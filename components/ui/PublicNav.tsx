import { createClient } from "@/lib/supabase/server";
import { PublicNavClient } from "./PublicNavClient";

const ROLE_HOME: Record<string, { href: string; label: string }> = {
  super_admin: { href: "/super-admin", label: "ผู้ดูแลระบบ" },
  venue_admin: { href: "/dashboard", label: "แดชบอร์ด" },
  staff: { href: "/dashboard", label: "แดชบอร์ด" },
  member: { href: "/me", label: "พื้นที่ของฉัน" },
};

export async function PublicNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let home: { href: string; label: string } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    home = ROLE_HOME[profile?.role ?? "member"] ?? ROLE_HOME.member;
  }

  return <PublicNavClient home={home} userEmail={user?.email} />;
}
