import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useUpdateProfile, useUploadAvatar } from "@/hooks/use-profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ThemeOption = "system" | "light" | "dark";

export default function Settings() {
  const { profile } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [nameError, setNameError] = useState<string | null>(null);

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
    try {
      await updateProfile.mutateAsync({ theme_preference: value });
    } catch {
      // UI reflects profile state — if mutation fails, button reverts automatically.
    }
  };

  const handleNotifToggle = async (value: boolean) => {
    try {
      await updateProfile.mutateAsync({ notifications_enabled: value });
    } catch {
      // UI reflects profile state — if mutation fails, toggle reverts automatically.
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  const theme = (profile?.theme_preference ?? "system") as ThemeOption;
  const notifsEnabled = profile?.notifications_enabled ?? true;

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
      showsVerticalScrollIndicator={false}
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
              <View className="w-20 h-20 rounded-full bg-sand dark:bg-[#2A1E18] items-center justify-center">
                <Text className="text-3xl">👤</Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-brown-warm dark:bg-umber rounded-full w-7 h-7 items-center justify-center">
              <Text className="text-xs">✏️</Text>
            </View>
          </View>
        </Pressable>
        {uploadAvatar.isPending && (
          <Text className="text-xs text-brown-muted dark:text-[#9A8A82]">
            Uploading…
          </Text>
        )}
        {uploadAvatar.isError && (
          <Text className="text-xs text-red-500">Upload failed.</Text>
        )}
      </View>

      {/* Display name */}
      <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#2A1E18] gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#9A8A82]">
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
      <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#2A1E18] gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#9A8A82]">
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
                  : "bg-sand/30 dark:bg-[#1E1410] border-sand dark:border-[#2A1E18]"
              }`}
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  theme === opt
                    ? "text-white"
                    : "text-brown-deep dark:text-offwhite"
                }`}
              >
                {opt === "system" ? "Auto" : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notifications toggle */}
      <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#2A1E18] flex-row items-center justify-between">
        <View>
          <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
            Notifications
          </Text>
          <Text className="text-xs text-brown-muted dark:text-[#9A8A82] mt-0.5">
            Friend requests, IOU updates
          </Text>
        </View>
        <Switch
          value={notifsEnabled}
          onValueChange={handleNotifToggle}
          trackColor={{ true: "#8B6347" }}
          thumbColor="#fff"
        />
      </View>

      {/* Logout */}
      <Pressable
        onPress={handleLogout}
        className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#2A1E18] items-center"
      >
        <Text className="text-base font-semibold text-red-500">Log out</Text>
      </Pressable>
    </ScrollView>
  );
}
