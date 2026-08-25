import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Plus, Edit2, Trash2, Clock, Users } from "lucide-react";
import { formatBahtFromDb } from "@/lib/money";

export const metadata = {
  title: "แพ็กเกจการสอน | SportHub",
};

export default async function ManageCoachServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  
  const { data: profile } = await admin
    .from("coach_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/me/coach/apply");

  const { data: services } = await admin
    .from("coach_services")
    .select("*")
    .eq("coach_profile_id", profile.id)
    .order("price", { ascending: true });

  const allServices = services ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-display-sm font-bold text-ink">แพ็กเกจการสอน</h1>
          <p className="mt-1 text-body-sm text-ink-soft">
            จัดการบริการสอนและราคาของคุณ เพื่อให้นักกีฬาจองได้ง่ายขึ้น
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-radius-sm bg-brand px-4 py-2 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
          <Plus className="h-4 w-4" />
          เพิ่มแพ็กเกจใหม่
        </button>
      </header>

      {allServices.length === 0 ? (
        <div className="card-floating p-12 text-center">
          <h2 className="text-body-lg font-semibold text-ink">ยังไม่มีแพ็กเกจการสอน</h2>
          <p className="mt-2 text-body-sm text-ink-soft">
            เพิ่มแพ็กเกจการสอนของคุณเพื่อให้นักกีฬาสามารถเริ่มจองเวลาได้
          </p>
          <button className="mt-6 flex mx-auto items-center gap-2 rounded-radius-sm bg-brand px-4 py-2 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
            <Plus className="h-4 w-4" />
            สร้างแพ็กเกจแรก
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {allServices.map((service) => (
            <div key={service.id} className="card-floating flex flex-col p-6 transition-all hover:shadow-lg">
              <div className="mb-3 flex items-start justify-between gap-4">
                <h3 className="font-display text-body-lg font-semibold text-ink">
                  {service.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button className="rounded bg-surface p-1.5 text-ink-soft hover:bg-brand-soft hover:text-brand">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button className="rounded bg-surface p-1.5 text-ink-soft hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mb-4 text-display-sm font-bold text-brand">
                ฿{formatBahtFromDb(service.price)}
              </div>
              
              {service.description && (
                <p className="mb-4 text-body-sm text-ink-soft line-clamp-3">
                  {service.description}
                </p>
              )}
              
              <div className="mt-auto flex flex-wrap gap-2 text-mono-sm font-medium text-ink">
                <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 ring-1 ring-inset ring-line">
                  <Clock className="h-3.5 w-3.5 text-ink-soft" />
                  {service.duration_minutes} นาที
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 ring-1 ring-inset ring-line">
                  <Users className="h-3.5 w-3.5 text-ink-soft" />
                  สูงสุด {service.max_participants} คน
                </span>
              </div>
              
              {!service.is_active && (
                <div className="mt-4 rounded bg-warning/10 px-3 py-2 text-center text-xs font-semibold text-warning-dark">
                  ระงับการให้บริการชั่วคราว
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
