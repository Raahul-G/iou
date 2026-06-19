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
  friendship_id: string;
  creator_id: string;
  target_id: string;
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
// The current unresolved (slot-occupying) wish for a friendship.
// ----------------------------------------------------------------
export function useActiveWish(friendshipId: string | undefined) {
  return useQuery({
    queryKey: ["wish", "active", friendshipId],
    enabled: !!friendshipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishes")
        .select("*")
        .eq("friendship_id", friendshipId!)
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
export function useWishHistory(friendshipId: string | undefined) {
  return useQuery({
    queryKey: ["wish", "history", friendshipId],
    enabled: !!friendshipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishes")
        .select("*")
        .eq("friendship_id", friendshipId!)
        .in("status", TERMINAL_STATUSES)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Wish[];
    },
  });
}

// ----------------------------------------------------------------
// Create a wish for a friend to grant.
// DB enforces the single-slot rule via a partial unique index.
// ----------------------------------------------------------------
export function useCreateWish() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: {
      friendshipId: string;
      targetId: string;
      text: string;
      mood: string;
    }) => {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("wishes").insert({
        friendship_id: payload.friendshipId,
        creator_id: userId,
        target_id: payload.targetId,
        text: payload.text,
        mood: payload.mood,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["wish", "active", variables.friendshipId] });
    },
  });
}

// ----------------------------------------------------------------
// Wish status transitions.
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
      friendshipId,
      ...action
    }: WishAction & { wishId: string; friendshipId: string }) => {
      let updates: WishUpdate;

      switch (action.action) {
        case "accept":        updates = { status: "accepted" }; break;
        case "not_right_now": updates = { status: "on_hold", decline_text: action.decline_text ?? null, decline_mood: action.decline_mood ?? null }; break;
        case "withdraw":      updates = { status: "withdrawn" }; break;
        case "mark_done":     updates = { status: "fulfilled" }; break;
        case "confirm":       updates = { status: "confirmed", thank_you_note: action.thank_you_note ?? null }; break;
        default:              return;
      }

      const { error } = await supabase.from("wishes").update(updates).eq("id", wishId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["wish", "active", variables.friendshipId] });
      qc.invalidateQueries({ queryKey: ["wish", "history", variables.friendshipId] });
      if (variables.action === "confirm") {
        qc.invalidateQueries({ queryKey: ["friend-tree"] });
      }
    },
  });
}
