import { useState } from "react";
import {
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
      if (error) setError(error.message);
      // Success: onAuthStateChange in _layout.tsx handles navigation
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
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

      if (result.type === "success" && result.url) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          result.url
        );
        if (error) throw error;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-cream dark:bg-bark"
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App name */}
        <View className="items-center mb-10">
          <Text className="text-5xl font-semibold tracking-tight text-brown-deep dark:text-offwhite">
            IOU
          </Text>
          <Text className="mt-1 text-base text-brown-muted dark:text-[#9A8A82]">
            Favours between friends
          </Text>
        </View>

        <View className="gap-4">
          {error && (
            <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {error}
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
            label="Continue with Google"
            onPress={handleGoogleSignIn}
            variant="secondary"
            loading={googleLoading}
          />
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-brown-muted dark:text-[#9A8A82]">
            Don't have an account?
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/sign-up")}
            hitSlop={8}
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
