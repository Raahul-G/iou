import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useUpdateProfile, useUploadAvatar } from "@/hooks/use-profile";
import { captureError } from "@/lib/analytics";
import { queryClient } from "@/lib/query-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon, IconBadge } from "@/components/ui/icon";
import { PLAY_STORE_MARKET_URL, PLAY_STORE_WEB_URL } from "@/constants/app";

type ThemeOption = "system" | "light" | "dark";

export default function Settings() {
  const { profile } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Profile loads async after mount (background fetch in _layout.tsx).
  // Sync the input field when it arrives so it isn't blank on hard refresh.
  useEffect(() => {
    if (profile?.display_name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError("Name can't be empty.");
      return;
    }
    setNameError(null);
    try {
      await updateProfile.mutateAsync({ display_name: trimmed });
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  const handleTheme = async (value: ThemeOption) => {
    setThemeError(null);
    try {
      await updateProfile.mutateAsync({ theme_preference: value });
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { flow: "settings_theme" });
      setThemeError("Couldn't save theme. Try again.");
    }
  };

  const handleNotifToggle = async (value: boolean) => {
    setNotifError(null);
    try {
      await updateProfile.mutateAsync({ notifications_enabled: value });
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { flow: "settings_notif" });
      setNotifError("Couldn't save notification setting. Try again.");
    }
  };

  const performDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;
      queryClient.clear();
      await supabase.auth.signOut();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not delete account. Please try again.";
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    const message = "This permanently deletes your account and all data — IOUs, friends, wishes — and cannot be undone.";
    if (Platform.OS === "web") {
      if (window.confirm(`Delete account?\n\n${message}`)) performDeleteAccount();
      return;
    }
    Alert.alert("Delete account?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete account", style: "destructive", onPress: performDeleteAccount },
    ]);
  };

  const handleLogout = async () => {
    // Alert.alert is not implemented in React Native Web — use window.confirm on web.
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Are you sure you want to log out?")) {
        await supabase.auth.signOut();
      }
      return;
    }
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  };

  const theme = (profile?.theme_preference ?? "system") as ThemeOption;
  const notifsEnabled = profile?.notifications_enabled ?? true;
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="px-5 pb-8 gap-6"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
        Settings
      </Text>

      {/* Avatar */}
      <View className="items-center gap-3">
        <Pressable onPress={() => uploadAvatar.mutate()} disabled={uploadAvatar.isPending}>
          <View className="relative">
            {profile?.profile_pic_url ? (
              <Image
                source={{ uri: profile.profile_pic_url }}
                className="w-20 h-20 rounded-full bg-sand"
              />
            ) : (
              <IconBadge name="person" tone="muted" badgeSize={80} size={36} />
            )}
            <View className="absolute bottom-0 right-0 bg-brown-warm dark:bg-umber rounded-full w-7 h-7 items-center justify-center">
              <Icon name="camera" size={14} tone="inverse" />
            </View>
          </View>
        </Pressable>
        {uploadAvatar.isPending && (
          <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
            Uploading…
          </Text>
        )}
        {uploadAvatar.isError && (
          <Text className="text-xs text-red-500">Upload failed.</Text>
        )}
      </View>

      {/* Display name */}
      <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
          Display name
        </Text>
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          maxLength={40}
        />
        {nameError && (
          <Text className="text-xs text-red-500">{nameError}</Text>
        )}
        <Button
          label="Save name"
          onPress={handleSaveName}
          loading={updateProfile.isPending}
          disabled={displayName.trim() === profile?.display_name}
        />
      </View>

      {/* Theme */}
      <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
          Appearance
        </Text>
        <View className="flex-row gap-2">
          {(["system", "light", "dark"] as ThemeOption[]).map((opt) => (
            <Pressable
              key={opt}
              onPress={() => handleTheme(opt)}
              className={`flex-1 py-2.5 rounded-xl items-center border ${
                theme === opt
                  ? "bg-brown-warm dark:bg-umber border-brown-warm dark:border-umber"
                  : "bg-sand/30 dark:bg-[#160F16] border-sand dark:border-[#3D2B3D]"
              }`}
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  theme === opt
                    ? "text-white"
                    : "text-brown-deep dark:text-offwhite"
                }`}
              >
                {opt === "system" ? "Auto" : opt === "light" ? "Morning Coffee" : "Midnight Snuggle"}
              </Text>
            </Pressable>
          ))}
        </View>
        {themeError && (
          <Text className="text-xs text-red-500">{themeError}</Text>
        )}
      </View>

      {/* Notifications toggle */}
      <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] gap-1">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
              Notifications
            </Text>
            <Text className="text-xs text-brown-muted dark:text-[#8A7385] mt-0.5">
              Friend requests, IOU updates
            </Text>
          </View>
          <Switch
            value={notifsEnabled}
            onValueChange={handleNotifToggle}
            trackColor={{
              false: colorScheme === "dark" ? "#4A354A" : "#E5D5C5",
              true: colorScheme === "dark" ? "#9E7E8A" : "#D4A5A5",
            }}
            thumbColor="#fff"
          />
        </View>
        {notifError && (
          <Text className="text-xs text-red-500">{notifError}</Text>
        )}
      </View>

      {/* About */}
      <View className="bg-white dark:bg-bark-card rounded-xl border border-sand dark:border-[#3D2B3D] overflow-hidden">
        <Pressable
          onPress={async () => {
            // Prefer the Play app; fall back to the web listing (iOS/web/no Play)
            if (Platform.OS === "android") {
              try {
                await Linking.openURL(PLAY_STORE_MARKET_URL);
                return;
              } catch {
                // Play Store app unavailable — fall through to web
              }
            }
            Linking.openURL(PLAY_STORE_WEB_URL);
          }}
          className="px-4 py-4 flex-row items-center justify-between"
          accessibilityRole="button"
          accessibilityLabel="Rate IOU on the Play Store"
        >
          <View className="flex-row items-center gap-3">
            <Icon name="star" size={18} tone="accent" />
            <Text className="text-base text-brown-deep dark:text-offwhite">Rate IOU on the Play Store</Text>
          </View>
          <Icon name="chevron-forward" size={15} tone="muted" />
        </Pressable>
        <View className="h-px bg-sand dark:bg-[#3D2B3D]" />
        <Pressable
          onPress={() => Linking.openURL("https://myiou.app/privacy")}
          className="px-4 py-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <Icon name="shield-checkmark-outline" size={18} tone="muted" />
            <Text className="text-base text-brown-deep dark:text-offwhite">Privacy Policy</Text>
          </View>
          <Icon name="chevron-forward" size={15} tone="muted" />
        </Pressable>
        <View className="h-px bg-sand dark:bg-[#3D2B3D]" />
        <Pressable
          onPress={() => Linking.openURL("https://myiou.app/tos")}
          className="px-4 py-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <Icon name="document-text-outline" size={18} tone="muted" />
            <Text className="text-base text-brown-deep dark:text-offwhite">Terms of Service</Text>
          </View>
          <Icon name="chevron-forward" size={15} tone="muted" />
        </Pressable>
      </View>

      {/* Logout */}
      <Pressable
        onPress={handleLogout}
        className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] flex-row items-center justify-center gap-2"
      >
        <Icon name="log-out-outline" size={18} tone="danger" />
        <Text className="text-base font-semibold text-red-500">Log out</Text>
      </Pressable>

      {/* Delete Account */}
      <Pressable
        onPress={handleDeleteAccount}
        disabled={deleting}
        className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] items-center"
        style={{ opacity: deleting ? 0.5 : 1 }}
      >
        <Text className="text-sm text-[#9E4444] dark:text-[#C47070]">
          {deleting ? "Deleting…" : "Delete account"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
