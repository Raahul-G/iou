import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { captureError } from "@/lib/analytics";

// Show notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) return null;

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return token;
}

async function upsertPushToken(userId: string, token: string, platform: string) {
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,token" }
  );

  if (error) {
    captureError(error, { flow: "push_token_register" });
  }
}

export function usePushNotifications() {
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Skip on web or when not authenticated
    if (Platform.OS === "web" || !user || !profile?.notifications_enabled) return;

    // Register token and upsert to DB
    registerForPushNotifications()
      .then(async (token) => {
        if (!token) return;
        await upsertPushToken(user.id, token, Platform.OS);
      })
      .catch((err) => {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          flow: "push_token_register",
        });
      });

    // Foreground notification — refresh notification list/badge
    receivedListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    });

    // User tapped notification — navigate to notifications tab
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)/notifications");
    });

    return () => {
      receivedListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [user?.id, profile?.notifications_enabled]);
}
