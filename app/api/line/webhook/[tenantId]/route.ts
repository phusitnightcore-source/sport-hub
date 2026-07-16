import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { replyLineMessage } from "@/lib/notify/line";
import { captureException } from "@/lib/logger";

// LINE Messaging API webhook (per-tenant) — ตั้ง Webhook URL ในคอนโซลเป็น
//   {APP_URL}/api/line/webhook/{tenantId}
// หน้าที่: เก็บ line_user_id ของลูกค้าอัตโนมัติ (ผูกด้วยเบอร์โทรสมาชิก) เพื่อส่งแจ้งเตือนได้จริง
// verify ลายเซ็นด้วย channel_secret ของสนามนั้น (เก็บใน tenants.settings.line_oa)

type LineOa = { channel_secret?: string; channel_access_token?: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  if (!z.string().uuid().safeParse(tenantId).success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const raw = await request.text();
  const admin = createAdminClient();

  const { data: tenant } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .maybeSingle();
  const oa = (tenant?.settings as { line_oa?: LineOa } | null)?.line_oa;
  if (!oa?.channel_secret) {
    // ยังไม่ตั้งค่า OA — รับ 200 ไว้ (กัน LINE retry) แต่ไม่ทำอะไร
    return NextResponse.json({ ok: true });
  }

  // ตรวจลายเซ็น (HMAC-SHA256 ด้วย channel_secret → base64)
  const signature = request.headers.get("x-line-signature") ?? "";
  const expected = crypto
    .createHmac("sha256", oa.channel_secret)
    .update(raw)
    .digest("base64");
  if (signature !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const token = oa.channel_access_token;
  try {
    for (const event of body.events ?? []) {
      const userId = event.source?.userId;
      if (!userId) continue;

      if (event.type === "follow" && token && event.replyToken) {
        await replyLineMessage(
          event.replyToken,
          "ขอบคุณที่เพิ่มเพื่อน! พิมพ์เบอร์โทรที่สมัครสมาชิก (เช่น 0812345678) เพื่อผูกบัญชีและรับแจ้งเตือนการจอง",
          token,
        );
        continue;
      }

      if (event.type === "message" && event.message?.type === "text") {
        const text = String(event.message.text ?? "").trim();
        const phone = /^0\d{8,9}$/.test(text) ? text : null;

        if (!phone) {
          if (token && event.replyToken) {
            await replyLineMessage(
              event.replyToken,
              "พิมพ์เบอร์โทรที่สมัครสมาชิก (เช่น 0812345678) เพื่อผูกบัญชี",
              token,
            );
          }
          continue;
        }

        // ผูก userId กับสมาชิกตามเบอร์ (เฉพาะสนามนี้)
        const { data: member } = await admin
          .from("members")
          .select("id, first_name")
          .eq("tenant_id", tenantId)
          .eq("phone", phone)
          .maybeSingle();

        if (member) {
          await admin
            .from("members")
            .update({ line_user_id: userId })
            .eq("id", member.id);
          if (token && event.replyToken) {
            await replyLineMessage(
              event.replyToken,
              `เชื่อมบัญชี LINE สำเร็จ คุณ${member.first_name} จะได้รับแจ้งเตือนการจอง/สมาชิกทางนี้ ✅`,
              token,
            );
          }
        } else if (token && event.replyToken) {
          await replyLineMessage(
            event.replyToken,
            "ไม่พบเบอร์นี้ในระบบสมาชิกของสนาม กรุณาตรวจสอบอีกครั้ง",
            token,
          );
        }
      }
    }
  } catch (e) {
    captureException("line.webhook", e, { tenantId });
  }

  return NextResponse.json({ ok: true });
}

type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};
