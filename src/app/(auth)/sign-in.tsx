import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { captureError } from "@/lib/analytics";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Divider } from "@/components/ui/divider";

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // oauthError: set by _layout.tsx deep-link handler if exchange fails
  // isExchangingOAuth: true from the moment the browser closes until exchange settles
  // Both surface to the user here so the Google button stays locked and errors are visible
  const { oauthError, isExchangingOAuth, setOAuthError } = useAuthStore();

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) setError("Couldn't sign in. If you registered with Google, use the Google button below.");
      // Success: onAuthStateChange in _layout.tsx handles navigation
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setOAuthError(null);
    setGoogleLoading(true);

    try {
      // Web: full-page redirect — browser handles the OAuth flow natively.
      // WebBrowser.openAuthSessionAsync opens a popup on web which is blocked
      // by most browsers. The callback is handled by _layout.tsx via Linking.
      if (Platform.OS === "web") {
        const redirectTo =
          typeof window !== "undefined" ? window.location.origin : undefined;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (error) throw error;
        // Page will redirect — no further handling needed here.
        return;
      }

      // Android: open OAuth URL in an in-app browser and capture the redirect.
      const redirectUrl = Linking.createURL("/");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });

      if (error) throw error;
      if (!data.url) throw new Error("No OAuth URL returned.");

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      // Code exchange is handled by the Linking listener in _layout.tsx —
      // openAuthSessionAsync's result.url is unreliable on Android (returns
      // the base URL without ?code= on some devices). The Linking event
      // always carries the full URL and is the single exchange point.
      if (result.type === "cancel" || result.type === "dismiss") {
        captureError(new Error(`OAuth browser closed: ${result.type}`), {
          flow: "google_sign_in",
          result_type: result.type,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      captureError(err instanceof Error ? err : new Error(message), {
        flow: "google_sign_in",
      });
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-auth-bg dark:bg-bark"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App logo */}
        <View className="items-center mb-10">
          <Image
            source={require("../../../assets/images/splash-icon.png")}
            style={{ width: 96, height: 96 }}
            resizeMode="contain"
          />
          <Text
            style={{ fontFamily: "DancingScript_600SemiBold", fontSize: 20 }}
            className="mt-3 text-brown-muted dark:text-[#8A7385]"
          >
            Little things, remembered
          </Text>
        </View>

        <View className="gap-4">
          {(error || oauthError) && (
            <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {error ?? oauthError}
              </Text>
            </View>
          )}

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />

          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />

          <Button
            label="Sign in"
            onPress={handleSignIn}
            loading={loading}
          />

          <Divider />

          <Button
            label={isExchangingOAuth ? "Signing in…" : "Continue with Google"}
            onPress={handleGoogleSignIn}
            variant="secondary"
            loading={googleLoading || isExchangingOAuth}
            disabled={isExchangingOAuth}
          />
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
            {"Don't have an account?"}
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-up")}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Sign up for a new account"
          >
            <Text className="text-sm font-medium text-brown-warm dark:text-umber">
              Sign up
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
