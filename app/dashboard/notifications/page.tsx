import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { StatusPill } from "@/components/ui/StatusPill";
import { MarkAllReadButton } from "./MarkAllReadButton";

// ศูนย์แจ้งเตือนในแอป (Module 8 — in_app channel; LINE/Email รอ API key)
export default async function NotificationsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, created_at")
    .eq("recipient_type", "admin")
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = (items ?? []).filter((n) => !n.is_read).length;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-md font-semibold text-ink">
            การแจ้งเตือน
          </h1>
          <p className="text-body-sm text-ink-soft">
            ยังไม่อ่าน {unread} รายการ
          </p>
        </div>
        {unread > 0 && <MarkAllReadButton />}
      </div>

      <div className="flex flex-col gap-3">
        {(items ?? []).length === 0 ? (
          <div className="card-floating flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Bell aria-hidden className="h-6 w-6" />
            </span>
            <p className="text-body text-ink">ยังไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          (items ?? []).map((n) => (
            <div
              key={n.id}
              className={`card-floating flex items-start justify-between gap-4 p-5 ${n.is_read ? "opacity-70" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-body font-medium text-ink">{n.title}</p>
                {n.body && <p className="text-body-sm text-ink-soft">{n.body}</p>}
                <p className="mt-1 font-mono text-mono-sm text-ink-soft">
                  {new Date(n.created_at).toLocaleString("th-TH", {
                    timeZone: "Asia/Bangkok",
                  })}
                </p>
              </div>
              {!n.is_read && <StatusPill tone="brand">ใหม่</StatusPill>}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
