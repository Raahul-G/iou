import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { NOTIF_FETCH_LIMIT } from "@/constants/app";

export type AppNotification = {
  id: string;
  user_id: string;
  type:
    | "friend_request"
    | "friend_request_accepted"
    | "iou_created"
    | "iou_accepted"
    | "iou_declined"
    | "iou_completion_requested"
    | "iou_completion_rejected"
    | "iou_completed";
  related_user_id: string | null;
  related_iou_id: string | null;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(NOTIF_FETCH_LIMIT);

      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["notifications-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}
