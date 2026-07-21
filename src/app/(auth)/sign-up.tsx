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

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // "punish late" — only show red after the user has left a field
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Derived validity
  const emailOk = isValidEmail(email);
  const passwordOk = password.length >= 8;
  const confirmOk = confirmPassword.length > 0 && confirmPassword === password;
  const isFormValid = emailOk && passwordOk && confirmOk;

  // Reward early (green on valid) / punish late (red only after blur)
  const emailValidation = email.trim()
    ? emailOk
      ? { success: "Looks good" }
      : touched.email
      ? { error: "Enter a valid email address" }
      : {}
    : {};

  const passwordValidation = password
    ? passwordOk
      ? { success: "Looks good" }
      : touched.password
      ? { error: "Must be at least 8 characters" }
      : {}
    : {};

  const confirmValidation = confirmPassword
    ? confirmOk
      ? { success: "Passwords match" }
      : touched.confirm
      ? { error: "Passwords don't match" }
      : {}
    : {};

  const handleSignUp = async () => {
    // Mark all fields touched so any remaining errors become visible
    setTouched({ email: true, password: true, confirm: true });
    if (!isFormValid) return;

    setFormError(null);
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Pre-check: if the email is already registered, stop early.
      // supabase.auth.signUp() silently succeeds for existing emails (enumeration
      // protection), which leaves the user stuck on the OTP screen with no code.
      const { data: existing } = await supabase.rpc("find_user_by_email", {
        search_email: trimmedEmail,
      });
      if (existing && existing.length > 0) {
        setFormError(
          "An account with this email already exists. Sign in instead."
        );
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setFormError(error.message);
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
          {formError && (
            <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {formError}
              </Text>
            </View>
          )}

          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            onBlur={() => touch("email")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            {...emailValidation}
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            onBlur={() => touch("password")}
            secureTextEntry
            autoComplete="new-password"
            {...passwordValidation}
          />

          <Input
            label="Confirm password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onBlur={() => touch("confirm")}
            secureTextEntry
            autoComplete="new-password"
            {...confirmValidation}
          />

          <Button
            label="Create account"
            onPress={handleSignUp}
            loading={loading}
            disabled={!email || !password || !confirmPassword}
          />
        </View>

        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
            Already have an account?
          </Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Sign in to existing account"
          >
            <Text className="text-sm font-medium text-brown-warm dark:text-umber">
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
