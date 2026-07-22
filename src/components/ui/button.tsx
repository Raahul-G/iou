import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";

type Variant = "primary" | "secondary" | "ghost";

const GRADIENT_ENABLED = ["#C07E83", "#A5646C"] as const;
const GRADIENT_PRESSED = ["#A5646C", "#8F4F57"] as const;

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  isValid?: boolean;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  isValid,
  className = "",
}: ButtonProps) {
  // isValid is a semantic alias for !disabled
  const isDisabled = disabled || loading || (isValid !== undefined ? !isValid : false);

  const base = "flex-row items-center justify-center rounded-xl py-4 px-6";

  const secondaryStyle =
    "bg-sand dark:bg-bark-card border border-sand dark:border-[#4A354A]";
  const ghostStyle = "bg-transparent";

  const labelStyles: Record<Variant, string> = {
    primary: `text-white text-base font-medium${isDisabled ? " opacity-40" : ""}`,
    secondary: "text-brown-deep dark:text-offwhite text-base font-medium",
    ghost: "text-brown-warm dark:text-umber text-base font-medium",
  };

  if (variant === "primary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={isDisabled ? { opacity: 0.4 } : undefined}
        className={className}
      >
        {({ pressed }) => {
          const innerStyle = {
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "center" as const,
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 24,
            shadowColor: "#9e6060",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isDisabled ? 0 : 0.35,
            shadowRadius: 6,
            elevation: isDisabled ? 0 : 6,
          };
          const inner = (
            <>
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white text-base font-medium">{label}</Text>
              )}
            </>
          );
          return isExpoGo ? (
            <View style={[innerStyle, { backgroundColor: pressed && !isDisabled ? "#A5646C" : "#C07E83" }]}>
              {inner}
            </View>
          ) : (
            <LinearGradient
              colors={pressed && !isDisabled ? GRADIENT_PRESSED : GRADIENT_ENABLED}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={innerStyle}
            >
              {inner}
            </LinearGradient>
          );
        }}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${base} ${variant === "secondary" ? secondaryStyle : ghostStyle} ${isDisabled ? "opacity-50" : ""} active:opacity-75 ${className}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#D4A5A5" />
      ) : (
        <Text className={labelStyles[variant]}>{label}</Text>
      )}
    </Pressable>
  );
}
