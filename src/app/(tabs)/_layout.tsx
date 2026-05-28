import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/colors";

type ColorScheme = keyof typeof Colors;

export default function TabsLayout() {
  const rawScheme = useColorScheme();
  const scheme: ColorScheme = rawScheme === "dark" ? "dark" : "light";
  const colors = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
