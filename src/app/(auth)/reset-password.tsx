import { useState } from "react";
import {
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
import { Icon } from "@/components/ui/icon";

export default function ResetPassword() {
  const { setPasswordRecovery } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Reward early / punish late
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const passwordOk = password.length >= 8;
  const confirmOk = confirm.length > 0 && confirm === password;
  const isFormValid = passwordOk && confirmOk;

  const passwordValidation = password
    ? passwordOk
      ? { success: "Looks good" }
      : touched.password
      ? { error: "Must be at least 8 characters" }
      : {}
    : {};

  const confirmValidation = confirm
    ? confirmOk
      ? { success: "Passwords match" }
      : touched.confirm
      ? { error: "Passwords don't match" }
      : {}
    : {};

  const handleReset = async () => {
    setTouched({ password: true, confirm: true });
    if (!isFormValid) return;

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setPasswordRecovery(false);
      setDone(true);
    } catch (err: unknown) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        flow: "reset_password",
      });
      setError("Something went wrong. Please try again.");
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
        {!done ? (
          <>
            <View className="mb-8">
              <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
                Set new password
              </Text>
              <Text className="mt-2 text-base leading-relaxed text-brown-muted dark:text-[#8A7385]">
                Choose a strong password — at least 8 characters.
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
                label="New password"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                onBlur={() => touch("password")}
                secureTextEntry
                autoComplete="new-password"
                {...passwordValidation}
              />

              <Input
                label="Confirm new password"
                placeholder="Repeat your new password"
                value={confirm}
                onChangeText={setConfirm}
                onBlur={() => touch("confirm")}
                secureTextEntry
                autoComplete="new-password"
                {...confirmValidation}
              />

              <Button
                label="Set password"
                onPress={handleReset}
                loading={loading}
                disabled={!password || !confirm}
              />
            </View>

            {/* Cancel — signs out so no dangling recovery session remains */}
            <View className="mt-8 flex-row items-center justify-center gap-1">
              <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
                Changed your mind?
              </Text>
              <Pressable
                onPress={async () => {
                  setPasswordRecovery(false);
                  await supabase.auth.signOut();
                  router.replace("/(auth)/sign-in");
                }}
                hitSlop={8}
              >
                <Text className="text-sm font-medium text-brown-warm dark:text-umber">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* Done state */}
            <View className="items-center gap-4 mb-8">
              <View className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center">
                <Icon name="check-circle" size={32} tone="success" weight="duotone" />
              </View>
              <View className="items-center gap-1">
                <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
                  Password updated
                </Text>
                <Text className="text-base text-center text-brown-muted dark:text-[#8A7385]">
                  {"You\u2019re all set. Sign in with your new password next time."}
                </Text>
              </View>
            </View>

            <Button
              label="Continue"
              onPress={() => router.replace("/")}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
