import * as Sentry from "@sentry/react-native";

// ─── User context ───────────────────────────────────────────────────────────

export function identifyUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

export function clearUser() {
  Sentry.setUser(null);
}

// ─── Auth events ─────────────────────────────────────────────────────────────

export function trackSignIn(method: "email" | "google") {
  Sentry.addBreadcrumb({ category: "auth", message: `sign_in:${method}`, level: "info" });
}

export function trackSignOut() {
  Sentry.addBreadcrumb({ category: "auth", message: "sign_out", level: "info" });
}

export function trackOAuthRedirect(url: string) {
  Sentry.addBreadcrumb({
    category: "auth.oauth",
    message: "deep_link_received",
    data: { url: url.split("?")[0].split("#")[0] }, // strip query params + fragment
    level: "info",
  });
}

export function trackOAuthError(error: unknown, method: "google" | "apple") {
  Sentry.captureException(error, {
    tags: { flow: "oauth", method },
  });
}

// ─── IOU events ───────────────────────────────────────────────────────────────

export function trackIOUCreated(friendshipId: string) {
  Sentry.addBreadcrumb({ category: "iou", message: "iou_created", data: { friendshipId }, level: "info" });
}

export function trackIOURedeemed(iouId: string) {
  Sentry.addBreadcrumb({ category: "iou", message: "iou_redeemed", data: { iouId }, level: "info" });
}

// ─── Wish events ──────────────────────────────────────────────────────────────

export function trackWishCreated(friendshipId: string) {
  Sentry.addBreadcrumb({ category: "wish", message: "wish_created", data: { friendshipId }, level: "info" });
}

export function trackWishGranted(wishId: string) {
  Sentry.addBreadcrumb({ category: "wish", message: "wish_granted", data: { wishId }, level: "info" });
}

// ─── Error capture ────────────────────────────────────────────────────────────

export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}
