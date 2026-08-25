import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { lineLoginConfigured, buildLineAuthorizeUrl } from "@/lib/line-login";

// เริ่ม LINE Login — mode=login (สมัคร/ล็อกอิน) | link (ผูกบัญชีที่ล็อกอินอยู่)
// เก็บ state (กัน CSRF) + mode ไว้ใน httpOnly cookie ก่อน redirect ไป LINE
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, "");
  const mode = url.searchParams.get("mode") === "link" ? "link" : "login";

  if (!lineLoginConfigured()) {
    const back = mode === "link" ? "/me/profile" : "/login";
    return NextResponse.redirect(`${base}${back}?line=unconfigured`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildLineAuthorizeUrl(state));
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("line_oauth_state", state, opts);
  res.cookies.set("line_oauth_mode", mode, opts);
  return res;
}
