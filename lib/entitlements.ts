import type { PlanType } from "@/lib/plans";

// สิทธิ์การใช้งานต่อแพลน (§5/§26) — ค่าคงที่ + type ที่ใช้ได้ทั้ง client/server
// ฟังก์ชันอ่าน/เขียน DB อยู่ใน lib/entitlements.server.ts (server-only)

export type PlanEntitlements = {
  online_payment: boolean;
  monthly_booking_limit: number | null;
  max_courts: number | null;
  max_branches: number | null;
  line_notify: boolean;
  member_system: boolean;
  peak_pricing: boolean;
  broadcast: boolean;
  export_reports: boolean;
  guest_pass: boolean;
  kiosk_mode: boolean;
  custom_domain: boolean;
  analytics: boolean;
};

// ค่าเริ่มต้น (ตรงกับ seed ใน migration + lib/plans.ts เดิม) — fallback เมื่อยังไม่ apply migration
export const DEFAULT_ENTITLEMENTS: Record<PlanType, PlanEntitlements> = {
  free: {
    online_payment: false, monthly_booking_limit: 30, max_courts: 1, max_branches: 1,
    line_notify: false, member_system: false, peak_pricing: false, broadcast: false,
    export_reports: false, guest_pass: false, kiosk_mode: false, custom_domain: false,
    analytics: false,
  },
  growth: {
    online_payment: true, monthly_booking_limit: null, max_courts: null, max_branches: null,
    line_notify: true, member_system: true, peak_pricing: true, broadcast: true,
    export_reports: true, guest_pass: false, kiosk_mode: false, custom_domain: false,
    analytics: true,
  },
  pro: {
    online_payment: true, monthly_booking_limit: null, max_courts: null, max_branches: null,
    line_notify: true, member_system: true, peak_pricing: true, broadcast: true,
    export_reports: true, guest_pass: true, kiosk_mode: true, custom_domain: true,
    analytics: true,
  },
};

export const FEATURE_FLAGS = [
  "online_payment", "line_notify", "member_system", "peak_pricing", "broadcast",
  "export_reports", "guest_pass", "kiosk_mode", "custom_domain", "analytics",
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  online_payment: "รับชำระออนไลน์ (QR PromptPay)",
  line_notify: "แจ้งเตือน LINE อัตโนมัติ",
  member_system: "ระบบสมาชิกฟิตเนส",
  peak_pricing: "ราคา Peak / Off-peak",
  broadcast: "Broadcast หาสมาชิก",
  export_reports: "Export รายงาน (CSV/Excel)",
  guest_pass: "Guest Pass",
  kiosk_mode: "Kiosk Mode + Dynamic QR",
  custom_domain: "Custom Domain",
  analytics: "หน้า Analytics",
};

export const LIMIT_FIELDS = [
  "monthly_booking_limit", "max_courts", "max_branches",
] as const;
export type LimitField = (typeof LIMIT_FIELDS)[number];

export const LIMIT_LABELS: Record<LimitField, string> = {
  monthly_booking_limit: "จำกัดจอง/เดือน (ว่าง = ไม่จำกัด)",
  max_courts: "จำนวนสนามสูงสุด (ว่าง = ไม่จำกัด)",
  max_branches: "จำนวนสาขาสูงสุด (ว่าง = ไม่จำกัด)",
};
