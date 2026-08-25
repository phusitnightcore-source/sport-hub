import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Zap,
  Award,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "การแข่งขัน | SportHub",
  description: "ค้นหาและเข้าร่วมการแข่งขันกีฬาใกล้คุณ — SportHub",
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  registration_open: {
    label: "เปิดรับสมัคร",
    tone: "bg-success/10 text-success",
  },
  registration_closed: {
    label: "ปิดรับสมัคร",
    tone: "bg-warning/10 text-warning",
  },
  in_progress: {
    label: "กำลังแข่งขัน",
    tone: "bg-brand/10 text-brand",
  },
  completed: {
    label: "จบแล้ว",
    tone: "bg-ink-soft/10 text-ink-soft",
  },
};

export default async function TournamentsPage() {
  const admin = createAdminClient();

  let tournaments: {
    id: string;
    name: string;
    sport: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    entry_fee: number;
    max_teams: number | null;
    bracket_type: string;
    status: string;
    banner_image_url: string | null;
    tenant_id: string;
  }[] = [];

  try {
    const { data } = await admin
      .from("tournaments")
      .select(
        "id, name, sport, description, start_date, end_date, entry_fee, max_teams, bracket_type, status, banner_image_url, tenant_id",
      )
      .in("status", [
        "registration_open",
        "registration_closed",
        "in_progress",
        "completed",
      ])
      .order("start_date", { ascending: false })
      .limit(50);
    tournaments = data ?? [];
  } catch {
    // Table may not exist yet
  }

  const upcoming = tournaments.filter(
    (t) => t.status === "registration_open" || t.status === "registration_closed",
  );
  const ongoing = tournaments.filter((t) => t.status === "in_progress");
  const past = tournaments.filter((t) => t.status === "completed");

  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-warning/20 to-warning/5">
            <Award className="h-8 w-8 text-warning" />
          </div>
          <h1 className="font-display text-display-lg font-bold text-ink">
            การแข่งขัน
          </h1>
          <p className="mt-2 text-body text-ink-soft">
            ค้นหาการแข่งขันกีฬาที่น่าสนใจ เข้าร่วมเพื่อพิสูจน์ฝีมือ
          </p>
        </header>

        {tournaments.length === 0 ? (
          <div className="card-floating p-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
              <Trophy className="h-10 w-10 text-warning" />
            </div>
            <h2 className="font-display text-body-lg font-semibold text-ink">
              เร็วๆ นี้!
            </h2>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">
              ระบบการแข่งขันกำลังอยู่ระหว่างพัฒนา
              เจ้าของสนามจะสามารถจัดการแข่งขัน สร้างสาย และบันทึกผลได้ในเร็วๆ
              นี้
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-radius-sm bg-brand px-5 py-2.5 text-body-sm font-semibold text-white transition-all hover:bg-brand-dark"
              >
                <Zap className="h-4 w-4" />
                ค้นหาสนาม
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 rounded-radius-sm bg-surface px-5 py-2.5 text-body-sm font-medium text-ink ring-1 ring-inset ring-line transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <Trophy className="h-4 w-4" />
                ดู Leaderboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {[
              { title: "กำลังแข่งขัน", items: ongoing },
              { title: "เปิดรับสมัคร", items: upcoming },
              { title: "จบแล้ว", items: past },
            ]
              .filter((s) => s.items.length > 0)
              .map((section) => (
                <section key={section.title}>
                  <h2 className="mb-4 font-display text-body-lg font-semibold text-ink">
                    {section.title} ({section.items.length})
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {section.items.map((t) => {
                      const statusInfo = STATUS_LABELS[t.status] ?? {
                        label: t.status,
                        tone: "bg-ink-soft/10 text-ink-soft",
                      };
                      return (
                        <div
                          key={t.id}
                          className="card-floating flex flex-col gap-3 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          {/* Banner */}
                          {t.banner_image_url ? (
                            <img
                              src={t.banner_image_url}
                              alt={t.name}
                              className="h-40 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand/15 to-warning/10">
                              <Trophy className="h-12 w-12 text-brand/40" />
                            </div>
                          )}

                          <div className="flex flex-col gap-2 p-5 pt-0">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-mono-sm text-brand">
                                {t.sport}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-mono-sm font-medium ${statusInfo.tone}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>
                            <h3 className="font-display text-body-lg font-semibold text-ink">
                              {t.name}
                            </h3>
                            {t.description && (
                              <p className="line-clamp-2 text-body-sm text-ink-soft">
                                {t.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-body-sm text-ink-soft">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(t.start_date).toLocaleDateString(
                                  "th-TH",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                              {t.max_teams && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  สูงสุด {t.max_teams} ทีม
                                </span>
                              )}
                            </div>
                            <div className="mt-auto border-t border-line pt-3">
                              <span className="text-body-sm font-semibold text-ink">
                                {Number(t.entry_fee) > 0
                                  ? `฿${new Intl.NumberFormat("th-TH").format(Number(t.entry_fee))} / ทีม`
                                  : "สมัครฟรี"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
