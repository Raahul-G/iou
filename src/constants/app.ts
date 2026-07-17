export const CATEGORIES = [
  { key: "coffee",  label: "Coffee",  icon: "coffee"     },
  { key: "food",    label: "Food",    icon: "fork-knife" },
  { key: "drinks",  label: "Drinks",  icon: "beer"       },
  { key: "favour",  label: "Favour",  icon: "handshake"  },
  { key: "money",   label: "Money",   icon: "wallet"     },
  { key: "other",   label: "Other",   icon: "sparkle"    },
] as const;


// Phosphor icon name + tint per notification type — used for in-app feed rows
export const NOTIF_ICON_GLYPHS: Record<string, { icon: string; tint: "accent" | "success" | "muted" | "danger" }> = {
  friend_onboarding:        { icon: "leaf",                    tint: "success" },
  friend_request:           { icon: "user-plus",               tint: "accent"  },
  friend_request_accepted:  { icon: "users",                   tint: "success" },
  iou_created:              { icon: "envelope-simple",         tint: "accent"  },
  iou_accepted:             { icon: "thumbs-up",               tint: "success" },
  iou_declined:             { icon: "x-circle",                tint: "muted"   },
  iou_completion_requested: { icon: "hand-palm",               tint: "accent"  },
  iou_completion_rejected:  { icon: "arrow-counter-clockwise", tint: "muted"   },
  iou_completed:            { icon: "check-circle",            tint: "success" },
  wish_created:             { icon: "sparkle",                 tint: "accent"  },
  wish_accepted:            { icon: "drop",                    tint: "accent"  },
  wish_not_right_now:       { icon: "clock",                   tint: "muted"   },
  wish_fulfilled:           { icon: "gift",                    tint: "accent"  },
  wish_confirmed:           { icon: "heart",                   tint: "success" },
  wish_withdrawn:           { icon: "minus-circle",            tint: "muted"   },
  tree_dull:                { icon: "cloud-rain",              tint: "muted"   },
};

export const WISH_MOODS = [
  { key: "playful",   label: "Playful",   icon: "confetti"       },
  { key: "cozy",      label: "Cozy",      icon: "heart"          },
  { key: "sweet",     label: "Sweet",     icon: "candy"          },
  { key: "heartfelt", label: "Heartfelt", icon: "envelope-heart" },
  { key: "fun",       label: "Fun",       icon: "game-controller" },
  { key: "calm",      label: "Calm",      icon: "leaf"           },
] as const;

export const PLAY_STORE_PACKAGE = "com.fridayvision.iou";
export const PLAY_STORE_MARKET_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;
export const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;

export const NOTIF_FETCH_LIMIT = 50;

export const RESEND_COOLDOWN_SECS = 60;
