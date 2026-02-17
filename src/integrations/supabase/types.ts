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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clinical_config: {
        Row: {
          completed_pipeline_id: number | null
          completed_status_id: number | null
          created_at: string
          credential_id: string
          doctor_custom_field_id: number | null
          id: string
          procedure_custom_field_id: number | null
          procedure_pipeline_id: number | null
          procedure_status_id: number | null
          rescheduled_pipeline_id: number | null
          rescheduled_status_id: number | null
          scheduled_pipeline_id: number | null
          scheduled_status_id: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_pipeline_id?: number | null
          completed_status_id?: number | null
          created_at?: string
          credential_id: string
          doctor_custom_field_id?: number | null
          id?: string
          procedure_custom_field_id?: number | null
          procedure_pipeline_id?: number | null
          procedure_status_id?: number | null
          rescheduled_pipeline_id?: number | null
          rescheduled_status_id?: number | null
          scheduled_pipeline_id?: number | null
          scheduled_status_id?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_pipeline_id?: number | null
          completed_status_id?: number | null
          created_at?: string
          credential_id?: string
          doctor_custom_field_id?: number | null
          id?: string
          procedure_custom_field_id?: number | null
          procedure_pipeline_id?: number | null
          procedure_status_id?: number | null
          rescheduled_pipeline_id?: number | null
          rescheduled_status_id?: number | null
          scheduled_pipeline_id?: number | null
          scheduled_status_id?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_config_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "user_kommo_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          period: string
          pipeline_ids: number[] | null
          product_name: string | null
          seller_id: number | null
          seller_name: string | null
          start_date: string
          status_ids: number[] | null
          target_type: string
          target_value: number
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          period: string
          pipeline_ids?: number[] | null
          product_name?: string | null
          seller_id?: number | null
          seller_name?: string | null
          start_date: string
          status_ids?: number[] | null
          target_type: string
          target_value: number
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          period?: string
          pipeline_ids?: number[] | null
          product_name?: string | null
          seller_id?: number | null
          seller_name?: string | null
          start_date?: string
          status_ids?: number[] | null
          target_type?: string
          target_value?: number
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      kommo_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          request_data: Json | null
          response_data: Json | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_data?: Json | null
          response_data?: Json | null
        }
        Relationships: []
      }
      user_kommo_credentials: {
        Row: {
          access_token: string | null
          account_name: string
          account_url: string | null
          created_at: string
          dashboard_mode: string | null
          id: string
          integration_id: string
          is_active: boolean
          redirect_uri: string | null
          refresh_token: string | null
          secret_key: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_name?: string
          account_url?: string | null
          created_at?: string
          dashboard_mode?: string | null
          id?: string
          integration_id: string
          is_active?: boolean
          redirect_uri?: string | null
          refresh_token?: string | null
          secret_key: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_name?: string
          account_url?: string | null
          created_at?: string
          dashboard_mode?: string | null
          id?: string
          integration_id?: string
          is_active?: boolean
          redirect_uri?: string | null
          refresh_token?: string | null
          secret_key?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_goal_progress: { Args: { p_goal_id: string }; Returns: Json }
      log_kommo_request: {
        Args: {
          p_action: string
          p_error_message?: string
          p_request_data?: Json
          p_response_data?: Json
        }
        Returns: string
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
