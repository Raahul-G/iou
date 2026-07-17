import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateIOU } from "@/hooks/use-ious";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon, type IconName } from "@/components/ui/icon";
import { celebrate } from "@/store/celebration.store";
import { CATEGORIES } from "@/constants/app";

export default function NewIOU() {
  const { friendshipId, friendId, friendName } = useLocalSearchParams<{
    friendshipId: string;
    friendId: string;
    friendName: string;
  }>();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("favour");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createIOU = useCreateIOU();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the IOU a title.");
      return;
    }

    setError(null);
    try {
      await createIOU.mutateAsync({
        friendship_id: friendshipId,
        receiver_id: friendId,
        title: trimmed,
        category,
        note: note.trim() || undefined,
      });
      celebrate("iou_sent", { name: friendName?.split(" ")[0] });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create IOU.");
    }
  };

  return (
    <View className="flex-1 bg-cream dark:bg-bark">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-4 border-b border-sand dark:border-[#3D2B3D]" style={{ paddingTop: insets.top + 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} className="flex-row items-center gap-1" accessibilityRole="button" accessibilityLabel="Cancel">
          <Icon name="x" size={18} tone="accent" />
          <Text className="text-base text-brown-warm dark:text-umber">Cancel</Text>
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-brown-deep dark:text-offwhite text-center pr-16">
          New IOU
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 py-6 gap-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* Who owes who */}
        <View className="rounded-xl bg-sand/50 dark:bg-bark-card px-4 py-3">
          <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
            You owe{" "}
            <Text className="font-semibold text-brown-deep dark:text-offwhite">
              {friendName}
            </Text>
          </Text>
        </View>

        {error && (
          <Text className="text-sm text-red-500 dark:text-red-400">{error}</Text>
        )}

        <Input
          label="What do you owe?"
          placeholder="e.g. a coffee, lunch, a big favour…"
          value={title}
          onChangeText={setTitle}
          autoFocus
          maxLength={80}
        />

        {/* Category picker */}
        <View className="gap-2">
          <Text className="text-sm font-medium text-brown-deep dark:text-offwhite">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full border ${
                  category === cat.key
                    ? "bg-brown-warm dark:bg-umber border-brown-warm dark:border-umber"
                    : "bg-white dark:bg-bark-card border-sand dark:border-[#3D2B3D]"
                }`}
              >
                <Icon name={cat.icon as IconName} size={18} tone={category === cat.key ? "inverse" : "accent"} />
                <Text
                  className={`text-sm font-medium ${
                    category === cat.key
                      ? "text-white"
                      : "text-brown-deep dark:text-offwhite"
                  }`}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Optional note */}
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-brown-deep dark:text-offwhite">
            Note{" "}
            <Text className="text-brown-muted dark:text-[#8A7385] font-normal">
              (optional)
            </Text>
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add context…"
            placeholderTextColor={colorScheme === "dark" ? "#9E8A9E" : "#8C7676"}
            multiline
            numberOfLines={3}
            maxLength={200}
            className="bg-white dark:bg-bark-card border border-sand dark:border-[#3D2B3D] rounded-xl px-4 py-3 text-base text-brown-deep dark:text-offwhite min-h-[80px]"
            style={{ textAlignVertical: "top" }}
          />
        </View>

        <Button
          label="Create IOU"
          onPress={handleCreate}
          loading={createIOU.isPending}
          disabled={title.trim().length === 0}
        />
      </ScrollView>
    </View>
  );
}
