export const Colors = {
  light: {
    bg: "#FFF8F3",
    bgCard: "#FFF8F3",
    border: "#E8D5C4",
    accent: "#FFE8D1",
    accentBrown: "#D4A574",
    text: "#5A4A42",
    textMuted: "#8A7A74",
    tabBar: "#FFF8F3",
    tabBarActive: "#D4A574",
    tabBarInactive: "#8A7A74",
  },
  dark: {
    bg: "#1A1410",
    bgCard: "#2A1F18",
    border: "#3A2A20",
    accent: "#B8885C",
    accentBrown: "#B8885C",
    text: "#E8DDD5",
    textMuted: "#9A8A82",
    tabBar: "#1A1410",
    tabBarActive: "#B8885C",
    tabBarInactive: "#6A5A52",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
