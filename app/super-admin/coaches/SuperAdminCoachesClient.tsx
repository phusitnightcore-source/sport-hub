"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  MapPin,
  Award,
  ExternalLink,
  Ban,
  RotateCcw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { updateCoachStatus } from "./actions";

export type CoachRow = {
  id: string;
  display_name: string;
  sport: string;
  skill_level: string | null;
  experience_years: number | null;
  biography: string | null;
  profile_image_url: string | null;
  location_province: string | null;
  approval_status: string;
  is_visible: boolean;
  rating_avg: number;
  review_count: number;
  created_at: string;
};

export function SuperAdminCoachesClient({ coaches }: { coaches: CoachRow[] }) {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "suspended">("all");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = coaches.filter((c) => {
    const matchFilter = filter === "all" || c.approval_status === filter;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      c.display_name.toLowerCase().includes(q) ||
      c.sport.toLowerCase().includes(q) ||
      (c.location_province && c.location_province.toLowerCase().includes(q));

    return matchFilter && matchSearch;
  });

  const counts = {
    all: coaches.length,
    pending: coaches.filter((c) => c.approval_status === "pending").length,
    approved: coaches.filter((c) => c.approval_status === "approved").length,
    rejected: coaches.filter((c) => c.approval_status === "rejected").length,
    suspended: coaches.filter((c) => c.approval_status === "suspended").length,
  };

  async function handleStatus(coachId: string, status: "approved" | "rejected" | "suspended" | "pending") {
    setLoadingId(coachId);
    await updateCoachStatus(coachId, status);
    setLoadingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Search & Tabs */}
      <div className="card-floating flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border border-line">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อโค้ช, กีฬา, จังหวัด..."
            className="w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-4 text-body-sm text-ink outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              filter === "all"
                ? "bg-brand text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-brand-soft/40 hover:text-brand"
            }`}
          >
            ทั้งหมด ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              filter === "pending"
                ? "bg-warning text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-warning/10 hover:text-warning"
            }`}
          >
            รออนุมัติ ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setFilter("approved")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              filter === "approved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-emerald-50 hover:text-emerald-600"
            }`}
          >
            อนุมัติแล้ว ({counts.approved})
          </button>
          <button
            type="button"
            onClick={() => setFilter("rejected")}
            className={`rounded-xl px-3 py-1.5 text-body-sm font-bold transition-all ${
              filter === "rejected"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-surface text-ink-soft border border-line hover:bg-rose-50 hover:text-rose-600"
            }`}
          >
            ปฏิเสธ ({counts.rejected})
          </button>
        </div>
      </div>

      {/* Coaches List */}
      {filtered.length === 0 ? (
        <div className="card-floating flex flex-col items-center gap-3 p-12 text-center border border-line">
          <GraduationCap className="h-10 w-10 text-ink-soft/40" />
          <h3 className="font-bold text-body-lg text-ink">ไม่พบข้อมูลโค้ช</h3>
          <p className="text-body-sm text-ink-soft">ไม่มีรายชื่อโค้ชในหมวดหมู่ที่เลือก</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((coach) => {
            const isPending = coach.approval_status === "pending";
            const isApproved = coach.approval_status === "approved";
            const isSuspended = coach.approval_status === "suspended";

            const tone: "success" | "warning" | "danger" | "brand" = isApproved
              ? "success"
              : isPending
              ? "warning"
              : "danger";

            const label = isApproved
              ? "อนุมัติแล้ว"
              : isPending
              ? "รออนุมัติ"
              : isSuspended
              ? "ถูกระงับ"
              : "ปฏิเสธ";

            return (
              <div
                key={coach.id}
                className="card-floating flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between transition-all"
              >
                {/* Left: Info */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-xs overflow-hidden">
                    {coach.profile_image_url ? (
                      <img src={coach.profile_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-body-lg font-bold text-ink truncate">
                        {coach.display_name}
                      </h4>
                      <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                        {coach.sport}
                      </span>
                    </div>

                    <p className="text-body-sm text-ink-soft mt-0.5 flex items-center gap-3">
                      <span>ประสบการณ์ {coach.experience_years || 1} ปี</span>
                      {coach.location_province && <span>• {coach.location_province}</span>}
                      <span>• สมัครเมื่อ {new Date(coach.created_at).toLocaleDateString("th-TH")}</span>
                    </p>

                    {coach.biography && (
                      <p className="text-[12px] text-ink-soft/90 mt-1 line-clamp-1 max-w-xl">
                        {coach.biography}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:justify-end border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
                  <StatusPill tone={tone}>{label}</StatusPill>

                  {/* Public Link */}
                  {isApproved && (
                    <Link
                      href={`/coaches/${coach.id}`}
                      target="_blank"
                      className="rounded-xl border border-line bg-surface p-2 text-ink-soft hover:text-brand hover:bg-brand-soft/40 transition-colors"
                      title="ดูโปรไฟล์สาธารณะ"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}

                  {/* Approve */}
                  {!isApproved && (
                    <Button
                      size="sm"
                      onClick={() => handleStatus(coach.id, "approved")}
                      disabled={loadingId === coach.id}
                      className="rounded-xl font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      อนุมัติ
                    </Button>
                  )}

                  {/* Reject */}
                  {isPending && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatus(coach.id, "rejected")}
                      disabled={loadingId === coach.id}
                      className="rounded-xl font-bold text-rose-600 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40"
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      ปฏิเสธ
                    </Button>
                  )}

                  {/* Suspend */}
                  {isApproved && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatus(coach.id, "suspended")}
                      disabled={loadingId === coach.id}
                      className="rounded-xl font-medium border-line text-ink-soft hover:text-danger"
                    >
                      <Ban className="mr-1 h-4 w-4" />
                      ระงับ
                    </Button>
                  )}

                  {/* Reactivate */}
                  {isSuspended && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatus(coach.id, "approved")}
                      disabled={loadingId === coach.id}
                      className="rounded-xl font-medium border-line"
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      คืนสถานะ
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
