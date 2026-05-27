import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "react-native";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, setSession, setLoading, setProfile, reset } =
    useAuthStore();

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
        } else {
          reset();
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
      router.replace("/(tabs)");
    }
  }, [session, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Slot />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </QueryClientProvider>
  );
}
