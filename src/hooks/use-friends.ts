import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

export type FriendProfile = {
  friendship_id: string;
  friend_id: string;
  display_name: string;
  profile_pic_url: string | null;
  nickname: string | null;
  is_user_a: boolean;
};

export type FriendRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  sender: { display_name: string; profile_pic_url: string | null };
  receiver: { display_name: string; profile_pic_url: string | null };
};

export function useFriends() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["friends", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(
          `
          id,
          user_a_id,
          user_b_id,
          user_a_nickname,
          user_b_nickname,
          profile_a:profiles!friendships_user_a_id_fkey(display_name, profile_pic_url),
          profile_b:profiles!friendships_user_b_id_fkey(display_name, profile_pic_url)
        `
        )
        .or(`user_a_id.eq.${user!.id},user_b_id.eq.${user!.id}`);

      if (error) throw error;

      return (data ?? []).map((f) => {
        const isA = f.user_a_id === user!.id;
        const profile = isA
          ? (f.profile_b as { display_name: string; profile_pic_url: string | null })
          : (f.profile_a as { display_name: string; profile_pic_url: string | null });
        return {
          friendship_id: f.id,
          friend_id: isA ? f.user_b_id : f.user_a_id,
          display_name: profile.display_name,
          profile_pic_url: profile.profile_pic_url,
          nickname: (isA ? f.user_a_nickname : f.user_b_nickname) ?? null,
          is_user_a: isA,
        } as FriendProfile;
      });
    },
  });
}

export function usePendingRequests() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["friend-requests", "pending", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friend_requests")
        .select(
          `
          id, from_user_id, to_user_id, status, created_at,
          sender:profiles!friend_requests_from_user_id_fkey(display_name, profile_pic_url),
          receiver:profiles!friend_requests_to_user_id_fkey(display_name, profile_pic_url)
        `
        )
        .eq("to_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as FriendRequest[];
    },
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (receiverId: string) => {
      const { error } = await supabase
        .from("friend_requests")
        .insert({ from_user_id: user!.id, to_user_id: receiverId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      accept,
    }: {
      requestId: string;
      accept: boolean;
    }) => {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
}

export function useSetNickname() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      friendshipId,
      nickname,
      isUserA,
    }: {
      friendshipId: string;
      nickname: string | null;
      isUserA: boolean;
    }) => {
      const update = isUserA
        ? { user_a_nickname: nickname }
        : { user_b_nickname: nickname };
      const { error } = await supabase
        .from("friendships")
        .update(update)
        .eq("id", friendshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}
