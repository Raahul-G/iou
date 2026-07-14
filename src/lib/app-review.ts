import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { captureError } from "@/lib/analytics";

// ─── Rating prompt policy ─────────────────────────────────────────────────────
// Universal in-app review conventions (and Google Play guidance):
//  • Only ask at a moment of delight — call sites are celebration dismissals
//    for completed IOUs / granted wishes, so "≥1 successful IOU" is inherent.
//  • Give users real experience first: ≥3 days since first app use.
//  • Respect long spacing: 90-day cooldown, max 3 asks per rolling year.
//  • Never gate with a "do you like the app?" pre-question (Play policy).
// Play itself also quota-limits the sheet and may silently skip it — we still
// record the attempt so our own spacing stays honest.

const FIRST_USE_KEY = "iou_first_use_at";
const ASK_LOG_KEY = "iou_review_ask_log";

const DAY_MS = 86_400_000;
const MIN_DAYS_SINCE_FIRST_USE = 3;
const COOLDOWN_DAYS = 90;
const MAX_ASKS_PER_YEAR = 3;

/** Call once at app start — stamps the install/first-use date if not already set. */
export async function recordFirstUse(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(FIRST_USE_KEY);
    if (!existing) await AsyncStorage.setItem(FIRST_USE_KEY, String(Date.now()));
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { flow: "app_review_first_use" });
  }
}

async function readAskLog(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(ASK_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/**
 * Show the native in-app review sheet if — and only if — every gate passes.
 * Safe to call optimistically after any qualifying success moment.
 */
export async function maybeRequestReview(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const now = Date.now();

    const firstUseRaw = await AsyncStorage.getItem(FIRST_USE_KEY);
    const firstUse = firstUseRaw ? Number(firstUseRaw) : now;
    if (now - firstUse < MIN_DAYS_SINCE_FIRST_USE * DAY_MS) return;

    const log = (await readAskLog()).filter((t) => now - t < 365 * DAY_MS);
    if (log.length >= MAX_ASKS_PER_YEAR) return;
    const lastAsk = log.length > 0 ? Math.max(...log) : 0;
    if (now - lastAsk < COOLDOWN_DAYS * DAY_MS) return;

    if (!(await StoreReview.isAvailableAsync())) return;

    // Record before showing: Play gives no callback on whether the sheet
    // actually appeared or how the user responded, so the attempt is the event.
    await AsyncStorage.setItem(ASK_LOG_KEY, JSON.stringify([...log, now]));
    await StoreReview.requestReview();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { flow: "app_review_request" });
  }
}
