import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Star, Building, GraduationCap, PenLine } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "รีวิวของฉัน | SportHub",
};

export default async function MyReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  
  const { data: reviews } = await admin
    .from("reviews")
    .select(`
      id,
      entity_type,
      rating_overall,
      comment,
      created_at,
      facility_id,
      coach_id,
      tenants(name),
      coach_profiles(display_name)
    `)
    .eq("reviewer_id", user.id)
    .order("created_at", { ascending: false });

  const allReviews = reviews ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-display-sm font-bold text-ink">รีวิวของฉัน</h1>
        <p className="mt-1 text-body-sm text-ink-soft">
          ประวัติการให้คะแนนและคำติชมของคุณ
        </p>
      </header>

      {allReviews.length === 0 ? (
        <div className="card-floating p-12 text-center">
          <Star className="mx-auto mb-4 h-12 w-12 text-ink-soft opacity-30" />
          <h2 className="text-body-lg font-semibold text-ink">คุณยังไม่ได้เขียนรีวิว</h2>
          <p className="mt-2 text-body-sm text-ink-soft">
            หลังจากเข้าใช้บริการสนามหรือเรียนกับโค้ช คุณสามารถกลับมาให้คะแนนได้ที่นี่
          </p>
          <Link href="/me/bookings" className="mt-6 inline-flex items-center gap-2 rounded-radius-sm bg-brand px-4 py-2 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
            <PenLine className="h-4 w-4" />
            เขียนรีวิวจากการจองที่ผ่านมา
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {allReviews.map((review) => {
            const isFacility = review.entity_type === "facility";
            const entityName = isFacility 
              ? review.tenants?.name 
              : review.coach_profiles?.display_name;
              
            return (
              <div key={review.id} className="card-floating p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-inset ring-line">
                      {isFacility ? (
                        <Building className="h-5 w-5 text-brand" />
                      ) : (
                        <GraduationCap className="h-5 w-5 text-brand" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-ink">
                        {isFacility ? "รีวิวสนาม: " : "รีวิวโค้ช: "}
                        {entityName || "ไม่ทราบชื่อ"}
                      </h3>
                      <p className="text-xs text-ink-soft">
                        {new Date(review.created_at).toLocaleDateString("th-TH", {
                          year: "numeric", month: "long", day: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
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
                </div>
                
                {review.comment ? (
                  <p className="mt-2 rounded bg-surface p-3 text-body-sm text-ink-soft">
                    &quot;{review.comment}&quot;
                  </p>
                ) : (
                  <p className="mt-2 text-body-sm italic text-ink-soft">ไม่มีข้อความรีวิว</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
