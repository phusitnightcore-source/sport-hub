import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// PDPA §6.5 Right to Data Portability — สมาชิก Export ข้อมูลตัวเองเป็น CSV ทันที
// อ่านผ่าน session client → RLS ให้เห็นเฉพาะข้อมูลตัวเอง (members_self/checkins_self)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("AUTH_UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);

  const { data: member } = await supabase
    .from("members")
    .select("*, packages(name)")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!member) return apiError("NOT_FOUND", "ไม่พบข้อมูลสมาชิก", 404);

  const [{ data: checkins }, { data: bookings }] = await Promise.all([
    supabase
      .from("checkins")
      .select("checkin_time, result, method, branches(name)")
      .eq("member_id", member.id)
      .order("checkin_time", { ascending: false }),
    supabase
      .from("bookings")
      .select("booking_code, booking_date, start_time, end_time, total_price, status")
      .eq("member_id", member.id)
      .order("booking_date", { ascending: false }),
  ]);

  const lines: string[] = [];
  lines.push("== ข้อมูลส่วนตัว ==");
  lines.push("รหัสสมาชิก,ชื่อ,นามสกุล,เบอร์โทร,อีเมล,แพ็กเกจ,วันเริ่ม,วันหมดอายุ,สถานะ,ครั้งที่ใช้");
  lines.push(
    [
      member.member_number,
      member.first_name,
      member.last_name,
      member.phone,
      member.email,
      member.packages?.name,
      member.start_date,
      member.end_date,
      member.status,
      member.sessions_used,
    ]
      .map(csvEscape)
      .join(","),
  );
  lines.push("");
  lines.push("== ประวัติเช็คอิน ==");
  lines.push("วันเวลา,สาขา,วิธี,ผล");
  for (const c of checkins ?? []) {
    lines.push(
      [c.checkin_time, c.branches?.name, c.method, c.result].map(csvEscape).join(","),
    );
  }
  lines.push("");
  lines.push("== ประวัติการจอง ==");
  lines.push("รหัสจอง,วันที่,เวลา,ราคา,สถานะ");
  for (const b of bookings ?? []) {
    lines.push(
      [
        b.booking_code,
        b.booking_date,
        `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}`,
        b.total_price,
        b.status,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  await logAudit({
    tenantId: member.tenant_id,
    actorId: user.id,
    actorRole: "member",
    action: "export_own_data",
    module: "pdpa",
    referenceId: member.id,
  });

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-data-${member.member_number}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
