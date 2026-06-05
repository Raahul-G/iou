import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCreateWish } from "@/hooks/use-wishes";
import { Button } from "@/components/ui/button";
import { WISH_MOODS } from "@/constants/app";

export default function NewWish() {
  const { friendshipId, targetId, friendName } = useLocalSearchParams<{
    friendshipId: string;
    targetId: string;
    friendName?: string;
  }>();

  const createWish = useCreateWish();
  const [text, setText] = useState("");
  const [mood, setMood] = useState(WISH_MOODS[0].key);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = text.trim();
    if (!trimmed || !friendshipId || !targetId) return;

    setError(null);
    try {
      await createWish.mutateAsync({ friendshipId, targetId, text: trimmed, mood });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create wish. Try again.");
    }
  };

  const charCount = text.length;
  const overLimit = charCount > 280;

  return (
    <View className="flex-1 bg-cream dark:bg-bark">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-14 pb-4 border-b border-sand dark:border-[#3D2B3D]">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-base text-brown-warm dark:text-umber">Cancel</Text>
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-brown-deep dark:text-offwhite">
          {friendName ? `Wish for ${friendName} ✨` : "Make a wish ✨"}
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

        {/* Wish text */}
        <View className="gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
            Your wish
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What do you wish for?"
            placeholderTextColor="#9E8A9E"
            maxLength={300}
            multiline
            autoFocus
            className="bg-white dark:bg-bark-card border border-sand dark:border-[#3D2B3D] rounded-xl px-4 py-3 text-base text-brown-deep dark:text-offwhite min-h-[120px]"
          />
          <Text className={`text-xs text-right ${overLimit ? "text-red-500" : "text-brown-muted dark:text-[#8A7385]"}`}>
            {charCount}/280
          </Text>
        </View>

        {/* Mood picker */}
        <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-wider text-brown-muted dark:text-[#8A7385]">
            Mood
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {WISH_MOODS.map((m) => {
              const isSelected = mood === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMood(m.key)}
                  className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 border ${
                    isSelected
                      ? "bg-brown-warm dark:bg-umber border-brown-warm dark:border-umber"
                      : "bg-white dark:bg-bark-card border-sand dark:border-[#3D2B3D]"
                  }`}
                >
                  <Text>{m.emoji}</Text>
                  <Text className={`text-sm font-medium ${isSelected ? "text-white" : "text-brown-deep dark:text-offwhite"}`}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label="Send wish 💌"
          onPress={handleCreate}
          loading={createWish.isPending}
          disabled={!text.trim() || overLimit}
        />
      </ScrollView>
    </View>
  );
}
