import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Star, MessageSquare } from "lucide-react";

export const metadata = {
  title: "เขียนรีวิว | SportHub",
};

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const { type, id } = await searchParams;
  
  if (!type || !id || !['facility', 'coach'].includes(type)) {
    redirect("/me/bookings");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  
  let targetName = "";
  
  if (type === "facility") {
    const { data: tenant } = await admin.from("tenants").select("name").eq("id", id).single();
    if (!tenant) notFound();
    targetName = tenant.name;
  } else {
    const { data: coach } = await admin.from("coach_profiles").select("display_name").eq("id", id).single();
    if (!coach) notFound();
    targetName = coach.display_name;
  }

  const entityType = type === "coach" ? "coach" : "facility";
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("reviewer_id", user.id)
    .eq("entity_type", entityType)
    .eq(entityType === "facility" ? "facility_id" : "coach_id", id)
    .maybeSingle();

  if (existing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="font-display text-display-sm font-bold text-ink">คุณได้รีวิวนี้ไปแล้ว</h1>
        <p className="mt-2 text-body-sm text-ink-soft">
          ขอบคุณที่ร่วมแบ่งปันประสบการณ์การใช้งาน
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-display-sm font-bold text-ink">
          ให้คะแนนและรีวิว
        </h1>
        <p className="mt-1 text-body text-ink-soft">
          คุณกำลังรีวิว {type === "facility" ? "สนาม" : "โค้ช"}: <strong className="text-ink">{targetName}</strong>
        </p>
      </header>

      <form action="/api/reviews" method="POST" className="card-floating p-6">
        <input type="hidden" name="entity_type" value={type} />
        <input type="hidden" name="target_id" value={id} />

        <div className="mb-8">
          <label className="mb-3 block text-body font-medium text-ink">
            คะแนนความพึงพอใจโดยรวม
          </label>
          <div className="flex items-center gap-2">
            {/* Simple radio button star rating logic using CSS peer for visual */}
            {[1, 2, 3, 4, 5].map((star) => (
              <label key={star} className="cursor-pointer">
                <input
                  type="radio"
                  name="rating_overall"
                  value={star}
                  required
                  className="peer sr-only"
                  defaultChecked={star === 5}
                />
                <Star className="h-8 w-8 fill-surface text-line transition-colors peer-checked:fill-warning peer-checked:text-warning hover:fill-warning/50 hover:text-warning/50" />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">เลือกคะแนนตั้งแต่ 1 ถึง 5 ดาว</p>
        </div>

        {type === "facility" && (
          <div className="mb-8 space-y-4 rounded bg-surface p-4 ring-1 ring-inset ring-line">
            <h3 className="font-medium text-ink text-sm">คะแนนรายด้าน (ทางเลือก)</h3>
            
            {['rating_cleanliness', 'rating_court', 'rating_service'].map((sub) => (
              <div key={sub} className="flex items-center justify-between">
                <span className="text-body-sm text-ink-soft">
                  {sub === 'rating_cleanliness' ? 'ความสะอาด' : 
                   sub === 'rating_court' ? 'คุณภาพพื้นสนาม' : 'การบริการ'}
                </span>
                <select name={sub} className="rounded border border-line bg-white px-2 py-1 text-sm">
                  <option value="">ไม่ระบุ</option>
                  <option value="5">5 - ดีเยี่ยม</option>
                  <option value="4">4 - ดี</option>
                  <option value="3">3 - ปานกลาง</option>
                  <option value="2">2 - พอใช้</option>
                  <option value="1">1 - ควรปรับปรุง</option>
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="mb-8">
          <label htmlFor="comment" className="mb-2 flex items-center gap-2 text-body font-medium text-ink">
            <MessageSquare className="h-4 w-4" />
            ความคิดเห็นเพิ่มเติม (ทางเลือก)
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={4}
            placeholder="เล่าประสบการณ์ของคุณ เพื่อเป็นประโยชน์กับผู้ใช้งานท่านอื่น..."
            className="w-full rounded-radius-sm border border-line bg-surface p-3 text-body text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <a
            href="/me/bookings"
            className="rounded-radius-sm px-6 py-2.5 text-body font-medium text-ink-soft hover:bg-surface hover:text-ink"
          >
            ยกเลิก
          </a>
          <button
            type="submit"
            className="rounded-radius-sm bg-brand px-6 py-2.5 text-body font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            ส่งรีวิว
          </button>
        </div>
      </form>
    </div>
  );
}
