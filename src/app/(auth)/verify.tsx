import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RESEND_COOLDOWN_SECS } from "@/constants/app";

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start initial cooldown so user doesn't spam resend immediately
    startCooldown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  const handleVerify = async () => {
    const trimmedCode = code.trim();

    if (!trimmedCode || trimmedCode.length < 6) {
      setError("Enter the verification code from your email.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: trimmedCode,
        type: "signup",
      });

      if (error) {
        setError(error.message);
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
        startCooldown();
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-cream dark:bg-bark"
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

        <View className="gap-4">
          {error && (
            <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {error}
              </Text>
            </View>
          )}

          <Input
            label="Verification code"
            placeholder="123456"
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 8))}
            keyboardType="number-pad"
            maxLength={8}
            autoFocus
            hint="Enter the code from your email"
          />

          <Button
            label="Verify"
            onPress={handleVerify}
            loading={loading}
            disabled={code.trim().length < 6}

          />

          {/* Resend */}
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
