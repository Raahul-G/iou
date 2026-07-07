import { View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;

// Theme-aware default tints, matching the Morning Coffee / Midnight Snuggle palette
const TINTS = {
  light: {
    default: "#3D2E2E", // brown-deep
    muted: "#8C7676",   // brown-muted
    accent: "#9e6060",  // brown-warm
    inverse: "#FFFFFF",
    success: "#059669",
    danger: "#EF4444",
  },
  dark: {
    default: "#F6F0F5", // offwhite
    muted: "#8A7385",
    accent: "#BA8B8B",  // umber
    inverse: "#FFFFFF",
    success: "#34D399",
    danger: "#F87171",
  },
} as const;

export type IconTone = keyof typeof TINTS.light;

interface IconProps {
  name: IconName;
  size?: number;
  tone?: IconTone;
  color?: string; // explicit color overrides tone
}

export function Icon({ name, size = 20, tone = "default", color }: IconProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return <Ionicons name={name} size={size} color={color ?? TINTS[scheme][tone]} />;
}

interface IconBadgeProps extends IconProps {
  /** Diameter of the circular background */
  badgeSize?: number;
  badgeClassName?: string;
}

/** Icon inside a soft rounded circle — used for notification rows, empty states, list accents */
export function IconBadge({
  badgeSize = 40,
  badgeClassName = "bg-sand/60 dark:bg-[#3D2B3D]",
  size,
  ...icon
}: IconBadgeProps) {
  return (
    <View
      className={`items-center justify-center rounded-full ${badgeClassName}`}
      style={{ width: badgeSize, height: badgeSize }}
    >
      <Icon size={size ?? Math.round(badgeSize * 0.5)} {...icon} />
    </View>
  );
}
