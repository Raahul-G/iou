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
};

export const NOTIF_FETCH_LIMIT = 50;

export const RESEND_COOLDOWN_SECS = 60;
