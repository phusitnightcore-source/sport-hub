import type { Database } from "@/lib/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

// RBAC baseline (§26) — แหล่งความจริงเดียวของสิทธิ์ตาม role
// venue_admin = ทุกสิทธิ์ใน tenant / staff = สิทธิ์พื้นฐาน + ที่ admin ปลดล็อกเพิ่ม (extra_permissions)

// สิทธิ์พื้นฐานของ staff ทุกคน (Staff Default §26) — ไม่ต้อง unlock
export const STAFF_DEFAULT_PERMISSIONS = [
  "block_time",         // บล็อกเวลาสนาม
  "view_bookings_own",  // ดูตารางจอง (สาขาตัวเอง)
  "create_booking",     // สร้างการจองให้ลูกค้า
  "add_member",         // เพิ่มสมาชิกใหม่
  "checkin_member",     // เช็คอินสมาชิก
] as const;

// สิทธิ์ที่ venue_admin ปลดล็อกให้ staff รายบุคคลได้ (Staff Extended §26)
export const STAFF_GRANTABLE_PERMISSIONS = [
  "cancel_booking",     // ยกเลิกการจอง
  "verify_slip",        // ยืนยัน/ปฏิเสธสลิป
  "confirm_refund",     // ยืนยันคืนเงิน
  "edit_member",        // แก้ไขข้อมูลสมาชิก
  "freeze_member",      // Freeze/Unfreeze
  "issue_guest_pass",   // ออก Guest Pass
  "use_pos",            // POS / Checkout / Receipt (Cashier)
  "manage_inventory",   // สินค้าและปรับสต็อก (Manager)
] as const;

// สิทธิ์เฉพาะ venue_admin (ไม่ปลดล็อกให้ staff — §26)
export const ADMIN_ONLY_PERMISSIONS = [
  "manage_branch", "manage_court", "view_bookings_all", "delete_member",
  "view_revenue", "export_reports", "manage_package", "manage_coupon",
  "broadcast", "view_audit", "manage_staff", "manage_settings",
] as const;

export type Permission =
  | (typeof STAFF_DEFAULT_PERMISSIONS)[number]
  | (typeof STAFF_GRANTABLE_PERMISSIONS)[number]
  | (typeof ADMIN_ONLY_PERMISSIONS)[number];

// ป้ายไทยของทุกสิทธิ์ — ใช้ในหน้าจัดการ Staff (เลือกสิทธิ์พิเศษ)
export const PERMISSION_LABELS: Record<Permission, string> = {
  block_time: "บล็อกเวลาสนาม",
  view_bookings_own: "ดูตารางจอง (สาขาตัวเอง)",
  create_booking: "สร้างการจองให้ลูกค้า",
  add_member: "เพิ่มสมาชิกใหม่",
  checkin_member: "เช็คอินสมาชิก",
  cancel_booking: "ยกเลิกการจอง",
  verify_slip: "ยืนยัน / ปฏิเสธสลิป",
  confirm_refund: "ยืนยันคืนเงิน",
  edit_member: "แก้ไขข้อมูลสมาชิก",
  freeze_member: "Freeze / Unfreeze สมาชิก",
  issue_guest_pass: "ออก Guest Pass",
  use_pos: "ใช้งาน POS / Checkout / ใบเสร็จ",
  manage_inventory: "จัดการสินค้าและคลังสต็อก",
  manage_branch: "จัดการสาขา",
  manage_court: "จัดการสนาม / ราคา",
  view_bookings_all: "ดูตารางจอง (ทุกสาขา)",
  delete_member: "ลบสมาชิก",
  view_revenue: "ดู Revenue Dashboard",
  export_reports: "Export รายงาน",
  manage_package: "จัดการแพ็กเกจ",
  manage_coupon: "จัดการคูปอง",
  broadcast: "Broadcast หาสมาชิก",
  view_audit: "ดู Audit Log",
  manage_staff: "จัดการพนักงานและสิทธิ์",
  manage_settings: "จัดการตั้งค่า",
};

const STAFF_DEFAULT_SET: ReadonlySet<string> = new Set(STAFF_DEFAULT_PERMISSIONS);

/**
 * เช็คสิทธิ์ตาม role (baseline §26):
 * - venue_admin: ทุกสิทธิ์
 * - staff: สิทธิ์พื้นฐาน ∪ สิทธิ์ที่ปลดล็อกเพิ่ม (extra_permissions)
 * - อื่นๆ (super_admin/member): false (super_admin ใช้ context แยก, member ไม่มีสิทธิ์ฝั่ง admin)
 */
export function roleHasPermission(
  role: UserRole,
  extraPermissions: string[],
  permission: string,
): boolean {
  if (role === "venue_admin") return true;
  if (role === "staff") {
    return STAFF_DEFAULT_SET.has(permission) || extraPermissions.includes(permission);
  }
  return false;
}
