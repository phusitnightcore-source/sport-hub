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
          package_id: string | null
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
          package_id?: string | null
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
          package_id?: string | null
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
          updated_at?: string
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
    }
    Enums: {
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
