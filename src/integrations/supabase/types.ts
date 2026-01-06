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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      factcode_22_12_2025_backup: {
        Row: {
          access_count: number | null
          conditional_rules: Json | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          factcode: string | null
          field_options: Json | null
          field_tooltips: Json | null
          grondslag_artikel: string | null
          grondslag_type:
            | Database["public"]["Enums"]["feitcodes_grondslag_type_enum"]
            | null
          grondslag_url: string | null
          id: string | null
          image_url: string | null
          location_field: string | null
          template: string | null
          tooltip_text: string | null
        }
        Insert: {
          access_count?: number | null
          conditional_rules?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          factcode?: string | null
          field_options?: Json | null
          field_tooltips?: Json | null
          grondslag_artikel?: string | null
          grondslag_type?:
            | Database["public"]["Enums"]["feitcodes_grondslag_type_enum"]
            | null
          grondslag_url?: string | null
          id?: string | null
          image_url?: string | null
          location_field?: string | null
          template?: string | null
          tooltip_text?: string | null
        }
        Update: {
          access_count?: number | null
          conditional_rules?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          factcode?: string | null
          field_options?: Json | null
          field_tooltips?: Json | null
          grondslag_artikel?: string | null
          grondslag_type?:
            | Database["public"]["Enums"]["feitcodes_grondslag_type_enum"]
            | null
          grondslag_url?: string | null
          id?: string | null
          image_url?: string | null
          location_field?: string | null
          template?: string | null
          tooltip_text?: string | null
        }
        Relationships: []
      }
      factcode_suggestions: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          field_options: Json | null
          id: number
          status: string | null
          suggested_code: string
          template: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          field_options?: Json | null
          id?: number
          status?: string | null
          suggested_code?: string
          template?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          field_options?: Json | null
          id?: number
          status?: string | null
          suggested_code?: string
          template?: string | null
        }
        Relationships: []
      }
      feitcodes: {
        Row: {
          access_count: number
          conditional_rules: Json | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          factcode: string
          field_options: Json | null
          field_tooltips: Json | null
          grondslag_artikel: string | null
          grondslag_type:
            | Database["public"]["Enums"]["feitcodes_grondslag_type_enum"]
            | null
          grondslag_url: string | null
          id: string
          image_url: string | null
          location_field: string | null
          template: string
          tooltip_text: string | null
        }
        Insert: {
          access_count?: number
          conditional_rules?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          factcode?: string
          field_options?: Json | null
          field_tooltips?: Json | null
          grondslag_artikel?: string | null
          grondslag_type?:
            | Database["public"]["Enums"]["feitcodes_grondslag_type_enum"]
            | null
          grondslag_url?: string | null
          id?: string
          image_url?: string | null
          location_field?: string | null
          template?: string
          tooltip_text?: string | null
        }
        Update: {
          access_count?: number
          conditional_rules?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          factcode?: string
          field_options?: Json | null
          field_tooltips?: Json | null
          grondslag_artikel?: string | null
          grondslag_type?:
            | Database["public"]["Enums"]["feitcodes_grondslag_type_enum"]
            | null
          grondslag_url?: string | null
          id?: string
          image_url?: string | null
          location_field?: string | null
          template?: string
          tooltip_text?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          backup_codes: Json | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          last_sign_in: string | null
          role: Database["public"]["Enums"]["user_role"]
          subscription_expires_at: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at: string
        }
        Insert: {
          backup_codes?: Json | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          last_sign_in?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Update: {
          backup_codes?: Json | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_sign_in?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status?: Database["public"]["Enums"]["subscription_status_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      road_sign_feitcodes: {
        Row: {
          created_at: string
          created_by: string | null
          feitcode_id: string
          id: string
          road_sign_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          feitcode_id: string
          id?: string
          road_sign_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          feitcode_id?: string
          id?: string
          road_sign_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "road_sign_feitcodes_feitcode_id_fkey"
            columns: ["feitcode_id"]
            isOneToOne: false
            referencedRelation: "feitcodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "road_sign_feitcodes_road_sign_id_fkey"
            columns: ["road_sign_id"]
            isOneToOne: false
            referencedRelation: "road_signs"
            referencedColumns: ["id"]
          },
        ]
      }
      road_signs: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          image_url: string | null
          sign_code: string
          sign_name: string
          sign_type: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          sign_code: string
          sign_name: string
          sign_type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          sign_code?: string
          sign_name?: string
          sign_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_rvws: {
        Row: {
          created_at: string
          factcode: string
          form_values: Json
          generated_text: string
          id: string
          location_value: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          factcode: string
          form_values?: Json
          generated_text: string
          id?: string
          location_value: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          factcode?: string
          form_values?: Json
          generated_text?: string
          id?: string
          location_value?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_rvws_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_missing_profiles: { Args: never; Returns: undefined }
      get_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_effective_role_for_current_user: { Args: never; Returns: string }
      get_old_role: {
        Args: { uid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_profile_role: {
        Args: { p_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      hard_delete_user: { Args: { target_user: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hook_restrict_signup_amsterdam: { Args: { event: Json }; Returns: Json }
      increment_access_count: { Args: { item_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_moderator_or_above: { Args: never; Returns: boolean }
      list_user_sessions: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          ip: string
          user_agent: string
          user_id: string
        }[]
      }
      list_user_sessions_for_current_user: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: string
          user_agent: string
          user_id: string
        }[]
      }
      revoke_other_sessions: {
        Args: { keep_session_id?: string; p_user_id: string }
        Returns: undefined
      }
      verify_backup_code: {
        Args: { p_code: string; p_user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      feitcodes_grondslag_type_enum: "RVV 1990" | "APV" | "ASV"
      subscription_plan_enum: "pro"
      subscription_status_enum: "active" | "inactive" | "cancelled"
      user_role: "user" | "subscriber" | "moderator" | "administrator"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      feitcodes_grondslag_type_enum: ["RVV 1990", "APV", "ASV"],
      subscription_plan_enum: ["pro"],
      subscription_status_enum: ["active", "inactive", "cancelled"],
      user_role: ["user", "subscriber", "moderator", "administrator"],
    },
  },
} as const
