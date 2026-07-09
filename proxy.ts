import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

type UserRole = "super_admin" | "venue_admin" | "staff" | "member";

// พื้นที่หลักของแต่ละ role — สิทธิ์ละเอียด (staff extended ฯลฯ) enforce ที่ page/API
const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin",
  venue_admin: "/dashboard",
  staff: "/dashboard",
  member: "/me",
};

const PROTECTED_PREFIXES = ["/super-admin", "/dashboard", "/me"] as const;

function allowedPrefix(role: UserRole): string {
  return ROLE_HOME[role];
}

export async function proxy(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLogin = pathname.startsWith("/login");

  if (!user) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!isProtected && !isLogin) return supabaseResponse;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // มี auth user แต่ไม่มี profile — ไม่ควรเกิด แต่กันไว้: ส่งกลับ login
  if (!profile) {
    if (isLogin) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const home = allowedPrefix(profile.role as UserRole);

  // login แล้วแต่ยังเข้า /login → ส่งไปพื้นที่ของ role ตัวเอง
  if (isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // เข้าพื้นที่ที่ไม่ใช่ของ role ตัวเอง → ส่งกลับพื้นที่ตัวเอง
  if (!pathname.startsWith(home)) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // ทุก path ยกเว้น static assets / รูป / favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
