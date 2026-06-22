import { useEffect, useState } from "react";
import { Text, View, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // NetInfo is unreliable on web — skip
    if (Platform.OS === "web") return;

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });

    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-amber-500 px-4 py-2 items-center">
      <Text className="text-xs font-semibold text-white">
        {"You're offline \u2014 changes will sync when you reconnect."}
      </Text>
    </View>
  );
}
