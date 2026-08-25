import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  lineLoginConfigured,
  exchangeLineCode,
  verifyLineIdToken,
  syntheticLineEmail,
} from "@/lib/line-login";
import { logAudit } from "@/lib/audit";
import { captureException } from "@/lib/logger";

// Callback ของ LINE Login — ตรวจ state, แลก code, verify id_token แล้ว:
//  - mode=link : ผูก line_user_id เข้ากับบัญชีที่ล็อกอินอยู่
//  - mode=login: หา/สร้างบัญชีผู้ใช้ทั่วไปจาก LINE แล้วสร้าง session ให้ (magiclink OTP)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, "");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("line_oauth_state")?.value;
  const mode = cookieStore.get("line_oauth_mode")?.value === "link" ? "link" : "login";
  cookieStore.delete("line_oauth_state");
  cookieStore.delete("line_oauth_mode");

  const backOnError = mode === "link" ? "/me/profile" : "/login";
  const fail = (reason: string) =>
    NextResponse.redirect(`${base}${backOnError}?line=${reason}`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!lineLoginConfigured()) return fail("unconfigured");
  if (!code || !state || !savedState || state !== savedState) return fail("failed");

  try {
    const tokens = await exchangeLineCode(code);
    if (!tokens?.id_token) return fail("failed");
    const profile = await verifyLineIdToken(tokens.id_token);
    if (!profile) return fail("failed");

    const admin = createAdminClient();

    // ---- โหมดผูกบัญชี (ผู้ใช้ล็อกอินอยู่แล้ว) ----
    if (mode === "link") {
      const server = await createClient();
      const {
        data: { user },
      } = await server.auth.getUser();
      if (!user) return fail("failed");

      // LINE นี้ถูกผูกกับบัญชีอื่นแล้วหรือไม่
      const { data: taken } = await admin
        .from("profiles")
        .select("id")
        .eq("line_user_id", profile.userId)
        .neq("id", user.id)
        .maybeSingle();
      if (taken) return NextResponse.redirect(`${base}/me/profile?line=taken`);

      await admin
        .from("profiles")
        .update({ line_user_id: profile.userId })
        .eq("id", user.id);
      await logAudit({
        tenantId: null,
        actorId: user.id,
        actorRole: "member",
        action: "link_line",
        module: "user",
        referenceId: user.id,
      });
      return NextResponse.redirect(`${base}/me/profile?line=linked`);
    }

    // ---- โหมดสมัคร/ล็อกอินด้วย LINE ----
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("line_user_id", profile.userId)
      .maybeSingle();

    let authEmail: string;
    if (existing) {
      const { data: au } = await admin.auth.admin.getUserById(existing.id);
      if (!au.user?.email) return fail("failed");
      authEmail = au.user.email;
    } else {
      // อีเมลสังเคราะห์เป็นตัวตนของบัญชี (real email เก็บใน profile.email เพื่อติดต่อ)
      authEmail = syntheticLineEmail(profile.userId);
      const { data: created, error: userErr } = await admin.auth.admin.createUser({
        email: authEmail,
        password: crypto.randomBytes(24).toString("hex"),
        email_confirm: true,
      });
      if (userErr || !created.user) {
        captureException("line.callback.createUser", userErr);
        return fail("failed");
      }
      const { error: profileErr } = await admin.from("profiles").insert({
        id: created.user.id,
        tenant_id: null,
        role: "member",
        full_name: profile.name ?? "ผู้ใช้ LINE",
        email: profile.email,
        line_user_id: profile.userId,
        pdpa_consent_at: new Date().toISOString(),
      });
      if (profileErr) {
        await admin.auth.admin.deleteUser(created.user.id);
        captureException("line.callback.profile", profileErr);
        return fail("failed");
      }
      await logAudit({
        tenantId: null,
        actorId: created.user.id,
        actorRole: "member",
        action: "signup_line",
        module: "user",
        referenceId: created.user.id,
      });
    }

    // สร้าง session ให้เบราว์เซอร์ — magiclink OTP → verifyOtp (server client เซ็ต cookie)
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });
    if (linkErr || !link.properties) {
      captureException("line.callback.generateLink", linkErr);
      return fail("failed");
    }
    const server = await createClient();
    const { error: verifyErr } = await server.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (verifyErr) {
      captureException("line.callback.verifyOtp", verifyErr);
      return fail("failed");
    }

    return NextResponse.redirect(`${base}/me/bookings`);
  } catch (e) {
    captureException("line.callback", e);
    return fail("failed");
  }
}
