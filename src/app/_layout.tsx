import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { QueryClientProvider } from "@tanstack/react-query";
import { Appearance, Platform, StyleSheet, View, useColorScheme } from "react-native";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";
import { Colors } from "@/constants/colors";

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVITY_KEY = "iou_last_activity";

SplashScreen.preventAutoHideAsync();

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

  // Handle OAuth deep-link callbacks (Google sign-in redirect back to app)
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (url.includes("code=") || url.includes("access_token")) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) console.warn("OAuth exchange error:", error.message);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
  }, []);

  // Listen for Supabase auth state changes — handles login, logout, and auto-login on restart
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .single();
          setProfile(profile);
          if (profile?.theme_preference === "light" || profile?.theme_preference === "dark") {
            Appearance.setColorScheme(profile.theme_preference);
          } else {
            // "system" — remove override so OS preference takes effect (iOS only; Android rejects null)
            if (Platform.OS !== "android") {
              (Appearance.setColorScheme as (s: string | null) => void)(null);
            }
          }
        } else {
          reset();
          // Auth screens always show in light mode — reset any previous user's theme override
          Appearance.setColorScheme("light");
          // Clear inactivity timestamp so the next login starts fresh
          if (Platform.OS === "web" && typeof window !== "undefined") {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
          }
        }

        setLoading(false);
        SplashScreen.hideAsync();
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
  const { isLoading } = useAuthStore();
  const scheme = colorScheme === "dark" ? "dark" : "light";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
      {/* Blanket overlay while auth resolves — prevents protected content flashing on web */}
      {isLoading && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: Colors[scheme].bg }]}
        />
      )}
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </QueryClientProvider>
  );
}
