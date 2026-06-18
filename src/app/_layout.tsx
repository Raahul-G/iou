import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Platform, useColorScheme } from "react-native";
import { useFonts, DancingScript_600SemiBold } from "@expo-google-fonts/dancing-script";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";
import { applyTheme } from "@/lib/theme";
import { identifyUser, clearUser, trackOAuthRedirect, captureError } from "@/lib/analytics";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  attachStacktrace: true,
});

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVITY_KEY = "iou_last_activity";

SplashScreen.preventAutoHideAsync();

// Module-level dedup — shared across all AuthGuard instances so duplicate
// Linking events (Android fires the URL intent more than once) only trigger
// one exchangeCodeForSession call even if multiple listeners are registered.
let _lastHandledOAuthUrl: string | null = null;

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, setSession, setLoading, setProfile, reset } =
    useAuthStore();

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

  // Handle OAuth deep-link callbacks. This is the single source of truth for
  // code exchange on Android — openAuthSessionAsync's result.url is unreliable
  // (returns base URL without the code on some devices). The Linking event
  // always carries the full URL. Module-level dedup prevents double-exchange
  // even when Android fires the URL intent twice or two listeners are registered.
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url.includes("code=") && !url.includes("access_token")) return;
      if (url === _lastHandledOAuthUrl) return;
      _lastHandledOAuthUrl = url;

      trackOAuthRedirect(url);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) captureError(error, { flow: "oauth_deep_link" });
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          flow: "oauth_deep_link",
        });
      }
    };

    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
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
          identifyUser(newSession.user.id, newSession.user.email);
          setLoading(false);
          SplashScreen.hideAsync();

          // Fetch profile in the background — does not block the route guard.
          supabase
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .single()
            .then(
              ({ data: profile }) => {
                if (profile) {
                  setProfile(profile);
                  applyTheme(
                    (profile.theme_preference as "light" | "dark" | "system") ?? "system"
                  );
                }
              },
              () => {
                // Non-critical: app is usable without profile. Theme stays default.
              }
            );
        } else {
          clearUser();
          reset();
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
  }, []);

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
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </QueryClientProvider>
  );
}
