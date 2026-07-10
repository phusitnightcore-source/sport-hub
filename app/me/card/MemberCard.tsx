"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from "react";
import QRCode from "react-qr-code";
import { daysUntil } from "@/lib/plans";

// Format: sport-hub:checkin:MEMBER_NUMBER:TIMESTAMP — กัน screenshot ซ้ำ
function makeQrValue(memberNumber: string): string {
  return `sport-hub:checkin:${memberNumber}:${Math.floor(Date.now() / 1000)}`;
}

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
};

/**
 * บัตรสมาชิกดิจิทัล — Dynamic QR รีเฟรชทุก 30 วินาที
 * QR ประกอบด้วย member_number + timestamp เพื่อป้องกัน screenshot ซ้ำ
 */
export function MemberCard({ member, tenantName }: MemberCardProps) {
  // สร้าง QR ตั้งแต่ render แรก (lazy initializer) — ไม่ setState ใน effect body
  const [qrValue, setQrValue] = useState(() => makeQrValue(member.member_number));
  const [countdown, setCountdown] = useState(30);

  const generateQr = useCallback(() => {
    setQrValue(makeQrValue(member.member_number));
    setCountdown(30);
  }, [member.member_number]);

  // Refresh QR ทุก 30 วินาที (Dynamic QR — Pro §5)
  useEffect(() => {
    const interval = setInterval(generateQr, 30_000);
    return () => clearInterval(interval);
  }, [generateQr]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: {
      label: "ACTIVE",
      color: "rgb(var(--success))",
      bg: "rgba(31, 174, 110, 0.12)",
    },
    frozen: {
      label: "FROZEN",
      color: "rgb(var(--warning))",
      bg: "rgba(245, 165, 36, 0.12)",
    },
    expired: {
      label: "EXPIRED",
      color: "rgb(var(--danger))",
      bg: "rgba(255, 107, 87, 0.12)",
    },
  };

  const st = statusConfig[member.status] || statusConfig.expired;
  const isActive = member.status === "active";

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate days remaining (helper กลางจาก lib/plans — เลี่ยง Date.now ใน render)
  const daysRemaining = member.end_date ? daysUntil(member.end_date) : null;

  return (
    <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-zinc-800 bg-zinc-950">
      {/* Card premium gradient background */}
      <div className="relative bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-6 pb-8 overflow-hidden">
        {/* Decorative glossy/metallic effects */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200/10 to-amber-600/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/10 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0)_40%,rgba(255,255,255,0.03)_60%,rgba(255,255,255,0)_100%)]" />

        {/* Header */}
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              Member Card
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
              {tenantName}
            </h2>
          </div>
          <div
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: st.color, backgroundColor: st.bg }}
          >
            {st.label}
          </div>
        </div>

        {/* Member info */}
        <div className="relative mt-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-zinc-800 ring-2 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            {member.profile_image_url ? (
              <img
                src={member.profile_image_url}
                alt={member.first_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-amber-500">
                {member.first_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-100 drop-shadow-sm">
              {member.first_name} {member.last_name || ""}
            </h3>
            <p className="font-mono text-xs text-amber-500/80 tracking-wider">
              ID: {member.member_number}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              แพ็กเกจ
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100 truncate">
              {member.packages?.name || "-"}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              {daysRemaining !== null ? "เหลืออีก" : "หมดอายุ"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100">
              {daysRemaining !== null ? <span className="text-amber-400">{daysRemaining} วัน</span> : "-"}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              วันหมดอายุ
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100">
              {formatDate(member.end_date)}
            </p>
          </div>
          {member.packages?.type === "session_based" && (
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2 backdrop-blur-md">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                ครั้งที่ใช้
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                {member.sessions_used} <span className="text-zinc-500">/</span> {member.packages.sessions_limit ?? "∞"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QR Section */}
      <div className="relative flex flex-col items-center bg-white px-6 py-6">
        {/* Notch decoration */}
        <div className="absolute -top-3 left-6 h-6 w-6 rounded-full bg-[rgb(var(--bg-top))]" />
        <div className="absolute -top-3 right-6 h-6 w-6 rounded-full bg-[rgb(var(--bg-top))]" />
        <div className="absolute top-0 left-9 right-9 border-t border-dashed border-gray-200" />

        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--ink-soft))]">
          สแกนเพื่อเช็คอิน
        </p>

        <div
          className={`rounded-xl p-3 transition-opacity duration-300 ${
            !isActive ? "opacity-40 grayscale" : ""
          }`}
        >
          {qrValue && (
            <QRCode
              value={qrValue}
              size={180}
              level="M"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          )}
        </div>

        {!isActive && (
          <p className="mt-2 text-center text-xs font-medium text-[rgb(var(--danger))]">
            บัตรใช้งานไม่ได้ — สถานะ: {st.label}
          </p>
        )}

        {/* Countdown ring */}
        {isActive && (
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex h-7 w-7 items-center justify-center">
              <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="rgb(var(--line))"
                  strokeWidth="2"
                />
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="none"
                  stroke="rgb(var(--brand))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 12}`}
                  strokeDashoffset={`${2 * Math.PI * 12 * (1 - countdown / 30)}`}
                  className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-[9px] font-bold text-[rgb(var(--brand))]">
                {countdown}
              </span>
            </div>
            <span className="text-[10px] text-[rgb(var(--ink-soft))]">
              QR รีเฟรชอัตโนมัติ
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
