import { ActivityIndicator, Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    "flex-row items-center justify-center rounded-lg py-4 px-6 active:opacity-75";

  const styles: Record<Variant, string> = {
    primary: "bg-brown-warm dark:bg-umber",
    secondary:
      "bg-sand dark:bg-bark-card border border-sand dark:border-[#3A2A20]",
    ghost: "bg-transparent",
  };

  const labelStyles: Record<Variant, string> = {
    primary: "text-white text-base font-medium",
    secondary: "text-brown-deep dark:text-offwhite text-base font-medium",
    ghost: "text-brown-warm dark:text-umber text-base font-medium",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${base} ${styles[variant]} ${isDisabled ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#ffffff" : "#D4A574"}
        />
      ) : (
        <Text className={labelStyles[variant]}>{label}</Text>
      )}
    </Pressable>
  );
}
