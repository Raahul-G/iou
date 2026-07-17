import { View, useColorScheme } from "react-native";
import * as Ph from "phosphor-react-native";

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

const ICON_MAP = {
  // Tab bar
  "house":                   Ph.House,
  "bell":                    Ph.Bell,
  "gear":                    Ph.Gear,
  // Navigation
  "caret-left":              Ph.CaretLeft,
  "caret-right":             Ph.CaretRight,
  // People
  "user-plus":               Ph.UserPlus,
  "users":                   Ph.Users,
  // Mail
  "envelope-simple":         Ph.EnvelopeSimple,
  "envelope-open":           Ph.EnvelopeOpen,
  // Actions
  "thumbs-up":               Ph.ThumbsUp,
  "x-circle":                Ph.XCircle,
  "hand-palm":               Ph.HandPalm,
  "arrow-counter-clockwise": Ph.ArrowCounterClockwise,
  "check-circle":            Ph.CheckCircle,
  // Nature
  "leaf":                    Ph.Leaf,
  "sparkle":                 Ph.Sparkle,
  "drop":                    Ph.Drop,
  // Time
  "clock":                   Ph.Clock,
  // Gifts
  "gift":                    Ph.Gift,
  "heart":                   Ph.Heart,
  // Misc
  "minus-circle":            Ph.MinusCircle,
  "cloud-rain":              Ph.CloudRain,
  "camera":                  Ph.Camera,
  "user":                    Ph.User,
  "check":                   Ph.Check,
  "x":                       Ph.X,
  "magnifying-glass":        Ph.MagnifyingGlass,
  "paper-plane-right":       Ph.PaperPlaneRight,
  "cloud-slash":             Ph.CloudSlash,
  "arrow-clockwise":         Ph.ArrowClockwise,
  "pencil-simple":           Ph.PencilSimple,
  "plus-circle":             Ph.PlusCircle,
  "trophy":                  Ph.Trophy,
  "star":                    Ph.Star,
  "shield-check":            Ph.ShieldCheck,
  "file-text":               Ph.FileText,
  "sign-out":                Ph.SignOut,
  "eye":                     Ph.Eye,
  "eye-slash":               Ph.EyeSlash,
  "check-square":            Ph.CheckSquare,
  "user-circle":             Ph.UserCircle,
  // Category icons
  "coffee":                  Ph.Coffee,
  "fork-knife":              Ph.ForkKnife,
  "beer":                    Ph.BeerStein,
  "handshake":               Ph.Handshake,
  "wallet":                  Ph.Wallet,
  // Wish mood icons
  "confetti":                Ph.Confetti,
  "candy":                   Ph.Cake,
  "envelope-heart":          Ph.EnvelopeSimple,
  "game-controller":         Ph.GameController,
} as const;

export type IconName = keyof typeof ICON_MAP;

export type PhosphorWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

interface IconProps {
  name: IconName;
  size?: number;
  tone?: IconTone;
  color?: string;
  weight?: PhosphorWeight;
}

export function Icon({ name, size = 20, tone = "default", color, weight = "duotone" }: IconProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const IconComp = ICON_MAP[name];
  return <IconComp size={size} color={color ?? TINTS[scheme][tone]} weight={weight} />;
}

interface IconBadgeProps extends IconProps {
  badgeSize?: number;
  badgeClassName?: string;
}

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
