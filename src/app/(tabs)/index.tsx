import React, { memo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { useFriends, type FriendProfile } from "@/hooks/use-friends";
import { useScores } from "@/hooks/use-ious";
import { useFriendTree, friendTreeVisual } from "@/hooks/use-friend-tree";
import { debouncedPush } from "@/lib/navigation";

// ─── Friend card ──────────────────────────────────────────────────────────────

const FriendCard = memo(function FriendCard({ friend }: { friend: FriendProfile }) {
  const { user } = useAuthStore();
  const { data: scores } = useScores(friend.friendship_id);
  const { data: treeData } = useFriendTree({
    friendshipId: friend.friendship_id,
    myId: user?.id ?? "",
    friendId: friend.friend_id,
    isUserA: friend.is_user_a,
  });
  const label = friend.nickname || friend.display_name;

  const statsText = () => {
    if (!scores || scores.all_time === 0) return "No IOUs yet";
    const parts = [];
    if (scores.this_month > 0) parts.push(`${scores.this_month} this month`);
    parts.push(`${scores.all_time} all-time`);
    return parts.join(" · ");
  };

  const isNew = !treeData || (treeData.myScore === 0 && treeData.friendScore === 0);
  const { emoji: tree } = friendTreeVisual(treeData, isNew);

  return (
    <Pressable
      onPress={() =>
        debouncedPush({
          pathname: "/friend/[id]",
          params: {
            id: friend.friendship_id,
            name: friend.display_name,
            pic: friend.profile_pic_url ?? "",
            friendId: friend.friend_id,
            nickname: friend.nickname ?? "",
            isUserA: friend.is_user_a ? "true" : "false",
          },
        })
      }
      className="flex-row items-center gap-3 bg-white dark:bg-bark-card rounded-xl px-4 py-3.5 border border-sand dark:border-[#3D2B3D] active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${statsText()}`}
    >
      {/* Avatar */}
      {friend.profile_pic_url ? (
        <Image
          source={{ uri: friend.profile_pic_url }}
          className="w-11 h-11 rounded-full bg-sand"
        />
      ) : (
        <View className="w-11 h-11 rounded-full bg-brown-warm/20 dark:bg-umber/20 items-center justify-center">
          <Text className="text-base font-bold text-brown-warm dark:text-umber">
            {label.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Info */}
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-brown-deep dark:text-offwhite" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
          {statsText()}
        </Text>
      </View>

      {/* Tree state — right-aligned */}
      <Text style={{ fontSize: 18 }}>{tree}</Text>

      <Text className="text-brown-muted dark:text-[#8A7385]">›</Text>
    </Pressable>
  );
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { profile } = useAuthStore();
  const {
    data: friends,
    isLoading: friendsLoading,
    error,
    refetch: refetchFriends,
    isRefetching,
  } = useFriends();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="px-5 pb-8 gap-6"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetchFriends} />
      }
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-bold text-brown-deep dark:text-offwhite">
            Hey, {profile?.display_name ?? "there"} 👋
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#7A6B8A] mt-0.5 tracking-wide">
            Your IOUs at a glance
          </Text>
        </View>
        <Pressable
          onPress={() => debouncedPush("/search")}
          className="bg-brown-warm dark:bg-umber rounded-full px-4 py-2"
          accessibilityRole="button"
          accessibilityLabel="Add friend"
        >
          <Text className="text-sm font-semibold text-white">+ Friend</Text>
        </Pressable>
      </View>

      {/* Friends list */}
      {error ? (
        <View className="items-center mt-8 gap-2">
          <Text className="text-4xl">⚠️</Text>
          <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
            {"Couldn't load friends"}
          </Text>
          <Pressable onPress={() => refetchFriends()} className="mt-1">
            <Text className="text-sm text-brown-warm dark:text-umber">Try again</Text>
          </Pressable>
        </View>
      ) : friendsLoading ? (
        <ActivityIndicator className="mt-6" />
      ) : friends && friends.length > 0 ? (
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
            Friends
          </Text>
          {friends.map((f) => (
            <FriendCard key={f.friendship_id} friend={f} />
          ))}
        </View>
      ) : (
        <View className="items-center mt-8 gap-3">
          <Text className="text-5xl">🤝</Text>
          <Text className="text-lg font-semibold text-brown-deep dark:text-offwhite">
            No friends yet
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center leading-relaxed">
            Add a friend to start trading IOUs and growing trees together.
          </Text>
          <Pressable
            onPress={() => debouncedPush("/search")}
            className="mt-2 bg-brown-warm dark:bg-umber rounded-full px-6 py-3"
            accessibilityRole="button"
            accessibilityLabel="Add your first friend"
          >
            <Text className="text-sm font-semibold text-white">
              Add your first friend
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
