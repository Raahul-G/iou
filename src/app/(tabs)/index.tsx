import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { useFriends, type FriendProfile } from "@/hooks/use-friends";
import { useScores } from "@/hooks/use-ious";

// ─── Inline tree emoji from scores (no extra query) ──────────────────────────

function treeEmoji(thisMonth: number, allTime: number): string {
  if (allTime === 0) return "🌱";
  if (thisMonth > 0) return "🌳";
  return "🌿";
}

// ─── Friend card ──────────────────────────────────────────────────────────────

function FriendCard({ friend }: { friend: FriendProfile }) {
  const { data: scores } = useScores(friend.friendship_id);
  const label = friend.nickname || friend.display_name;

  const statsText = () => {
    if (!scores || scores.all_time === 0) return "No IOUs yet";
    const parts = [];
    if (scores.this_month > 0) parts.push(`${scores.this_month} this month`);
    parts.push(`${scores.all_time} all-time`);
    return parts.join(" · ");
  };

  const tree = scores ? treeEmoji(scores.this_month, scores.all_time) : "🌱";

  return (
    <Pressable
      onPress={() =>
        router.push({
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
        <View className="flex-row items-center gap-1.5">
          <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
            {label}
          </Text>
          <Text style={{ fontSize: 14 }}>{tree}</Text>
        </View>
        <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
          {statsText()}
        </Text>
      </View>

      <Text className="text-brown-muted dark:text-[#8A7385]">›</Text>
    </Pressable>
  );
}

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

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetchFriends} />
      }
      showsVerticalScrollIndicator={false}
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
          onPress={() => router.push("/search")}
          className="bg-brown-warm dark:bg-umber rounded-full px-4 py-2"
        >
          <Text className="text-sm font-semibold text-white">+ Friend</Text>
        </Pressable>
      </View>

      {/* Friends list */}
      {error ? (
        <View className="items-center mt-8 gap-2">
          <Text className="text-4xl">⚠️</Text>
          <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
            Couldn't load friends
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
            onPress={() => router.push("/search")}
            className="mt-2 bg-brown-warm dark:bg-umber rounded-full px-6 py-3"
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
