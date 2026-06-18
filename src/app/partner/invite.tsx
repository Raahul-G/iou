import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFriends, type FriendProfile } from "@/hooks/use-friends";
import {
  useSendPartnerInvite,
  type PartnerRole,
} from "@/hooks/use-partnerships";
import { Button } from "@/components/ui/button";

type RoleOption = {
  role: PartnerRole;
  emoji: string;
  label: string;
  description: string;
};

const ROLES: RoleOption[] = [
  {
    role: "water",
    emoji: "💧",
    label: "Water",
    description: "Send IOUs and make wishes — every drop of effort keeps your tree alive and growing.",
  },
  {
    role: "fertilizer",
    emoji: "🌿",
    label: "Fertilizer",
    description: "Send IOUs and make wishes — your effort is the nourishment that helps your tree grow strong.",
  },
];

export default function PartnerInvite() {
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [myRole, setMyRole] = useState<PartnerRole>("water");
  const [error, setError] = useState<string | null>(null);

  const { data: friends, isLoading } = useFriends();
  const sendInvite = useSendPartnerInvite();
  const insets = useSafeAreaInsets();

  const handleSend = async () => {
    if (!selectedFriend) return;
    setError(null);
    try {
      await sendInvite.mutateAsync({
        partnerId: selectedFriend.friend_id,
        myRole,
      });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send invite.");
    }
  };

  const partnerLabel = selectedFriend
    ? (selectedFriend.nickname || selectedFriend.display_name)
    : null;

  return (
    <View className="flex-1 bg-cream dark:bg-bark">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-4 border-b border-sand dark:border-[#3D2B3D]" style={{ paddingTop: insets.top + 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base text-brown-warm dark:text-umber">Cancel</Text>
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-brown-deep dark:text-offwhite">
          Plant a tree 🌱
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-6 gap-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <Text className="text-sm text-red-500 dark:text-red-400">{error}</Text>
        )}

        {/* Friend picker */}
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
            Choose a friend
          </Text>

          {isLoading ? (
            <ActivityIndicator className="mt-2" />
          ) : !friends || friends.length === 0 ? (
            <View className="items-center py-6 gap-2">
              <Text className="text-3xl">🤝</Text>
              <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center">
                Add a friend first before planting a tree.
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {friends.map((friend) => {
                const isSelected = selectedFriend?.friend_id === friend.friend_id;
                const label = friend.nickname || friend.display_name;
                return (
                  <Pressable
                    key={friend.friend_id}
                    onPress={() => setSelectedFriend(friend)}
                    className={`flex-row items-center gap-3 rounded-xl px-4 py-3 border ${
                      isSelected
                        ? "bg-brown-warm dark:bg-umber border-brown-warm dark:border-umber"
                        : "bg-white dark:bg-bark-card border-sand dark:border-[#3D2B3D]"
                    }`}
                  >
                    {friend.profile_pic_url ? (
                      <Image
                        source={{ uri: friend.profile_pic_url }}
                        className="w-10 h-10 rounded-full bg-sand"
                      />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-sand dark:bg-[#3D2B3D] items-center justify-center">
                        <Text className="text-base">👤</Text>
                      </View>
                    )}
                    <Text
                      className={`flex-1 text-base font-medium ${
                        isSelected
                          ? "text-white"
                          : "text-brown-deep dark:text-offwhite"
                      }`}
                    >
                      {label}
                    </Text>
                    {isSelected && (
                      <Text className="text-white text-base">✓</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Role picker */}
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
            Your role
          </Text>
          <View className="gap-2">
            {ROLES.map((opt) => {
              const isSelected = myRole === opt.role;
              return (
                <Pressable
                  key={opt.role}
                  onPress={() => setMyRole(opt.role)}
                  className={`rounded-xl px-4 py-4 border ${
                    isSelected
                      ? "bg-brown-warm dark:bg-umber border-brown-warm dark:border-umber"
                      : "bg-white dark:bg-bark-card border-sand dark:border-[#3D2B3D]"
                  }`}
                >
                  <Text
                    className={`text-base font-semibold ${
                      isSelected
                        ? "text-white"
                        : "text-brown-deep dark:text-offwhite"
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </Text>
                  <Text
                    className={`text-sm mt-1 ${
                      isSelected
                        ? "text-white/80"
                        : "text-brown-muted dark:text-[#8A7385]"
                    }`}
                  >
                    {opt.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-brown-muted dark:text-[#8A7385] text-center">
            Roles are just labels — both of you give and receive IOUs equally.
          </Text>
        </View>

        <Button
          label={
            partnerLabel
              ? `Plant a tree with ${partnerLabel}`
              : "Choose a friend first"
          }
          onPress={handleSend}
          loading={sendInvite.isPending}
          disabled={!selectedFriend}
        />
      </ScrollView>
    </View>
  );
}
