import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureException } from "@/lib/logger";

// บันทึกการเข้าชมหน้าเว็บ (first-party, cookieless, PDPA-friendly)
// เรียกจาก <PageViewTracker/> ฝั่ง client — ตอบเร็ว ไม่คืนข้อมูลอะไร

// ไม่นับหน้าภายใน (หลังบ้าน) — เก็บเฉพาะทราฟฟิกผู้เข้าชมสาธารณะ
const SKIP_PREFIXES = ["/dashboard", "/super-admin", "/api", "/me"];

function deviceFromUA(ua: string): string {
  if (/mobile/i.test(ua) && !/ipad|tablet/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

// ดึง tenant_id จาก path ของหน้าจอง/สมัคร (เพื่อให้แต่ละสนามดูทราฟฟิกของตัวเองได้)
function tenantFromPath(path: string): string | null {
  const m = /^\/(?:book|apply)\/([0-9a-f-]{36})/i.exec(path);
  return m ? m[1] : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false });
  }
  const raw = (body as { path?: unknown }).path;
  if (typeof raw !== "string") return NextResponse.json({ ok: false });

  const path = raw.split("?")[0].split("#")[0].slice(0, 300);
  if (!path.startsWith("/") || SKIP_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.json({ ok: true }); // ข้ามเงียบๆ
  }

  const ua = request.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|slurp|preview|curl|wget|headless|monitor/i.test(ua)) {
    return NextResponse.json({ ok: true }); // ข้ามบอท
  }

  // hash IP+UA+วัน — ประเมิน unique รายวัน โดยไม่เก็บ PII (salt = วันที่ → หมุนทุกวัน)
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "0";
  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = crypto
    .createHash("sha256")
    .update(`${ip}|${ua}|${day}`)
    .digest("hex")
    .slice(0, 16);

  const referrerRaw = (body as { referrer?: unknown }).referrer;
  const referrer =
    typeof referrerRaw === "string" && referrerRaw
      ? referrerRaw.slice(0, 300)
      : null;

  try {
    const admin = createAdminClient();
    await admin.from("page_views").insert({
      path,
      tenant_id: tenantFromPath(path),
      referrer,
      visitor_hash: visitorHash,
      device: deviceFromUA(ua),
    });
  } catch (e) {
    captureException("track.view", e);
  }
  return NextResponse.json({ ok: true });
}
