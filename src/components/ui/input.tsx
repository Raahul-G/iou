import { useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View, useColorScheme } from "react-native";
import { Icon } from "@/components/ui/icon";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
}

export function Input({ label, error, success, hint, style, ...props }: InputProps) {
  const colorScheme = useColorScheme();
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = !!props.secureTextEntry;

  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-brown-deep dark:text-offwhite">
          {label}
        </Text>
      )}
      <View className="relative">
        <TextInput
          {...props}
          secureTextEntry={isPasswordField && !showPassword}
          accessibilityLabel={label}
          placeholderTextColor={colorScheme === "dark" ? "#9E8A9E" : "#8C7676"}
          className={[
            "rounded-xl border px-4 py-3.5 text-base",
            "text-brown-deep dark:text-offwhite",
            "bg-white dark:bg-bark-card",
            isPasswordField ? "pr-12" : "",
            error
              ? "border-red-400 dark:border-red-600"
              : success
              ? "border-green-500 dark:border-green-600"
              : "border-sand dark:border-[#4A354A]",
          ].join(" ")}
        />
        {isPasswordField && (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}
          >
            <Icon
              name={showPassword ? "eye-slash" : "eye"}
              size={20}
              tone="muted"
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <View className="flex-row items-center gap-1">
          <Icon name="x-circle" size={13} tone="danger" weight="fill" />
          <Text className="text-xs text-red-500 dark:text-red-400">{error}</Text>
        </View>
      ) : success ? (
        <View className="flex-row items-center gap-1">
          <Icon name="check-circle" size={13} tone="success" weight="fill" />
          <Text className="text-xs text-green-600 dark:text-green-400">{success}</Text>
        </View>
      ) : hint ? (
        <Text className="text-xs text-brown-muted dark:text-[#8A7385]">{hint}</Text>
      ) : null}
    </View>
  );
}
