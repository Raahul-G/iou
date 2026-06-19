import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { Tables } from "@/types/database.types";

type Profile = Tables<"profiles">;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  oauthError: string | null;
  isExchangingOAuth: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setOAuthError: (error: string | null) => void;
  setExchangingOAuth: (exchanging: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  oauthError: null,
  isExchangingOAuth: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setProfile: (profile) =>
    set({ profile }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setOAuthError: (oauthError) =>
    set({ oauthError }),

  setExchangingOAuth: (isExchangingOAuth) =>
    set({ isExchangingOAuth }),

  reset: () =>
    set({ session: null, user: null, profile: null, isLoading: false, oauthError: null, isExchangingOAuth: false }),
}));
