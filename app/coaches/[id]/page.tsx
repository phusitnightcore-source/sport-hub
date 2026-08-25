import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import { notFound } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import {
  GraduationCap,
  Star,
  MapPin,
  Award,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  FileBadge2,
} from "lucide-react";
import { formatBahtFromDb } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return {};
  const admin = createAdminClient();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("display_name, sport, location_province")
    .eq("id", id)
    .single();
  if (!coach) return {};
  return {
    title: `${coach.display_name} | โค้ช${coach.sport} - SportHub`,
    description: `เรียน${coach.sport}กับโค้ช ${coach.display_name} ${coach.location_province ? `ที่ ${coach.location_province}` : ""} — SportHub Coach Marketplace`,
  };
}

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const admin = createAdminClient();
  
  // Fetch coach profile and related data
  const [{ data: coach }, { data: services }, { data: certificates }, { data: reviews }] = await Promise.all([
    admin
      .from("coach_profiles")
      .select("*")
      .eq("id", id)
      .eq("approval_status", "approved")
      .single(),
    admin
      .from("coach_services")
      .select("*")
      .eq("coach_profile_id", id)
      .eq("is_active", true)
      .order("price", { ascending: true }),
    admin
      .from("coach_certificates")
      .select("*")
      .eq("coach_profile_id", id)
      .order("issued_date", { ascending: false }),
    admin
      .from("reviews")
      .select("id, rating_overall, comment, created_at, reviewer_id")
      .eq("coach_id", id)
      .eq("entity_type", "coach")
      .eq("is_visible", true)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!coach || (!coach.is_visible && coach.approval_status !== "approved")) {
    notFound();
  }

  const allServices = services ?? [];
  const allCertificates = certificates ?? [];
  const allReviews = reviews ?? [];

  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
        {/* Cover Image */}
        <div className="relative mb-16 h-48 w-full rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 sm:h-64">
          {coach.cover_image_url && (
            <img
              src={coach.cover_image_url}
              alt="Cover"
              className="h-full w-full rounded-2xl object-cover"
            />
          )}
          
          {/* Avatar Profile */}
          <div className="absolute -bottom-12 left-6 sm:left-10">
            {coach.profile_image_url ? (
              <img
                src={coach.profile_image_url}
                alt={coach.display_name}
                className="h-24 w-24 rounded-full border-4 border-surface bg-surface object-cover shadow-sm sm:h-32 sm:w-32"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface bg-brand-soft text-brand shadow-sm sm:h-32 sm:w-32">
                <GraduationCap className="h-10 w-10 sm:h-14 sm:w-14" />
              </div>
            )}
          </div>
        </div>

        {/* Coach Header Info */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:px-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-display-md font-bold text-ink sm:text-display-lg">
              {coach.display_name}
              {coach.approval_status === "approved" && (
                <ShieldCheck className="h-6 w-6 text-success" />
              )}
            </h1>
            
            <div className="mt-2 flex flex-wrap items-center gap-3 text-body-sm text-ink-soft">
              <span className="rounded-full bg-brand-soft px-3 py-1 text-mono-sm font-medium text-brand">
                {coach.sport}
              </span>
              {coach.skill_level && (
                <span className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  {coach.skill_level}
                </span>
              )}
              {coach.location_province && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {coach.location_province}
                </span>
              )}
              {coach.experience_years && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ประสบการณ์ {coach.experience_years} ปี
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 shadow-sm ring-1 ring-inset ring-line sm:self-start">
            <Star className="h-5 w-5 fill-warning text-warning" />
            <span className="font-mono text-body-lg font-bold text-ink">
              {Number(coach.rating_avg) > 0 ? Number(coach.rating_avg).toFixed(1) : "ใหม่"}
            </span>
            {coach.review_count > 0 && (
              <span className="text-body-sm text-ink-soft">({coach.review_count} รีวิว)</span>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Bio & Details */}
          <div className="space-y-8 lg:col-span-2">
            
            {/* Biography */}
            <section className="card-floating p-6">
              <h2 className="mb-4 font-display text-body-lg font-semibold text-ink">
                เกี่ยวกับผู้สอน
              </h2>
              {coach.biography ? (
                <div className="whitespace-pre-line text-body text-ink-soft leading-relaxed">
                  {coach.biography}
                </div>
              ) : (
                <p className="text-body-sm text-ink-soft italic">
                  ยังไม่ได้เพิ่มข้อมูลส่วนตัว
                </p>
              )}
            </section>

            {/* Certificates */}
            {allCertificates.length > 0 && (
              <section className="card-floating p-6">
                <h2 className="mb-4 flex items-center gap-2 font-display text-body-lg font-semibold text-ink">
                  <FileBadge2 className="h-5 w-5 text-brand" />
                  ใบรับรอง & คุณวุฒิ
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {allCertificates.map((cert) => (
                    <div key={cert.id} className="flex items-start gap-3 rounded-radius-md bg-surface p-4 ring-1 ring-inset ring-line">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-ink">{cert.name}</h3>
                        {cert.issuing_org && (
                          <p className="text-body-sm text-ink-soft">{cert.issuing_org}</p>
                        )}
                        {cert.issued_date && (
                          <p className="mt-1 text-mono-sm text-ink-soft">
                            {new Date(cert.issued_date).getFullYear()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section className="card-floating p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-body-lg font-semibold text-ink">
                  รีวิวจากนักเรียน
                </h2>
              </div>
              
              {allReviews.length === 0 ? (
                <p className="py-8 text-center text-body-sm text-ink-soft">
                  ยังไม่มีรีวิว
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {allReviews.map((review) => (
                    <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating_overall
                                  ? "fill-warning text-warning"
                                  : "text-line"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-mono-sm text-ink-soft">
                          {new Date(review.created_at).toLocaleDateString("th-TH", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-body-sm text-ink">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right: Booking Services */}
          <aside className="space-y-6">
            <div className="card-floating sticky top-24 p-6">
              <h2 className="mb-4 font-display text-body-lg font-semibold text-ink">
                แพ็กเกจการสอน
              </h2>
              
              {allServices.length === 0 ? (
                <p className="text-center text-body-sm text-ink-soft">
                  โค้ชยังไม่ได้เพิ่มแพ็กเกจการสอน
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {allServices.map((service) => (
                    <div key={service.id} className="rounded-radius-md bg-surface p-4 ring-1 ring-inset ring-line transition-colors hover:ring-brand">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="font-medium text-ink">{service.name}</h3>
                        <span className="shrink-0 font-semibold text-brand">
                          ฿{formatBahtFromDb(service.price)}
                        </span>
                      </div>
                      
                      {service.description && (
                        <p className="mb-3 line-clamp-2 text-body-sm text-ink-soft">
                          {service.description}
                        </p>
                      )}
                      
                      <div className="mb-4 flex flex-wrap gap-2 text-mono-sm text-ink-soft">
                        <span className="flex items-center gap-1 rounded-full bg-ink-soft/10 px-2 py-1">
                          <Clock className="h-3.5 w-3.5" />
                          {service.duration_minutes} นาที
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-ink-soft/10 px-2 py-1">
                          <Users className="h-3.5 w-3.5" />
                          กลุ่มละไม่เกิน {service.max_participants} คน
                        </span>
                      </div>
                      
                      <Link
                        href={`/book/coach/${coach.id}?service=${service.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-radius-sm bg-brand px-4 py-2 text-body-sm font-semibold text-white transition-all hover:bg-brand-dark"
                      >
                        <CalendarDays className="h-4 w-4" />
                        จองเวลานี้
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
