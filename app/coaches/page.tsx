import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import Link from "next/link";
import {
  GraduationCap,
  Star,
  MapPin,
  Award,
  Search,
  Clock,
  Users,
} from "lucide-react";

export const metadata = {
  title: "หาโค้ช | SportHub",
  description:
    "ค้นหาโค้ชกีฬามืออาชีพใกล้คุณ จองเรียนได้ทันที — SportHub Coach Marketplace",
};

export default async function CoachesPage() {
  const admin = createAdminClient();

  let coaches: {
    id: string;
    display_name: string;
    sport: string;
    skill_level: string | null;
    experience_years: number | null;
    biography: string | null;
    profile_image_url: string | null;
    location_province: string | null;
    rating_avg: number;
    review_count: number;
  }[] = [];

  try {
    const { data } = await admin
      .from("coach_profiles")
      .select(
        "id, display_name, sport, skill_level, experience_years, biography, profile_image_url, location_province, rating_avg, review_count",
      )
      .eq("is_visible", true)
      .eq("approval_status", "approved")
      .order("rating_avg", { ascending: false })
      .limit(50);
    coaches = data ?? [];
  } catch {
    // Table may not exist yet
  }

  const sports = [...new Set(coaches.map((c) => c.sport))];

  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand/20 to-brand/5">
            <GraduationCap className="h-8 w-8 text-brand" />
          </div>
          <h1 className="font-display text-display-lg font-bold text-ink">
            หาโค้ช
          </h1>
          <p className="mt-2 text-body text-ink-soft">
            เรียนกับโค้ชมืออาชีพ พัฒนาทักษะ ยกระดับเกมของคุณ
          </p>
        </header>

        {coaches.length === 0 ? (
          <div className="card-floating mx-auto mt-10 max-w-xl p-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
              <GraduationCap className="h-10 w-10 text-brand" />
            </div>
            <h2 className="font-display text-body-lg font-semibold text-ink">
              เร็วๆ นี้!
            </h2>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">
              Coach Marketplace กำลังอยู่ระหว่างพัฒนา
              โค้ชจะสามารถสร้างโปรไฟล์ ลงตารางสอน และรับจองจากนักกีฬาได้ในเร็วๆ
              นี้
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-radius-sm bg-brand px-5 py-2.5 text-body-sm font-semibold text-white transition-all hover:bg-brand-dark"
              >
                <Search className="h-4 w-4" />
                ค้นหาสนาม
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Sport filter */}
            {sports.length > 1 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {sports.map((sport) => (
                  <span
                    key={sport}
                    className="rounded-full bg-brand-soft px-4 py-1.5 text-body-sm font-medium text-brand"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            )}

            {/* Coach Grid */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coaches.map((coach) => (
                <Link
                  key={coach.id}
                  href={`/coaches/${coach.id}`}
                  className="card-floating group flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Avatar Header */}
                  <div className="relative flex items-center gap-4 bg-gradient-to-r from-brand/10 to-transparent p-5">
                    {coach.profile_image_url ? (
                      <img
                        src={coach.profile_image_url}
                        alt={coach.display_name}
                        className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-surface"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand ring-2 ring-surface">
                        <GraduationCap className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-body-lg font-semibold text-ink group-hover:text-brand">
                        {coach.display_name}
                      </h2>
                      <div className="mt-1 flex items-center gap-2 text-body-sm text-ink-soft">
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-mono-sm text-brand">
                          {coach.sport}
                        </span>
                        {coach.skill_level && (
                          <span className="text-mono-sm">
                            {coach.skill_level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5 pt-3">
                    {coach.biography && (
                      <p className="line-clamp-2 text-body-sm text-ink-soft">
                        {coach.biography}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-body-sm text-ink-soft">
                      {coach.experience_years && (
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5" />
                          {coach.experience_years} ปี
                        </span>
                      )}
                      {coach.location_province && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {coach.location_province}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                      <div className="flex items-center gap-1.5">
                        <Star
                          className={`h-4 w-4 ${Number(coach.rating_avg) > 0 ? "fill-warning text-warning" : "text-line"}`}
                        />
                        <span className="font-mono text-body-sm font-semibold text-ink">
                          {Number(coach.rating_avg) > 0
                            ? Number(coach.rating_avg).toFixed(1)
                            : "ใหม่"}
                        </span>
                        {coach.review_count > 0 && (
                          <span className="text-body-sm text-ink-soft">
                            ({coach.review_count})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
