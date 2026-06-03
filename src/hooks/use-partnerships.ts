import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

export type PartnerRole = "water" | "fertilizer";

export type Partnership = {
  id: string;
  water_id: string;
  fertilizer_id: string;
  inviter_id: string;
  status: "pending" | "active";
  created_at: string;
  activated_at: string | null;
  // Derived fields
  my_role: PartnerRole;
  partner_id: string;
  partner_name: string;
  partner_pic: string | null;
};

export type TreeScore = {
  waterScore: number;
  fertilizerScore: number;
  threshold: number; // Math.floor(waterScore / 2) — what fertilizer must reach
  state: "alive" | "dull" | "dead";
  anniversaryToday: boolean;
};

// ----------------------------------------------------------------
// Fetch the current user's partnership (active preferred, else most
// recent pending). Returns null if the user has no partnership.
// ----------------------------------------------------------------
export function usePartnership() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["partnership", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partnerships")
        .select(
          `
          id, water_id, fertilizer_id, inviter_id, status, created_at, activated_at,
          water:profiles!partnerships_water_id_fkey(display_name, profile_pic_url),
          fertilizer:profiles!partnerships_fertilizer_id_fkey(display_name, profile_pic_url)
        `
        )
        .or(`water_id.eq.${user!.id},fertilizer_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Prefer active over any pending invite
      const row = data.find((p) => p.status === "active") ?? data[0];
      const isWater = row.water_id === user!.id;
      const partnerProfile = isWater
        ? (row.fertilizer as { display_name: string; profile_pic_url: string | null })
        : (row.water as { display_name: string; profile_pic_url: string | null });

      return {
        id: row.id,
        water_id: row.water_id,
        fertilizer_id: row.fertilizer_id,
        inviter_id: row.inviter_id,
        status: row.status,
        created_at: row.created_at,
        activated_at: row.activated_at,
        my_role: isWater ? "water" : "fertilizer",
        partner_id: isWater ? row.fertilizer_id : row.water_id,
        partner_name: partnerProfile.display_name,
        partner_pic: partnerProfile.profile_pic_url,
      } as Partnership;
    },
  });
}

// ----------------------------------------------------------------
// Send a partner invite. The caller picks their own role — the
// partner gets the other role. Both IDs are validated by the DB
// constraint (inviter_is_participant).
// ----------------------------------------------------------------
export function useSendPartnerInvite() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      partnerId,
      myRole,
    }: {
      partnerId: string;
      myRole: PartnerRole;
    }) => {
      const water_id = myRole === "water" ? user!.id : partnerId;
      const fertilizer_id = myRole === "fertilizer" ? user!.id : partnerId;
      const { error } = await supabase.from("partnerships").insert({
        water_id,
        fertilizer_id,
        inviter_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership"] });
    },
  });
}

// ----------------------------------------------------------------
// Invitee accepts the invite → status: active
// ----------------------------------------------------------------
export function useAcceptPartnerInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from("partnerships")
        .update({ status: "active" })
        .eq("id", partnershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership"] });
    },
  });
}

// ----------------------------------------------------------------
// Either party deletes the invite row:
//   inviter  → cancels their pending invite
//   invitee  → declines the invite
// Works on both pending and active rows (dissolving a partnership).
// ----------------------------------------------------------------
export function useDeclineOrCancelPartnership() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from("partnerships")
        .delete()
        .eq("id", partnershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partnership"] });
      qc.invalidateQueries({ queryKey: ["tree"] });
    },
  });
}

// ----------------------------------------------------------------
// Relationship Tree score — 14-day rolling window.
//
// Water score (X):
//   1× per IOU given by water_id (completed in window)
//   2× per wish fulfilled by water_id (confirmed in window)
//
// Fertilizer score:
//   1× per IOU given by fertilizer_id (completed in window)
//
// Tree state:
//   alive — fertilizer_score >= floor(water_score / 2)
//   dull  — current window fails threshold, previous window was ok
//   dead  — both current AND previous 14-day windows fail threshold
//
// Anniversary blossom: tree blooms on the calendar day matching
// activated_at (day + month, any year).
// ----------------------------------------------------------------
export function useTreeScore(partnership: Partnership | null | undefined) {
  return useQuery({
    queryKey: ["tree", partnership?.id],
    enabled: !!partnership && partnership.status === "active",
    queryFn: async () => {
      const now = new Date();
      const window14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const window28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

      const { water_id, fertilizer_id, id: partnershipId, activated_at } = partnership!;

      // All completed IOUs between the two partners in the last 28 days
      const { data: ious, error: iouError } = await supabase
        .from("ious")
        .select("creator_id, completed_at")
        .or(
          `and(creator_id.eq.${water_id},receiver_id.eq.${fertilizer_id}),and(creator_id.eq.${fertilizer_id},receiver_id.eq.${water_id})`
        )
        .eq("status", "completed")
        .gte("completed_at", window28);

      if (iouError) throw iouError;

      // All confirmed wishes in this partnership in the last 28 days
      const { data: wishes, error: wishError } = await supabase
        .from("wishes")
        .select("confirmed_at")
        .eq("partnership_id", partnershipId)
        .eq("status", "confirmed")
        .gte("confirmed_at", window28);

      if (wishError) throw wishError;

      const allIOUs = ious ?? [];
      const allWishes = wishes ?? [];

      // ── Current 14-day window ──────────────────────────────────
      const waterIous14 = allIOUs.filter(
        (i) => i.creator_id === water_id && i.completed_at! >= window14
      ).length;
      const fertilizerIous14 = allIOUs.filter(
        (i) => i.creator_id === fertilizer_id && i.completed_at! >= window14
      ).length;
      const wishesFulfilled14 = allWishes.filter(
        (w) => w.confirmed_at! >= window14
      ).length;

      const waterScore = waterIous14 + wishesFulfilled14 * 2;
      const fertilizerScore = fertilizerIous14;
      const threshold = Math.floor(waterScore / 2);

      // ── Previous 14-28 day window ─────────────────────────────
      const waterIous28 = allIOUs.filter(
        (i) => i.creator_id === water_id && i.completed_at! < window14
      ).length;
      const fertilizerIous28 = allIOUs.filter(
        (i) => i.creator_id === fertilizer_id && i.completed_at! < window14
      ).length;
      const wishesFulfilled28 = allWishes.filter(
        (w) => w.confirmed_at! < window14
      ).length;

      const prevWaterScore = waterIous28 + wishesFulfilled28 * 2;
      const prevFertilizerScore = fertilizerIous28;
      const prevThreshold = Math.floor(prevWaterScore / 2);

      // ── Tree state ────────────────────────────────────────────
      const currentHealthy = fertilizerScore >= threshold;
      const prevHealthy = prevFertilizerScore >= prevThreshold;

      const state: TreeScore["state"] = currentHealthy
        ? "alive"
        : prevHealthy
        ? "dull"
        : "dead";

      // ── Anniversary blossom ───────────────────────────────────
      const anniversaryToday = (() => {
        if (!activated_at) return false;
        const today = new Date();
        const activated = new Date(activated_at);
        return (
          today.getMonth() === activated.getMonth() &&
          today.getDate() === activated.getDate()
        );
      })();

      return { waterScore, fertilizerScore, threshold, state, anniversaryToday } as TreeScore;
    },
  });
}
