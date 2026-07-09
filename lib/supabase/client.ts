import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Browser client — ใช้ใน Client Components ("use client") เท่านั้น
// ฝั่ง server ให้ใช้ lib/supabase/server.ts แทน
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
