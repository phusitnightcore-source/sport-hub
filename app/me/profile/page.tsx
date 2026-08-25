import { redirect } from "next/navigation";
import { Mail, CalendarClock, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lineLoginConfigured } from "@/lib/line-login";
import { ProfileForm } from "./ProfileForm";
import { LineConnection } from "./LineConnection";

export const dynamic = "force-dynamic";

const LINE_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "เชื่อมต่อ LINE สำเร็จ ✅" },
  taken: { ok: false, text: "LINE นี้ถูกผูกกับบัญชีอื่นแล้ว" },
  unconfigured: { ok: false, text: "ระบบยังไม่ได้เปิดใช้งานการเชื่อมต่อ LINE" },
  failed: { ok: false, text: "เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่" },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ line?: string }>;
}) {
  const { line } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, phone, line_user_id, pdpa_consent_at, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const banner = line ? LINE_MESSAGES[line] : null;
  const name = profile?.full_name ?? "ผู้ใช้";
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const memberSince = (profile?.created_at ?? "").slice(0, 10);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-8 sm:px-6">
      {/* Hero */}
      <section className="card-floating relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-soft blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark font-display text-2xl font-bold text-white shadow-sm">
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-display-md font-semibold text-ink">
              {name}
            </h1>
            <p className="flex items-center gap-1.5 truncate text-body-sm text-ink-soft">
              <Mail aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {profile?.email ?? "—"}
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-sm bg-brand-soft/60 px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] font-medium text-ink-soft">
              <Phone aria-hidden className="h-3 w-3" />
              เบอร์โทร
            </p>
            <p className="mt-0.5 truncate font-mono text-mono-sm text-ink">
              {profile?.phone ?? "ยังไม่ระบุ"}
            </p>
          </div>
          <div className="rounded-sm bg-brand-soft/60 px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] font-medium text-ink-soft">
              <CalendarClock aria-hidden className="h-3 w-3" />
              สมาชิกตั้งแต่
            </p>
            <p className="mt-0.5 truncate font-mono text-mono-sm text-ink">
              {memberSince || "—"}
            </p>
          </div>
        </div>
      </section>

      {banner && (
        <p
          role="status"
          className={`rounded-sm px-4 py-3 text-body-sm ring-1 ring-inset ${
            banner.ok
              ? "bg-success/10 text-success ring-success/20"
              : "bg-danger/10 text-danger ring-danger/20"
          }`}
        >
          {banner.text}
        </p>
      )}

      {/* แก้ไขข้อมูล */}
      <section className="card-floating flex flex-col gap-4 p-6">
        <h2 className="text-body font-medium text-ink">ข้อมูลส่วนตัว</h2>
        <ProfileForm
          initialName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
        />
      </section>

      {/* เชื่อมต่อ LINE */}
      <section className="card-floating p-6">
        <LineConnection
          connected={Boolean(profile?.line_user_id)}
          enabled={lineLoginConfigured()}
        />
      </section>
    </main>
  );
}
