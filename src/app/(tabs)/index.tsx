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
import { useBalance, useScores } from "@/hooks/use-ious";

function FriendCard({ friend }: { friend: FriendProfile }) {
  const { data: balance } = useBalance(friend.friendship_id);
  const { data: scores } = useScores(friend.friendship_id);

  const balanceText = () => {
    if (!balance) return null;
    if (balance.i_owe === 0 && balance.they_owe === 0) return "All settled ✓";
    const parts = [];
    if (balance.i_owe > 0) parts.push(`You owe ${balance.i_owe}`);
    if (balance.they_owe > 0) parts.push(`They owe ${balance.they_owe}`);
    return parts.join(" · ");
  };

  const scoresText = () => {
    if (!scores) return null;
    if (scores.all_time === 0) return null;
    const parts = [];
    if (scores.this_month > 0) parts.push(`${scores.this_month} this month`);
    parts.push(`${scores.all_time} all-time`);
    return parts.join(" · ");
  };

  const label = friend.nickname || friend.display_name;

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
      className="flex-row items-center gap-3 bg-white dark:bg-bark-card rounded-xl px-4 py-3 border border-sand dark:border-[#2A1E18]"
    >
      {friend.profile_pic_url ? (
        <Image
          source={{ uri: friend.profile_pic_url }}
          className="w-11 h-11 rounded-full bg-sand"
        />
      ) : (
        <View className="w-11 h-11 rounded-full bg-sand dark:bg-[#2A1E18] items-center justify-center">
          <Text className="text-lg">👤</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
          {label}
        </Text>
        <Text className="text-sm text-brown-muted dark:text-[#9A8A82]">
          {balanceText() ?? "—"}
        </Text>
        {scoresText() && (
          <Text className="text-xs text-brown-muted dark:text-[#9A8A82] mt-0.5">
            ✓ {scoresText()}
          </Text>
        )}
      </View>
      <Text className="text-brown-muted dark:text-[#9A8A82]">›</Text>
    </Pressable>
  );
}

export default function Dashboard() {
  const { profile } = useAuthStore();
  const { data: friends, isLoading, error, refetch, isRefetching } = useFriends();

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
            Hey, {profile?.display_name ?? "there"} 👋
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#9A8A82] mt-0.5">
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
        <View className="items-center mt-16 gap-2">
          <Text className="text-4xl">⚠️</Text>
          <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
            Couldn't load friends
          </Text>
          <Pressable onPress={() => refetch()} className="mt-1">
            <Text className="text-sm text-brown-warm dark:text-umber">Try again</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator className="mt-10" />
      ) : friends && friends.length > 0 ? (
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#9A8A82]">
            Friends
          </Text>
          {friends.map((f) => (
            <FriendCard key={f.friendship_id} friend={f} />
          ))}
        </View>
      ) : (
        <View className="items-center mt-16 gap-3">
          <Text className="text-5xl">🤝</Text>
          <Text className="text-lg font-semibold text-brown-deep dark:text-offwhite">
            No friends yet
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#9A8A82] text-center leading-relaxed">
            Add a friend to start trading IOUs. Search by their email address.
          </Text>
          <Pressable
            onPress={() => router.push("/search")}
            className="mt-2 bg-brown-warm dark:bg-umber rounded-full px-6 py-3"
          >
            <Text className="text-sm font-semibold text-white">Add your first friend</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
