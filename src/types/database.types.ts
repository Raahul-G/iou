export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          status: string
          user_a_id: string
          user_a_nickname: string | null
          user_b_id: string
          user_b_nickname: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          user_a_id: string
          user_a_nickname?: string | null
          user_b_id: string
          user_b_nickname?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          user_a_id?: string
          user_a_nickname?: string | null
          user_b_id?: string
          user_b_nickname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ious: {
        Row: {
          accepted_at: string | null
          category: string
          completed_at: string | null
          completion_requested_at: string | null
          created_at: string
          creator_id: string
          friendship_id: string
          id: string
          note: string | null
          receiver_id: string
          status: string
          title: string
        }
        Insert: {
          accepted_at?: string | null
          category: string
          completed_at?: string | null
          completion_requested_at?: string | null
          created_at?: string
          creator_id: string
          friendship_id: string
          id?: string
          note?: string | null
          receiver_id: string
          status?: string
          title: string
        }
        Update: {
          accepted_at?: string | null
          category?: string
          completed_at?: string | null
          completion_requested_at?: string | null
          created_at?: string
          creator_id?: string
          friendship_id?: string
          id?: string
          note?: string | null
          receiver_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ious_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ious_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ious_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          related_friendship_id: string | null
          related_iou_id: string | null
          related_partnership_id: string | null
          related_user_id: string | null
          related_wish_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_friendship_id?: string | null
          related_iou_id?: string | null
          related_partnership_id?: string | null
          related_user_id?: string | null
          related_wish_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          related_friendship_id?: string | null
          related_iou_id?: string | null
          related_partnership_id?: string | null
          related_user_id?: string | null
          related_wish_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_friendship_id_fkey"
            columns: ["related_friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_iou_id_fkey"
            columns: ["related_iou_id"]
            isOneToOne: false
            referencedRelation: "ious"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_partnership_id_fkey"
            columns: ["related_partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_wish_id_fkey"
            columns: ["related_wish_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          activated_at: string | null
          created_at: string
          fertilizer_id: string
          id: string
          inviter_id: string
          status: string
          water_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          fertilizer_id: string
          id?: string
          inviter_id: string
          status?: string
          water_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          fertilizer_id?: string
          id?: string
          inviter_id?: string
          status?: string
          water_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnerships_fertilizer_id_fkey"
            columns: ["fertilizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnerships_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnerships_water_id_fkey"
            columns: ["water_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          notifications_enabled: boolean
          onboarding_completed_at: string | null
          profile_pic_url: string | null
          theme_preference: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          notifications_enabled?: boolean
          onboarding_completed_at?: string | null
          profile_pic_url?: string | null
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          notifications_enabled?: boolean
          onboarding_completed_at?: string | null
          profile_pic_url?: string | null
          theme_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishes: {
        Row: {
          accepted_at: string | null
          confirmed_at: string | null
          created_at: string
          creator_id: string
          decline_mood: string | null
          decline_text: string | null
          friendship_id: string
          fulfilled_at: string | null
          held_at: string | null
          id: string
          mood: string
          status: string
          target_id: string
          text: string
          thank_you_note: string | null
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          creator_id: string
          decline_mood?: string | null
          decline_text?: string | null
          friendship_id: string
          fulfilled_at?: string | null
          held_at?: string | null
          id?: string
          mood: string
          status?: string
          target_id: string
          text: string
          thank_you_note?: string | null
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          creator_id?: string
          decline_mood?: string | null
          decline_text?: string | null
          friendship_id?: string
          fulfilled_at?: string | null
          held_at?: string | null
          id?: string
          mood?: string
          status?: string
          target_id?: string
          text?: string
          thank_you_note?: string | null
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishes_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: false
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification:
        | {
            Args: {
              p_message: string
              p_related_iou_id: string
              p_related_user_id: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_message: string
              p_related_friendship_id: string
              p_related_user_id: string
              p_related_wish_id: string
              p_title: string
              p_type: string
              p_user_id: string
            }
            Returns: undefined
          }
      delete_own_account: { Args: never; Returns: undefined }
      find_user_by_email: {
        Args: { search_email: string }
        Returns: {
          display_name: string
          id: string
          profile_pic_url: string
        }[]
      }
      maybe_notify_tree_dull: {
        Args: { p_friendship_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
