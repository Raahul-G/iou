import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

export type IOU = {
  id: string;
  friendship_id: string;
  creator_id: string;
  receiver_id: string;
  title: string;
  category: string | null;
  note: string | null;
  status: "pending" | "accepted" | "declined" | "completion_requested" | "completed";
  created_at: string;
  accepted_at: string | null;
  completion_requested_at: string | null;
  completed_at: string | null;
};

export type Balance = {
  i_owe: number;   // active IOUs where I am creator
  they_owe: number; // active IOUs where I am receiver
};

export function useIOUs(friendshipId: string) {
  return useQuery({
    queryKey: ["ious", friendshipId],
    enabled: !!friendshipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ious")
        .select("*")
        .eq("friendship_id", friendshipId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as IOU[];
    },
  });
}

export function useBalance(friendshipId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["balance", friendshipId, user?.id],
    enabled: !!friendshipId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ious")
        .select("creator_id, receiver_id, status")
        .eq("friendship_id", friendshipId)
        .in("status", ["accepted", "completion_requested"]);

      if (error) throw error;

      const active = data ?? [];
      return {
        i_owe: active.filter((iou) => iou.creator_id === user!.id).length,
        they_owe: active.filter((iou) => iou.receiver_id === user!.id).length,
      } as Balance;
    },
  });
}

export function useCreateIOU() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: {
      friendship_id: string;
      receiver_id: string;
      title: string;
      category?: string;
      note?: string;
    }) => {
      const { error } = await supabase.from("ious").insert({
        friendship_id: payload.friendship_id,
        receiver_id: payload.receiver_id,
        title: payload.title,
        category: payload.category ?? "other",
        note: payload.note,
        creator_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ious", variables.friendship_id] });
      qc.invalidateQueries({ queryKey: ["balance", variables.friendship_id] });
    },
  });
}

export type Scores = {
  this_month: number;
  all_time: number;
};

export function useScores(friendshipId: string) {
  return useQuery({
    queryKey: ["scores", friendshipId],
    enabled: !!friendshipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ious")
        .select("completed_at")
        .eq("friendship_id", friendshipId)
        .eq("status", "completed");

      if (error) throw error;

      const now = new Date();
      const firstOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      const completed = data ?? [];
      return {
        this_month: completed.filter(
          (iou) => iou.completed_at && iou.completed_at >= firstOfMonth
        ).length,
        all_time: completed.length,
      } as Scores;
    },
  });
}

export function useUpdateIOUStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      iouId,
      status,
      friendshipId,
    }: {
      iouId: string;
      status: IOU["status"];
      friendshipId: string;
    }) => {
      const { error } = await supabase
        .from("ious")
        .update({ status })
        .eq("id", iouId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ious", variables.friendshipId] });
      qc.invalidateQueries({ queryKey: ["balance", variables.friendshipId] });
    },
  });
}
