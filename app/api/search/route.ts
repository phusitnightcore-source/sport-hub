import { createAdminClient } from "@/lib/supabase/admin";
import { apiOk, apiError } from "@/lib/api";
import { getStaffContext } from "@/lib/auth";

// Global Search (§22) — ค้นข้ามสมาชิก/การจอง ภายใน tenant เดียว (RLS ผ่าน service role + filter tenant_id)
export async function GET(request: Request) {
  const ctx = await getStaffContext();
  if (!ctx) return apiError("AUTH_UNAUTHORIZED", "ไม่มีสิทธิ์เข้าถึง", 403);

  const raw = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  // ตัดอักขระที่ทำให้ตัวกรอง PostgREST .or() พัง
  const q = raw.replace(/[,()%*]/g, "");
  if (q.length < 2) {
    return apiOk({ members: [], bookings: [] });
  }

  const admin = createAdminClient();
  const like = `%${q}%`;

  const [members, bookings] = await Promise.all([
    admin
      .from("members")
      .select("id, first_name, last_name, member_number, phone")
      .eq("tenant_id", ctx.tenantId)
      .or(
        `first_name.ilike.${like},last_name.ilike.${like},member_number.ilike.${like},phone.ilike.${like}`,
      )
      .limit(6),
    admin
      .from("bookings")
      .select("id, booking_code, user_name, user_phone, booking_date, status")
      .eq("tenant_id", ctx.tenantId)
      .or(
        `booking_code.ilike.${like},user_name.ilike.${like},user_phone.ilike.${like}`,
      )
      .order("booking_date", { ascending: false })
      .limit(6),
  ]);

  return apiOk({
    members: members.data ?? [],
    bookings: bookings.data ?? [],
  });
}
