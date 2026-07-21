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
import { supabase } from "@/lib/supabase";
import { captureError } from "@/lib/analytics";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChangePassword() {
  const { session } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Reward early / punish late
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Derived validity
  const currentOk = current.length > 0;
  const newLengthOk = newPassword.length >= 8;
  const newOk = newLengthOk && (newPassword !== current || !current);
  const confirmOk = confirm.length > 0 && confirm === newPassword;
  const isFormValid = currentOk && newLengthOk && newPassword !== current && confirmOk;

  // No "Looks good" for current password — we can't verify it without re-authing.
  // Only penalise if the user blurs while the field is empty.
  const currentValidation =
    touched.current && !current
      ? { error: "Enter your current password" }
      : {};

  const newPasswordValidation = newPassword
    ? newOk
      ? { success: "Looks good" }
      : touched.new
      ? {
          error:
            !newLengthOk
              ? "Must be at least 8 characters"
              : "Must differ from your current password",
        }
      : {}
    : {};

  // Re-evaluate new password validation when current changes (same-password check)
  const newPasswordValidationLive =
    newPassword && current && newPassword === current
      ? touched.new
        ? { error: "Must differ from your current password" }
        : {}
      : newPasswordValidation;

  const confirmValidation = confirm
    ? confirmOk
      ? { success: "Passwords match" }
      : touched.confirm
      ? { error: "Passwords don't match" }
      : {}
    : {};

  const handleChange = async () => {
    setTouched({ current: true, new: true, confirm: true });
    if (!isFormValid) return;

    setError(null);
    setLoading(true);

    try {
      // Re-authenticate to verify current password
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: session!.user.email!,
        password: current,
      });

      if (reAuthError) {
        setError("Current password is incorrect.");
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDone(true);
    } catch (err: unknown) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        flow: "change_password",
      });
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-cream dark:bg-bark"
    >
      {/* Manual header */}
      <View
        className="flex-row items-center px-4 border-b border-sand dark:border-[#3D2B3D]"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} className="mr-3">
          <Icon name="caret-left" size={22} tone="default" weight="regular" />
        </Pressable>
        <Text className="text-lg font-semibold text-brown-deep dark:text-offwhite">
          Change password
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 py-6 gap-4"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {!done ? (
          <>
            {error && (
              <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
                <Text className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </Text>
              </View>
            )}

            <Input
              label="Current password"
              placeholder="Your current password"
              value={current}
              onChangeText={setCurrent}
              onBlur={() => touch("current")}
              secureTextEntry
              autoComplete="current-password"
              {...currentValidation}
            />

            <Input
              label="New password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              onBlur={() => touch("new")}
              secureTextEntry
              autoComplete="new-password"
              {...newPasswordValidationLive}
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
              label="Update password"
              onPress={handleChange}
              loading={loading}
              disabled={!current || !newPassword || !confirm}
            />
          </>
        ) : (
          <View className="items-center gap-4 mt-8">
            <View className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 items-center justify-center">
              <Icon name="check-circle" size={32} tone="success" weight="duotone" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-xl font-semibold text-brown-deep dark:text-offwhite">
                Password updated
              </Text>
              <Text className="text-base text-center text-brown-muted dark:text-[#8A7385]">
                Your password has been changed successfully.
              </Text>
            </View>
            <View className="w-full mt-2">
              <Button label="Done" onPress={() => router.back()} />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
