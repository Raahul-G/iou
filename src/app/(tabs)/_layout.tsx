import { Platform, Text } from "react-native";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { SymbolView } from "expo-symbols";
import { Colors } from "@/constants/colors";
import { useUnreadCount } from "@/hooks/use-notifications";

type ColorScheme = keyof typeof Colors;

type TabIconProps = {
  symbol: string;
  emoji: string;
  color: string;
  size: number;
};

function TabIcon({ symbol, emoji, color, size }: TabIconProps) {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={symbol as never}
        size={size}
        tintColor={color}
      />
    );
  }
  return <Text style={{ fontSize: size - 2, color, lineHeight: size }}>{emoji}</Text>;
}

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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              symbol={focused ? "house.fill" : "house"}
              emoji="🏠"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarBadge: unreadCount && unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              symbol={focused ? "bell.fill" : "bell"}
              emoji="🔔"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              symbol={focused ? "gearshape.fill" : "gearshape"}
              emoji="⚙️"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
