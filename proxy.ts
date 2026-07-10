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

// ห้ามเบราว์เซอร์ cache หน้าที่ผ่าน auth (รวม bfcache) — กันกด Back หลัง logout
// แล้วเห็นหน้า/ข้อมูลของบัญชีก่อนหน้า Chrome/Firefox จะไม่เก็บ bfcache ถ้ามี no-store
function noStore<T extends NextResponse>(res: T): T {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function proxy(request: NextRequest) {
  const { supabase, user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLogin = pathname.startsWith("/login");
  // ทุก response ที่เกี่ยวกับพื้นที่ auth (protected หรือ /login) ห้าม cache
  const sensitive = isProtected || isLogin;

  if (!user) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return noStore(NextResponse.redirect(url));
    }
    return sensitive ? noStore(supabaseResponse) : supabaseResponse;
  }

  if (!isProtected && !isLogin) return supabaseResponse;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // มี auth user แต่ไม่มี profile — ไม่ควรเกิด แต่กันไว้: ส่งกลับ login
  if (!profile) {
    if (isLogin) return noStore(supabaseResponse);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return noStore(NextResponse.redirect(url));
  }

  const home = allowedPrefix(profile.role as UserRole);

  // login แล้วแต่ยังเข้า /login → ส่งไปพื้นที่ของ role ตัวเอง
  if (isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return noStore(NextResponse.redirect(url));
  }

  // เข้าพื้นที่ที่ไม่ใช่ของ role ตัวเอง → ส่งกลับพื้นที่ตัวเอง
  if (!pathname.startsWith(home)) {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return noStore(NextResponse.redirect(url));
  }

  // หน้า protected ที่ role ถูกต้อง — ห้าม cache
  return noStore(supabaseResponse);
}

export const config = {
  matcher: [
    // ทุก path ยกเว้น static assets / รูป / favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
