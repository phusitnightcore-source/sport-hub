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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_events: {
        Row: {
          id: string
          kind: string
          label: string | null
          path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          kind: string
          label?: string | null
          path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          kind?: string
          label?: string | null
          path?: string | null
          created_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          id: string
          name: string
          image_url: string
          link_url: string
          placement: string
          is_active: boolean
          weight: number
          impressions: number
          clicks: number
          starts_at: string | null
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          image_url: string
          link_url: string
          placement?: string
          is_active?: boolean
          weight?: number
          impressions?: number
          clicks?: number
          starts_at?: string | null
          ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          image_url?: string
          link_url?: string
          placement?: string
          is_active?: boolean
          weight?: number
          impressions?: number
          clicks?: number
          starts_at?: string | null
          ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string | null
          content: string
          cover_image_url: string | null
          category: string | null
          tags: string[]
          status: Database["public"]["Enums"]["blog_status"]
          author_name: string | null
          author_id: string | null
          views: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          excerpt?: string | null
          content?: string
          cover_image_url?: string | null
          category?: string | null
          tags?: string[]
          status?: Database["public"]["Enums"]["blog_status"]
          author_name?: string | null
          author_id?: string | null
          views?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          excerpt?: string | null
          content?: string
          cover_image_url?: string | null
          category?: string | null
          tags?: string[]
          status?: Database["public"]["Enums"]["blog_status"]
          author_name?: string | null
          author_id?: string | null
          views?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          id: string
          path: string
          tenant_id: string | null
          referrer: string | null
          visitor_hash: string | null
          device: string | null
          created_at: string
        }
        Insert: {
          id?: string
          path: string
          tenant_id?: string | null
          referrer?: string | null
          visitor_hash?: string | null
          device?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          path?: string
          tenant_id?: string | null
          referrer?: string | null
          visitor_hash?: string | null
          device?: string | null
          created_at?: string
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          plan: Database["public"]["Enums"]["plan_type"]
          online_payment: boolean
          monthly_booking_limit: number | null
          max_courts: number | null
          max_branches: number | null
          line_notify: boolean
          member_system: boolean
          peak_pricing: boolean
          broadcast: boolean
          export_reports: boolean
          guest_pass: boolean
          kiosk_mode: boolean
          custom_domain: boolean
          analytics: boolean
          updated_at: string
        }
        Insert: {
          plan: Database["public"]["Enums"]["plan_type"]
          online_payment?: boolean
          monthly_booking_limit?: number | null
          max_courts?: number | null
          max_branches?: number | null
          line_notify?: boolean
          member_system?: boolean
          peak_pricing?: boolean
          broadcast?: boolean
          export_reports?: boolean
          guest_pass?: boolean
          kiosk_mode?: boolean
          custom_domain?: boolean
          analytics?: boolean
          updated_at?: string
        }
        Update: {
          plan?: Database["public"]["Enums"]["plan_type"]
          online_payment?: boolean
          monthly_booking_limit?: number | null
          max_courts?: number | null
          max_branches?: number | null
          line_notify?: boolean
          member_system?: boolean
          peak_pricing?: boolean
          broadcast?: boolean
          export_reports?: boolean
          guest_pass?: boolean
          kiosk_mode?: boolean
          custom_domain?: boolean
          analytics?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"]
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: string
          ip_address: unknown
          module: string
          reference_id: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: Database["public"]["Enums"]["user_role"]
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          module: string
          reference_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"]
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: string
          ip_address?: unknown
          module?: string
          reference_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      block_schedules: {
        Row: {
          block_date: string
          court_id: string
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          note: string | null
          reason: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          block_date: string
          court_id: string
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          note?: string | null
          reason?: string
          start_time: string
          tenant_id: string
        }
        Update: {
          block_date?: string
          court_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          note?: string | null
          reason?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_schedules_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_code: string
          booking_date: string
          booking_range: unknown
          branch_id: string
          cancel_fee: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          coupon_id: string | null
          court_id: string
          created_at: string
          created_by: string | null
          discount_amount: number
          duration_hours: number | null
          end_time: string
          id: string
          member_id: string | null
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          policy_accepted_at: string | null
          price_per_hour: number
          price_type: Database["public"]["Enums"]["price_type"]
          slot_locked_until: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          total_price: number
          updated_at: string
          user_name: string
          user_phone: string
          profile_id: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Insert: {
          booking_code?: string
          booking_date: string
          booking_range?: unknown
          branch_id: string
          cancel_fee?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          coupon_id?: string | null
          court_id: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          duration_hours?: number | null
          end_time: string
          id?: string
          member_id?: string | null
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          policy_accepted_at?: string | null
          price_per_hour: number
          price_type?: Database["public"]["Enums"]["price_type"]
          slot_locked_until?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          total_price: number
          updated_at?: string
          user_name: string
          user_phone: string
          profile_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Update: {
          booking_code?: string
          booking_date?: string
          booking_range?: unknown
          branch_id?: string
          cancel_fee?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          coupon_id?: string | null
          court_id?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          duration_hours?: number | null
          end_time?: string
          id?: string
          member_id?: string | null
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          policy_accepted_at?: string | null
          price_per_hour?: number
          price_type?: Database["public"]["Enums"]["price_type"]
          slot_locked_until?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
          total_price?: number
          updated_at?: string
          user_name?: string
          user_phone?: string
          profile_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branch_occupancy"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          alert_threshold: number
          amenities: string[]
          avg_session_duration_hours: number
          city: string | null
          close_time: string | null
          created_at: string
          email: string | null
          google_map_url: string | null
          id: string
          images: string[]
          kiosk_scan_out_enabled: boolean
          kiosk_token: string | null
          latitude: number | null
          longitude: number | null
          max_capacity: number
          name: string
          open_time: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          status: Database["public"]["Enums"]["branch_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          alert_threshold?: number
          amenities?: string[]
          avg_session_duration_hours?: number
          city?: string | null
          close_time?: string | null
          created_at?: string
          email?: string | null
          google_map_url?: string | null
          id?: string
          images?: string[]
          kiosk_scan_out_enabled?: boolean
          kiosk_token?: string | null
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number
          name: string
          open_time?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["branch_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          alert_threshold?: number
          amenities?: string[]
          avg_session_duration_hours?: number
          city?: string | null
          close_time?: string | null
          created_at?: string
          email?: string | null
          google_map_url?: string | null
          id?: string
          images?: string[]
          kiosk_scan_out_enabled?: boolean
          kiosk_token?: string | null
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number
          name?: string
          open_time?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          status?: Database["public"]["Enums"]["branch_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlists: {
        Row: {
          booking_date: string
          court_id: string
          created_at: string
          end_time: string
          id: string
          notified_at: string | null
          profile_id: string | null
          start_time: string
          tenant_id: string
          user_name: string
          user_phone: string
        }
        Insert: {
          booking_date: string
          court_id: string
          created_at?: string
          end_time: string
          id?: string
          notified_at?: string | null
          profile_id?: string | null
          start_time: string
          tenant_id: string
          user_name: string
          user_phone: string
        }
        Update: {
          booking_date?: string
          court_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notified_at?: string | null
          profile_id?: string | null
          start_time?: string
          tenant_id?: string
          user_name?: string
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlists_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          actual_checkout_time: string | null
          branch_id: string
          checkin_time: string
          checkout_method: Database["public"]["Enums"]["checkout_method"] | null
          estimated_checkout_time: string | null
          fail_reason: Database["public"]["Enums"]["checkin_fail_reason"] | null
          guest_pass_id: string | null
          id: string
          member_id: string | null
          method: Database["public"]["Enums"]["checkin_method"]
          result: Database["public"]["Enums"]["checkin_result"]
          tenant_id: string
          verified_by: string | null
        }
        Insert: {
          actual_checkout_time?: string | null
          branch_id: string
          checkin_time?: string
          checkout_method?:
            | Database["public"]["Enums"]["checkout_method"]
            | null
          estimated_checkout_time?: string | null
          fail_reason?:
            | Database["public"]["Enums"]["checkin_fail_reason"]
            | null
          guest_pass_id?: string | null
          id?: string
          member_id?: string | null
          method: Database["public"]["Enums"]["checkin_method"]
          result: Database["public"]["Enums"]["checkin_result"]
          tenant_id: string
          verified_by?: string | null
        }
        Update: {
          actual_checkout_time?: string | null
          branch_id?: string
          checkin_time?: string
          checkout_method?:
            | Database["public"]["Enums"]["checkout_method"]
            | null
          estimated_checkout_time?: string | null
          fail_reason?:
            | Database["public"]["Enums"]["checkin_fail_reason"]
            | null
          guest_pass_id?: string | null
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["checkin_method"]
          result?: Database["public"]["Enums"]["checkin_result"]
          tenant_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branch_occupancy"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "checkins_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_guest_pass_id_fkey"
            columns: ["guest_pass_id"]
            isOneToOne: false
            referencedRelation: "guest_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          booking_id: string | null
          coupon_id: string
          discount_amount: number
          id: string
          member_id: string | null
          tenant_id: string
          used_at: string
          user_phone: string | null
        }
        Insert: {
          booking_id?: string | null
          coupon_id: string
          discount_amount: number
          id?: string
          member_id?: string | null
          tenant_id: string
          used_at?: string
          user_phone?: string | null
        }
        Update: {
          booking_id?: string | null
          coupon_id?: string
          discount_amount?: number
          id?: string
          member_id?: string | null
          tenant_id?: string
          used_at?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_ids: string[]
          applicable_to: string
          code: string
          created_at: string
          created_by: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          end_date: string
          first_booking_only: boolean
          id: string
          min_purchase: number
          name: string
          start_date: string
          status: Database["public"]["Enums"]["coupon_status"]
          tenant_id: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          applicable_ids?: string[]
          applicable_to?: string
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          end_date: string
          first_booking_only?: boolean
          id?: string
          min_purchase?: number
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["coupon_status"]
          tenant_id: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          applicable_ids?: string[]
          applicable_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          end_date?: string
          first_booking_only?: boolean
          id?: string
          min_purchase?: number
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["coupon_status"]
          tenant_id?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      court_peak_windows: {
        Row: {
          court_id: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          tenant_id: string
        }
        Insert: {
          court_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          tenant_id: string
        }
        Update: {
          court_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_peak_windows_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_peak_windows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          advance_booking_days: number
          allow_reschedule: boolean
          branch_id: string
          cancel_fee_percent: number
          capacity: number
          close_time: string
          created_at: string
          free_cancel_hours: number
          id: string
          images: string[]
          name: string
          open_time: string
          price_offpeak: number | null
          price_peak: number | null
          price_standard: number
          refund_note: string | null
          reschedule_hours: number
          status: Database["public"]["Enums"]["court_status"]
          tenant_id: string
          type: string
          is_indoor?: boolean | null
          updated_at: string
        }
        Insert: {
          advance_booking_days?: number
          allow_reschedule?: boolean
          branch_id: string
          cancel_fee_percent?: number
          capacity?: number
          close_time?: string
          created_at?: string
          free_cancel_hours?: number
          id?: string
          images?: string[]
          name: string
          open_time?: string
          price_offpeak?: number | null
          price_peak?: number | null
          price_standard?: number
          refund_note?: string | null
          reschedule_hours?: number
          status?: Database["public"]["Enums"]["court_status"]
          tenant_id: string
          type: string
          is_indoor?: boolean | null
          updated_at?: string
        }
        Update: {
          advance_booking_days?: number
          allow_reschedule?: boolean
          branch_id?: string
          cancel_fee_percent?: number
          capacity?: number
          close_time?: string
          created_at?: string
          free_cancel_hours?: number
          id?: string
          images?: string[]
          name?: string
          open_time?: string
          price_offpeak?: number | null
          price_peak?: number | null
          price_standard?: number
          refund_note?: string | null
          reschedule_hours?: number
          status?: Database["public"]["Enums"]["court_status"]
          tenant_id?: string
          type?: string
          is_indoor?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branch_occupancy"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "courts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      freeze_requests: {
        Row: {
          freeze_end: string | null
          freeze_start: string | null
          id: string
          member_id: string
          reason: string | null
          reject_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["freeze_request_status"]
          tenant_id: string
        }
        Insert: {
          freeze_end?: string | null
          freeze_start?: string | null
          id?: string
          member_id: string
          reason?: string | null
          reject_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["freeze_request_status"]
          tenant_id: string
        }
        Update: {
          freeze_end?: string | null
          freeze_start?: string | null
          id?: string
          member_id?: string
          reason?: string | null
          reject_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["freeze_request_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "freeze_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freeze_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freeze_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_passes: {
        Row: {
          branch_access_all: boolean
          branch_access_ids: string[]
          created_at: string
          id: string
          issued_by: string | null
          qr_token: string
          recipient_name: string
          sessions_limit: number | null
          sessions_used: number
          tenant_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          branch_access_all?: boolean
          branch_access_ids?: string[]
          created_at?: string
          id?: string
          issued_by?: string | null
          qr_token?: string
          recipient_name: string
          sessions_limit?: number | null
          sessions_used?: number
          tenant_id: string
          valid_from: string
          valid_until: string
        }
        Update: {
          branch_access_all?: boolean
          branch_access_ids?: string[]
          created_at?: string
          id?: string
          issued_by?: string | null
          qr_token?: string
          recipient_name?: string
          sessions_limit?: number | null
          sessions_used?: number
          tenant_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_passes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_passes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_date: string | null
          broadcast_opt_out: boolean
          consent_given_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          end_date: string | null
          first_name: string
          freeze_count: number
          freeze_days_used: number
          freeze_start_date: string | null
          health_info: string | null
          id: string
          last_name: string | null
          line_user_id: string | null
          member_number: string
          original_end_date: string | null
          package_id: string | null
          phone: string
          profile_id: string | null
          profile_image_url: string | null
          sessions_used: number
          start_date: string | null
          status: Database["public"]["Enums"]["member_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          broadcast_opt_out?: boolean
          consent_given_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_date?: string | null
          first_name: string
          freeze_count?: number
          freeze_days_used?: number
          freeze_start_date?: string | null
          health_info?: string | null
          id?: string
          last_name?: string | null
          line_user_id?: string | null
          member_number: string
          original_end_date?: string | null
          package_id?: string | null
          phone: string
          profile_id?: string | null
          profile_image_url?: string | null
          sessions_used?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          broadcast_opt_out?: boolean
          consent_given_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_date?: string | null
          first_name?: string
          freeze_count?: number
          freeze_days_used?: number
          freeze_start_date?: string | null
          health_info?: string | null
          id?: string
          last_name?: string | null
          line_user_id?: string | null
          member_number?: string
          original_end_date?: string | null
          package_id?: string | null
          phone?: string
          profile_id?: string | null
          profile_image_url?: string | null
          sessions_used?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          recipient_id: string | null
          recipient_type: string
          reference_id: string | null
          reference_type: string | null
          retry_count: number
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_id?: string | null
          recipient_type: string
          reference_id?: string | null
          reference_type?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_id?: string | null
          recipient_type?: string
          reference_id?: string | null
          reference_type?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          benefits: string | null
          branch_access_all: boolean
          branch_access_ids: string[]
          created_at: string
          duration_days: number | null
          freeze_auto_approve: boolean
          freeze_max_days: number
          freeze_max_times: number
          id: string
          is_active: boolean
          name: string
          price: number
          sessions_carryover: boolean
          sessions_limit: number | null
          tenant_id: string
          type: Database["public"]["Enums"]["package_type"]
          updated_at: string
        }
        Insert: {
          benefits?: string | null
          branch_access_all?: boolean
          branch_access_ids?: string[]
          created_at?: string
          duration_days?: number | null
          freeze_auto_approve?: boolean
          freeze_max_days?: number
          freeze_max_times?: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          sessions_carryover?: boolean
          sessions_limit?: number | null
          tenant_id: string
          type: Database["public"]["Enums"]["package_type"]
          updated_at?: string
        }
        Update: {
          benefits?: string | null
          branch_access_all?: boolean
          branch_access_ids?: string[]
          created_at?: string
          duration_days?: number | null
          freeze_auto_approve?: boolean
          freeze_max_days?: number
          freeze_max_times?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sessions_carryover?: boolean
          sessions_limit?: number | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          id: string
          member_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          package_id: string | null
          promptpay_qr_payload: string | null
          reference_id: string | null
          reference_module: string | null
          refund_confirmed_at: string | null
          refund_confirmed_by: string | null
          refund_evidence_url: string | null
          refund_status: Database["public"]["Enums"]["refund_status"] | null
          reject_reason: string | null
          sender_name: string | null
          slip_hash: string | null
          slip_image_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          submitted_at: string
          tenant_id: string
          transfer_datetime: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          package_id?: string | null
          promptpay_qr_payload?: string | null
          reference_id?: string | null
          reference_module?: string | null
          refund_confirmed_at?: string | null
          refund_confirmed_by?: string | null
          refund_evidence_url?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"] | null
          reject_reason?: string | null
          sender_name?: string | null
          slip_hash?: string | null
          slip_image_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string
          tenant_id: string
          transfer_datetime?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          id?: string
          member_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          package_id?: string | null
          promptpay_qr_payload?: string | null
          reference_id?: string | null
          reference_module?: string | null
          refund_confirmed_at?: string | null
          refund_confirmed_by?: string | null
          refund_evidence_url?: string | null
          refund_status?: Database["public"]["Enums"]["refund_status"] | null
          reject_reason?: string | null
          sender_name?: string | null
          slip_hash?: string | null
          slip_image_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          submitted_at?: string
          tenant_id?: string
          transfer_datetime?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_refund_confirmed_by_fkey"
            columns: ["refund_confirmed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_change_logs: {
        Row: {
          created_at: string
          effective_at: string
          from_plan: Database["public"]["Enums"]["plan_type"]
          id: string
          prorate_amount: number | null
          tenant_id: string
          to_plan: Database["public"]["Enums"]["plan_type"]
        }
        Insert: {
          created_at?: string
          effective_at?: string
          from_plan: Database["public"]["Enums"]["plan_type"]
          id?: string
          prorate_amount?: number | null
          tenant_id: string
          to_plan: Database["public"]["Enums"]["plan_type"]
        }
        Update: {
          created_at?: string
          effective_at?: string
          from_plan?: Database["public"]["Enums"]["plan_type"]
          id?: string
          prorate_amount?: number | null
          tenant_id?: string
          to_plan?: Database["public"]["Enums"]["plan_type"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          line_user_id: string | null
          pdpa_consent_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          line_user_id?: string | null
          pdpa_consent_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          line_user_id?: string | null
          pdpa_consent_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          customer_name: string
          id: string
          issued_date: string
          item_description: string
          payment_id: string
          payment_method: string
          pdf_url: string | null
          receipt_number: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_name: string
          id?: string
          issued_date?: string
          item_description: string
          payment_id: string
          payment_method?: string
          pdf_url?: string | null
          receipt_number: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string
          id?: string
          issued_date?: string
          item_description?: string
          payment_id?: string
          payment_method?: string
          pdf_url?: string | null
          receipt_number?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          email: string
          extra_permissions: string[]
          id: string
          multi_branch_access: boolean
          name: string
          phone: string | null
          profile_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          extra_permissions?: string[]
          id?: string
          multi_branch_access?: boolean
          name: string
          phone?: string | null
          profile_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          extra_permissions?: string[]
          id?: string
          multi_branch_access?: boolean
          name?: string
          phone?: string | null
          profile_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_branches: {
        Row: {
          branch_id: string
          staff_id: string
        }
        Insert: {
          branch_id: string
          staff_id: string
        }
        Update: {
          branch_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branch_occupancy"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "staff_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_branches_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount_before_vat: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          due_date: string | null
          id: string
          invoice_number: string
          omise_charge_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          pdf_url: string | null
          plan: Database["public"]["Enums"]["plan_type"] | null
          plan_name: string
          tenant_id: string
          total_amount: number
          vat_7: number
        }
        Insert: {
          amount_before_vat: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          omise_charge_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          pdf_url?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          plan_name: string
          tenant_id: string
          total_amount: number
          vat_7: number
        }
        Update: {
          amount_before_vat?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          omise_charge_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          pdf_url?: string | null
          plan?: Database["public"]["Enums"]["plan_type"] | null
          plan_name?: string
          tenant_id?: string
          total_amount?: number
          vat_7?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_end: string | null
          id: string
          last_payment_amount: number | null
          last_payment_date: string | null
          next_billing_date: string | null
          omise_card_id: string | null
          omise_customer_id: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          next_billing_date?: string | null
          omise_card_id?: string | null
          omise_customer_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_date?: string | null
          next_billing_date?: string | null
          omise_card_id?: string | null
          omise_customer_id?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_counters: {
        Row: {
          receipt_counter: number
          tenant_id: string
        }
        Insert: {
          receipt_counter?: number
          tenant_id: string
        }
        Update: {
          receipt_counter?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          business_type: Database["public"]["Enums"]["business_type"]
          cancelled_at: string | null
          consent_version: string | null
          created_at: string
          email: string
          hard_delete_after: string | null
          id: string
          logo_url: string | null
          name: string
          owner_name: string
          pdpa_consent_at: string | null
          pdpa_consent_ip: unknown
          phone: string
          promptpay_id: string | null
          settings: Json
          status: Database["public"]["Enums"]["tenant_status"]
          tax_id: string | null
          rating_avg: number
          review_count: number
          sport_types: string[]
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          cancelled_at?: string | null
          consent_version?: string | null
          created_at?: string
          email: string
          hard_delete_after?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_name: string
          pdpa_consent_at?: string | null
          pdpa_consent_ip?: unknown
          phone: string
          promptpay_id?: string | null
          settings?: Json
          status?: Database["public"]["Enums"]["tenant_status"]
          tax_id?: string | null
          rating_avg?: number | null
          review_count?: number | null
          sport_types?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"]
          cancelled_at?: string | null
          consent_version?: string | null
          created_at?: string
          email?: string
          hard_delete_after?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_name?: string
          pdpa_consent_at?: string | null
          pdpa_consent_ip?: unknown
          phone?: string
          promptpay_id?: string | null
          settings?: Json
          status?: Database["public"]["Enums"]["tenant_status"]
          tax_id?: string | null
          rating_avg?: number | null
          review_count?: number | null
          sport_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          category_id: string | null
          sku: string | null
          barcode: string | null
          name: string
          product_type: "product" | "rental" | "service"
          cost_price: number
          selling_price: number
          low_stock_threshold: number
          track_stock: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          category_id?: string | null
          sku?: string | null
          barcode?: string | null
          name: string
          product_type?: "product" | "rental" | "service"
          cost_price?: number
          selling_price: number
          low_stock_threshold?: number
          track_stock?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          category_id?: string | null
          sku?: string | null
          barcode?: string | null
          name?: string
          product_type?: "product" | "rental" | "service"
          cost_price?: number
          selling_price?: number
          low_stock_threshold?: number
          track_stock?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branch_id: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string
          shift_id: string | null
          booking_id: string | null
          staff_id: string | null
          sale_number: string
          receipt_number: string
          customer_name: string | null
          customer_phone: string | null
          subtotal: number
          discount_amount: number
          total_amount: number
          status: "completed" | "voided"
          note: string | null
          completed_at: string
          voided_at: string | null
          void_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branch_id: string
          shift_id?: string | null
          booking_id?: string | null
          staff_id?: string | null
          sale_number: string
          receipt_number: string
          customer_name?: string | null
          customer_phone?: string | null
          subtotal?: number
          discount_amount?: number
          total_amount?: number
          status?: "completed" | "voided"
          note?: string | null
          completed_at?: string
          voided_at?: string | null
          void_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string
          shift_id?: string | null
          booking_id?: string | null
          staff_id?: string | null
          sale_number?: string
          receipt_number?: string
          customer_name?: string | null
          customer_phone?: string | null
          subtotal?: number
          discount_amount?: number
          total_amount?: number
          status?: "completed" | "voided"
          note?: string | null
          completed_at?: string
          voided_at?: string | null
          void_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          product_id: string | null
          product_name: string
          product_type: "product" | "rental" | "service"
          quantity: number
          unit_price: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          product_id?: string | null
          product_name: string
          product_type: "product" | "rental" | "service"
          quantity: number
          unit_price: number
          line_total: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          product_id?: string | null
          product_name?: string
          product_type?: "product" | "rental" | "service"
          quantity?: number
          unit_price?: number
          line_total?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_payments: {
        Row: {
          id: string
          tenant_id: string
          sale_id: string
          method: "cash" | "transfer" | "card" | "other"
          amount: number
          reference: string | null
          received_by: string | null
          paid_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_id: string
          method: "cash" | "transfer" | "card" | "other"
          amount: number
          reference?: string | null
          received_by?: string | null
          paid_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          sale_id?: string
          method?: "cash" | "transfer" | "card" | "other"
          amount?: number
          reference?: string | null
          received_by?: string | null
          paid_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shifts: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string
          opened_by: string | null
          closed_by: string | null
          opened_at: string
          closed_at: string | null
          status: "open" | "closed"
          starting_cash: number
          actual_closing_cash: number | null
          expected_closing_cash: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branch_id: string
          opened_by?: string | null
          closed_by?: string | null
          opened_at?: string
          closed_at?: string | null
          status?: "open" | "closed"
          starting_cash?: number
          actual_closing_cash?: number | null
          expected_closing_cash?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string
          opened_by?: string | null
          closed_by?: string | null
          opened_at?: string
          closed_at?: string | null
          status?: "open" | "closed"
          starting_cash?: number
          actual_closing_cash?: number | null
          expected_closing_cash?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string
          product_id: string
          sale_id: string | null
          movement_type: "purchase" | "sale" | "return" | "adjustment" | "damage" | "transfer" | "initial"
          quantity_change: number
          quantity_after: number
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branch_id: string
          product_id: string
          sale_id?: string | null
          movement_type: "purchase" | "sale" | "return" | "adjustment" | "damage" | "transfer" | "initial"
          quantity_change: number
          quantity_after: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string
          product_id?: string
          sale_id?: string | null
          movement_type?: "purchase" | "sale" | "return" | "adjustment" | "damage" | "transfer" | "initial"
          quantity_change?: number
          quantity_after?: number
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          profile_id: string
          role: "player" | "coach" | "facility_owner"
          is_active: boolean
          granted_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role: "player" | "coach" | "facility_owner"
          is_active?: boolean
          granted_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          role?: "player" | "coach" | "facility_owner"
          is_active?: boolean
          granted_at?: string
        }
        Relationships: []
      }
      coach_profiles: {
        Row: {
          id: string
          profile_id: string
          display_name: string
          sport: string
          skill_level: string | null
          experience_years: number | null
          biography: string | null
          cover_image_url: string | null
          profile_image_url: string | null
          location_province: string | null
          latitude: number | null
          longitude: number | null
          payment_info: string | null
          approval_status: "pending" | "approved" | "rejected" | "suspended"
          approved_at: string | null
          approved_by: string | null
          rejection_reason: string | null
          rating_avg: number
          review_count: number
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          display_name: string
          sport: string
          skill_level?: string | null
          experience_years?: number | null
          biography?: string | null
          cover_image_url?: string | null
          profile_image_url?: string | null
          location_province?: string | null
          latitude?: number | null
          longitude?: number | null
          payment_info?: string | null
          approval_status?: "pending" | "approved" | "rejected" | "suspended"
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          rating_avg?: number
          review_count?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          display_name?: string
          sport?: string
          skill_level?: string | null
          experience_years?: number | null
          biography?: string | null
          cover_image_url?: string | null
          profile_image_url?: string | null
          location_province?: string | null
          latitude?: number | null
          longitude?: number | null
          payment_info?: string | null
          approval_status?: "pending" | "approved" | "rejected" | "suspended"
          approved_at?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          rating_avg?: number
          review_count?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_certificates: {
        Row: {
          id: string
          coach_profile_id: string
          name: string
          issuing_org: string | null
          issued_date: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          coach_profile_id: string
          name: string
          issuing_org?: string | null
          issued_date?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          coach_profile_id?: string
          name?: string
          issuing_org?: string | null
          issued_date?: string | null
          image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      coach_media: {
        Row: {
          id: string
          coach_profile_id: string
          media_type: "image" | "video"
          url: string
          caption: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          coach_profile_id: string
          media_type: "image" | "video"
          url: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          coach_profile_id?: string
          media_type?: "image" | "video"
          url?: string
          caption?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      coach_services: {
        Row: {
          id: string
          coach_profile_id: string
          name: string
          description: string | null
          duration_minutes: number
          price: number
          max_participants: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_profile_id: string
          name: string
          description?: string | null
          duration_minutes?: number
          price: number
          max_participants?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_profile_id?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          price?: number
          max_participants?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_schedules: {
        Row: {
          id: string
          coach_profile_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
        }
        Insert: {
          id?: string
          coach_profile_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean
        }
        Update: {
          id?: string
          coach_profile_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
        }
        Relationships: []
      }
      coach_bookings: {
        Row: {
          id: string
          coach_profile_id: string
          player_profile_id: string
          service_id: string
          booking_date: string
          start_time: string
          end_time: string
          location_note: string | null
          total_price: number
          status: "requested" | "accepted" | "rejected" | "confirmed" | "in_progress" | "completed" | "cancelled"
          slip_image_url: string | null
          player_note: string | null
          coach_note: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          cancelled_by: "player" | "coach" | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_profile_id: string
          player_profile_id: string
          service_id: string
          booking_date: string
          start_time: string
          end_time: string
          location_note?: string | null
          total_price: number
          status?: "requested" | "accepted" | "rejected" | "confirmed" | "in_progress" | "completed" | "cancelled"
          slip_image_url?: string | null
          player_note?: string | null
          coach_note?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          cancelled_by?: "player" | "coach" | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_profile_id?: string
          player_profile_id?: string
          service_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          location_note?: string | null
          total_price?: number
          status?: "requested" | "accepted" | "rejected" | "confirmed" | "in_progress" | "completed" | "cancelled"
          slip_image_url?: string | null
          player_note?: string | null
          coach_note?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          cancelled_by?: "player" | "coach" | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_bookings_coach_profile_id_fkey"
            columns: ["coach_profile_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bookings_player_profile_id_fkey"
            columns: ["player_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "coach_services"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          reviewer_id: string
          entity_type: "facility" | "coach"
          facility_id: string | null
          coach_id: string | null
          coach_profile_id: string | null
          booking_id: string | null
          rating_overall: number
          rating_cleanliness: number | null
          rating_court: number | null
          rating_bathroom: number | null
          rating_parking: number | null
          rating_service: number | null
          rating_technique: number | null
          rating_communication: number | null
          rating_punctuality: number | null
          rating_value: number | null
          comment: string | null
          is_visible: boolean
          reported_at: string | null
          report_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reviewer_id: string
          entity_type: "facility" | "coach"
          facility_id?: string | null
          coach_id?: string | null
          coach_profile_id?: string | null
          booking_id?: string | null
          rating_overall: number
          rating_cleanliness?: number | null
          rating_court?: number | null
          rating_bathroom?: number | null
          rating_parking?: number | null
          rating_service?: number | null
          rating_technique?: number | null
          rating_communication?: number | null
          rating_punctuality?: number | null
          rating_value?: number | null
          comment?: string | null
          is_visible?: boolean
          reported_at?: string | null
          report_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reviewer_id?: string
          entity_type?: "facility" | "coach"
          facility_id?: string | null
          coach_id?: string | null
          coach_profile_id?: string | null
          booking_id?: string | null
          rating_overall?: number
          rating_cleanliness?: number | null
          rating_court?: number | null
          rating_bathroom?: number | null
          rating_parking?: number | null
          rating_service?: number | null
          rating_technique?: number | null
          rating_communication?: number | null
          rating_punctuality?: number | null
          rating_value?: number | null
          comment?: string | null
          is_visible?: boolean
          reported_at?: string | null
          report_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_coach_profile_id_fkey"
            columns: ["coach_profile_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          creator_id: string
          sport: string
          facility_id: string | null
          branch_id: string | null
          title: string
          description: string | null
          play_date: string
          start_time: string
          end_time: string
          max_players: number
          current_players: number
          skill_level: string | null
          cost_per_person: number | null
          booking_id: string | null
          status: "open" | "full" | "booked" | "completed" | "cancelled"
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          creator_id: string
          sport: string
          facility_id?: string | null
          branch_id?: string | null
          title: string
          description?: string | null
          play_date: string
          start_time: string
          end_time: string
          max_players: number
          current_players?: number
          skill_level?: string | null
          cost_per_person?: number | null
          booking_id?: string | null
          status?: "open" | "full" | "booked" | "completed" | "cancelled"
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          creator_id?: string
          sport?: string
          facility_id?: string | null
          branch_id?: string | null
          title?: string
          description?: string | null
          play_date?: string
          start_time?: string
          end_time?: string
          max_players?: number
          current_players?: number
          skill_level?: string | null
          cost_per_person?: number | null
          booking_id?: string | null
          status?: "open" | "full" | "booked" | "completed" | "cancelled"
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          profile_id: string
          joined_at: string
          is_creator: boolean
        }
        Insert: {
          id?: string
          group_id: string
          profile_id: string
          joined_at?: string
          is_creator?: boolean
        }
        Update: {
          id?: string
          group_id?: string
          profile_id?: string
          joined_at?: string
          is_creator?: boolean
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          tenant_id: string
          branch_id: string | null
          organizer_id: string
          name: string
          sport: string
          description: string | null
          banner_image_url: string | null
          start_date: string
          end_date: string | null
          registration_deadline: string | null
          entry_fee: number
          max_teams: number | null
          rules: string | null
          prize_info: string | null
          bracket_type: "single_elimination" | "double_elimination" | "round_robin" | "group_knockout"
          status: "draft" | "registration_open" | "registration_closed" | "in_progress" | "completed" | "cancelled"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          branch_id?: string | null
          organizer_id: string
          name: string
          sport: string
          description?: string | null
          banner_image_url?: string | null
          start_date: string
          end_date?: string | null
          registration_deadline?: string | null
          entry_fee?: number
          max_teams?: number | null
          rules?: string | null
          prize_info?: string | null
          bracket_type?: "single_elimination" | "double_elimination" | "round_robin" | "group_knockout"
          status?: "draft" | "registration_open" | "registration_closed" | "in_progress" | "completed" | "cancelled"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          branch_id?: string | null
          organizer_id?: string
          name?: string
          sport?: string
          description?: string | null
          banner_image_url?: string | null
          start_date?: string
          end_date?: string | null
          registration_deadline?: string | null
          entry_fee?: number
          max_teams?: number | null
          rules?: string | null
          prize_info?: string | null
          bracket_type?: "single_elimination" | "double_elimination" | "round_robin" | "group_knockout"
          status?: "draft" | "registration_open" | "registration_closed" | "in_progress" | "completed" | "cancelled"
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_categories: {
        Row: {
          id: string
          tournament_id: string
          name: string
          max_teams: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          max_teams?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          max_teams?: number | null
          created_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          tournament_id: string
          category_id: string | null
          name: string
          seed: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          category_id?: string | null
          name: string
          seed?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          category_id?: string | null
          name?: string
          seed?: number | null
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          profile_id: string
          is_captain: boolean
        }
        Insert: {
          id?: string
          team_id: string
          profile_id: string
          is_captain?: boolean
        }
        Update: {
          id?: string
          team_id?: string
          profile_id?: string
          is_captain?: boolean
        }
        Relationships: []
      }
      tournament_registrations: {
        Row: {
          id: string
          tournament_id: string
          category_id: string | null
          team_id: string | null
          player_id: string
          payment_status: "pending" | "paid" | "refunded"
          slip_image_url: string | null
          registered_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          category_id?: string | null
          team_id?: string | null
          player_id: string
          payment_status?: "pending" | "paid" | "refunded"
          slip_image_url?: string | null
          registered_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          category_id?: string | null
          team_id?: string | null
          player_id?: string
          payment_status?: "pending" | "paid" | "refunded"
          slip_image_url?: string | null
          registered_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          category_id: string | null
          round: number
          match_number: number
          team_a_id: string | null
          team_b_id: string | null
          winner_id: string | null
          score_a: string | null
          score_b: string | null
          court_id: string | null
          scheduled_at: string | null
          started_at: string | null
          completed_at: string | null
          duration_minutes: number | null
          status: "scheduled" | "in_progress" | "completed" | "cancelled"
          notes: string | null
          next_match_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          category_id?: string | null
          round: number
          match_number: number
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
          score_a?: string | null
          score_b?: string | null
          court_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_minutes?: number | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          notes?: string | null
          next_match_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          category_id?: string | null
          round?: number
          match_number?: number
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
          score_a?: string | null
          score_b?: string | null
          court_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_minutes?: number | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          notes?: string | null
          next_match_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      elo_ratings: {
        Row: {
          id: string
          profile_id: string
          sport: string
          rating: number
          games_played: number
          wins: number
          losses: number
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          sport: string
          rating?: number
          games_played?: number
          wins?: number
          losses?: number
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          sport?: string
          rating?: number
          games_played?: number
          wins?: number
          losses?: number
          updated_at?: string
        }
        Relationships: []
      }
      elo_history: {
        Row: {
          id: string
          profile_id: string
          sport: string
          match_id: string | null
          tournament_id: string | null
          opponent_id: string | null
          rating_before: number
          rating_after: number
          rating_change: number
          result: "win" | "loss" | "draw"
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          sport: string
          match_id?: string | null
          tournament_id?: string | null
          opponent_id?: string | null
          rating_before: number
          rating_after: number
          rating_change: number
          result: "win" | "loss" | "draw"
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          sport?: string
          match_id?: string | null
          tournament_id?: string | null
          opponent_id?: string | null
          rating_before?: number
          rating_after?: number
          rating_change?: number
          result?: "win" | "loss" | "draw"
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      branch_occupancy: {
        Row: {
          branch_id: string | null
          current_occupancy: number | null
          max_capacity: number | null
          name: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      auth_tenant_id: { Args: never; Returns: string }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_venue_admin: { Args: never; Returns: boolean }
      my_branch_ids: { Args: never; Returns: string[] }
      next_receipt_number: { Args: { p_tenant: string }; Returns: string }
      adjust_inventory: {
        Args: {
          p_tenant_id: string
          p_branch_id: string
          p_product_id: string
          p_quantity_change: number
          p_movement_type: string
          p_note?: string | null
          p_created_by?: string | null
          p_sale_id?: string | null
        }
        Returns: number
      }
      open_pos_shift: {
        Args: {
          p_tenant_id: string
          p_branch_id: string
          p_staff_id?: string | null
          p_starting_cash: number
        }
        Returns: string
      }
      close_pos_shift: {
        Args: {
          p_tenant_id: string
          p_shift_id: string
          p_staff_id?: string | null
          p_actual_cash: number
          p_notes?: string | null
        }
        Returns: void
      }
      complete_pos_sale: {
        Args: {
          p_tenant_id: string
          p_branch_id: string
          p_staff_id?: string | null
          p_shift_id: string
          p_payment_method: string
          p_items: Json
          p_customer_name?: string | null
          p_customer_phone?: string | null
          p_booking_id?: string | null
          p_note?: string | null
          p_discount_amount?: number
        }
        Returns: {
          sale_id: string
          receipt_number: string
          total_amount: number
        }[]
      }
    }
    Enums: {
      blog_status: "draft" | "published" | "pending_review"
      booking_status:
        | "pending_payment"
        | "awaiting_verification"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "awaiting_refund"
        | "refunded"
      branch_status: "active" | "inactive" | "maintenance"
      business_type: "sports_venue" | "fitness" | "both"
      checkin_fail_reason:
        | "expired"
        | "frozen"
        | "branch_denied"
        | "session_limit"
        | "capacity_full"
        | "invalid_qr"
      checkin_method: "qr" | "staff" | "kiosk" | "guest_pass"
      checkin_result: "passed" | "failed"
      checkout_method: "auto" | "kiosk_scan" | "staff_manual"
      coupon_status: "active" | "inactive" | "expired"
      court_status: "open" | "closed" | "maintenance"
      discount_type: "percent" | "fixed"
      freeze_request_status: "pending" | "approved" | "rejected"
      member_status: "active" | "expired" | "frozen"
      notification_channel: "line" | "email" | "in_app"
      notification_status: "sent" | "failed" | "pending"
      notification_type:
        | "booking"
        | "payment"
        | "membership"
        | "promotion"
        | "system"
      package_type:
        | "daily"
        | "weekly"
        | "monthly"
        | "three_month"
        | "six_month"
        | "yearly"
        | "session_based"
      payment_method: "online_qr" | "walk_in_cash" | "walk_in_transfer"
      payment_status: "awaiting_verification" | "verified" | "rejected"
      plan_type: "free" | "growth" | "pro"
      price_type: "standard" | "peak" | "offpeak"
      refund_status: "awaiting_refund" | "refunded"
      subscription_status:
        | "active"
        | "trial"
        | "grace"
        | "suspended"
        | "cancelled"
      tenant_status:
        | "active"
        | "trial"
        | "free"
        | "suspended"
        | "cancelled_pending_delete"
      user_role: "super_admin" | "venue_admin" | "staff" | "member"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      blog_status: ["draft", "published", "pending_review"],
      booking_status: [
        "pending_payment",
        "awaiting_verification",
        "confirmed",
        "rejected",
        "cancelled",
        "awaiting_refund",
        "refunded",
      ],
      branch_status: ["active", "inactive", "maintenance"],
      business_type: ["sports_venue", "fitness", "both"],
      checkin_fail_reason: [
        "expired",
        "frozen",
        "branch_denied",
        "session_limit",
        "capacity_full",
        "invalid_qr",
      ],
      checkin_method: ["qr", "staff", "kiosk", "guest_pass"],
      checkin_result: ["passed", "failed"],
      checkout_method: ["auto", "kiosk_scan", "staff_manual"],
      coupon_status: ["active", "inactive", "expired"],
      court_status: ["open", "closed", "maintenance"],
      discount_type: ["percent", "fixed"],
      freeze_request_status: ["pending", "approved", "rejected"],
      member_status: ["active", "expired", "frozen"],
      notification_channel: ["line", "email", "in_app"],
      notification_status: ["sent", "failed", "pending"],
      notification_type: [
        "booking",
        "payment",
        "membership",
        "promotion",
        "system",
      ],
      package_type: [
        "daily",
        "weekly",
        "monthly",
        "three_month",
        "six_month",
        "yearly",
        "session_based",
      ],
      payment_method: ["online_qr", "walk_in_cash", "walk_in_transfer"],
      payment_status: ["awaiting_verification", "verified", "rejected"],
      plan_type: ["free", "growth", "pro"],
      price_type: ["standard", "peak", "offpeak"],
      refund_status: ["awaiting_refund", "refunded"],
      subscription_status: [
        "active",
        "trial",
        "grace",
        "suspended",
        "cancelled",
      ],
      tenant_status: [
        "active",
        "trial",
        "free",
        "suspended",
        "cancelled_pending_delete",
      ],
      user_role: ["super_admin", "venue_admin", "staff", "member"],
    },
  },
} as const
