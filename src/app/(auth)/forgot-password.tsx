import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { captureError } from "@/lib/analytics";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { RESEND_COOLDOWN_SECS } from "@/constants/app";

const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function ForgotPassword() {
  const { setPasswordRecovery } = useAuthStore();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [otpKey, setOtpKey] = useState(0); // increment to reset OTP boxes
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sign out any stale recovery session left over from a previous abandoned reset
  // (e.g., user verified OTP but went back without changing password).
  // Without this, the dangling session would let the route guard redirect to home
  // the moment isPasswordRecovery is cleared on a subsequent OTP error.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) supabase.auth.signOut();
    });
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSend = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
      startCooldown();
    } catch (err: unknown) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        flow: "forgot_password_send",
      });
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setError(null);
    setResendLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase()
      );
      if (error) {
        setError(error.message);
      } else {
        setOtpKey((k) => k + 1); // clear boxes when new code is sent
        startCooldown();
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      // Raise flag BEFORE verifyOtp so onAuthStateChange in _layout.tsx
      // knows to navigate to reset-password instead of home.
      setPasswordRecovery(true);

      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "recovery",
      });

      if (error) {
        setPasswordRecovery(false);
        setError(error.message);
        setOtpKey((k) => k + 1); // reset boxes on failure
        return;
      }
      // Success: onAuthStateChange fires (SIGNED_IN or PASSWORD_RECOVERY) →
      // _layout.tsx detects isPasswordRecovery flag and navigates to reset-password
    } catch (err: unknown) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        flow: "forgot_password_verify",
      });
      setPasswordRecovery(false);
      setError("Something went wrong. Please try again.");
      setOtpKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-auth-bg dark:bg-bark"
    >
      <View className="flex-1 justify-center px-6 py-12">
        {!sent ? (
          <>
            {/* Email state */}
            <View className="mb-8">
              <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
                Forgot password?
              </Text>
              <Text className="mt-2 text-base leading-relaxed text-brown-muted dark:text-[#8A7385]">
                Enter your email and we'll send you a code to reset your
                password.
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
                onBlur={() => setEmailTouched(true)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                {...(email.trim()
                  ? isValidEmail(email)
                    ? { success: "Looks good" }
                    : emailTouched
                    ? { error: "Enter a valid email address" }
                    : {}
                  : {})}
              />

              <Button
                label="Send code"
                onPress={handleSend}
                loading={loading}
                disabled={!email.trim()}
              />
            </View>
          </>
        ) : (
          <>
            {/* Code entry state */}
            <View className="mb-8">
              <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
                Check your email
              </Text>
              <Text className="mt-2 text-base leading-relaxed text-brown-muted dark:text-[#8A7385]">
                We sent a 6-digit code to{" "}
                <Text className="font-medium text-brown-deep dark:text-offwhite">
                  {email.trim()}
                </Text>
                . Enter it below to reset your password.
              </Text>
            </View>

            <View className="gap-6">
              {error && (
                <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
                  <Text className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </Text>
                </View>
              )}

              <OtpInput
                key={otpKey}
                onComplete={handleVerify}
                disabled={loading}
              />

              {/* Loading indicator */}
              {loading && (
                <View className="items-center">
                  <ActivityIndicator size="small" color="#D4A5A5" />
                </View>
              )}

              {/* Resend */}
              {!loading && (
                <View className="items-center">
                  {cooldown > 0 ? (
                    <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
                      Resend code in{" "}
                      <Text className="font-medium text-brown-deep dark:text-offwhite">
                        {cooldown}s
                      </Text>
                    </Text>
                  ) : (
                    <Pressable
                      onPress={handleResend}
                      disabled={resendLoading}
                      hitSlop={8}
                    >
                      <Text className="text-sm font-medium text-brown-warm dark:text-umber">
                        {resendLoading ? "Sending…" : "Resend code"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Footer */}
        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
            Remember it?
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-sm font-medium text-brown-warm dark:text-umber">
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
