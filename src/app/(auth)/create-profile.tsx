import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CreateProfile() {
  const { user, profile, setProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with auto-created profile name
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
    if (profile?.profile_pic_url) {
      setAvatarUri(profile.profile_pic_url);
    }
  }, [profile]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo access is needed to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarAsset(result.assets[0]);
    }
  };

  const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    if (!user || !asset.base64) throw new Error("Failed to read image data.");

    const path = `${user.id}/avatar.jpg`;

    // base64 → Uint8Array — works on web and native
    let binary: string;
    try {
      binary = atob(asset.base64);
    } catch {
      throw new Error("Image could not be processed. Please try a different photo.");
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Upload first (upsert: true) — old avatar is preserved if this fails
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

    if (error) throw error;

    // Clean up stale files after successful upload
    const { data: existing } = await supabase.storage
      .from("avatars")
      .list(user.id);
    if (existing && existing.length > 0) {
      const stale = existing.filter((f) => f.name !== "avatar.jpg");
      if (stale.length > 0) {
        await supabase.storage
          .from("avatars")
          .remove(stale.map((f) => `${user.id}/${f.name}`));
      }
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const handleSave = async () => {
    if (!user) return;
    const name = displayName.trim();

    if (!name) {
      setError("Display name is required.");
      return;
    }
    if (name.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let profilePicUrl = profile?.profile_pic_url ?? null;

      // Upload avatar if a new local image was picked
      if (avatarAsset && avatarUri !== profile?.profile_pic_url) {
        setUploading(true);
        try {
          profilePicUrl = await uploadAvatar(avatarAsset);
        } finally {
          setUploading(false);
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: name,
          profile_pic_url: profilePicUrl,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/");
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
        {/* Header */}
        <View className="mb-8">
          <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
            Set up your profile
          </Text>
          <Text className="mt-2 text-base text-brown-muted dark:text-[#8A7385]">
            How should your friends see you?
          </Text>
        </View>

        <View className="gap-6">
          {/* Avatar picker */}
          <View className="items-center">
            <Pressable
              onPress={pickAvatar}
              className="relative items-center justify-center"
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="h-24 w-24 rounded-full bg-sand dark:bg-bark-card"
                />
              ) : (
                <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-sand dark:border-[#4A354A] bg-white dark:bg-bark-card">
                  <Text className="text-3xl">👤</Text>
                </View>
              )}
              {uploading && (
                <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                  <ActivityIndicator color="white" />
                </View>
              )}
            </Pressable>
            <Pressable onPress={pickAvatar} hitSlop={8} className="mt-2">
              <Text className="text-sm font-medium text-brown-warm dark:text-umber">
                {avatarUri ? "Change photo" : "Add photo"}
              </Text>
            </Pressable>
          </View>

          {/* Error */}
          {error && (
            <View className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {error}
              </Text>
            </View>
          )}

          {/* Display name */}
          <Input
            label="Display name"
            placeholder="How friends will see you"
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus={!avatarUri}
            autoCorrect={false}
            maxLength={40}
            hint="You can change this anytime in settings"
          />

          <Button
            label="Save and continue"
            onPress={handleSave}
            loading={loading}
          />

          <Button label="Skip for now" onPress={handleSkip} variant="ghost" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
