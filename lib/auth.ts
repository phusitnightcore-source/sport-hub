import "server-only";
import { createClient } from "@/lib/supabase/server";
import { roleHasPermission } from "@/lib/permissions";
import type { Database } from "@/lib/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

export type StaffContext = {
  userId: string;
  staffId: string | null;
  tenantId: string;
  role: UserRole;
  /** extra_permissions ของ staff (ว่างสำหรับ venue_admin) */
  extraPermissions: string[];
};

// ดึง context ของผู้ใช้ฝั่ง admin (venue_admin / staff) จาก session ปัจจุบัน
// คืน null ถ้าไม่ได้ login หรือ role ไม่ใช่ฝั่งจัดการสนาม
export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return null;
  if (profile.role !== "venue_admin" && profile.role !== "staff") return null;

  let extraPermissions: string[] = [];
  let staffId: string | null = null;
  
  const { data: staffRow } = await supabase
    .from("staff")
    .select("id, extra_permissions")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (staffRow) {
    staffId = staffRow.id;
    if (profile.role === "staff") {
      extraPermissions = staffRow.extra_permissions ?? [];
    }
  }

  return {
    userId: user.id,
    staffId,
    tenantId: profile.tenant_id,
    role: profile.role,
    extraPermissions,
  };
}

// Permission Matrix ตาม SCOPE.md §26 (แหล่งความจริงใน lib/permissions.ts)
// venue_admin = ทุกสิทธิ์ / staff = สิทธิ์พื้นฐาน ∪ extra_permissions ที่ admin ปลดล็อก
export function hasPermission(ctx: StaffContext, permission: string): boolean {
  return roleHasPermission(ctx.role, ctx.extraPermissions, permission);
}

// Context ของทีม SportHub (super_admin) — tenant_id เป็น null
export async function getSuperAdminContext(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") return null;
  return { userId: user.id };
}
