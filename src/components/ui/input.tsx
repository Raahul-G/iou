import { Text, TextInput, TextInputProps, View } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, style, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-brown-deep dark:text-offwhite">
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        placeholderTextColor="#8A7A74"
        className={[
          "rounded-lg border px-4 py-3.5 text-base",
          "text-brown-deep dark:text-offwhite",
          "bg-white dark:bg-bark-card",
          error
            ? "border-red-400 dark:border-red-600"
            : "border-sand dark:border-[#3A2A20]",
        ].join(" ")}
      />
      {error ? (
        <Text className="text-xs text-red-500 dark:text-red-400">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-brown-muted dark:text-[#9A8A82]">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
