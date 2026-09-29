"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { Dumbbell, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

type MemberCardProps = {
  member: {
    id: string;
    member_number: string;
    first_name: string;
    last_name: string | null;
    status: string;
    end_date: string | null;
    start_date: string | null;
    sessions_used: number;
    profile_image_url: string | null;
    packages: {
      name: string;
      type: string;
      sessions_limit: number | null;
    } | null;
  };
  tenantName: string;
  initialQr: { token: string; expiresAt: number };
};

const STATUS = {
  active: { label: "ACTIVE", className: "border-emerald-300/30 bg-emerald-400/15 text-emerald-200" },
  frozen: { label: "FROZEN", className: "border-amber-300/30 bg-amber-400/15 text-amber-100" },
  expired: { label: "EXPIRED", className: "border-rose-300/30 bg-rose-400/15 text-rose-100" },
} as const;

function secondsRemaining(expiresAt: number) {
  return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
}

function todayInBangkok() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysRemainingUntil(date: string) {
  const from = new Date(`${todayInBangkok()}T00:00:00+07:00`).getTime();
  const to = new Date(`${date}T00:00:00+07:00`).getTime();
  return Math.max(0, Math.ceil((to - from) / 86_400_000));
}

export function MemberCard({ member, tenantName, initialQr }: MemberCardProps) {
  const [qr, setQr] = useState(initialQr);
  const [countdown, setCountdown] = useState(() => secondsRemaining(initialQr.expiresAt));
  const [refreshing, setRefreshing] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const refreshQr = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/me/member-card-token?memberId=${member.id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("refresh failed");
      const next = await response.json() as { token: string; expiresAt: number };
      setQr(next);
      setCountdown(secondsRemaining(next.expiresAt));
      setQrError(null);
    } catch {
      setQrError("รีเฟรช QR ไม่สำเร็จ");
    } finally {
      setRefreshing(false);
    }
  }, [member.id]);

  useEffect(() => {
    const refreshTimer = window.setInterval(refreshQr, 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshQr]);

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setCountdown(secondsRemaining(qr.expiresAt));
    }, 1_000);
    return () => window.clearInterval(countdownTimer);
  }, [qr.expiresAt]);

  const status = STATUS[member.status as keyof typeof STATUS] ?? STATUS.expired;
  const isActive = member.status === "active" && (!member.end_date || member.end_date >= todayInBangkok());
  const daysRemaining = member.end_date ? daysRemainingUntil(member.end_date) : null;
  const fullName = `${member.first_name} ${member.last_name ?? ""}`.trim();
  const initials = useMemo(
    () => `${member.first_name.charAt(0)}${member.last_name?.charAt(0) ?? ""}`.toUpperCase(),
    [member.first_name, member.last_name],
  );
  const formatDate = (value: string | null) => value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    : "ไม่จำกัด";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <article
        className="relative isolate min-h-[330px] overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 shadow-[0_28px_70px_-25px_rgba(0,0,0,0.75)] sm:min-h-[390px]"
        style={{
          backgroundImage: "linear-gradient(90deg,rgba(3,7,18,.2),rgba(3,7,18,.02)),url('/images/membership/fitness-card-premium.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/5" />
        <div className="relative flex min-h-[330px] flex-col justify-between p-5 text-white sm:min-h-[390px] sm:p-8">
          <header className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-black/35 shadow-lg backdrop-blur-md">
                <Dumbbell className="h-5 w-5 text-cyan-300" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-200/75">SportHub Fitness</p>
                <h2 className="truncate font-display text-lg font-black text-white sm:text-xl">{tenantName}</h2>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em] backdrop-blur-md ${status.className}`}>
              {status.label}
            </span>
          </header>

          <div className="grid items-end gap-5 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-xl font-black text-cyan-100 shadow-xl backdrop-blur-md">
                  {member.profile_image_url ? <img src={member.profile_image_url} alt={fullName} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">Member</p>
                  <h3 className="truncate font-display text-2xl font-black tracking-tight text-white sm:text-3xl">{fullName}</h3>
                  <p className="mt-1 font-mono text-xs font-bold tracking-[0.16em] text-amber-300 sm:text-sm">{member.member_number}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
                  <p className="text-[9px] uppercase tracking-wider text-white/45">แพ็กเกจ</p>
                  <p className="truncate text-xs font-bold text-white sm:text-sm">{member.packages?.name ?? "สมาชิกทั่วไป"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md">
                  <p className="text-[9px] uppercase tracking-wider text-white/45">ใช้ได้ถึง</p>
                  <p className="text-xs font-bold text-white sm:text-sm">{formatDate(member.end_date)}</p>
                </div>
                <div className="col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md sm:col-span-1">
                  <p className="text-[9px] uppercase tracking-wider text-white/45">สิทธิ์คงเหลือ</p>
                  <p className="text-xs font-bold text-cyan-200 sm:text-sm">
                    {member.packages?.type === "session_based"
                      ? member.packages.sessions_limit === null
                        ? "ไม่จำกัด"
                        : `${Math.max(0, member.packages.sessions_limit - member.sessions_used)} ครั้ง`
                      : daysRemaining === null ? "ไม่จำกัด" : `${daysRemaining} วัน`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:block">
              <div className={`rounded-2xl bg-white p-2.5 shadow-2xl ${!isActive ? "opacity-45 grayscale" : ""}`}>
                <QRCode value={qr.token} size={116} level="M" className="h-[104px] w-[104px] sm:h-[116px] sm:w-[116px]" />
              </div>
              <div className="mt-2 text-right">
                <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/65"><ShieldCheck className="h-3 w-3 text-emerald-300" /> QR ปลอดภัย</p>
                <button type="button" onClick={refreshQr} disabled={refreshing} className="mt-1 flex items-center gap-1 text-[10px] font-bold text-cyan-200 hover:text-white disabled:opacity-50 sm:ml-auto">
                  <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> {countdown > 0 ? `เปลี่ยนใน ${countdown} วิ` : "แตะเพื่อรีเฟรช"}
                </button>
              </div>
            </div>
          </div>

          <footer className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-white/45">
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-300" /> Digital membership</span>
            <span>แสดงบัตรนี้เพื่อเช็กอิน</span>
          </footer>
        </div>
      </article>

      {(!isActive || qrError) && (
        <p className={`rounded-xl border px-4 py-3 text-center text-body-sm font-semibold ${!isActive ? "border-danger/20 bg-danger/10 text-danger" : "border-warning/20 bg-warning/10 text-warning"}`}>
          {!isActive ? "บัตรนี้ยังใช้เช็กอินไม่ได้ กรุณาตรวจสถานะหรือต่ออายุสมาชิก" : qrError}
        </p>
      )}
    </div>
  );
}
