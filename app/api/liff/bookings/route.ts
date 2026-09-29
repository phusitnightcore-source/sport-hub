import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureException } from "@/lib/logger";

// LIFF: ดึงบัตรสมาชิก + ประวัติจอง โดยยืนยันตัวตนด้วย LINE idToken
// verify idToken กับ LINE (ใช้ LINE_LOGIN_CHANNEL_ID) → sub = LINE userId → หา member จาก line_user_id
export async function POST(request: Request) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json(
      { ok: false, error: "ยังไม่ได้ตั้งค่า LINE Login/LIFF" },
      { status: 503 },
    );
  }

  let body: { idToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.idToken) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: body.idToken, client_id: channelId }),
    });
    if (!verifyRes.ok) {
      return NextResponse.json({ ok: false, error: "ยืนยันตัวตนไม่สำเร็จ" }, { status: 401 });
    }
    const claims = (await verifyRes.json()) as { sub?: string };
    const userId = claims.sub;
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

    const admin = createAdminClient();
    const { data: member } = await admin
      .from("members")
      .select("id, first_name, last_name, member_number, end_date, status, tenants(name)")
      .eq("line_user_id", userId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ ok: true, member: null, bookings: [] });
    }

    const { data: rows } = await admin
      .from("bookings")
      .select(
        "booking_code, booking_date, start_time, end_time, total_price, status, courts(name), tenants(name)",
      )
      .eq("member_id", member.id)
      .order("booking_date", { ascending: false })
      .limit(30);

    return NextResponse.json({
      ok: true,
      member: {
        name: `${member.first_name} ${member.last_name ?? ""}`.trim(),
        memberNumber: member.member_number,
        endDate: member.end_date,
        status: member.status,
        venue: member.tenants?.name ?? "",
      },
      bookings: (rows ?? []).map((b) => ({
        code: b.booking_code,
        venue: b.tenants?.name ?? undefined,
        courtName: b.courts?.name ?? "—",
        date: b.booking_date,
        startTime: b.start_time,
        endTime: b.end_time,
        totalPrice: b.total_price,
        status: b.status,
      })),
    });
  } catch (e) {
    captureException("liff.bookings", e);
    return NextResponse.json({ ok: false, error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
