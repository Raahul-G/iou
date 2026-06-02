import { Appearance, Platform } from "react-native";

/**
 * Applies a theme preference across all platforms.
 *
 * - Web: toggles the `dark` CSS class on `document.documentElement` so
 *   NativeWind's `darkMode: "class"` CSS picks it up, then also calls
 *   Appearance.setColorScheme so RN useColorScheme() hooks stay in sync.
 * - iOS: uses Appearance.setColorScheme with null for system (supported on iOS).
 * - Android: uses Appearance.setColorScheme for light/dark; "system" is a no-op
 *   because Android does not support resetting to system programmatically.
 */
export function applyTheme(theme: "light" | "dark" | "system") {
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return;

    let isDark: boolean;
    if (theme === "dark") {
      isDark = true;
    } else if (theme === "light") {
      isDark = false;
    } else {
      isDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Keep the RN Appearance context in sync so useColorScheme() hooks re-render.
    try {
      Appearance.setColorScheme(isDark ? "dark" : "light");
    } catch {
      // Appearance.setColorScheme may throw in some environments — safe to ignore.
    }
    return;
  }

  if (theme === "light" || theme === "dark") {
    Appearance.setColorScheme(theme);
  } else {
    // "system" — null resets to OS preference on iOS only.
    if (Platform.OS === "ios") {
      (Appearance.setColorScheme as (s: string | null) => void)(null);
    }
    // Android has no programmatic way to reset; leave the current scheme as-is.
  }
}
