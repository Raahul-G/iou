import { StyleSheet, Text, View } from "react-native";

export function Divider({ label = "or" }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-3 my-1">
      <View className="flex-1 bg-sand dark:bg-[#4A354A]" style={{ height: StyleSheet.hairlineWidth }} />
      <Text className="text-sm text-brown-muted dark:text-[#8A7385]">
        {label}
      </Text>
      <View className="flex-1 bg-sand dark:bg-[#4A354A]" style={{ height: StyleSheet.hairlineWidth }} />
    </View>
  );
}
