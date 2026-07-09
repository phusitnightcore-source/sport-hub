import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

// Server client — ใช้ใน Server Components / Server Actions / Route Handlers
// ใช้สิทธิ์ของ user ที่ login อยู่ (ผ่าน RLS ปกติ) — ถ้าต้องการ service role ดู admin.ts
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // เรียกจาก Server Component ซึ่ง set cookie ไม่ได้ — ปล่อยผ่านได้
            // เพราะ proxy.ts รับหน้าที่ refresh session อยู่แล้ว
          }
        },
      },
    },
  );
}
