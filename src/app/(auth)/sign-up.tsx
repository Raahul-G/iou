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
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      const trimmedEmail = email.trim().toLowerCase();

      // Pre-check: if the email is already registered, stop early.
      // supabase.auth.signUp() silently succeeds for existing emails (enumeration
      // protection), which leaves the user stuck on the OTP screen with no code.
      const { data: existing } = await supabase.rpc(
        "find_user_by_email",
        { search_email: trimmedEmail }
      );
      if (existing && existing.length > 0) {
        setErrors({ form: "An account with this email already exists. Sign in instead." });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrors({ form: error.message });
        return;
      }

      // OTP sent — navigate to verify screen
      router.push({
        pathname: "/(auth)/verify",
        params: { email: trimmedEmail },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-auth-bg dark:bg-bark"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
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
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
            Already have an account?
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="link" accessibilityLabel="Sign in to existing account">
            <Text className="text-sm font-medium text-brown-warm dark:text-umber">
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
