import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { BellItem } from "@/components/ui/NotificationBell";
import type { NotifSoundType } from "@/lib/sounds";

type Admin = ReturnType<typeof createAdminClient>;
type Row = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

const SELECT = "id, type, title, body, is_read, created_at";

function toItems(rows: Row[]): BellItem[] {
  return rows.map((r) => ({
    id: r.id,
    type: r.type as NotifSoundType,
    title: r.title,
    body: r.body,
    is_read: r.is_read,
    created_at: r.created_at,
  }));
}

// เสียง custom ของสนาม → signed URL (bucket private) ต่อประเภท
async function tenantSoundMap(
  admin: Admin,
  tenantId: string,
): Promise<Partial<Record<NotifSoundType, string>>> {
  const { data } = await admin
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .maybeSingle();
  const sounds = (data?.settings as { notification_sounds?: Record<string, string> } | null)
    ?.notification_sounds;
  if (!sounds) return {};
  const map: Partial<Record<NotifSoundType, string>> = {};
  for (const [type, path] of Object.entries(sounds)) {
    if (!path) continue;
    const { data: signed } = await admin.storage
      .from("tenant-media")
      .createSignedUrl(path, 3600);
    if (signed?.signedUrl) map[type as NotifSoundType] = signed.signedUrl;
  }
  return map;
}

export async function getTenantBellData(admin: Admin, tenantId: string) {
  const [{ data }, { count }, soundMap] = await Promise.all([
    admin
      .from("notifications")
      .select(SELECT)
      .eq("tenant_id", tenantId)
      .in("recipient_type", ["admin", "staff"])
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("recipient_type", ["admin", "staff"])
      .eq("channel", "in_app")
      .eq("is_read", false),
    tenantSoundMap(admin, tenantId),
  ]);
  return { items: toItems((data ?? []) as Row[]), unread: count ?? 0, soundMap };
}

export async function getSelfBellData(admin: Admin, recipientIds: string[]) {
  if (recipientIds.length === 0) return { items: [] as BellItem[], unread: 0 };
  const [{ data }, { count }] = await Promise.all([
    admin
      .from("notifications")
      .select(SELECT)
      .in("recipient_id", recipientIds)
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .in("recipient_id", recipientIds)
      .eq("channel", "in_app")
      .eq("is_read", false),
  ]);
  return { items: toItems((data ?? []) as Row[]), unread: count ?? 0 };
}

export async function getPlatformBellData(admin: Admin) {
  const [{ data }, { count }] = await Promise.all([
    admin
      .from("notifications")
      .select(SELECT)
      .is("tenant_id", null)
      .eq("recipient_type", "admin")
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("tenant_id", null)
      .eq("recipient_type", "admin")
      .eq("channel", "in_app")
      .eq("is_read", false),
  ]);
  return { items: toItems((data ?? []) as Row[]), unread: count ?? 0 };
}
