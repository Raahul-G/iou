import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type FriendTreeScore = {
  myScore: number;
  friendScore: number;
  state: "alive" | "dull" | "dead";
  myEmoji: "💧" | "🌿";
  friendEmoji: "💧" | "🌿";
};

// ----------------------------------------------------------------
// Tree score for a friendship. Uses the same 14-day rolling window
// and scoring rules as the partner tree:
//   IOU completed  → creator  +1 pt
//   Wish confirmed → target   +2 pts
//
// Emoji assignment is stable and deterministic:
//   user_a (lower UUID in canonical order) → 💧
//   user_b                                 → 🌿
// isUserA comes from the friendships query in useFriends().
// ----------------------------------------------------------------
export function useFriendTree({
  friendshipId,
  myId,
  friendId,
  isUserA,
}: {
  friendshipId: string;
  myId: string;
  friendId: string;
  isUserA: boolean;
}) {
  const query = useQuery({
    queryKey: ["friend-tree", friendshipId, myId],
    enabled: !!friendshipId && !!myId && !!friendId,
    queryFn: async () => {
      const now = new Date();
      const window14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const window28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: ious, error: iouError }, { data: wishes, error: wishError }] =
        await Promise.all([
          supabase
            .from("ious")
            .select("creator_id, completed_at")
            .eq("friendship_id", friendshipId)
            .eq("status", "completed")
            .gte("completed_at", window28),
          supabase
            .from("wishes")
            .select("target_id, confirmed_at")
            .eq("friendship_id", friendshipId)
            .eq("status", "confirmed")
            .gte("confirmed_at", window28),
        ]);

      if (iouError) throw iouError;
      if (wishError) throw wishError;

      const allIOUs   = ious   ?? [];
      const allWishes = wishes ?? [];

      const calcScore = (userId: string, fromTs: string, toTs?: string) => {
        const iouPts = allIOUs.filter(
          (i) =>
            i.creator_id === userId &&
            (i.completed_at ?? "") >= fromTs &&
            (toTs === undefined || (i.completed_at ?? "") < toTs)
        ).length;
        const wishPts = allWishes.filter(
          (w) =>
            w.target_id === userId &&
            (w.confirmed_at ?? "") >= fromTs &&
            (toTs === undefined || (w.confirmed_at ?? "") < toTs)
        ).length * 2;
        return iouPts + wishPts;
      };

      const myScore     = calcScore(myId,     window14);
      const friendScore = calcScore(friendId,  window14);
      const prevMy      = calcScore(myId,     window28, window14);
      const prevFriend  = calcScore(friendId,  window28, window14);

      const treeState = (me: number, partner: number): "alive" | "dull" | null => {
        if (me === 0 && partner === 0) return null;
        const high = Math.max(me, partner);
        const low  = Math.min(me, partner);
        return low >= Math.floor(high / 2) ? "alive" : "dull";
      };

      const currentState = treeState(myScore, friendScore);
      const prevState    = treeState(prevMy, prevFriend);

      const state: FriendTreeScore["state"] =
        currentState !== null ? currentState :
        prevState    !== null ? "dull"       :
        "dead";

      const myEmoji:     "💧" | "🌿" = isUserA ? "💧" : "🌿";
      const friendEmoji: "💧" | "🌿" = isUserA ? "🌿" : "💧";

      return { myScore, friendScore, state, myEmoji, friendEmoji } as FriendTreeScore;
    },
  });

  // Fire tree_dull notification when tree is not alive (at most once per 7 days — deduped in DB)
  useEffect(() => {
    if (query.data?.state === "dull" || query.data?.state === "dead") {
      supabase.rpc("maybe_notify_tree_dull", { p_friendship_id: friendshipId });
    }
  }, [query.data?.state, friendshipId]);

  return query;
}

export function friendTreeVisual(
  score: FriendTreeScore | undefined,
  isNew: boolean
): { emoji: string; label: string } {
  if (!score) return { emoji: isNew ? "🌱" : "🌳", label: "Growing together" };
  switch (score.state) {
    case "alive":
      return { emoji: isNew ? "🌱" : "🌳", label: isNew ? "Your tree is growing" : "Growing together" };
    case "dull":
      return { emoji: "🌿", label: "Needs a little care" };
    case "dead":
      return { emoji: isNew ? "🌱" : "🪵", label: isNew ? "Just getting started" : "Time for a fresh start" };
  }
}
