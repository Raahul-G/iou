export const Colors = {
  light: {
    bg: "#FFFDF9",
    bgCard: "#FFFFFF",
    border: "#F0DCDC",
    accent: "#F0DCDC",
    accentBrown: "#D4A5A5",
    text: "#3D2E2E",
    textMuted: "#8C7676",
    tabBar: "#FFFDF9",
    tabBarActive: "#D4A5A5",
    tabBarInactive: "#8C7676",
  },
  dark: {
    bg: "#1E151E",
    bgCard: "#2B1F2B",
    border: "#3D2B3D",
    accent: "#BA8B8B",
    accentBrown: "#BA8B8B",
    text: "#F6F0F5",
    textMuted: "#8A7385",
    tabBar: "#1E151E",
    tabBarActive: "#BA8B8B",
    tabBarInactive: "#7A6A7A",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
