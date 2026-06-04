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
import {
  usePartnership,
  useTreeScore,
  type Partnership,
  type TreeScore,
} from "@/hooks/use-partnerships";

// ─── Friend card (unchanged) ──────────────────────────────────────────────────

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
      className="flex-row items-center gap-3 bg-white dark:bg-bark-card rounded-xl px-4 py-3 border border-sand dark:border-[#3D2B3D]"
    >
      {friend.profile_pic_url ? (
        <Image
          source={{ uri: friend.profile_pic_url }}
          className="w-11 h-11 rounded-full bg-sand"
        />
      ) : (
        <View className="w-11 h-11 rounded-full bg-sand dark:bg-[#3D2B3D] items-center justify-center">
          <Text className="text-lg">👤</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
          {label}
        </Text>
        <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
          {balanceText() ?? "—"}
        </Text>
        {scoresText() && (
          <Text className="text-xs text-brown-muted dark:text-[#8A7385] mt-0.5">
            ✓ {scoresText()}
          </Text>
        )}
      </View>
      <Text className="text-brown-muted dark:text-[#8A7385]">›</Text>
    </Pressable>
  );
}

// ─── Relationship Tree card (active partnership) ──────────────────────────────

function treeVisual(score: TreeScore | undefined, isNew: boolean) {
  if (!score) return { emoji: isNew ? "🌱" : "🌳", label: "Growing together" };
  switch (score.state) {
    case "alive":
      return {
        emoji: isNew ? "🌱" : "🌳",
        label: isNew ? "Your tree is growing" : "Growing together",
      };
    case "dull":
      return { emoji: "🌿", label: "Needs a little care" };
    case "dead":
      return { emoji: "🪵", label: "Time for a fresh start" };
  }
}

function TreeCard({ partnership }: { partnership: Partnership }) {
  const { data: score, isLoading } = useTreeScore(partnership);

  const activatedMs = partnership.activated_at
    ? Date.now() - new Date(partnership.activated_at).getTime()
    : Infinity;
  const isNew = activatedMs < 14 * 24 * 60 * 60 * 1000;

  const { emoji, label } = treeVisual(isLoading ? undefined : score, isNew);

  const myRole = partnership.my_role;
  const myEmoji = myRole === "water" ? "💧" : "🌿";
  const partnerEmoji = myRole === "water" ? "🌿" : "💧";
  const partnerFirst = partnership.partner_name.split(" ")[0];

  const myScore      = score?.myScore;
  const partnerScore = score?.partnerScore;

  return (
    <Pressable
      onPress={() => router.push("/wish")}
      className="bg-white dark:bg-bark-card rounded-xl border border-sand dark:border-[#3D2B3D] overflow-hidden active:opacity-80"
    >
      {/* Anniversary blossom banner */}
      {score?.anniversaryToday && (
        <View className="bg-brown-warm dark:bg-umber px-4 py-2.5">
          <Text className="text-xs text-white text-center font-medium">
            🌸 Happy anniversary! Your tree is blooming today.
          </Text>
        </View>
      )}

      <View className="px-4 py-6 items-center gap-3">
        <Text style={{ fontSize: 72, lineHeight: 80 }}>{emoji}</Text>

        <View className="items-center gap-1">
          <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
            {label}
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
            You {myEmoji} · {partnerFirst} {partnerEmoji}
          </Text>
        </View>

        {/* Score row — only shown when score is loaded */}
        {!isLoading && score && (
          <View className="flex-row gap-5 mt-1">
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite">
                {myScore ?? 0} {myEmoji}
              </Text>
              <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
                your pts
              </Text>
            </View>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite">
                {partnerScore ?? 0} {partnerEmoji}
              </Text>
              <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
                {partnerFirst}'s pts
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Pending invite banner ────────────────────────────────────────────────────

function PendingBanner({ partnership }: { partnership: Partnership }) {
  const isInvitee = partnership.inviter_id !== partnership.water_id &&
    partnership.inviter_id !== partnership.fertilizer_id
    ? false
    : partnership.inviter_id === partnership.water_id
      ? partnership.my_role !== "water"
      : partnership.my_role !== "fertilizer";

  // Simpler derivation: invitee = my_role's id !== inviter_id
  const amInvitee = (() => {
    if (partnership.my_role === "water") return partnership.inviter_id !== partnership.water_id;
    return partnership.inviter_id !== partnership.fertilizer_id;
  })();

  return (
    <Pressable
      onPress={() => router.push("/partner/pending")}
      className="flex-row items-center gap-3 bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] active:opacity-80"
    >
      {partnership.partner_pic ? (
        <Image
          source={{ uri: partnership.partner_pic }}
          className="w-12 h-12 rounded-full bg-sand"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-sand dark:bg-[#3D2B3D] items-center justify-center">
          <Text className="text-xl">👤</Text>
        </View>
      )}
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite">
          {amInvitee
            ? `${partnership.partner_name} wants to plant a tree 🌱`
            : `Waiting for ${partnership.partner_name} to respond 🌱`}
        </Text>
        <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
          {amInvitee ? "Tap to accept or decline" : "Tap to cancel your invite"}
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
    isRefetching: friendsRefreshing,
  } = useFriends();
  const {
    data: partnership,
    isLoading: partnershipLoading,
    refetch: refetchPartnership,
    isRefetching: partnershipRefreshing,
  } = usePartnership();

  const isRefreshing = friendsRefreshing || partnershipRefreshing;

  const handleRefresh = () => {
    refetchFriends();
    refetchPartnership();
  };

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-bark"
      contentContainerClassName="px-5 pt-14 pb-8 gap-6"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
            Hey, {profile?.display_name ?? "there"} 👋
          </Text>
          <Text className="text-sm text-brown-muted dark:text-[#8A7385] mt-0.5">
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

      {/* Tree section — always renders; loading shimmer while fetching */}
      {partnership?.status === "active" ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
            Your tree
          </Text>
          <TreeCard partnership={partnership} />
        </View>
      ) : partnership?.status === "pending" ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
            Partner invite
          </Text>
          <PendingBanner partnership={partnership} />
        </View>
      ) : partnershipLoading ? (
        // Show placeholder while fetching — prevents blank gap
        <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] flex-row items-center gap-4 opacity-50">
          <Text style={{ fontSize: 36, lineHeight: 42 }}>🌱</Text>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite">
              Plant a tree with someone
            </Text>
            <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
              Grow a bond that reflects your effort together
            </Text>
          </View>
        </View>
      ) : (
        // No partnership
        <Pressable
          onPress={() => router.push("/partner/invite")}
          className="flex-row items-center gap-4 bg-white dark:bg-bark-card rounded-xl px-4 py-4 border border-sand dark:border-[#3D2B3D] active:opacity-80"
        >
          <Text style={{ fontSize: 36, lineHeight: 42 }}>🌱</Text>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite">
              Plant a tree with someone
            </Text>
            <Text className="text-xs text-brown-muted dark:text-[#8A7385]">
              Grow a bond that reflects your effort together
            </Text>
          </View>
          <Text className="text-brown-muted dark:text-[#8A7385]">›</Text>
        </Pressable>
      )}

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
            Add a friend to start trading IOUs. Search by their email address.
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
