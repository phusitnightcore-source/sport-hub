import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  MapPin,
  Clock,
  Star,
  Phone,
  Mail,
  Globe,
  Navigation,
  ChevronRight,
  CalendarSearch,
  Dumbbell,
  Wifi,
  ParkingCircle,
  ShowerHead,
  AirVent,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBahtFromDb } from "@/lib/money";
import { PublicNav } from "@/components/ui/PublicNav";

// Amenity icon map
const AMENITY_ICONS: Record<string, typeof Wifi> = {
  "wifi": Wifi,
  "ที่จอดรถ": ParkingCircle,
  "parking": ParkingCircle,
  "ห้องน้ำ": ShowerHead,
  "shower": ShowerHead,
  "แอร์": AirVent,
  "air": AirVent,
  "ล็อกเกอร์": Shield,
  "locker": Shield,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return {};
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("name, address")
    .eq("id", id)
    .single();
  if (!tenant) return {};
  return {
    title: `${tenant.name} | SportHub`,
    description: `จองสนามกีฬาที่ ${tenant.name} ${tenant.address ?? ""} — SportHub`,
  };
}

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, address, phone, email, logo_url, status, promptpay_id, settings, rating_avg, review_count, sport_types")
    .eq("id", id)
    .single();
  if (!tenant || !["active", "trial", "free"].includes(tenant.status)) notFound();

  const [{ data: branches }, { data: courts }, { data: reviews }] =
    await Promise.all([
      admin
        .from("branches")
        .select(
          "id, name, address, province, latitude, longitude, open_time, close_time, amenities, images, google_map_url",
        )
        .eq("tenant_id", id)
        .eq("status", "active")
        .order("created_at"),
      admin
        .from("courts")
        .select(
          "id, branch_id, name, type, price_standard, price_peak, price_offpeak, open_time, close_time, capacity, status, images",
        )
        .eq("tenant_id", id)
        .eq("status", "open")
        .order("created_at"),
      admin
        .from("reviews")
        .select(
          "id, rating_overall, rating_cleanliness, rating_court, rating_service, comment, created_at, reviewer_id",
        )
        .eq("facility_id", id)
        .eq("entity_type", "facility")
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const allCourts = courts ?? [];
  const allBranches = branches ?? [];
  const allReviews = reviews ?? [];
  const allSports = [...new Set(allCourts.map((c) => c.type))];
  const lowestPrice = allCourts.reduce<number | null>(
    (low, c) =>
      low === null || Number(c.price_standard) < low
        ? Number(c.price_standard)
        : low,
    null,
  );
  const allAmenities = [
    ...new Set(allBranches.flatMap((b) => b.amenities ?? [])),
  ];

  return (
    <div className="min-h-screen">
      <PublicNav />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-body-sm text-ink-soft">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1 hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" />
            ค้นหาสนาม
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink">{tenant.name}</span>
        </nav>

        {/* Hero Header */}
        <header className="card-floating overflow-hidden">
          {/* Gradient Header */}
          <div className="relative bg-gradient-to-br from-brand/20 via-brand/10 to-transparent px-6 pb-6 pt-10 sm:px-8 sm:pt-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {/* Logo */}
                {tenant.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenant.name}
                    className="h-16 w-16 shrink-0 rounded-radius-md bg-surface object-cover shadow-sm ring-2 ring-surface sm:h-20 sm:w-20"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-radius-md bg-brand-soft text-brand shadow-sm ring-2 ring-surface sm:h-20 sm:w-20">
                    <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10" />
                  </div>
                )}
                <div>
                  <h1 className="font-display text-display-md font-bold text-ink sm:text-display-lg">
                    {tenant.name}
                  </h1>
                  {tenant.address && (
                    <p className="mt-1 flex items-center gap-1.5 text-body-sm text-ink-soft">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {tenant.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4">
                {/* Rating */}
                <div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 shadow-sm">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-mono text-mono-sm font-semibold text-ink">
                    {Number(tenant.rating_avg) > 0
                      ? Number(tenant.rating_avg).toFixed(1)
                      : "ยังไม่มีรีวิว"}
                  </span>
                  {tenant.review_count > 0 && (
                    <span className="text-body-sm text-ink-soft">
                      ({tenant.review_count})
                    </span>
                  )}
                </div>

                {/* Price */}
                {lowestPrice !== null && (
                  <div className="rounded-full bg-success/10 px-3 py-1.5 text-body-sm font-semibold text-success">
                    เริ่ม ฿{formatBahtFromDb(lowestPrice)}/ชม.
                  </div>
                )}
              </div>
            </div>

            {/* Sport Tags */}
            {allSports.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {allSports.map((sport) => (
                  <span
                    key={sport}
                    className="rounded-full bg-brand-soft px-3 py-1 text-mono-sm font-medium text-brand"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Content Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Left: Courts & Details */}
          <div className="space-y-8 lg:col-span-2">
            {/* Courts by Branch */}
            {allBranches.map((branch) => {
              const branchCourts = allCourts.filter(
                (c) => c.branch_id === branch.id,
              );
              if (branchCourts.length === 0) return null;
              return (
                <section key={branch.id} className="card-floating p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-body-lg font-semibold text-ink">
                        {branch.name}
                      </h2>
                      <div className="mt-1 flex items-center gap-3 text-body-sm text-ink-soft">
                        {branch.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {branch.address}
                          </span>
                        )}
                        {branch.open_time && branch.close_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {String(branch.open_time).slice(0, 5)}–
                            {String(branch.close_time).slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                    {branch.google_map_url && (
                      <a
                        href={branch.google_map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-body-sm font-medium text-brand transition-colors hover:bg-brand/15"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        นำทาง
                      </a>
                    )}
                  </div>

                  {/* Amenities */}
                  {(branch.amenities ?? []).length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {(branch.amenities as string[]).map((amenity) => {
                        const Icon =
                          AMENITY_ICONS[amenity.toLowerCase()] ?? Shield;
                        return (
                          <span
                            key={amenity}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-mono-sm text-ink-soft ring-1 ring-inset ring-line"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {amenity}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Court List */}
                  <div className="divide-y divide-line">
                    {branchCourts.map((court) => (
                      <Link
                        key={court.id}
                        href={`/book/${tenant.id}/${court.id}`}
                        className="group flex items-center justify-between py-4 transition-colors first:pt-0 last:pb-0 hover:text-brand"
                      >
                        <div>
                          <h3 className="text-body font-medium text-ink group-hover:text-brand">
                            {court.name}
                          </h3>
                          <p className="mt-0.5 text-body-sm text-ink-soft">
                            {court.type}
                            {court.capacity > 1 &&
                              ` · รองรับ ${court.capacity} คน`}
                            {" · "}
                            {String(court.open_time).slice(0, 5)}–
                            {String(court.close_time).slice(0, 5)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-body font-semibold text-ink">
                              ฿{formatBahtFromDb(court.price_standard)}
                              <span className="text-body-sm font-normal text-ink-soft">
                                /ชม.
                              </span>
                            </p>
                            {court.price_peak && (
                              <p className="text-mono-sm text-warning">
                                พีค ฿{formatBahtFromDb(court.price_peak)}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-ink-soft group-hover:text-brand" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}

            {allCourts.length === 0 && (
              <div className="card-floating p-12 text-center text-body text-ink-soft">
                ยังไม่มีสนามเปิดให้จองในขณะนี้
              </div>
            )}

            {/* Reviews Section */}
            <section className="card-floating p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-body-lg font-semibold text-ink">
                  รีวิวจากผู้ใช้
                </h2>
                {Number(tenant.rating_avg) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 fill-warning text-warning" />
                    <span className="font-mono text-body-lg font-bold text-ink">
                      {Number(tenant.rating_avg).toFixed(1)}
                    </span>
                    <span className="text-body-sm text-ink-soft">
                      ({tenant.review_count} รีวิว)
                    </span>
                  </div>
                )}
              </div>

              {allReviews.length === 0 ? (
                <p className="py-8 text-center text-body-sm text-ink-soft">
                  ยังไม่มีรีวิว — จองและใช้บริการเพื่อเป็นคนแรกที่รีวิว!
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
                          {new Date(review.created_at).toLocaleDateString(
                            "th-TH",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-body-sm text-ink">
                          {review.comment}
                        </p>
                      )}
                      {/* Sub-ratings */}
                      <div className="mt-2 flex flex-wrap gap-3 text-mono-sm text-ink-soft">
                        {review.rating_cleanliness && (
                          <span>ความสะอาด {review.rating_cleanliness}/5</span>
                        )}
                        {review.rating_court && (
                          <span>พื้นสนาม {review.rating_court}/5</span>
                        )}
                        {review.rating_service && (
                          <span>บริการ {review.rating_service}/5</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* CTA */}
            <div className="card-floating p-6">
              <Link
                href={`/book/${tenant.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-radius-sm bg-brand px-6 py-3 text-body font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md"
              >
                <CalendarSearch className="h-5 w-5" />
                จองสนาม
              </Link>
              <p className="mt-3 text-center text-body-sm text-ink-soft">
                {allCourts.length} สนามพร้อมให้บริการ
              </p>
            </div>

            {/* Contact Info */}
            <div className="card-floating p-6">
              <h3 className="mb-3 font-display text-body font-semibold text-ink">
                ข้อมูลติดต่อ
              </h3>
              <div className="flex flex-col gap-3 text-body-sm">
                {tenant.phone && (
                  <a
                    href={`tel:${tenant.phone}`}
                    className="flex items-center gap-2 text-ink-soft hover:text-brand"
                  >
                    <Phone className="h-4 w-4" />
                    {tenant.phone}
                  </a>
                )}
                {tenant.email && (
                  <a
                    href={`mailto:${tenant.email}`}
                    className="flex items-center gap-2 text-ink-soft hover:text-brand"
                  >
                    <Mail className="h-4 w-4" />
                    {tenant.email}
                  </a>
                )}
                {allBranches[0]?.google_map_url && (
                  <a
                    href={allBranches[0].google_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-ink-soft hover:text-brand"
                  >
                    <Globe className="h-4 w-4" />
                    ดูแผนที่
                  </a>
                )}
              </div>
            </div>

            {/* Amenities Summary */}
            {allAmenities.length > 0 && (
              <div className="card-floating p-6">
                <h3 className="mb-3 font-display text-body font-semibold text-ink">
                  สิ่งอำนวยความสะดวก
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allAmenities.map((amenity) => {
                    const Icon =
                      AMENITY_ICONS[amenity.toLowerCase()] ?? Shield;
                    return (
                      <span
                        key={amenity}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-body-sm text-ink ring-1 ring-inset ring-line"
                      >
                        <Icon className="h-4 w-4 text-brand" />
                        {amenity}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Check Booking */}
            <div className="card-floating p-6">
              <Link
                href="/track"
                className="flex w-full items-center justify-center gap-2 rounded-radius-sm bg-surface px-6 py-3 text-body-sm font-medium text-ink ring-1 ring-inset ring-line transition-colors hover:bg-brand-soft hover:text-brand"
              >
                <CalendarSearch className="h-4 w-4" />
                เช็คการจองของฉัน
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
