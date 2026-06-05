import { useEffect } from "react";
import { router } from "expo-router";

// Wish is now embedded in the friend detail screen.
// This route is no longer used but kept to prevent 404s.
export default function WishRedirect() {
  useEffect(() => {
    router.replace("/");
  }, []);
  return null;
}
