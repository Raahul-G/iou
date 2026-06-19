import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { applyTheme } from "@/lib/theme";

export function useUpdateProfile() {
  const { user, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async (updates: {
      display_name?: string;
      theme_preference?: "light" | "dark" | "system";
      notifications_enabled?: boolean;
      profile_pic_url?: string;
    }) => {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      setProfile(data);
      if (variables.theme_preference !== undefined) {
        applyTheme(
          (data.theme_preference as "light" | "dark" | "system") ?? "system"
        );
      }
    },
  });
}

export function useUploadAvatar() {
  const { user, setProfile } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return null;

      const asset = result.assets[0];
      if (!asset.base64) throw new Error("Failed to read image data.");

      const path = `${userId}/avatar.jpg`;

      // base64 → Uint8Array — works on web and native, no fetch(uri) needed
      let binary: string;
      try {
        binary = atob(asset.base64);
      } catch {
        throw new Error("Image could not be processed. Please try a different photo.");
      }
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      // Upload first (upsert: true) — old avatar is preserved if this fails
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, bytes, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      // Clean up stale files (e.g. old extension changes) — safe since new avatar is already uploaded
      const { data: existing } = await supabase.storage
        .from("avatars")
        .list(userId);
      if (existing && existing.length > 0) {
        const stale = existing.filter((f) => f.name !== "avatar.jpg");
        if (stale.length > 0) {
          await supabase.storage
            .from("avatars")
            .remove(stale.map((f) => `${userId}/${f.name}`));
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Cache-bust so all platforms show the new image immediately
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { data, error } = await supabase
        .from("profiles")
        .update({ profile_pic_url: urlWithBust })
        .eq("id", userId)
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
