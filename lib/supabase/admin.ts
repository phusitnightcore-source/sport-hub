import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Service-role client — bypass RLS ทั้งหมด
// ใช้ได้เฉพาะฝั่ง server (API Routes / Server Actions) ในจุดที่ตั้งใจ bypass RLS
// อย่างจงใจเท่านั้น เช่น guest booking, audit log insert, webhook
// ห้าม import จาก client code เด็ดขาด — `server-only` จะ fail ตอน build ถ้าหลุด
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
