import { Text, View } from "react-native";
import { useAuthStore } from "@/store/auth.store";

export default function Dashboard() {
  const { profile } = useAuthStore();

  return (
    <View className="flex-1 items-center justify-center bg-cream dark:bg-bark">
      <Text className="text-2xl font-semibold text-brown-deep dark:text-offwhite">
        👋 Hey, {profile?.display_name ?? "there"}
      </Text>
      <Text className="mt-2 text-base text-brown-muted dark:text-[#9A8A82]">
        Dashboard coming in Milestone 002
      </Text>
    </View>
  );
}
