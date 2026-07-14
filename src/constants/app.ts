export const CATEGORIES = [
  { key: "coffee", label: "Coffee", emoji: "☕" },
  { key: "food", label: "Food", emoji: "🍕" },
  { key: "drinks", label: "Drinks", emoji: "🍺" },
  { key: "favour", label: "Favour", emoji: "🤝" },
  { key: "money", label: "Money", emoji: "💰" },
  { key: "other", label: "Other", emoji: "✨" },
];

export const CATEGORY_EMOJI: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.emoji])
);

export const NOTIF_ICONS: Record<string, string> = {
  friend_request: "🤝",
  friend_request_accepted: "✅",
  iou_created: "📬",
  iou_accepted: "👍",
  iou_declined: "❌",
  iou_completion_requested: "🔔",
  iou_completion_rejected: "↩️",
  iou_completed: "🎉",
  partner_invite: "🌱",
  partner_invite_accepted: "🌳",
  wish_created: "💌",
  wish_accepted: "💧",
  wish_not_right_now: "🌿",
  wish_fulfilled: "✨",
  wish_confirmed: "🎉",
  wish_withdrawn: "🍂",
  tree_dull: "🌿",
};

// Ionicons name + tint per notification type — used for in-app feed rows
export const NOTIF_ICON_GLYPHS: Record<string, { icon: string; tint: "accent" | "success" | "muted" | "danger" }> = {
  friend_request: { icon: "person-add", tint: "accent" },
  friend_request_accepted: { icon: "people", tint: "success" },
  iou_created: { icon: "mail", tint: "accent" },
  iou_accepted: { icon: "thumbs-up", tint: "success" },
  iou_declined: { icon: "close-circle", tint: "muted" },
  iou_completion_requested: { icon: "hand-left", tint: "accent" },
  iou_completion_rejected: { icon: "arrow-undo", tint: "muted" },
  iou_completed: { icon: "checkmark-circle", tint: "success" },
  partner_invite: { icon: "leaf", tint: "success" },
  partner_invite_accepted: { icon: "leaf", tint: "success" },
  wish_created: { icon: "sparkles", tint: "accent" },
  wish_accepted: { icon: "water", tint: "accent" },
  wish_not_right_now: { icon: "time", tint: "muted" },
  wish_fulfilled: { icon: "gift", tint: "accent" },
  wish_confirmed: { icon: "heart", tint: "success" },
  wish_withdrawn: { icon: "remove-circle", tint: "muted" },
  tree_dull: { icon: "rainy", tint: "muted" },
};

export const WISH_MOODS = [
  { key: "playful", label: "Playful", emoji: "🎉" },
  { key: "cozy", label: "Cozy", emoji: "🫶" },
  { key: "sweet", label: "Sweet", emoji: "🍯" },
  { key: "heartfelt", label: "Heartfelt", emoji: "💌" },
  { key: "fun", label: "Fun", emoji: "🎮" },
  { key: "calm", label: "Calm", emoji: "🌿" },
];

export const PLAY_STORE_PACKAGE = "com.fridayvision.iou";
export const PLAY_STORE_MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;
export const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

export const NOTIF_FETCH_LIMIT = 50;

export const RESEND_COOLDOWN_SECS = 60;
