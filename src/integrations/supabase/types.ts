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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      business_payment_settings: {
        Row: {
          bnb_account_id: string
          bnb_authorization_id: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bnb_account_id: string
          bnb_authorization_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bnb_account_id?: string
          bnb_authorization_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          event_id: string | null
          id: string
          name: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          name?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          name?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      eula_acceptances: {
        Row: {
          accepted_at: string
          id: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      event_analytics: {
        Row: {
          check_ins: number | null
          event_id: string
          guestlist_joins: number | null
          id: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          check_ins?: number | null
          event_id: string
          guestlist_joins?: number | null
          id?: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          check_ins?: number | null
          event_id?: string
          guestlist_joins?: number | null
          id?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborators: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          invited_by: string
          responded_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          invited_by: string
          responded_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          invited_by?: string
          responded_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_comments: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          event_id: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          event_id: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          event_id?: string
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_interactions: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_interactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_likes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_likes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_media: {
        Row: {
          aspect_ratio: number | null
          created_at: string
          display_order: number
          event_id: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          aspect_ratio?: number | null
          created_at?: string
          display_order: number
          event_id: string
          id?: string
          media_type: string
          media_url: string
        }
        Update: {
          aspect_ratio?: number | null
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tags: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          responded_at: string | null
          status: string
          tagged_by: string
          tagged_user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          responded_at?: string | null
          status?: string
          tagged_by: string
          tagged_user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          responded_at?: string | null
          status?: string
          tagged_by?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tags_tagged_by_fkey"
            columns: ["tagged_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string
          deleted_at: string | null
          description: string | null
          description_tags: string[] | null
          end_datetime: string | null
          has_guestlist: boolean | null
          has_guestlist_chat: boolean | null
          id: string
          image_url: string | null
          is_business_event: boolean | null
          is_post: boolean | null
          is_public: boolean | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          max_guestlist_capacity: number | null
          payment_qr_url: string | null
          price: number | null
          scanner_access_token: string | null
          show_menu_button: boolean | null
          show_reservation_button: boolean | null
          start_datetime: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          description_tags?: string[] | null
          end_datetime?: string | null
          has_guestlist?: boolean | null
          has_guestlist_chat?: boolean | null
          id?: string
          image_url?: string | null
          is_business_event?: boolean | null
          is_post?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          max_guestlist_capacity?: number | null
          payment_qr_url?: string | null
          price?: number | null
          scanner_access_token?: string | null
          show_menu_button?: boolean | null
          show_reservation_button?: boolean | null
          start_datetime?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          description_tags?: string[] | null
          end_datetime?: string | null
          has_guestlist?: boolean | null
          has_guestlist_chat?: boolean | null
          id?: string
          image_url?: string | null
          is_business_event?: boolean | null
          is_post?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          max_guestlist_capacity?: number | null
          payment_qr_url?: string | null
          price?: number | null
          scanner_access_token?: string | null
          show_menu_button?: boolean | null
          show_reservation_button?: boolean | null
          start_datetime?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guestlist_entries: {
        Row: {
          attended: boolean | null
          checked_in_at: string | null
          event_id: string
          id: string
          joined_at: string | null
          payment_confirmed_at: string | null
          payment_status: string | null
          qr_code_token: string | null
          status: string | null
          ticket_tier_id: string | null
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          checked_in_at?: string | null
          event_id: string
          id?: string
          joined_at?: string | null
          payment_confirmed_at?: string | null
          payment_status?: string | null
          qr_code_token?: string | null
          status?: string | null
          ticket_tier_id?: string | null
          user_id: string
        }
        Update: {
          attended?: boolean | null
          checked_in_at?: string | null
          event_id?: string
          id?: string
          joined_at?: string | null
          payment_confirmed_at?: string | null
          payment_status?: string | null
          qr_code_token?: string | null
          status?: string | null
          ticket_tier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guestlist_invitations: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          invited_user_id: string
          inviter_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          invited_user_id: string
          inviter_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          invited_user_id?: string
          inviter_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          menu_id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          menu_id: string
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          menu_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_available: boolean | null
          menu_id: string
          name: string
          price: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          menu_id: string
          name: string
          price?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          menu_id?: string
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string | null
          deleted_at: string | null
          event_id: string | null
          id: string
          message_type: string | null
          sender_id: string | null
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string | null
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          event_id?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sessions: {
        Row: {
          amount: number
          bnb_qr_id: string | null
          business_user_id: string
          buyer_user_id: string
          confirmed_at: string | null
          created_at: string
          event_id: string
          id: string
          status: string
          ticket_tier_id: string | null
        }
        Insert: {
          amount: number
          bnb_qr_id?: string | null
          business_user_id: string
          buyer_user_id: string
          confirmed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          status?: string
          ticket_tier_id?: string | null
        }
        Update: {
          amount?: number
          bnb_qr_id?: string | null
          business_user_id?: string
          buyer_user_id?: string
          confirmed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          ticket_tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      post_business_cta_requests: {
        Row: {
          business_id: string
          created_at: string
          event_id: string
          id: string
          requested_by: string
          responded_at: string | null
          revoked_by: string | null
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          event_id: string
          id?: string
          requested_by: string
          responded_at?: string | null
          revoked_by?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          event_id?: string
          id?: string
          requested_by?: string
          responded_at?: string | null
          revoked_by?: string | null
          status?: string
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_visits: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          visit_date: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          visit_date?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          visit_date?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          business_address: string | null
          business_hours: string | null
          business_latitude: number | null
          business_longitude: number | null
          business_phone: string | null
          business_type: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          gender: string | null
          id: string
          interests: string[] | null
          is_business: boolean | null
          is_food_business: boolean | null
          menu_enabled: boolean | null
          referral_code: string | null
          reservation_capacity: number | null
          reservation_end_time: string | null
          reservation_start_time: string | null
          reservations_enabled: boolean | null
          stripe_customer_id: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          business_address?: string | null
          business_hours?: string | null
          business_latitude?: number | null
          business_longitude?: number | null
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          is_business?: boolean | null
          is_food_business?: boolean | null
          menu_enabled?: boolean | null
          referral_code?: string | null
          reservation_capacity?: number | null
          reservation_end_time?: string | null
          reservation_start_time?: string | null
          reservations_enabled?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          business_address?: string | null
          business_hours?: string | null
          business_latitude?: number | null
          business_longitude?: number | null
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_business?: boolean | null
          is_food_business?: boolean | null
          menu_enabled?: boolean | null
          referral_code?: string | null
          reservation_capacity?: number | null
          reservation_end_time?: string | null
          reservation_start_time?: string | null
          reservations_enabled?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          onesignal_player_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          onesignal_player_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          onesignal_player_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          redeemed_at: string | null
          referral_id: string | null
          reward_type: string
          stripe_coupon_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          redeemed_at?: string | null
          referral_id?: string | null
          reward_type?: string
          stripe_coupon_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          redeemed_at?: string | null
          referral_id?: string | null
          reward_type?: string
          stripe_coupon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          payment_completed: boolean | null
          referral_code: string
          referred_plan_type: string | null
          referred_user_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_completed?: boolean | null
          referral_code: string
          referred_plan_type?: string | null
          referred_user_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_completed?: boolean | null
          referral_code?: string
          referred_plan_type?: string | null
          referred_user_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reposts: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reposts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_guests: {
        Row: {
          created_at: string | null
          id: string
          reservation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reservation_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reservation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_guests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_guests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_guests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_reminders: {
        Row: {
          created_at: string
          id: string
          reminder_type: string
          reservation_id: string
          scheduled_for: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_type: string
          reservation_id: string
          scheduled_for: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reminder_type?: string
          reservation_id?: string
          scheduled_for?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_reminders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          business_id: string
          cancelled_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date: string
          reservation_time: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          cancelled_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_clicks: {
        Row: {
          created_at: string
          day: string
          id: string
          sponsored_post_id: string
          viewer_fingerprint: string | null
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          sponsored_post_id: string
          viewer_fingerprint?: string | null
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          sponsored_post_id?: string
          viewer_fingerprint?: string | null
          viewer_id?: string | null
        }
        Relationships: []
      }
      sponsored_daily_spend: {
        Row: {
          day: string
          impressions: number
          spent: number
          sponsored_post_id: string
          updated_at: string
        }
        Insert: {
          day?: string
          impressions?: number
          spent?: number
          sponsored_post_id: string
          updated_at?: string
        }
        Update: {
          day?: string
          impressions?: number
          spent?: number
          sponsored_post_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsored_posts: {
        Row: {
          ad_payment_session_id: string | null
          business_user_id: string
          clicks: number
          created_at: string
          daily_budget: number | null
          end_date: string | null
          event_id: string
          id: string
          impressions: number
          spent: number
          start_date: string | null
          status: string
          target_age_max: number | null
          target_age_min: number | null
          target_categories: string[] | null
          target_days_of_week: number[] | null
          target_gender: string | null
          target_hour_end: number | null
          target_hour_start: number | null
          target_radius_km: number | null
          target_timezone: string
          total_budget: number | null
        }
        Insert: {
          ad_payment_session_id?: string | null
          business_user_id: string
          clicks?: number
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          event_id: string
          id?: string
          impressions?: number
          spent?: number
          start_date?: string | null
          status?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_categories?: string[] | null
          target_days_of_week?: number[] | null
          target_gender?: string | null
          target_hour_end?: number | null
          target_hour_start?: number | null
          target_radius_km?: number | null
          target_timezone?: string
          total_budget?: number | null
        }
        Update: {
          ad_payment_session_id?: string | null
          business_user_id?: string
          clicks?: number
          created_at?: string
          daily_budget?: number | null
          end_date?: string | null
          event_id?: string
          id?: string
          impressions?: number
          spent?: number
          start_date?: string | null
          status?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_categories?: string[] | null
          target_days_of_week?: number[] | null
          target_gender?: string | null
          target_hour_end?: number | null
          target_hour_start?: number | null
          target_radius_km?: number | null
          target_timezone?: string
          total_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_posts_business_user_id_fkey"
            columns: ["business_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_posts_business_user_id_fkey"
            columns: ["business_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          display_order: number
          event_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          sold_count: number
          unlock_after_tier_id: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sold_count?: number
          unlock_after_tier_id?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sold_count?: number
          unlock_after_tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_tiers_unlock_after_tier_id_fkey"
            columns: ["unlock_after_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_scores_cache: {
        Row: {
          event_id: string
          trending_score: number
          updated_at: string
          velocity_count: number
        }
        Insert: {
          event_id: string
          trending_score?: number
          updated_at?: string
          velocity_count?: number
        }
        Update: {
          event_id?: string
          trending_score?: number
          updated_at?: string
          velocity_count?: number
        }
        Relationships: []
      }
      user_category_preferences: {
        Row: {
          category: string
          created_at: string
          id: string
          interaction_count: number | null
          last_interaction: string | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collab_boosts_cache: {
        Row: {
          boost_count: number
          event_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          boost_count?: number
          event_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          boost_count?: number
          event_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_creator_preferences: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          interaction_count: number | null
          last_interaction: string | null
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_creator_preferences_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_creator_preferences_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_creator_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_creator_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_day_preferences: {
        Row: {
          category: string
          created_at: string
          day_of_week: number
          id: string
          interaction_count: number | null
          last_interaction: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          day_of_week: number
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          day_of_week?: number
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          allow_messages_from: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_messages_from?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_messages_from?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tag_preferences: {
        Row: {
          created_at: string
          id: string
          interaction_count: number | null
          last_interaction: string | null
          score: number | null
          tag: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          tag: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_count?: number | null
          last_interaction?: string | null
          score?: number | null
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      web_vitals: {
        Row: {
          created_at: string
          id: string
          is_native: boolean
          metric_name: string
          metric_rating: string | null
          metric_value: number
          navigation_type: string | null
          path: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_native?: boolean
          metric_name: string
          metric_rating?: string | null
          metric_value: number
          navigation_type?: string | null
          path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_native?: boolean
          metric_name?: string
          metric_rating?: string | null
          metric_value?: number
          navigation_type?: string | null
          path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      guestlist_entries_public: {
        Row: {
          attended: boolean | null
          checked_in_at: string | null
          event_id: string | null
          id: string | null
          joined_at: string | null
          payment_confirmed_at: string | null
          payment_status: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean | null
          checked_in_at?: string | null
          event_id?: string | null
          id?: string | null
          joined_at?: string | null
          payment_confirmed_at?: string | null
          payment_status?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean | null
          checked_in_at?: string | null
          event_id?: string | null
          id?: string | null
          joined_at?: string | null
          payment_confirmed_at?: string | null
          payment_status?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_address: string | null
          business_hours: string | null
          business_latitude: number | null
          business_longitude: number | null
          business_phone: string | null
          business_type: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          interests: string[] | null
          is_business: boolean | null
          is_food_business: boolean | null
          menu_enabled: boolean | null
          referral_code: string | null
          reservation_capacity: number | null
          reservation_end_time: string | null
          reservation_start_time: string | null
          reservations_enabled: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_address?: string | null
          business_hours?: string | null
          business_latitude?: number | null
          business_longitude?: number | null
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          interests?: string[] | null
          is_business?: boolean | null
          is_food_business?: boolean | null
          menu_enabled?: boolean | null
          referral_code?: string | null
          reservation_capacity?: number | null
          reservation_end_time?: string | null
          reservation_start_time?: string | null
          reservations_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_address?: string | null
          business_hours?: string | null
          business_latitude?: number | null
          business_longitude?: number | null
          business_phone?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          interests?: string[] | null
          is_business?: boolean | null
          is_food_business?: boolean | null
          menu_enabled?: boolean | null
          referral_code?: string | null
          reservation_capacity?: number | null
          reservation_end_time?: string | null
          reservation_start_time?: string | null
          reservations_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_full_guestlist_entry: {
        Args: { _entry_user_id: string; _event_id: string; _user_id: string }
        Returns: boolean
      }
      enqueue_reservation_reminders: {
        Args: { _reservation_id: string }
        Returns: undefined
      }
      ensure_collab_boosts_fresh: {
        Args: { _user_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: { _user_id: string }; Returns: string }
      get_chat_list_with_unread: {
        Args: { _user_id: string }
        Returns: {
          chat_created_at: string
          chat_id: string
          chat_name: string
          chat_type: string
          event_id: string
          last_message_at: string
          last_message_content: string
          last_message_sender_id: string
          unread_count: number
        }[]
      }
      get_collab_boosts: {
        Args: { _user_id: string }
        Returns: {
          boost_count: number
          event_id: string
        }[]
      }
      get_eligible_sponsored_posts: {
        Args: { _lat?: number; _lng?: number; _user_id?: string }
        Returns: {
          event_id: string
          preference_score: number
          sponsored_post_id: string
          target_age_max: number
          target_age_min: number
          target_categories: string[]
          target_gender: string
          target_radius_km: number
        }[]
      }
      get_event_view_counts: {
        Args: { _event_ids: string[] }
        Returns: {
          event_id: string
          view_count: number
        }[]
      }
      get_for_you_context: { Args: { _user_id: string }; Returns: Json }
      get_for_you_events:
        | {
            Args: never
            Returns: {
              attendee_avatars: Json
              attendee_count: number
              category: string
              created_at: string
              creator_avatar_url: string
              creator_full_name: string
              creator_id: string
              creator_username: string
              description: string
              description_tags: string[]
              end_datetime: string
              has_guestlist: boolean
              has_guestlist_chat: boolean
              id: string
              image_url: string
              is_business_event: boolean
              is_post: boolean
              is_public: boolean
              latitude: number
              location_name: string
              longitude: number
              max_guestlist_capacity: number
              media: Json
              payment_qr_url: string
              price: number
              show_menu_button: boolean
              show_reservation_button: boolean
              start_datetime: string
              title: string
            }[]
          }
        | {
            Args: { _cursor?: string; _limit?: number }
            Returns: {
              attendee_avatars: Json
              attendee_count: number
              category: string
              created_at: string
              creator_avatar_url: string
              creator_full_name: string
              creator_id: string
              creator_username: string
              description: string
              description_tags: string[]
              end_datetime: string
              has_guestlist: boolean
              has_guestlist_chat: boolean
              id: string
              image_url: string
              is_business_event: boolean
              is_post: boolean
              is_public: boolean
              latitude: number
              location_name: string
              longitude: number
              max_guestlist_capacity: number
              media: Json
              payment_qr_url: string
              price: number
              show_menu_button: boolean
              show_reservation_button: boolean
              start_datetime: string
              title: string
            }[]
          }
      get_mutual_followers: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_or_create_private_chat: {
        Args: { _other_user_id: string; _user_id: string }
        Returns: string
      }
      get_referral_stats: {
        Args: { _user_id: string }
        Returns: {
          pending_rewards: number
          referral_code: string
          referral_count: number
          reward_claimed: boolean
        }[]
      }
      get_save_count: { Args: { _event_id: string }; Returns: number }
      get_trending_scores: {
        Args: never
        Returns: {
          event_id: string
          trending_score: number
          velocity_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_sponsored_clicks: {
        Args: { _post_id: string }
        Returns: undefined
      }
      increment_sponsored_clicks_v2: {
        Args: { _fingerprint?: string; _post_id: string; _viewer_id?: string }
        Returns: undefined
      }
      increment_sponsored_impressions: {
        Args: { _post_id: string }
        Returns: undefined
      }
      increment_tier_sold: { Args: { _tier_id: string }; Returns: boolean }
      is_blocked: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
      }
      is_chat_participant: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_post_owner: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      refresh_trending_scores_cache: { Args: never; Returns: undefined }
      refresh_user_collab_boosts: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
