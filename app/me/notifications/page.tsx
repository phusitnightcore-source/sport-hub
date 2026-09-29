import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusPill } from "@/components/ui/StatusPill";
import { MeMarkReadButton } from "./MeMarkReadButton";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; tone: "success" | "warning" | "brand" }> = {
  booking: { label: "การจอง", tone: "brand" },
  payment: { label: "ชำระเงิน", tone: "success" },
  membership: { label: "สมาชิก", tone: "warning" },
  promotion: { label: "โปรโมชั่น", tone: "brand" },
  system: { label: "ระบบ", tone: "brand" },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
}

// ศูนย์แจ้งเตือนของผู้ใช้ (โซน /me) — อ่านของตัวเอง (profile.id + member.id ถ้ามี)
export default async function MeNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/me/notifications");

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const ids = member ? [user.id, member.id] : [user.id];

  const { data: items } = await admin
    .from("notifications")
    .select("id, title, body, type, is_read, created_at")
    .in("recipient_id", ids)
    .eq("channel", "in_app")
    .order("created_at", { ascending: false })
    .limit(60);

  const list = items ?? [];
  const unread = list.filter((n) => !n.is_read).length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-lg font-semibold text-ink">การแจ้งเตือน</h1>
          <p className="text-body-sm text-ink-soft">ยังไม่อ่าน {unread} รายการ</p>
        </div>
        {unread > 0 && <MeMarkReadButton />}
      </div>

      {list.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-4 p-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Bell className="h-8 w-8" />
          </span>
          <p className="text-body-sm text-ink-soft">ยังไม่มีการแจ้งเตือน</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            return (
              <div
                key={n.id}
                className={`card-floating flex flex-col gap-1 p-4 ${
                  !n.is_read ? "ring-1 ring-inset ring-brand/20" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body font-medium text-ink">{n.title}</span>
                  <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                </div>
                {n.body && <p className="text-body-sm text-ink-soft">{n.body}</p>}
                <span className="text-[11px] text-ink-soft/70">{fmt(n.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
