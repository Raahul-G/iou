import { useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import {
  usePendingRequests,
  useRespondToRequest,
  type FriendRequest,
} from "@/hooks/use-friends";
import {
  useNotifications,
  useMarkAllRead,
  type AppNotification,
} from "@/hooks/use-notifications";

const NOTIF_ICONS: Record<AppNotification["type"], string> = {
  friend_request: "🤝",
  friend_request_accepted: "✅",
  iou_created: "📬",
  iou_accepted: "👍",
  iou_declined: "❌",
  iou_completion_requested: "🔔",
  iou_completion_rejected: "↩️",
  iou_completed: "🎉",
};

function RequestCard({
  request,
  onRespond,
}: {
  request: FriendRequest;
  onRespond: (id: string, accept: boolean) => void;
}) {
  const sender = request.sender as {
    display_name: string;
    profile_pic_url: string | null;
  };

  return (
    <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 gap-3 border border-sand dark:border-[#2A1E18]">
      <View className="flex-row items-center gap-3">
        {sender.profile_pic_url ? (
          <Image
            source={{ uri: sender.profile_pic_url }}
            className="w-11 h-11 rounded-full bg-sand"
          />
        ) : (
          <View className="w-11 h-11 rounded-full bg-sand dark:bg-[#2A1E18] items-center justify-center">
            <Text className="text-lg">👤</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
            {sender.display_name}
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#9A8A82]">
            Wants to be friends
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Pressable
            onPress={() => onRespond(request.id, true)}
            className="bg-brown-warm dark:bg-umber rounded-xl py-2.5 items-center"
          >
            <Text className="text-sm font-semibold text-white">Accept</Text>
          </Pressable>
        </View>
        <View className="flex-1">
          <Pressable
            onPress={() => onRespond(request.id, false)}
            className="bg-sand/50 dark:bg-[#2A1E18] rounded-xl py-2.5 items-center border border-sand dark:border-[#3A2A20]"
          >
            <Text className="text-sm font-semibold text-brown-muted dark:text-[#9A8A82]">
              Decline
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NotifCard({
  notif,
  onPress,
}: {
  notif: AppNotification;
  onPress: () => void;
}) {
  const icon = NOTIF_ICONS[notif.type] ?? "🔔";
  const timeAgo = (() => {
    const diff = Date.now() - new Date(notif.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-start gap-3 px-4 py-3 rounded-xl border ${
        notif.is_read
          ? "bg-white/50 dark:bg-bark-card/50 border-sand/50 dark:border-[#2A1E18]/50"
          : "bg-white dark:bg-bark-card border-sand dark:border-[#2A1E18]"
      }`}
    >
      <Text className="text-xl mt-0.5">{icon}</Text>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite leading-snug">
          {notif.title}
        </Text>
        {notif.message ? (
          <Text className="text-xs text-brown-muted dark:text-[#9A8A82] mt-0.5">
            {notif.message}
          </Text>
        ) : null}
      </View>
      <Text className="text-xs text-brown-muted dark:text-[#9A8A82] mt-0.5">
        {timeAgo}
      </Text>
    </Pressable>
  );
}

export default function Notifications() {
  const { user } = useAuthStore();
  const {
    data: requests,
    isLoading: reqLoading,
    error: reqError,
    refetch: refetchReqs,
    isRefetching: isRefetchingReqs,
  } = usePendingRequests();
  const {
    data: notifs,
    isLoading: notifLoading,
    error: notifError,
    refetch: refetchNotifs,
    isRefetching: isRefetchingNotifs,
  } = useNotifications();
  const respond = useRespondToRequest();
  const markAllRead = useMarkAllRead();

  // Mark all as read when the tab gains focus
  useFocusEffect(
    useCallback(() => {
      markAllRead.mutate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleRespond = async (requestId: string, accept: boolean) => {
    await respond.mutateAsync({ requestId, accept });
  };

  const handleNotifPress = async (notif: AppNotification) => {
    if (notif.type === "friend_request") return;

    if (notif.related_iou_id) {
      const { data } = await supabase
        .from("ious")
        .select(
          `
          friendship_id,
          creator_id,
          receiver_id,
          creator:profiles!ious_creator_id_fkey(display_name, profile_pic_url),
          receiver:profiles!ious_receiver_id_fkey(display_name, profile_pic_url),
          friendship:friendships!ious_friendship_id_fkey(user_a_id, user_a_nickname, user_b_nickname)
        `
        )
        .eq("id", notif.related_iou_id)
        .single();

      if (!data) return;

      const myId = user!.id;
      const iAmCreator = data.creator_id === myId;
      const friendId = iAmCreator ? data.receiver_id : data.creator_id;
      const friendProfile = (iAmCreator ? data.receiver : data.creator) as {
        display_name: string;
        profile_pic_url: string | null;
      };
      const fs = data.friendship as {
        user_a_id: string;
        user_a_nickname: string | null;
        user_b_nickname: string | null;
      };
      const isUserA = myId === fs.user_a_id;
      const nickname = isUserA ? fs.user_a_nickname : fs.user_b_nickname;

      router.push({
        pathname: "/friend/[id]",
        params: {
          id: data.friendship_id,
          name: friendProfile.display_name,
          pic: friendProfile.profile_pic_url ?? "",
          friendId,
          nickname: nickname ?? "",
          isUserA: isUserA ? "true" : "false",
        },
      });
    } else {
      // friend_request_accepted or other — go home to see updated friends list
      router.push("/");
    }
  };

  const isLoading = reqLoading || notifLoading;
  const isRefetching = isRefetchingReqs || isRefetchingNotifs;
  const error = reqError || notifError;
  const refetch = () => {
    refetchReqs();
    refetchNotifs();
  };

  // Activity feed: all notifications except friend_requests (shown as action cards above)
  const activity = (notifs ?? []).filter((n) => n.type !== "friend_request");

  const hasAnything = (requests && requests.length > 0) || activity.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
        Notifications
      </Text>

      {error ? (
        <View className="items-center mt-20 gap-2">
          <Text className="text-4xl">⚠️</Text>
          <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
            Couldn't load notifications
          </Text>
          <Pressable onPress={refetch} className="mt-1">
            <Text className="text-sm text-brown-warm dark:text-umber">Try again</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator className="mt-10" />
      ) : !hasAnything ? (
        <View className="items-center mt-20 gap-2">
          <Text className="text-4xl">🔔</Text>
          <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
            All caught up
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#9A8A82]">
            No pending notifications.
          </Text>
        </View>
      ) : (
        <>
          {/* Pending friend requests — actionable */}
          {requests && requests.length > 0 && (
            <View className="gap-3">
              <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#9A8A82]">
                Friend requests
              </Text>
              {requests.map((r) => (
                <RequestCard key={r.id} request={r} onRespond={handleRespond} />
              ))}
            </View>
          )}

          {/* Activity feed */}
          {activity.length > 0 && (
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#9A8A82]">
                Activity
              </Text>
              {activity.map((n) => (
                <NotifCard key={n.id} notif={n} onPress={() => handleNotifPress(n)} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
