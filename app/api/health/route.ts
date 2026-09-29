import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Health check สำหรับ UptimeRobot (§35.4) — เช็คแอป + การเชื่อมต่อ DB
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("tenants")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return NextResponse.json({ ok: true, db: "up", at: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { ok: false, db: "down", at: new Date().toISOString() },
      { status: 503 },
    );
  }
}
