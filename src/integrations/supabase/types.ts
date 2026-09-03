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
      area_bookings: {
        Row: {
          answers: Json
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string
          event_area_id: string
          guestlist_entry_id: string | null
          hold_expires_at: string | null
          id: string
          included_tickets: number
          party_size: number
          payment_session_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          event_area_id: string
          guestlist_entry_id?: string | null
          hold_expires_at?: string | null
          id?: string
          included_tickets?: number
          party_size?: number
          payment_session_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          event_area_id?: string
          guestlist_entry_id?: string | null
          hold_expires_at?: string | null
          id?: string
          included_tickets?: number
          party_size?: number
          payment_session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_bookings_event_area_id_fkey"
            columns: ["event_area_id"]
            isOneToOne: false
            referencedRelation: "event_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_bookings_guestlist_entry_id_fkey"
            columns: ["guestlist_entry_id"]
            isOneToOne: false
            referencedRelation: "guestlist_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_bookings_guestlist_entry_id_fkey"
            columns: ["guestlist_entry_id"]
            isOneToOne: false
            referencedRelation: "guestlist_entries_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_bookings_payment_session_id_fkey"
            columns: ["payment_session_id"]
            isOneToOne: false
            referencedRelation: "payment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      business_subscriptions: {
        Row: {
          activation_method: string
          amount_paid_bob: number | null
          auto_renew: boolean
          billing_interval: string
          billing_period_end: string | null
          billing_period_start: string | null
          business_id: string
          cancelled_at: string | null
          created_at: string
          grace_until: string | null
          id: string
          last_payment_session_id: string | null
          notes: string | null
          qhantuy_subscription_id: string | null
          reminders_sent: Json
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          activation_method?: string
          amount_paid_bob?: number | null
          auto_renew?: boolean
          billing_interval?: string
          billing_period_end?: string | null
          billing_period_start?: string | null
          business_id: string
          cancelled_at?: string | null
          created_at?: string
          grace_until?: string | null
          id?: string
          last_payment_session_id?: string | null
          notes?: string | null
          qhantuy_subscription_id?: string | null
          reminders_sent?: Json
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          activation_method?: string
          amount_paid_bob?: number | null
          auto_renew?: boolean
          billing_interval?: string
          billing_period_end?: string | null
          billing_period_start?: string | null
          business_id?: string
          cancelled_at?: string | null
          created_at?: string
          grace_until?: string | null
          id?: string
          last_payment_session_id?: string | null
          notes?: string | null
          qhantuy_subscription_id?: string | null
          reminders_sent?: Json
          status?: string
          tier?: string
          updated_at?: string
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      event_announcements: {
        Row: {
          body: string
          created_at: string
          error: string | null
          event_id: string
          id: string
          recipient_count: number
          scheduled_for: string | null
          sender_id: string
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          error?: string | null
          event_id: string
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          sender_id: string
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          error?: string | null
          event_id?: string
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_areas: {
        Row: {
          area_type: Database["public"]["Enums"]["venue_area_type"]
          arrival_note: string | null
          capacity: number
          color: string
          created_at: string
          description: string | null
          display_order: number
          event_id: string
          height: number
          id: string
          included_tickets: number | null
          is_active: boolean
          is_decor: boolean
          is_exclusive: boolean
          name: string
          perks: string[] | null
          pos_x: number
          pos_y: number
          price: number
          rotation: number
          shape: string
          source_layout_area_id: string | null
          updated_at: string
          width: number
        }
        Insert: {
          area_type?: Database["public"]["Enums"]["venue_area_type"]
          arrival_note?: string | null
          capacity?: number
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          event_id: string
          height?: number
          id?: string
          included_tickets?: number | null
          is_active?: boolean
          is_decor?: boolean
          is_exclusive?: boolean
          name: string
          perks?: string[] | null
          pos_x?: number
          pos_y?: number
          price?: number
          rotation?: number
          shape?: string
          source_layout_area_id?: string | null
          updated_at?: string
          width?: number
        }
        Update: {
          area_type?: Database["public"]["Enums"]["venue_area_type"]
          arrival_note?: string | null
          capacity?: number
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          event_id?: string
          height?: number
          id?: string
          included_tickets?: number | null
          is_active?: boolean
          is_decor?: boolean
          is_exclusive?: boolean
          name?: string
          perks?: string[] | null
          pos_x?: number
          pos_y?: number
          price?: number
          rotation?: number
          shape?: string
          source_layout_area_id?: string | null
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_areas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_areas_source_layout_area_id_fkey"
            columns: ["source_layout_area_id"]
            isOneToOne: false
            referencedRelation: "venue_layout_areas"
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
      event_promoters: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          id: string
          is_active: boolean
          name: string
          short_code: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          short_code: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
          short_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_promoters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_promoters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_promoters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_purchase_questions: {
        Row: {
          created_at: string
          display_order: number
          event_id: string
          id: string
          label: string
          options: Json
          required: boolean
          scope: string
          type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          label: string
          options?: Json
          required?: boolean
          scope?: string
          type?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          label?: string
          options?: Json
          required?: boolean
          scope?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_purchase_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_special_invites: {
        Row: {
          batch_id: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          created_by: string
          delivery_mode: string
          email_sent_at: string | null
          email_status: string
          event_id: string
          guest_email: string | null
          guest_name: string | null
          id: string
          label: string | null
          qr_code_token: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          rsvp_confirmed_at: string | null
          rsvp_email: string | null
          rsvp_name: string | null
          segment: string | null
          status: string
          ticket_tier_id: string | null
          token: string
        }
        Insert: {
          batch_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          created_by: string
          delivery_mode?: string
          email_sent_at?: string | null
          email_status?: string
          event_id: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          label?: string | null
          qr_code_token?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          rsvp_confirmed_at?: string | null
          rsvp_email?: string | null
          rsvp_name?: string | null
          segment?: string | null
          status?: string
          ticket_tier_id?: string | null
          token?: string
        }
        Update: {
          batch_id?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          created_by?: string
          delivery_mode?: string
          email_sent_at?: string | null
          email_status?: string
          event_id?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          label?: string | null
          qr_code_token?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          rsvp_confirmed_at?: string | null
          rsvp_email?: string | null
          rsvp_name?: string | null
          segment?: string | null
          status?: string
          ticket_tier_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_special_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_special_invites_ticket_tier_id_fkey"
            columns: ["ticket_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_stats: {
        Row: {
          event_id: string
          impression_count: number
          updated_at: string
          view_count: number
        }
        Insert: {
          event_id: string
          impression_count?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          event_id?: string
          impression_count?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_stats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
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
      event_waitlist: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notified_at: string | null
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notified_at?: string | null
          position: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notified_at?: string | null
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_waitlist_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
          experience_id: string | null
          has_guestlist: boolean | null
          has_guestlist_chat: boolean | null
          id: string
          image_url: string | null
          is_business_event: boolean | null
          is_location_secret: boolean
          is_post: boolean | null
          is_public: boolean | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          max_guestlist_capacity: number | null
          payment_qr_url: string | null
          price: number | null
          sales_open_at: string | null
          scanner_access_token: string | null
          show_menu_button: boolean | null
          show_reservation_button: boolean | null
          start_datetime: string | null
          title: string | null
          waitlist_capacity: number | null
          waitlist_early_access_hours: number
          waitlist_enabled: boolean
          waitlist_released_at: string | null
          waitlist_tier_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          description_tags?: string[] | null
          end_datetime?: string | null
          experience_id?: string | null
          has_guestlist?: boolean | null
          has_guestlist_chat?: boolean | null
          id?: string
          image_url?: string | null
          is_business_event?: boolean | null
          is_location_secret?: boolean
          is_post?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          max_guestlist_capacity?: number | null
          payment_qr_url?: string | null
          price?: number | null
          sales_open_at?: string | null
          scanner_access_token?: string | null
          show_menu_button?: boolean | null
          show_reservation_button?: boolean | null
          start_datetime?: string | null
          title?: string | null
          waitlist_capacity?: number | null
          waitlist_early_access_hours?: number
          waitlist_enabled?: boolean
          waitlist_released_at?: string | null
          waitlist_tier_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          description_tags?: string[] | null
          end_datetime?: string | null
          experience_id?: string | null
          has_guestlist?: boolean | null
          has_guestlist_chat?: boolean | null
          id?: string
          image_url?: string | null
          is_business_event?: boolean | null
          is_location_secret?: boolean
          is_post?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          max_guestlist_capacity?: number | null
          payment_qr_url?: string | null
          price?: number | null
          sales_open_at?: string | null
          scanner_access_token?: string | null
          show_menu_button?: boolean | null
          show_reservation_button?: boolean | null
          start_datetime?: string | null
          title?: string | null
          waitlist_capacity?: number | null
          waitlist_early_access_hours?: number
          waitlist_enabled?: boolean
          waitlist_released_at?: string | null
          waitlist_tier_id?: string | null
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
          {
            foreignKeyName: "events_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_waitlist_tier_id_fkey"
            columns: ["waitlist_tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_blackouts: {
        Row: {
          blackout_date: string
          created_at: string
          experience_id: string
          id: string
          reason: string | null
        }
        Insert: {
          blackout_date: string
          created_at?: string
          experience_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          blackout_date?: string
          created_at?: string
          experience_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experience_blackouts_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_booking_guests: {
        Row: {
          booking_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_booking_guests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "experience_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_booking_guests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_booking_guests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_bookings: {
        Row: {
          amount: number
          booking_date: string
          booking_time: string
          check_in_token: string
          created_at: string
          experience_id: string
          hold_expires_at: string | null
          id: string
          notes: string | null
          payment_session_id: string | null
          quantity: number
          segment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_date: string
          booking_time: string
          check_in_token?: string
          created_at?: string
          experience_id: string
          hold_expires_at?: string | null
          id?: string
          notes?: string | null
          payment_session_id?: string | null
          quantity?: number
          segment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_date?: string
          booking_time?: string
          check_in_token?: string
          created_at?: string
          experience_id?: string
          hold_expires_at?: string | null
          id?: string
          notes?: string | null
          payment_session_id?: string | null
          quantity?: number
          segment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_bookings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_bookings_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "experience_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_policies: {
        Row: {
          cancellation_window_hours: number
          experience_id: string
          max_per_booking: number
          min_lead_minutes: number
          spots_per_slot: number
          updated_at: string
        }
        Insert: {
          cancellation_window_hours?: number
          experience_id: string
          max_per_booking?: number
          min_lead_minutes?: number
          spots_per_slot?: number
          updated_at?: string
        }
        Update: {
          cancellation_window_hours?: number
          experience_id?: string
          max_per_booking?: number
          min_lead_minutes?: number
          spots_per_slot?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_policies_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: true
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_schedules: {
        Row: {
          created_at: string
          end_time: string
          experience_id: string
          id: string
          is_closed: boolean
          slot_interval_minutes: number
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time?: string
          experience_id: string
          id?: string
          is_closed?: boolean
          slot_interval_minutes?: number
          start_time?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          experience_id?: string
          id?: string
          is_closed?: boolean
          slot_interval_minutes?: number
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "experience_schedules_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_segments: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          experience_id: string
          id: string
          is_active: boolean
          max_per_booking: number | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          experience_id: string
          id?: string
          is_active?: boolean
          max_per_booking?: number | null
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          experience_id?: string
          id?: string
          is_active?: boolean
          max_per_booking?: number | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "experience_segments_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          location_note: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_note?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_note?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_business_id_fkey"
            columns: ["business_id"]
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
          area_booking_id: string | null
          attended: boolean | null
          checked_in_at: string | null
          event_id: string
          guest_email: string | null
          guest_name: string | null
          id: string
          is_special_guest: boolean
          joined_at: string | null
          payment_confirmed_at: string | null
          payment_session_id: string | null
          payment_status: string | null
          promoter_id: string | null
          purchased_by_user_id: string | null
          qr_code_token: string | null
          special_guest_label: string | null
          status: string | null
          ticket_tier_id: string | null
          user_id: string | null
        }
        Insert: {
          area_booking_id?: string | null
          attended?: boolean | null
          checked_in_at?: string | null
          event_id: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_special_guest?: boolean
          joined_at?: string | null
          payment_confirmed_at?: string | null
          payment_session_id?: string | null
          payment_status?: string | null
          promoter_id?: string | null
          purchased_by_user_id?: string | null
          qr_code_token?: string | null
          special_guest_label?: string | null
          status?: string | null
          ticket_tier_id?: string | null
          user_id?: string | null
        }
        Update: {
          area_booking_id?: string | null
          attended?: boolean | null
          checked_in_at?: string | null
          event_id?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_special_guest?: boolean
          joined_at?: string | null
          payment_confirmed_at?: string | null
          payment_session_id?: string | null
          payment_status?: string | null
          promoter_id?: string | null
          purchased_by_user_id?: string | null
          qr_code_token?: string | null
          special_guest_label?: string | null
          status?: string | null
          ticket_tier_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestlist_entries_area_booking_id_fkey"
            columns: ["area_booking_id"]
            isOneToOne: false
            referencedRelation: "area_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_payment_session_id_fkey"
            columns: ["payment_session_id"]
            isOneToOne: false
            referencedRelation: "payment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "event_promoters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_purchased_by_user_id_fkey"
            columns: ["purchased_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestlist_entries_purchased_by_user_id_fkey"
            columns: ["purchased_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
      interaction_events_log: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260827: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260828: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260829: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260830: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260831: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260901: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260902: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260903: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260904: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      interaction_events_log_20260905: {
        Row: {
          created_at: string
          event_id: string
          id: number
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: number
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: number
          signal_type?: string
          user_id?: string
        }
        Relationships: []
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
          assignees: Json | null
          base_amount: number | null
          beneficiary_code: string | null
          business_user_id: string
          buyer_user_id: string
          confirmed_at: string | null
          created_at: string
          event_area_id: string | null
          event_id: string | null
          experience_booking_id: string | null
          gateway_fee_amount: number
          id: string
          party_size: number | null
          payment_method: string
          payout_amount: number | null
          platform_fee_amount: number | null
          platform_fee_bps: number
          promoter_id: string | null
          provider: string
          qhantuy_raw_callback: Json | null
          qhantuy_transaction_id: number | null
          quantity: number
          status: string
          subscription_business_id: string | null
          subscription_interval: string | null
          subscription_tier: string | null
          ticket_tier_id: string | null
        }
        Insert: {
          amount: number
          assignees?: Json | null
          base_amount?: number | null
          beneficiary_code?: string | null
          business_user_id: string
          buyer_user_id: string
          confirmed_at?: string | null
          created_at?: string
          event_area_id?: string | null
          event_id?: string | null
          experience_booking_id?: string | null
          gateway_fee_amount?: number
          id?: string
          party_size?: number | null
          payment_method?: string
          payout_amount?: number | null
          platform_fee_amount?: number | null
          platform_fee_bps?: number
          promoter_id?: string | null
          provider?: string
          qhantuy_raw_callback?: Json | null
          qhantuy_transaction_id?: number | null
          quantity?: number
          status?: string
          subscription_business_id?: string | null
          subscription_interval?: string | null
          subscription_tier?: string | null
          ticket_tier_id?: string | null
        }
        Update: {
          amount?: number
          assignees?: Json | null
          base_amount?: number | null
          beneficiary_code?: string | null
          business_user_id?: string
          buyer_user_id?: string
          confirmed_at?: string | null
          created_at?: string
          event_area_id?: string | null
          event_id?: string | null
          experience_booking_id?: string | null
          gateway_fee_amount?: number
          id?: string
          party_size?: number | null
          payment_method?: string
          payout_amount?: number | null
          platform_fee_amount?: number | null
          platform_fee_bps?: number
          promoter_id?: string | null
          provider?: string
          qhantuy_raw_callback?: Json | null
          qhantuy_transaction_id?: number | null
          quantity?: number
          status?: string
          subscription_business_id?: string | null
          subscription_interval?: string | null
          subscription_tier?: string | null
          ticket_tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_event_area_id_fkey"
            columns: ["event_area_id"]
            isOneToOne: false
            referencedRelation: "event_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_experience_booking_id_fkey"
            columns: ["experience_booking_id"]
            isOneToOne: false
            referencedRelation: "experience_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "event_promoters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_subscription_business_id_fkey"
            columns: ["subscription_business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sessions_subscription_business_id_fkey"
            columns: ["subscription_business_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          account_type: string
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
          experience_goal: number | null
          experience_goal_year: number | null
          experiences_enabled: boolean
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
          account_type?: string
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
          experience_goal?: number | null
          experience_goal_year?: number | null
          experiences_enabled?: boolean
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
          account_type?: string
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
          experience_goal?: number | null
          experience_goal_year?: number | null
          experiences_enabled?: boolean
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
      promoter_clicks: {
        Row: {
          click_day: string
          created_at: string
          event_id: string
          id: string
          promoter_id: string
          viewer_fingerprint: string | null
          viewer_id: string | null
        }
        Insert: {
          click_day?: string
          created_at?: string
          event_id: string
          id?: string
          promoter_id: string
          viewer_fingerprint?: string | null
          viewer_id?: string | null
        }
        Update: {
          click_day?: string
          created_at?: string
          event_id?: string
          id?: string
          promoter_id?: string
          viewer_fingerprint?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promoter_clicks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promoter_clicks_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "event_promoters"
            referencedColumns: ["id"]
          },
        ]
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
      qhantuy_beneficiaries: {
        Row: {
          account_number: string
          account_type: string
          bank_id: number
          bank_name: string | null
          beneficiary_code: string
          ci_number: string
          created_at: string
          email: string
          first_name: string
          is_active: boolean
          last_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_type: string
          bank_id: number
          bank_name?: string | null
          beneficiary_code: string
          ci_number: string
          created_at?: string
          email: string
          first_name: string
          is_active?: boolean
          last_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_type?: string
          bank_id?: number
          bank_name?: string | null
          beneficiary_code?: string
          ci_number?: string
          created_at?: string
          email?: string
          first_name?: string
          is_active?: boolean
          last_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      reservation_blackouts: {
        Row: {
          blackout_date: string
          business_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blackout_date: string
          business_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blackout_date?: string
          business_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_blackouts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_blackouts_business_id_fkey"
            columns: ["business_id"]
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
      reservation_policies: {
        Row: {
          allow_table_join: boolean
          arrival_grace_minutes: number
          business_id: string
          cancellation_window_hours: number
          created_at: string
          max_covers_per_interval: number | null
          max_party_size: number
          min_lead_minutes: number
          turn_time_minutes: number
          updated_at: string
        }
        Insert: {
          allow_table_join?: boolean
          arrival_grace_minutes?: number
          business_id: string
          cancellation_window_hours?: number
          created_at?: string
          max_covers_per_interval?: number | null
          max_party_size?: number
          min_lead_minutes?: number
          turn_time_minutes?: number
          updated_at?: string
        }
        Update: {
          allow_table_join?: boolean
          arrival_grace_minutes?: number
          business_id?: string
          cancellation_window_hours?: number
          created_at?: string
          max_covers_per_interval?: number | null
          max_party_size?: number
          min_lead_minutes?: number
          turn_time_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
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
      reservation_schedules: {
        Row: {
          business_id: string
          created_at: string
          end_time: string
          id: string
          is_closed: boolean
          shift_name: string | null
          start_time: string
          weekday: number
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time: string
          id?: string
          is_closed?: boolean
          shift_name?: string | null
          start_time: string
          weekday: number
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: string
          id?: string
          is_closed?: boolean
          shift_name?: string | null
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_tables: {
        Row: {
          reservation_id: string
          table_id: string
        }
        Insert: {
          reservation_id: string
          table_id: string
        }
        Update: {
          reservation_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_tables_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_waitlist: {
        Row: {
          business_id: string
          created_at: string
          desired_date: string
          desired_time: string
          id: string
          notified_at: string | null
          party_size: number
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          desired_date: string
          desired_time: string
          id?: string
          notified_at?: string | null
          party_size?: number
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          desired_date?: string
          desired_time?: string
          id?: string
          notified_at?: string | null
          party_size?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_waitlist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_waitlist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          business_id: string
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          duration_minutes: number
          id: string
          notes: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          seated_at: string | null
          status: string
          table_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date: string
          reservation_time: string
          seated_at?: string | null
          status?: string
          table_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          seated_at?: string | null
          status?: string
          table_id?: string | null
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
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
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
      restaurant_tables: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          seats: number
          sort_order: number
          updated_at: string
          zone: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          seats?: number
          sort_order?: number
          updated_at?: string
          zone?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          seats?: number
          sort_order?: number
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_business_id_fkey"
            columns: ["business_id"]
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
      session_feed_state: {
        Row: {
          created_at: string
          feed_kind: string
          seen_event_ids: string[]
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feed_kind?: string
          seen_event_ids?: string[]
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feed_kind?: string
          seen_event_ids?: string[]
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
      venue_layout_areas: {
        Row: {
          area_type: Database["public"]["Enums"]["venue_area_type"]
          arrival_note: string | null
          capacity: number
          color: string
          created_at: string
          default_price: number | null
          description: string | null
          display_order: number
          height: number
          id: string
          included_tickets: number | null
          is_decor: boolean
          is_exclusive: boolean
          layout_id: string
          name: string
          perks: string[] | null
          pos_x: number
          pos_y: number
          rotation: number
          shape: string
          updated_at: string
          width: number
        }
        Insert: {
          area_type?: Database["public"]["Enums"]["venue_area_type"]
          arrival_note?: string | null
          capacity?: number
          color?: string
          created_at?: string
          default_price?: number | null
          description?: string | null
          display_order?: number
          height?: number
          id?: string
          included_tickets?: number | null
          is_decor?: boolean
          is_exclusive?: boolean
          layout_id: string
          name: string
          perks?: string[] | null
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          width?: number
        }
        Update: {
          area_type?: Database["public"]["Enums"]["venue_area_type"]
          arrival_note?: string | null
          capacity?: number
          color?: string
          created_at?: string
          default_price?: number | null
          description?: string | null
          display_order?: number
          height?: number
          id?: string
          included_tickets?: number | null
          is_decor?: boolean
          is_exclusive?: boolean
          layout_id?: string
          name?: string
          perks?: string[] | null
          pos_x?: number
          pos_y?: number
          rotation?: number
          shape?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "venue_layout_areas_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "venue_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_layouts: {
        Row: {
          business_id: string
          canvas_height: number
          canvas_width: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          canvas_height?: number
          canvas_width?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_layouts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_layouts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
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
      web_vitals_20260827: {
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
      web_vitals_20260828: {
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
      web_vitals_20260829: {
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
      web_vitals_20260830: {
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
      web_vitals_20260831: {
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
      web_vitals_20260901: {
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
      web_vitals_20260902: {
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
      web_vitals_20260903: {
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
      web_vitals_20260904: {
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
      web_vitals_20260905: {
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
      worker_cursors: {
        Row: {
          last_processed_id: number
          last_run_at: string
          name: string
        }
        Insert: {
          last_processed_id?: number
          last_run_at?: string
          name: string
        }
        Update: {
          last_processed_id?: number
          last_run_at?: string
          name?: string
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
      activate_business_subscription: {
        Args: {
          _amount: number
          _business_id: string
          _interval: string
          _prorated?: boolean
          _session_id: string
          _tier: string
        }
        Returns: Json
      }
      bulk_create_special_invites: {
        Args: {
          _batch_id?: string
          _event_id: string
          _guests: Json
          _segment: string
        }
        Returns: Json
      }
      bulk_upsert_category_preferences: {
        Args: { _records: Json }
        Returns: undefined
      }
      bulk_upsert_creator_preferences: {
        Args: { _records: Json }
        Returns: undefined
      }
      bulk_upsert_day_preferences: {
        Args: { _records: Json }
        Returns: undefined
      }
      bulk_upsert_tag_preferences: {
        Args: { _records: Json }
        Returns: undefined
      }
      bump_event_stats: {
        Args: { _event_id: string; _impressions?: number; _views?: number }
        Returns: undefined
      }
      can_see_event_location: {
        Args: { _event: string; _user: string }
        Returns: boolean
      }
      can_view_full_guestlist_entry: {
        Args: { _entry_user_id: string; _event_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_area_holds: { Args: never; Returns: number }
      cleanup_infra_logs: { Args: never; Returns: undefined }
      cleanup_interaction_events_log: { Args: never; Returns: undefined }
      cleanup_old_event_interactions: { Args: never; Returns: undefined }
      cleanup_session_feed_state: { Args: never; Returns: undefined }
      cleanup_web_vitals: { Args: never; Returns: undefined }
      confirm_free_area_booking: {
        Args: { _booking_id: string }
        Returns: {
          answers: Json
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string
          event_area_id: string
          guestlist_entry_id: string | null
          hold_expires_at: string | null
          id: string
          included_tickets: number
          party_size: number
          payment_session_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "area_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_invite_rsvp: {
        Args: { _email: string; _name: string; _token: string }
        Returns: Json
      }
      count_event_announcements_24h: {
        Args: { _event_id: string }
        Returns: number
      }
      create_experience_booking: {
        Args: {
          _date: string
          _experience_id: string
          _guest_ids?: string[]
          _notes?: string
          _quantity: number
          _segment_id: string
          _time: string
        }
        Returns: string
      }
      create_reservation: {
        Args: {
          _business_id: string
          _date: string
          _guest_ids?: string[]
          _notes?: string
          _party_size: number
          _reservation_id?: string
          _time: string
        }
        Returns: string
      }
      enqueue_reservation_reminders: {
        Args: { _reservation_id: string }
        Returns: undefined
      }
      ensure_collab_boosts_fresh: {
        Args: { _user_id: string }
        Returns: undefined
      }
      ensure_daily_partition: {
        Args: { day: string; parent: unknown }
        Returns: undefined
      }
      generate_referral_code: { Args: { _user_id: string }; Returns: string }
      get_business_public_tier: {
        Args: { _business_id: string }
        Returns: string
      }
      get_business_shifts: {
        Args: { _business_id: string; _weekday: number }
        Returns: {
          end_time: string
          start_time: string
        }[]
      }
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
      get_city_benchmarks: { Args: { _business_id: string }; Returns: Json }
      get_collab_boosts: {
        Args: { _user_id: string }
        Returns: {
          boost_count: number
          event_id: string
        }[]
      }
      get_creator_promoter_leaderboard: {
        Args: never
        Returns: {
          clicks: number
          event_id: string
          event_title: string
          gl_approved: number
          name: string
          promoter_id: string
          revenue_bs: number
          short_code: string
          tickets_sold: number
        }[]
      }
      get_creator_sales_by_event: {
        Args: never
        Returns: {
          attributed_revenue: number
          attributed_tickets: number
          capacity: number
          checked_in: number
          event_id: string
          image_url: string
          revenue: number
          start_datetime: string
          tickets_sold: number
          title: string
        }[]
      }
      get_creator_sales_monthly: {
        Args: never
        Returns: {
          bucket: string
          revenue: number
          tickets: number
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
      get_event_announcement_recipients: {
        Args: { _event_id: string }
        Returns: {
          user_id: string
        }[]
      }
      get_event_area_availability: {
        Args: { _event_id: string }
        Returns: {
          capacity: number
          event_area_id: string
          is_exclusive: boolean
          remaining: number
          state: string
          taken: number
        }[]
      }
      get_event_card_counts: {
        Args: { _event_ids: string[] }
        Returns: {
          event_id: string
          impression_count: number
          view_count: number
        }[]
      }
      get_event_like_summary: {
        Args: { _event_ids: string[] }
        Returns: {
          event_id: string
          like_count: number
          viewer_liked: boolean
        }[]
      }
      get_event_payment_status_breakdown: {
        Args: { _event_id: string }
        Returns: {
          amount: number
          count: number
          status: string
        }[]
      }
      get_event_promoter_stats: {
        Args: { _event_id: string }
        Returns: {
          checked_in: number
          clicks: number
          gl_approved: number
          gl_requests: number
          is_active: boolean
          name: string
          promoter_id: string
          revenue_bs: number
          short_code: string
          tickets_sold: number
        }[]
      }
      get_event_promoter_totals: {
        Args: { _event_id: string }
        Returns: {
          attributed_gl: number
          attributed_revenue: number
          attributed_tickets: number
          total_gl: number
          total_revenue: number
          total_tickets: number
        }[]
      }
      get_event_ticket_breakdown: {
        Args: { _event_id: string }
        Returns: {
          capacity: number
          name: string
          price: number
          revenue_bs: number
          sold: number
          tier_id: string
        }[]
      }
      get_event_view_counts: {
        Args: { _event_ids: string[] }
        Returns: {
          event_id: string
          view_count: number
        }[]
      }
      get_experience_availability: {
        Args: { _date: string; _experience_id: string; _quantity?: number }
        Returns: {
          slot_time: string
          spots_left: number
          status: string
        }[]
      }
      get_for_you_context: { Args: { _user_id: string }; Returns: Json }
      get_for_you_events: {
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
          impression_count: number
          is_business_event: boolean
          is_post: boolean
          is_public: boolean
          latitude: number
          like_count: number
          location_name: string
          longitude: number
          max_guestlist_capacity: number
          media: Json
          payment_qr_url: string
          price: number
          save_count: number
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
      get_premium_business_ids: {
        Args: never
        Returns: {
          business_id: string
        }[]
      }
      get_public_invite: {
        Args: { _token: string }
        Returns: {
          checked_in_at: string
          delivery_mode: string
          event_id: string
          event_image_url: string
          event_location: string
          event_start: string
          event_title: string
          guest_email: string
          guest_name: string
          host_name: string
          id: string
          qr_code_token: string
          rsvp_confirmed_at: string
          rsvp_email: string
          rsvp_name: string
          segment: string
          status: string
          token: string
        }[]
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
      get_reservation_availability: {
        Args: { _business_id: string; _date: string; _party_size?: number }
        Returns: {
          seats_left: number
          slot_time: string
          status: string
        }[]
      }
      get_save_count: { Args: { _event_id: string }; Returns: number }
      get_special_invite_by_token: {
        Args: { _token: string }
        Returns: {
          event_id: string
          guest_name: string
          id: string
          redeemed_by: string
          segment: string
          status: string
          ticket_tier_id: string
          token: string
        }[]
      }
      get_trending_scores: {
        Args: never
        Returns: {
          event_id: string
          trending_score: number
          velocity_count: number
        }[]
      }
      get_viewer_liked_events: {
        Args: { _event_ids: string[] }
        Returns: {
          event_id: string
        }[]
      }
      has_active_business_plan: {
        Args: { _business_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hold_event_area: {
        Args: { _event_area_id: string; _party_size: number }
        Returns: {
          answers: Json
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string
          event_area_id: string
          guestlist_entry_id: string | null
          hold_expires_at: string | null
          id: string
          included_tickets: number
          party_size: number
          payment_session_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "area_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
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
      increment_sponsored_impressions_batch: {
        Args: { _counts: Json }
        Returns: undefined
      }
      increment_tier_sold: { Args: { _tier_id: string }; Returns: boolean }
      increment_tier_sold_by: {
        Args: { _qty: number; _tier_id: string }
        Returns: boolean
      }
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
      join_event_waitlist: {
        Args: { _event_id: string }
        Returns: {
          wl_position: number
          wl_total: number
        }[]
      }
      log_interaction: {
        Args: { _event_id: string; _signal_type: string }
        Returns: undefined
      }
      log_promoter_click: {
        Args: { _fingerprint: string; _promoter_id: string }
        Returns: undefined
      }
      maintain_daily_partitions: { Args: never; Returns: undefined }
      owns_experience: { Args: { _experience_id: string }; Returns: boolean }
      redeem_special_invite: { Args: { _token: string }; Returns: Json }
      refresh_trending_scores_cache: { Args: never; Returns: undefined }
      refresh_user_collab_boosts: {
        Args: { _user_id: string }
        Returns: undefined
      }
      resolve_promoter: {
        Args: { _code: string; _event_id: string }
        Returns: string
      }
      set_experience_booking_status: {
        Args: { _booking_id: string; _status: string }
        Returns: undefined
      }
      set_reservation_status: {
        Args: { _reservation_id: string; _status: string }
        Returns: undefined
      }
      set_special_invite_mode: {
        Args: { _invite_ids: string[]; _mode: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      venue_area_type:
        | "table"
        | "lounge"
        | "long_table"
        | "section"
        | "general_admission"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      venue_area_type: [
        "table",
        "lounge",
        "long_table",
        "section",
        "general_admission",
      ],
    },
  },
} as const
