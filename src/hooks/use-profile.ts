import { useMutation } from "@tanstack/react-query";
import { Appearance, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

export function useUpdateProfile() {
  const { user, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async (updates: {
      display_name?: string;
      theme_preference?: "light" | "dark" | "system";
      notifications_enabled?: boolean;
      profile_pic_url?: string;
    }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setProfile(data);
      if (data.theme_preference === "light" || data.theme_preference === "dark") {
        Appearance.setColorScheme(data.theme_preference);
      } else {
        // "system" — null only supported on iOS; Android and web both reject it
        if (Platform.OS === "ios") {
          (Appearance.setColorScheme as (s: string | null) => void)(null);
        }
      }
    },
  });
}

export function useUploadAvatar() {
  const { user, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return null;

      const asset = result.assets[0];
      const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${user!.id}/avatar.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // Bust CDN cache by appending a timestamp param
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { data, error } = await supabase
        .from("profiles")
        .update({ profile_pic_url: urlWithBust })
        .eq("id", user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) setProfile(data);
    },
  });
}
