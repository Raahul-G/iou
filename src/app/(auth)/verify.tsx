import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { OtpInput } from "@/components/ui/otp-input";
import { RESEND_COOLDOWN_SECS } from "@/constants/app";

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otpKey, setOtpKey] = useState(0); // increment to reset OTP boxes
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCooldown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (error) {
        setError(error.message);
        setOtpKey((k) => k + 1); // reset boxes on failure
        return;
      }

      // Verified — go to profile setup (new user flow)
      router.replace("/(auth)/create-profile");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setError(null);
    setResendLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-auth-bg dark:bg-bark"
    >
      <View className="flex-1 justify-center px-6 py-12">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
            Check your email
          </Text>
          <Text className="mt-2 text-base leading-relaxed text-brown-muted dark:text-[#8A7385]">
            We sent a verification code to{" "}
            <Text className="font-medium text-brown-deep dark:text-offwhite">
              {email}
            </Text>
            . Enter it below to confirm your account.
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

        {/* Wrong email? */}
        <View className="mt-8 flex-row items-center justify-center gap-1">
          <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
            Wrong email?
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
