import { useState } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useFriends, useSendFriendRequest } from "@/hooks/use-friends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon, IconBadge } from "@/components/ui/icon";

type FoundUser = {
  id: string;
  display_name: string;
  profile_pic_url: string | null;
};

export default function SearchScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<FoundUser | null | "not-found">(null);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendRequest = useSendFriendRequest();
  const { data: friends } = useFriends();

  const isAlreadyFriend =
    result && result !== "not-found"
      ? (friends ?? []).some((f) => f.friend_id === result.id)
      : false;

  const handleSearch = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setError(null);
    setResult(null);
    setRequestSent(false);
    setHasSearched(true);
    setSearching(true);

    try {
      // Look up user by email via auth.users → profiles join
      const { data, error: rpcError } = await supabase.rpc(
        "find_user_by_email",
        { search_email: trimmed }
      );

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        setResult("not-found");
        return;
      }

      const found = data[0] as FoundUser;
      if (found.id === user?.id) {
        setError("That's you!");
        return;
      }

      setResult(found);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!result || result === "not-found") return;
    try {
      await sendRequest.mutateAsync(result.id);
      setRequestSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send request.");
    }
  };

  return (
    <View className="flex-1 bg-cream dark:bg-bark">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-4 border-b border-sand dark:border-[#3D2B3D]" style={{ paddingTop: insets.top + 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} className="flex-row items-center gap-1" accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="caret-left" size={18} tone="accent" weight="regular" />
          <Text className="text-base text-brown-warm dark:text-umber">Back</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-brown-deep dark:text-offwhite">
          Add a friend
        </Text>
      </View>

      <View className="flex-1 px-5 pt-6 gap-4">
        <Input
          label="Friend's email"
          placeholder="hello@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />

        <Button
          label="Search"
          onPress={handleSearch}
          loading={searching}
          disabled={email.trim().length < 4}
        />

        {!hasSearched && (
          <View className="items-center gap-3 py-10">
            <IconBadge name="user-plus" badgeSize={52} tone="accent"
              badgeClassName="bg-brown-warm/15 dark:bg-umber/20" />
            <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
              Find your people
            </Text>
            <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center px-6">
              Search by email to connect, then start trading IOUs and wishes.
            </Text>
          </View>
        )}

        {error && (
          <Text className="text-sm text-red-500 dark:text-red-400">{error}</Text>
        )}

        {result === "not-found" && (
          <View className="rounded-xl bg-sand/50 dark:bg-bark-card px-4 py-5 items-center gap-2">
            <IconBadge name="magnifying-glass" tone="muted" badgeSize={44} />
            <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
              No user found
            </Text>
            <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center">
              {"Make sure they've signed up for IOU with that email."}
            </Text>
          </View>
        )}

        {result && result !== "not-found" && (
          <View className="rounded-xl bg-sand/50 dark:bg-bark-card px-4 py-4 gap-4">
            <View className="flex-row items-center gap-3">
              {result.profile_pic_url ? (
                <Image
                  source={{ uri: result.profile_pic_url }}
                  className="w-12 h-12 rounded-full bg-sand"
                />
              ) : (
                <IconBadge name="user" tone="muted" badgeSize={48} />
              )}
              <View>
                <Text className="text-base font-semibold text-brown-deep dark:text-offwhite">
                  {result.display_name}
                </Text>
                <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
                  {email.trim().toLowerCase()}
                </Text>
              </View>
            </View>

            {isAlreadyFriend ? (
              <View className="rounded-lg bg-green-50 dark:bg-green-950 px-4 py-3 flex-row items-center justify-center gap-2">
                <Icon name="check-circle" size={16} tone="success" />
                <Text className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
                  Already friends
                </Text>
              </View>
            ) : requestSent ? (
              <View className="rounded-lg bg-green-50 dark:bg-green-950 px-4 py-3 flex-row items-center justify-center gap-2">
                <Icon name="paper-plane-right" size={15} tone="success" />
                <Text className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
                  Friend request sent
                </Text>
              </View>
            ) : (
              <Button
                label="Send friend request"
                onPress={handleSendRequest}
                loading={sendRequest.isPending}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}
