import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { apiError, bangkokToday } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const querySchema = z.object({
  type: z.enum(["bookings", "members", "payments", "sales"]),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  // BOM ให้ Excel เปิดภาษาไทยถูกต้อง (§15 Export Excel)
  return "﻿" + lines.join("\r\n");
}

// Export รายงานเป็น CSV (เปิดใน Excel ได้) — §7.2/§8.2/§15
// อ่านผ่าน session client → RLS จำกัดข้อมูลตาม tenant/สาขาของผู้ใช้เอง
export async function GET(request: Request) {
  const ctx = await getStaffContext();
  if (!ctx) return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    type: url.searchParams.get("type"),
    month: url.searchParams.get("month") ?? undefined,
  });
  if (!parsed.success) return apiError("VALIDATION_ERROR", "พารามิเตอร์ไม่ถูกต้อง", 400);
  const month = parsed.data.month ?? bangkokToday().slice(0, 7);
  const monthStartIso = new Date(`${month}-01T00:00:00+07:00`).toISOString();
  const nextMonth = new Date(`${month}-01T00:00:00+07:00`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  const supabase = await createClient();

  // Plan gating — Export เฉพาะแพลนที่มีสิทธิ์ (กันเรียก URL ตรงแม้ปุ่มถูกซ่อน)
  const { entitlements } = await getTenantEntitlements(supabase, ctx.tenantId);
  if (!entitlements.export_reports) {
    return apiError("SUBSCRIPTION_INACTIVE", "แพลนนี้ยังไม่รองรับการ Export รายงาน", 402);
  }

  let csv: string;
  let filename: string;

  if (parsed.data.type === "bookings") {
    const { data } = await supabase
      .from("bookings")
      .select(
        "booking_code, booking_date, start_time, end_time, user_name, user_phone, total_price, discount_amount, price_type, status, payment_method, created_at, courts(name), branches(name)",
      )
      .gte("created_at", monthStartIso)
      .lt("created_at", nextMonth.toISOString())
      .order("created_at");
    const rows = (data ?? []).map((b) => ({
      รหัสจอง: b.booking_code,
      วันที่: b.booking_date,
      เวลา: `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}`,
      สนาม: b.courts?.name,
      สาขา: b.branches?.name,
      ชื่อลูกค้า: b.user_name,
      เบอร์โทร: b.user_phone,
      ราคารวม: b.total_price,
      ส่วนลด: b.discount_amount,
      ประเภทราคา: b.price_type,
      สถานะ: b.status,
      ช่องทางชำระ: b.payment_method,
      วันที่ทำรายการ: b.created_at,
    }));
    csv = toCsv(rows, Object.keys(rows[0] ?? { ไม่มีข้อมูล: "" }));
    filename = `bookings-${month}.csv`;
  } else if (parsed.data.type === "payments") {
    // รายงานรายได้ (§15.1) — เฉพาะสลิปที่ยืนยันแล้วในเดือนที่เลือก
    const { data } = await supabase
      .from("payments")
      .select(
        "amount, status, method, booking_id, member_id, verified_at, submitted_at",
      )
      .eq("status", "verified")
      .gte("verified_at", monthStartIso)
      .lt("verified_at", nextMonth.toISOString())
      .order("verified_at");
    const rows = (data ?? []).map((p) => ({
      วันที่ยืนยัน: p.verified_at,
      จำนวนเงิน: p.amount,
      ประเภท: p.booking_id ? "ค่าจอง" : p.member_id ? "ค่าสมาชิก" : "อื่นๆ",
      ช่องทาง: p.method,
      สถานะ: p.status,
      วันที่ส่งสลิป: p.submitted_at,
    }));
    csv = toCsv(rows, Object.keys(rows[0] ?? { ไม่มีข้อมูล: "" }));
    filename = `payments-${month}.csv`;
  } else if (parsed.data.type === "sales") {
    // รายงานการขาย POS หน้าร้าน
    const { data } = await supabase
      .from("sales")
      .select("receipt_number, sale_number, customer_name, customer_phone, subtotal, discount_amount, total_amount, completed_at, branches(name)")
      .eq("status", "completed")
      .gte("completed_at", monthStartIso)
      .lt("completed_at", nextMonth.toISOString())
      .order("completed_at");
    const rows = (data ?? []).map((s: any) => ({
      เลขที่ใบเสร็จ: s.receipt_number,
      รหัสรายการ: s.sale_number,
      สาขา: s.branches?.name,
      ชื่อลูกค้า: s.customer_name || "ลูกค้าหน้าร้าน",
      เบอร์โทร: s.customer_phone || "",
      ยอดรวมก่อนลด: s.subtotal,
      ส่วนลด: s.discount_amount,
      ยอดสุทธิ: s.total_amount,
      วันที่ทำรายการ: s.completed_at,
    }));
    csv = toCsv(rows, Object.keys(rows[0] ?? { ไม่มีข้อมูล: "" }));
    filename = `pos-sales-${month}.csv`;
  } else {
    const { data } = await supabase
      .from("members")
      .select(
        "member_number, first_name, last_name, phone, email, status, start_date, end_date, sessions_used, freeze_count, created_at, packages(name)",
      )
      .order("created_at");
    const rows = (data ?? []).map((m) => ({
      รหัสสมาชิก: m.member_number,
      ชื่อ: `${m.first_name} ${m.last_name ?? ""}`.trim(),
      เบอร์โทร: m.phone,
      อีเมล: m.email,
      แพ็กเกจ: m.packages?.name,
      สถานะ: m.status,
      วันเริ่ม: m.start_date,
      วันหมดอายุ: m.end_date,
      ครั้งที่ใช้: m.sessions_used,
      จำนวนFreeze: m.freeze_count,
      วันสมัคร: m.created_at,
    }));
    csv = toCsv(rows, Object.keys(rows[0] ?? { ไม่มีข้อมูล: "" }));
    filename = `members-${month}.csv`;
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "export_csv",
    module: "reports",
    after: { type: parsed.data.type, month },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
