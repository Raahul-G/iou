import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { type ErrorBoundaryProps } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Platform, Pressable, Text, View, useColorScheme } from "react-native";
import { useFonts, DancingScript_600SemiBold } from "@expo-google-fonts/dancing-script";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";
import { applyTheme } from "@/lib/theme";
import { identifyUser, clearUser, trackOAuthRedirect, captureError } from "@/lib/analytics";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const OAUTH_EXCHANGE_TIMEOUT_MS = 15_000;

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  attachStacktrace: true,
});

if (!process.env.EXPO_PUBLIC_SENTRY_DSN && __DEV__) {
  console.error(
    "[IOU] EXPO_PUBLIC_SENTRY_DSN is not set. Crashes will not be reported."
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff1e4" }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>😕</Text>
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#3D2E2E", marginBottom: 8, textAlign: "center" }}>
        Something went wrong
      </Text>
      <Text style={{ fontSize: 14, color: "#7a5f5f", textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
        {error.message}
      </Text>
      <Pressable
        onPress={retry}
        style={{ backgroundColor: "#D4A5A5", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Try again</Text>
      </Pressable>
    </View>
  );
}

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVITY_KEY = "iou_last_activity";

SplashScreen.preventAutoHideAsync();

// Module-level Set of already-handled OAuth codes.
// Using a Set (vs a boolean flag) means a code is skipped even if a zombie
// BrowserProxyActivity re-fires the Linking event after the first exchange
// completes and the flag would have reset. Codes are one-time-use so the
// Set stays tiny (≤1 entry per OAuth attempt).
const handledOAuthCodes = new Set<string>();

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const {
    session, isLoading,
    setSession, setLoading, setProfile, reset,
    setOAuthError, setExchangingOAuth,
  } = useAuthStore();

  // Web only: check inactivity on hard refresh, track activity while active
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (stored && Date.now() - Number(stored) > INACTIVITY_MS) {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      supabase.auth.signOut();
      return;
    }

    const touch = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    touch();
    window.addEventListener("click", touch, { passive: true });
    window.addEventListener("keydown", touch, { passive: true });
    window.addEventListener("scroll", touch, { passive: true });
    window.addEventListener("touchstart", touch, { passive: true });
    return () => {
      window.removeEventListener("click", touch);
      window.removeEventListener("keydown", touch);
      window.removeEventListener("scroll", touch);
      window.removeEventListener("touchstart", touch);
    };
  }, []);

  // Handle OAuth deep-link callbacks — single source of truth for code exchange.
  //
  // Robustness measures:
  // 1. Scheme validation — only process iou:// deep links, not arbitrary URLs.
  // 2. Code-level dedup via Set — a code that has already been handled is skipped
  //    even after the exchange completes, preventing zombie BrowserProxyActivity
  //    re-fires from triggering a second exchange with an already-expired code.
  // 3. URL-decode — codes with encoded characters (e.g. %3D) are decoded before
  //    being sent to Supabase, which expects the raw value.
  // 4. 15-second timeout — if Supabase's token-refresh lock stalls the exchange,
  //    we reject after 15 s so the app never freezes permanently.
  // 5. Session validation — confirms a session was actually created, not just that
  //    no error object was returned.
  // 6. UI feedback — sets isExchangingOAuth in the store so sign-in.tsx can keep
  //    the Google button disabled and surface exchange errors to the user.
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      // Fix 6: scheme validation — ignore deep links that aren't ours
      if (!url.startsWith("iou://")) return;
      if (!url.includes("code=") && !url.includes("access_token")) return;

      // Fix 5: URL-decode before extracting — do NOT use new URL() or searchParams
      // (unreliable for custom-scheme URLs even with react-native-url-polyfill)
      const rawSegment = url.split("code=")[1]?.split("&")[0] ?? "";
      const code = decodeURIComponent(rawSegment) || null;

      // Fix 2: code-level dedup — skip if this exact code was already handled
      if (!code || handledOAuthCodes.has(code)) return;
      handledOAuthCodes.add(code);
      // Cap at 10 entries to prevent unbounded growth
      if (handledOAuthCodes.size > 10) {
        const oldest = handledOAuthCodes.values().next().value;
        handledOAuthCodes.delete(oldest!);
      }

      trackOAuthRedirect(url);
      setExchangingOAuth(true);
      setOAuthError(null);

      try {
        // Fix 4: 15-second timeout so a stalled Supabase exchange never freezes the app
        const { data, error } = await Promise.race([
          supabase.auth.exchangeCodeForSession(code),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("OAuth exchange timed out. Please try again.")),
              OAUTH_EXCHANGE_TIMEOUT_MS
            )
          ),
        ]);

        if (error) {
          captureError(error, { flow: "oauth_deep_link" });
          setOAuthError("Google sign-in failed. Please try again.");
          return;
        }

        // Fix 8: verify a session was actually established, not just error=null
        if (!data?.session) {
          captureError(new Error("OAuth: exchange returned no session"), {
            flow: "oauth_deep_link",
          });
          setOAuthError("Google sign-in failed. Please try again.");
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
        captureError(err instanceof Error ? err : new Error(message), {
          flow: "oauth_deep_link",
        });
        setOAuthError(message);
      } finally {
        setExchangingOAuth(false);
      }
    };

    // Cold start: app was killed while Chrome Custom Tabs was open, then
    // re-launched via iou:///?code=abc deep link. getInitialURL() is the
    // ONLY way to retrieve the URL on a cold start — the "url" event
    // listener below does NOT fire for the launch URL.
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    // Warm start: app was backgrounded but still alive
    const sub = Linking.addEventListener("url", handleUrl);
    return () => {
      sub.remove();
      // Clear in-progress flag so a fresh listener registration starts cleanly
      setExchangingOAuth(false);
    };
    // Zustand setters (setExchangingOAuth, setOAuthError) are stable references — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for Supabase auth state changes — handles login, logout, and auto-login on restart
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // Synchronously update the session so the route guard and data queries
        // can fire immediately. Do NOT await anything before unlocking here —
        // if the profile fetch (below) hangs (e.g. Supabase token-refresh lock
        // on a hard refresh), keeping setLoading(false) inside a finally block
        // of an awaited call means SplashScreen.hideAsync() is never called and
        // the app is permanently stuck on the splash/loading screen.
        setSession(newSession);

        if (newSession?.user) {
          identifyUser(newSession.user.id);
          setLoading(false);
          SplashScreen.hideAsync();

          // Fetch profile in the background — does not block the route guard.
          const fetchUserId = newSession.user.id;
          supabase
            .from("profiles")
            .select("*")
            .eq("id", fetchUserId)
            .single()
            .then(
              ({ data: profile }) => {
                // Guard: if user logged out or switched accounts while fetch was in-flight, discard
                if (useAuthStore.getState().user?.id !== fetchUserId) return;
                if (profile) {
                  setProfile(profile);
                  applyTheme(
                    (profile.theme_preference as "light" | "dark" | "system") ?? "system"
                  );
                }
              },
              (err) => {
                // Non-critical: app is usable without profile. Theme stays default.
                captureError(err instanceof Error ? err : new Error(String(err)), {
                  flow: "profile_fetch",
                });
              }
            );
        } else {
          clearUser();
          reset();
          queryClient.clear();
          // Auth screens always show in light mode — reset any previous user's theme override
          applyTheme("light");
          // Clear inactivity timestamp so the next login starts fresh
          if (Platform.OS === "web" && typeof window !== "undefined") {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
          }
          setLoading(false);
          SplashScreen.hideAsync();
        }
      }
    );

    return () => listener.subscription.unsubscribe();
    // Zustand setters (setSession, setLoading, setProfile, reset) are stable references — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push notifications — register token when user is authenticated
  usePushNotifications();

  // Route guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    // Allow staying on create-profile even when session exists
    const onCreateProfile = segments.at(1) === "create-profile";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup && !onCreateProfile) {
      router.replace("/");
    }
    // router from expo-router is a stable singleton — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useFonts({ DancingScript_600SemiBold });

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>IOU — Little things, remembered.</title>
        <meta name="description" content="Track favours, make wishes, and grow your friendship tree. Private, free, and built for the friends who always show up." />
        <meta property="og:title" content="IOU — Little things, remembered." />
        <meta property="og:description" content="Track favours, make wishes, and grow your friendship tree. Private, free, and built for the friends who always show up." />
        <meta property="og:image" content="https://myiou.app/app-icon.png" />
        <meta property="og:url" content="https://myiou.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="IOU — Little things, remembered." />
        <meta name="twitter:description" content="Track favours, make wishes, and grow your friendship tree." />
        <meta name="twitter:image" content="https://myiou.app/app-icon.png" />
        <meta name="theme-color" content="#fff1e4" />
      </Head>
      <AuthGuard />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </QueryClientProvider>
  );
}
