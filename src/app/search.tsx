import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useSendFriendRequest } from "@/hooks/use-friends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FoundUser = {
  id: string;
  display_name: string;
  profile_pic_url: string | null;
};

export default function SearchScreen() {
  const { user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<FoundUser | null | "not-found">(null);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendRequest = useSendFriendRequest();

  const handleSearch = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setError(null);
    setResult(null);
    setRequestSent(false);
    setSearching(true);

    try {
      // Look up user by email via auth.users → profiles join
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)(
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
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4 border-b border-sand dark:border-[#3D2B3D]">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base text-brown-warm dark:text-umber">← Back</Text>
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

        {error && (
          <Text className="text-sm text-red-500 dark:text-red-400">{error}</Text>
        )}

        {result === "not-found" && (
          <View className="rounded-xl bg-sand/50 dark:bg-bark-card px-4 py-5 items-center gap-1">
            <Text className="text-base font-medium text-brown-deep dark:text-offwhite">
              No user found
            </Text>
            <Text className="text-sm text-brown-muted dark:text-[#8A7385] text-center">
              Make sure they've signed up for IOU with that email.
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
                <View className="w-12 h-12 rounded-full bg-sand dark:bg-[#3D2B3D] items-center justify-center">
                  <Text className="text-xl">👤</Text>
                </View>
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

            {requestSent ? (
              <View className="rounded-lg bg-green-50 dark:bg-green-950 px-4 py-3">
                <Text className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
                  Friend request sent ✓
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
