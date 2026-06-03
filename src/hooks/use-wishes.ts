import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import type { Database } from "@/types/database.types";

type WishUpdate = Database["public"]["Tables"]["wishes"]["Update"];

export type WishStatus =
  | "active"
  | "accepted"
  | "on_hold"
  | "fulfilled"
  | "confirmed"
  | "withdrawn";

export type Wish = {
  id: string;
  partnership_id: string;
  creator_id: string; // Fertilizer (User B)
  target_id: string;  // Water (User A)
  text: string;
  mood: string;
  status: WishStatus;
  decline_text: string | null;
  decline_mood: string | null;
  thank_you_note: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  held_at: string | null;
  fulfilled_at: string | null;
  confirmed_at: string | null;
  withdrawn_at: string | null;
};

const ACTIVE_STATUSES: WishStatus[] = ["active", "accepted", "on_hold", "fulfilled"];
const TERMINAL_STATUSES: WishStatus[] = ["confirmed", "withdrawn"];

// ----------------------------------------------------------------
// The current unresolved (slot-occupying) wish for a partnership.
// Returns null when the slot is empty.
// ----------------------------------------------------------------
export function useActiveWish(partnershipId: string | undefined) {
  return useQuery({
    queryKey: ["wish", "active", partnershipId],
    enabled: !!partnershipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishes")
        .select("*")
        .eq("partnership_id", partnershipId!)
        .in("status", ACTIVE_STATUSES)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as Wish | null;
    },
  });
}

// ----------------------------------------------------------------
// Past wishes (confirmed or withdrawn), newest first.
// ----------------------------------------------------------------
export function useWishHistory(partnershipId: string | undefined) {
  return useQuery({
    queryKey: ["wish", "history", partnershipId],
    enabled: !!partnershipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishes")
        .select("*")
        .eq("partnership_id", partnershipId!)
        .in("status", TERMINAL_STATUSES)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Wish[];
    },
  });
}

// ----------------------------------------------------------------
// Create a wish (Fertilizer / User B only).
// DB enforces the single-slot rule via a partial unique index —
// this will error if a wish is already in the slot.
// ----------------------------------------------------------------
export function useCreateWish() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: {
      partnershipId: string;
      targetId: string;
      text: string;
      mood: string;
    }) => {
      const { error } = await supabase.from("wishes").insert({
        partnership_id: payload.partnershipId,
        creator_id: user!.id,
        target_id: payload.targetId,
        text: payload.text,
        mood: payload.mood,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["wish", "active", variables.partnershipId] });
    },
  });
}

// ----------------------------------------------------------------
// All valid wish status transitions, typed as a discriminated union.
//
//   accept         active    → accepted   (User A)
//   not_right_now  active    → on_hold    (User A, + optional sweet text + mood)
//   withdraw       active    → withdrawn  (User B)
//                  on_hold   → withdrawn  (User B)
//   mark_done      accepted  → fulfilled  (User A)
//   confirm        fulfilled → confirmed  (User B, + optional thank you note)
// ----------------------------------------------------------------
type WishAction =
  | { action: "accept" }
  | { action: "not_right_now"; decline_text?: string; decline_mood?: string }
  | { action: "withdraw" }
  | { action: "mark_done" }
  | { action: "confirm"; thank_you_note?: string };

export function useUpdateWishStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wishId,
      partnershipId,
      ...action
    }: WishAction & { wishId: string; partnershipId: string }) => {
      let updates: WishUpdate;

      switch (action.action) {
        case "accept":
          updates = { status: "accepted" };
          break;
        case "not_right_now":
          updates = {
            status: "on_hold",
            decline_text: action.decline_text ?? null,
            decline_mood: action.decline_mood ?? null,
          };
          break;
        case "withdraw":
          updates = { status: "withdrawn" };
          break;
        case "mark_done":
          updates = { status: "fulfilled" };
          break;
        case "confirm":
          updates = {
            status: "confirmed",
            thank_you_note: action.thank_you_note ?? null,
          };
          break;
        default:
          return; // exhaustive — should never reach here
      }

      const { error } = await supabase
        .from("wishes")
        .update(updates)
        .eq("id", wishId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["wish", "active", variables.partnershipId] });
      qc.invalidateQueries({ queryKey: ["wish", "history", variables.partnershipId] });
      // Confirmed wish changes tree score
      if (variables.action === "confirm") {
        qc.invalidateQueries({ queryKey: ["tree"] });
      }
    },
  });
}
