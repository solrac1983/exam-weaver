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
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_text: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender: string
          text: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender: string
          text?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      class_groups: {
        Row: {
          company_id: string
          created_at: string
          grade: string | null
          id: string
          name: string
          segment: string | null
          shift: string | null
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          grade?: string | null
          id?: string
          name: string
          segment?: string | null
          shift?: string | null
          year?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          grade?: string | null
          id?: string
          name?: string
          segment?: string | null
          shift?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          billing_blocked: boolean
          created_at: string
          id: string
          max_users: number
          name: string
          plan: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_blocked?: boolean
          created_at?: string
          id?: string
          max_users?: number
          name: string
          plan?: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_blocked?: boolean
          created_at?: string
          id?: string
          max_users?: number
          name?: string
          plan?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      demands: {
        Row: {
          application_date: string | null
          class_groups: string[]
          company_id: string
          coordinator_id: string
          created_at: string
          deadline: string
          exam_type: string
          id: string
          notes: string | null
          status: string
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          application_date?: string | null
          class_groups?: string[]
          company_id: string
          coordinator_id: string
          created_at?: string
          deadline: string
          exam_type?: string
          id?: string
          notes?: string | null
          status?: string
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          application_date?: string | null
          class_groups?: string[]
          company_id?: string
          coordinator_id?: string
          created_at?: string
          deadline?: string
          exam_type?: string
          id?: string
          notes?: string | null
          status?: string
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_comments: {
        Row: {
          author: string
          created_at: string
          demand_id: string
          id: string
          resolved: boolean
          text: string
        }
        Insert: {
          author: string
          created_at?: string
          demand_id: string
          id?: string
          resolved?: boolean
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          demand_id?: string
          id?: string
          resolved?: boolean
          text?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          due_date: string
          id: string
          installment_number: number | null
          is_recurring: boolean
          notes: string | null
          paid_date: string | null
          payment_method_id: string | null
          recurring_group_id: string | null
          reference_month: string
          status: string
          total_installments: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_number?: number | null
          is_recurring?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_method_id?: string | null
          recurring_group_id?: string | null
          reference_month?: string
          status?: string
          total_installments?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          is_recurring?: boolean
          notes?: string | null
          paid_date?: string | null
          payment_method_id?: string | null
          recurring_group_id?: string | null
          reference_month?: string
          status?: string
          total_installments?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          details: Json
          id: string
          name: string
          type: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          details?: Json
          id?: string
          name: string
          type?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          details?: Json
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          area: string | null
          code: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          area?: string | null
          code?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          area?: string | null
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          class_groups: string[] | null
          company_id: string
          cpf: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          subjects: string[] | null
        }
        Insert: {
          class_groups?: string[] | null
          company_id: string
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string | null
          subjects?: string[] | null
        }
        Update: {
          class_groups?: string[] | null
          company_id?: string
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          subjects?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      template_documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_path: string
          file_size: number | null
          file_url: string
          grade: string | null
          id: string
          name: string
          segment: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number | null
          file_url: string
          grade?: string | null
          id?: string
          name: string
          segment?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number | null
          file_url?: string
          grade?: string | null
          id?: string
          name?: string
          segment?: string | null
        }
        Relationships: []
      }
      template_headers: {
        Row: {
          created_at: string
          file_path: string
          file_url: string
          grade: string | null
          id: string
          name: string
          segment: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_url: string
          grade?: string | null
          id?: string
          name: string
          segment?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_url?: string
          grade?: string | null
          id?: string
          name?: string
          segment?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
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
      check_and_block_overdue_companies: { Args: never; Returns: undefined }
      get_my_company_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_blocked: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "coordinator" | "professor" | "admin"
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
      app_role: ["super_admin", "coordinator", "professor", "admin"],
    },
  },
} as const
