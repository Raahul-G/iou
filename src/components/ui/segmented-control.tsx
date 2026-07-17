import { Pressable, Text, View } from "react-native";

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          className={`flex-1 items-center py-2 rounded-xl ${
            value === opt
              ? "bg-brown-warm dark:bg-umber"
              : "bg-sand dark:bg-bark-card"
          }`}
          accessibilityRole="button"
          accessibilityState={{ selected: value === opt }}
        >
          <Text
            className={`text-xs font-semibold ${
              value === opt
                ? "text-white"
                : "text-brown-muted dark:text-[#8A7385]"
            }`}
          >
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
