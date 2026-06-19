import { router, type Href } from "expo-router";

let lastNavTime = 0;
const NAV_DEBOUNCE_MS = 500;

export function debouncedPush(href: Href) {
  const now = Date.now();
  if (now - lastNavTime < NAV_DEBOUNCE_MS) return;
  lastNavTime = now;
  router.push(href);
}
