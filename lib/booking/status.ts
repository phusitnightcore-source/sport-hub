import type { Database } from "@/lib/supabase/types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

type PillTone = "success" | "danger" | "warning" | "brand";

// ป้ายสถานะภาษาไทยตาม SCOPE.md §9.3 + tone ของ StatusPill
export const BOOKING_STATUS_LABEL: Record<
  BookingStatus,
  { label: string; tone: PillTone }
> = {
  pending_payment: { label: "รอชำระ", tone: "warning" },
  awaiting_verification: { label: "รอยืนยัน", tone: "warning" },
  confirmed: { label: "ยืนยันแล้ว", tone: "success" },
  rejected: { label: "ปฏิเสธ", tone: "danger" },
  cancelled: { label: "ยกเลิก", tone: "danger" },
  awaiting_refund: { label: "รอคืนเงิน", tone: "warning" },
  refunded: { label: "คืนเงินแล้ว", tone: "brand" },
};
