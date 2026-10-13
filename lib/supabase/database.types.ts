export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      museums: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          title: string;
          theme: string;
          portrait_path: string | null;
          required_exhibits: number;
          collected_exhibits: number;
          analytics_id: string;
          status: Database["public"]["Enums"]["museum_status"];
          created_at: string;
          unlocked_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          slug: string;
          title: string;
          theme?: string;
          portrait_path?: string | null;
          required_exhibits?: number;
          collected_exhibits?: number;
          analytics_id?: string;
          status?: Database["public"]["Enums"]["museum_status"];
          created_at?: string;
          unlocked_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["museums"]["Insert"]>;
        Relationships: [];
      };
      invite_links: {
        Row: {
          id: string;
          museum_id: string;
          token: string;
          max_submissions: number;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          museum_id: string;
          token: string;
          max_submissions?: number;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invite_links"]["Insert"]>;
        Relationships: [];
      };
      exhibits: {
        Row: {
          id: string;
          museum_id: string;
          invite_id: string;
          title: string;
          caption: string | null;
          media_type: Database["public"]["Enums"]["exhibit_media_type"];
          image_url: string | null;
          image_source: string | null;
          image_source_id: string | null;
          image_author: string | null;
          submission_id: string | null;
          visitor_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          museum_id: string;
          invite_id: string;
          title: string;
          caption?: string | null;
          media_type?: Database["public"]["Enums"]["exhibit_media_type"];
          image_url?: string | null;
          image_source?: string | null;
          image_source_id?: string | null;
          image_author?: string | null;
          submission_id?: string | null;
          visitor_hash?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exhibits"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      museum_status: "collecting" | "unlocked";
      exhibit_media_type: "image" | "video" | "audio" | "link" | "text";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Museum = Database["public"]["Tables"]["museums"]["Row"];
export type InviteLink = Database["public"]["Tables"]["invite_links"]["Row"];
export type Exhibit = Database["public"]["Tables"]["exhibits"]["Row"];
