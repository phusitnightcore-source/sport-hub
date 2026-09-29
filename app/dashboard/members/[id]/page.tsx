import Link from "next/link";
import { ChevronLeft, User, Phone, Mail, Activity, Calendar, ShieldCheck, Snowflake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { StatusPill } from "@/components/ui/StatusPill";
import { notFound } from "next/navigation";
import { QuickActions } from "./QuickActions";
import { formatThaiDate } from "@/lib/date";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) return null;

  const resolvedParams = await params;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("members")
    .select(`
      *,
      packages ( name, type, freeze_max_times, freeze_max_days, sessions_limit )
    `)
    .eq("id", resolvedParams.id)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!member) notFound();

  return (
    <main className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/members"
            className="rounded-full bg-surface p-2 text-ink-soft shadow-sm transition-all hover:bg-line hover:text-ink"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="font-display text-display-md font-semibold text-ink">
            รายละเอียดสมาชิก
          </h1>
          <StatusPill
            tone={
              member.status === "active"
                ? "success"
                : member.status === "frozen"
                  ? "brand"
                  : "danger"
            }
          >
            {member.status.toUpperCase()}
          </StatusPill>
        </div>
        <QuickActions memberId={member.id} currentStatus={member.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ข้อมูลส่วนตัว (Sidebar) */}
        <div className="card-floating flex flex-col p-6 lg:col-span-1">
          <div className="flex flex-col items-center gap-4 border-b border-line pb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-brand shadow-sm">
              <User className="h-10 w-10" />
            </div>
            <div className="text-center">
              <h2 className="font-display text-display-sm font-bold text-ink">
                {member.first_name} {member.last_name || ""}
              </h2>
              <p className="mt-1 font-mono text-body-sm font-medium text-ink-soft">
                {member.member_number}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-5 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-ink-soft">เบอร์โทรศัพท์</span>
              <div className="flex items-center gap-3 text-body font-medium text-ink">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-ink-soft">
                  <Phone className="h-4 w-4" />
                </div>
                {member.phone}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-ink-soft">อีเมล</span>
              <div className="flex items-center gap-3 text-body font-medium text-ink">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-ink-soft">
                  <Mail className="h-4 w-4" />
                </div>
                {member.email || "-"}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wider text-ink-soft">ข้อมูลสุขภาพ</span>
              <div className="flex items-start gap-3 text-body font-medium text-ink">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-soft">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-surface p-3 text-body-sm text-ink w-full">
                  {member.health_info || "ไม่มีระบุ"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ข้อมูลแพ็กเกจ (Main Content) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="card-floating flex flex-col p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="font-display text-display-sm font-bold text-ink">ข้อมูลแพ็กเกจ</h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl bg-brand-soft/30 p-4 border border-brand-soft sm:col-span-2 md:col-span-1">
                <span className="text-xs uppercase tracking-wider text-brand">แพ็กเกจปัจจุบัน</span>
                <p className="text-display-xs font-bold text-brand">{member.packages?.name || "-"}</p>
              </div>
              
              {member.packages?.type === "session_based" && (
                <div className="flex flex-col gap-1 rounded-xl bg-surface p-4">
                  <span className="text-xs uppercase tracking-wider text-ink-soft">การใช้งาน (ครั้ง)</span>
                  <div className="flex items-baseline gap-2">
                    <p className="text-display-xs font-bold text-ink">{member.sessions_used}</p>
                    <span className="text-body-sm text-ink-soft">/ {member.packages.sessions_limit || 0}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 rounded-xl bg-surface p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-ink-soft">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-ink-soft">วันเริ่มแพ็กเกจ</span>
                  <p className="font-medium text-ink">{formatThaiDate(member.start_date)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 rounded-xl bg-surface p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-ink-soft">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-ink-soft">วันหมดอายุ</span>
                  <p className="font-medium text-ink">{formatThaiDate(member.end_date)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-floating flex flex-col p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info">
                <Snowflake className="h-5 w-5" />
              </div>
              <h2 className="font-display text-display-sm font-bold text-ink">ประวัติการระงับ (Freeze)</h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl bg-surface p-4">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-ink-soft">จำนวนครั้ง</span>
                  <p className="mt-1 text-body-lg font-bold text-ink">
                    {member.freeze_count} <span className="text-body text-ink-soft font-normal">/ {member.packages?.freeze_max_times || 0} ครั้ง</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface p-4">
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-ink-soft">จำนวนวัน</span>
                  <p className="mt-1 text-body-lg font-bold text-ink">
                    {member.freeze_days_used} <span className="text-body text-ink-soft font-normal">/ {member.packages?.freeze_max_days || 0} วัน</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
