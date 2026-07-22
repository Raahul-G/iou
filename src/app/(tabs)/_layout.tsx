import { useColorScheme, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { House, Bell, UserCircle } from "phosphor-react-native";
import { Colors } from "@/constants/colors";
import { useUnreadCount } from "@/hooks/use-notifications";

type ColorScheme = keyof typeof Colors;

export default function TabsLayout() {
  const rawScheme = useColorScheme();
  const scheme: ColorScheme = rawScheme === "dark" ? "dark" : "light";
  const colors = Colors[scheme];
  const { data: unreadCount } = useUnreadCount();

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
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
            <House size={size} color={color as string} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Activity",
          tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.tabBarActive, color: "#fff" },
          tabBarIcon: ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
            <Bell size={size} color={color as string} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
            <UserCircle size={size} color={color as string} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
    </Tabs>
  );
}
