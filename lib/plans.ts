import type { Database } from "@/lib/supabase/types";

export type PlanType = Database["public"]["Enums"]["plan_type"];

// Pricing ตาม SCOPE.md §5 — ราคาที่แสดง (รวม VAT) เก็บเป็นสตางค์
// Invoice ต้องแยก amount_before_vat + vat_7 (§11.3)
export const PLANS: Record<
  PlanType,
  {
    name: string;
    priceSatang: number;
    features: string[];
    /** จำกัดจำนวนจอง/เดือน (null = ไม่จำกัด) */
    monthlyBookingLimit: number | null;
    /** รับชำระออนไลน์ QR PromptPay ได้ไหม */
    onlinePayment: boolean;
    maxCourts: number | null;
  }
> = {
  free: {
    name: "Free",
    priceSatang: 0,
    monthlyBookingLimit: 30,
    onlinePayment: false,
    maxCourts: 1,
    features: [
      "สนาม 1 สนาม",
      "รับจองไม่เกิน 30 ครั้ง/เดือน",
      "ลูกค้าชำระหน้าร้านเท่านั้น",
      "Dashboard เบื้องต้น",
    ],
  },
  growth: {
    name: "Growth",
    priceSatang: 89900,
    monthlyBookingLimit: null,
    onlinePayment: true,
    maxCourts: null,
    features: [
      "สนามไม่จำกัด รับจองไม่จำกัด",
      "Online Payment QR PromptPay + สลิป",
      "แจ้งเตือน LINE อัตโนมัติ",
      "ระบบสมาชิกฟิตเนสไม่จำกัด",
      "ราคา Peak/Off-peak + Broadcast + Export Excel",
    ],
  },
  pro: {
    name: "Pro",
    priceSatang: 149900,
    monthlyBookingLimit: null,
    onlinePayment: true,
    maxCourts: null,
    features: [
      "ทุกอย่างใน Growth",
      "Multi-venue Check-in สูงสุด 5 สาขา",
      "Kiosk Mode + Dynamic QR บัตรสมาชิก",
      "Guest Pass + Custom Domain",
      "Priority Support ตอบภายใน 4 ชม.",
    ],
  },
};

/** แตกยอดรวม (สตางค์) เป็นก่อน VAT + VAT 7% — ผลรวมกลับมาเท่าเดิมเป๊ะ */
export function vatBreakdown(totalSatang: number): {
  beforeVatSatang: number;
  vatSatang: number;
} {
  const beforeVatSatang = Math.round(totalSatang / 1.07);
  return { beforeVatSatang, vatSatang: totalSatang - beforeVatSatang };
}

/**
 * Pro-rata upgrade กลางรอบ (§11.4): (ราคาใหม่ − ราคาเดิม) × วันที่เหลือ/วันทั้งรอบ
 * คำนวณเป็นสตางค์ปัดลงระดับสตางค์
 */
export function prorateUpgradeSatang(params: {
  fromPlan: PlanType;
  toPlan: PlanType;
  daysLeft: number;
  daysInPeriod: number;
}): number {
  const diff =
    PLANS[params.toPlan].priceSatang - PLANS[params.fromPlan].priceSatang;
  if (diff <= 0 || params.daysInPeriod <= 0) return 0;
  return Math.round((diff * params.daysLeft) / params.daysInPeriod);
}

/** จำนวนวันที่เหลือจนถึงวันที่กำหนด (ปัดขึ้น, ต่ำสุด 0) */
export function daysUntil(dateStr: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000),
  );
}

/**
 * แพลนที่ active จริงของ subscription — เช็คหมดอายุแบบ real-time (ไม่รอ cron)
 * trial ใช้ฟีเจอร์ Growth เต็ม (§4) / grace ใช้แพลนเดิมได้จนหมด grace_period_end (§11.2)
 * ทั้ง trial และ grace ที่เลยกำหนดแล้ว → ตัดเป็น free ทันทีเพื่อกันเข้าถึงฟีเจอร์จ่ายเงินฟรี
 */
export function effectivePlan(sub: {
  plan: PlanType;
  status: Database["public"]["Enums"]["subscription_status"];
  trial_end: string | null;
  grace_period_end?: string | null;
}): PlanType {
  const now = Date.now();
  if (sub.status === "trial") {
    const stillInTrial =
      !sub.trial_end || new Date(sub.trial_end).getTime() > now;
    return stillInTrial ? "growth" : "free";
  }
  if (sub.status === "suspended" || sub.status === "cancelled") return "free";
  if (sub.status === "grace") {
    const stillInGrace =
      !!sub.grace_period_end && new Date(sub.grace_period_end).getTime() > now;
    return stillInGrace ? sub.plan : "free";
  }
  return sub.plan; // active
}
