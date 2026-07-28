export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          target_university: string | null;
          target_major: string | null;
          exam_target_date: string | null;
          email: string | null;
          role: "user" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          target_university?: string | null;
          target_major?: string | null;
          exam_target_date?: string | null;
          email?: string | null;
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          target_university?: string | null;
          target_major?: string | null;
          exam_target_date?: string | null;
          email?: string | null;
          role?: "user" | "admin";
          updated_at?: string;
        };
        Relationships: [];
      };
      study_data: {
        Row: {
          user_id: string;
          payload: unknown;
          version: number;
          device_label: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          payload: unknown;
          version?: number;
          device_label?: string | null;
          updated_at?: string;
        };
        Update: {
          payload?: unknown;
          version?: number;
          device_label?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          role: string;
          target_university: string | null;
          target_major: string | null;
          created_at: string;
          last_sign_in_at: string | null;
        }[];
      };
      admin_set_role: {
        Args: {
          target_id: string;
          new_role: string;
        };
        Returns: undefined;
      };
      admin_delete_user: {
        Args: {
          target_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type AdminUserRow = Database["public"]["Functions"]["admin_list_users"]["Returns"][number];
