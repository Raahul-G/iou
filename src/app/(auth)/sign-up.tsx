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

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};

    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter a valid email address.";

    if (!password) next.password = "Password is required.";
    else if (password.length < 8)
      next.password = "Password must be at least 8 characters.";

    if (!confirmPassword) next.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword)
      next.confirmPassword = "Passwords don't match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrors({ form: error.message });
        return;
      }

      // OTP sent — navigate to verify screen
      router.push({
        pathname: "/(auth)/verify",
        params: { email: email.trim().toLowerCase() },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrors({});
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
        err instanceof Error ? err.message : "Google sign-up failed.";
      setErrors({ form: message });
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
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* App name */}
        <View className="items-center mb-10">
          <Text className="text-5xl font-semibold tracking-tight text-brown-deep dark:text-offwhite">
            IOU
          </Text>
          <Text className="mt-1 text-base text-brown-muted dark:text-[#9A8A82]">
            Start tracking favours
          </Text>
        </View>

        <View className="gap-4">
          {errors.form && (
            <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {errors.form}
              </Text>
            </View>
          )}

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
          />

          <Input
            label="Confirm password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <Button
            label="Create account"
            onPress={handleSignUp}
            loading={loading}
          />

          <Divider />

          <Button
            label="Continue with Google"
            onPress={handleGoogleSignUp}
            variant="secondary"
            loading={googleLoading}
          />
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-brown-muted dark:text-[#9A8A82]">
            Already have an account?
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-sm font-medium text-brown-warm dark:text-umber">
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
