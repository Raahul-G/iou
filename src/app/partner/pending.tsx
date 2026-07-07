import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  usePartnership,
  useAcceptPartnerInvite,
  useDeclineOrCancelPartnership,
} from "@/hooks/use-partnerships";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/ui/icon";

const ROLE_LABELS: Record<string, string> = {
  water: "Water 💧",
  fertilizer: "Fertilizer 🌿",
};

const OTHER_ROLE: Record<string, "water" | "fertilizer"> = {
  water: "fertilizer",
  fertilizer: "water",
};

export default function PartnerPending() {
  const { user } = useAuthStore();
  const { data: partnership, isLoading } = usePartnership();
  const acceptInvite = useAcceptPartnerInvite();
  const declineOrCancel = useDeclineOrCancelPartnership();
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream dark:bg-bark items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Guard: if no pending partnership, go home
  if (!partnership || partnership.status !== "pending") {
    router.replace("/");
    return null;
  }
  const isInvitee = partnership.inviter_id !== user?.id;
  const myRole = partnership.my_role;
  const partnerRole = OTHER_ROLE[myRole];

  const handleAccept = async () => {
    setError(null);
    try {
      await acceptInvite.mutateAsync(partnership.id);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept. Try again.");
    }
  };

  const handleDeclineOrCancel = () => {
    const isCancel = !isInvitee;
    const title = isCancel ? "Cancel invite?" : "Decline invite?";
    const message = isCancel
      ? `Your invite to ${partnership.partner_name} will be withdrawn.`
      : `${partnership.partner_name} won't see your decision.`;

    const doAction = () => {
      declineOrCancel.mutate(partnership.id, {
        onSuccess: () => router.replace("/"),
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Failed. Try again."),
      });
    };

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n${message}`)) doAction();
      return;
    }

    Alert.alert(title, message, [
      { text: "No", style: "cancel" },
      {
        text: isCancel ? "Cancel invite" : "Decline",
        style: "destructive",
        onPress: doAction,
      },
    ]);
  };

  return (
    <View className="flex-1 bg-cream dark:bg-bark">
      {/* Header */}
      <View className="flex-row items-center px-5 pb-4 border-b border-sand dark:border-[#3D2B3D]" style={{ paddingTop: insets.top + 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base text-brown-warm dark:text-umber">Back</Text>
        </Pressable>
      </View>

      <View className="flex-1 px-5 py-8 gap-8 justify-between">
        <View className="gap-8">
          {/* Partner avatar + headline */}
          <View className="items-center gap-4">
            {partnership.partner_pic ? (
              <Image
                source={{ uri: partnership.partner_pic }}
                className="w-24 h-24 rounded-full bg-sand"
              />
            ) : (
              <IconBadge name="person" tone="muted" badgeSize={96} size={44} />
            )}
            <View className="items-center gap-1">
              <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
                {partnership.partner_name}
              </Text>
              <Text className="text-base text-brown-muted dark:text-[#8A7385] text-center leading-relaxed px-4">
                {isInvitee
                  ? "wants to plant a Relationship Tree with you 🌱"
                  : "is waiting to accept your invite 🌱"}
              </Text>
            </View>
          </View>

          {/* Role assignment card */}
          <View className="bg-white dark:bg-bark-card rounded-xl px-4 py-5 border border-sand dark:border-[#3D2B3D] gap-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
              Your roles
            </Text>
            <View className="flex-row gap-3">
              {/* My role */}
              <View className="flex-1 items-center bg-brown-warm/10 dark:bg-umber/20 rounded-xl py-4 gap-1.5">
                <Text className="text-3xl">
                  {myRole === "water" ? "💧" : "🌿"}
                </Text>
                <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite">
                  You
                </Text>
                <Text className="text-xs text-brown-muted dark:text-[#8A7385] text-center px-2">
                  {ROLE_LABELS[myRole]}
                </Text>
              </View>

              <View className="items-center justify-center">
                <Text className="text-xl text-brown-muted dark:text-[#8A7385]">
                  +
                </Text>
              </View>

              {/* Partner role */}
              <View className="flex-1 items-center bg-sand/30 dark:bg-[#160F16] rounded-xl py-4 gap-1.5">
                <Text className="text-3xl">
                  {partnerRole === "water" ? "💧" : "🌿"}
                </Text>
                <Text className="text-sm font-semibold text-brown-deep dark:text-offwhite text-center px-1">
                  {partnership.partner_name}
                </Text>
                <Text className="text-xs text-brown-muted dark:text-[#8A7385] text-center px-2">
                  {ROLE_LABELS[partnerRole]}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-brown-muted dark:text-[#8A7385] text-center">
              Roles are just labels — both of you can send IOUs and make wishes equally.
            </Text>
          </View>

          {error && (
            <Text className="text-sm text-red-500 text-center">{error}</Text>
          )}
        </View>

        {/* Actions */}
        {isInvitee ? (
          <View className="gap-3">
            <Button
              label="Accept"
              onPress={handleAccept}
              loading={acceptInvite.isPending}
              disabled={declineOrCancel.isPending}
            />
            <Button
              label="Decline"
              onPress={handleDeclineOrCancel}
              variant="ghost"
              loading={declineOrCancel.isPending}
              disabled={acceptInvite.isPending}
            />
          </View>
        ) : (
          <Button
            label="Cancel invite"
            onPress={handleDeclineOrCancel}
            variant="ghost"
            loading={declineOrCancel.isPending}
          />
        )}
      </View>
    </View>
  );
}
