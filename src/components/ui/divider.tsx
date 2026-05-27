import { Text, View } from "react-native";

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-3 my-1">
      <View className="flex-1 h-px bg-sand dark:bg-[#3A2A20]" />
      <Text className="text-sm text-brown-muted dark:text-[#9A8A82]">
        {label}
      </Text>
      <View className="flex-1 h-px bg-sand dark:bg-[#3A2A20]" />
    </View>
  );
}
