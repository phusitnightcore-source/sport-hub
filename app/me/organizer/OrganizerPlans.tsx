"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Trophy, Users } from "lucide-react";
import { submitOrganizerOrder, type OrganizerOrderState } from "./actions";

type Plan = {
  code: "group_host" | "tournament_host" | "organizer_pro";
  name: string;
  description: string;
  price_satang: number;
  can_manage_groups: boolean;
  can_manage_tournaments: boolean;
};

export function OrganizerPlans({ plans, promptpayId }: { plans: Plan[]; promptpayId: string | null }) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const [state, action, pending] = useActionState<OrganizerOrderState, FormData>(submitOrganizerOrder, {});

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.code === "group_host" ? Users : plan.code === "tournament_host" ? Trophy : Sparkles;
          return (
            <article key={plan.code} className="card-floating flex flex-col rounded-3xl border border-line p-6">
              <Icon className="h-7 w-7 text-brand" />
              <h2 className="mt-4 font-display text-xl font-black text-ink">{plan.name}</h2>
              <p className="mt-1 min-h-10 text-body-sm text-ink-soft">{plan.description}</p>
              <p className="mt-5 font-display text-3xl font-black text-brand">
                ฿{(plan.price_satang / 100).toLocaleString("th-TH")}
                <span className="text-body-xs font-semibold text-ink-soft"> / เดือน</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-body-sm text-ink">
                {plan.can_manage_groups && <li>✓ สร้างและบริหารก๊วน</li>}
                {plan.can_manage_tournaments && <li>✓ จัดการแข่งขันและสายแข่ง</li>}
                <li>✓ Badge ยืนยันหลังชื่อ</li>
              </ul>
              <button onClick={() => setSelected(plan)} className="mt-6 rounded-xl bg-brand px-4 py-2.5 font-bold text-white hover:bg-brand-dark">
                เลือกแพ็กเกจนี้
              </button>
            </article>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form action={action} className="w-full max-w-lg space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <input type="hidden" name="plan_code" value={selected.code} />
            <div>
              <h3 className="font-display text-xl font-black text-ink">สมัคร {selected.name}</h3>
              <p className="text-body-sm text-ink-soft">โอน ฿{(selected.price_satang / 100).toLocaleString("th-TH")} {promptpayId ? `ไปยังพร้อมเพย์ ${promptpayId}` : "ตามช่องทางที่ทีม SportHub แจ้ง"}</p>
            </div>
            {state.error && <div role="alert" className="rounded-xl bg-danger/10 p-3 text-body-sm font-bold text-danger">{state.error}</div>}
            {state.success && <div className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-body-sm font-bold text-success"><CheckCircle2 className="h-4 w-4" /> ส่งหลักฐานแล้ว รอตรวจสอบ</div>}
            {!state.success && <>
              <label className="block text-body-sm font-bold text-ink">ชื่อผู้โอน<input required name="sender_name" className="mt-1 w-full rounded-xl border border-line bg-surface-raised px-3 py-2" /></label>
              <label className="block text-body-sm font-bold text-ink">วันและเวลาโอน<input required name="transfer_at" type="datetime-local" className="mt-1 w-full rounded-xl border border-line bg-surface-raised px-3 py-2" /></label>
              <label className="block text-body-sm font-bold text-ink">เลขอ้างอิง (ถ้ามี)<input name="payment_reference" className="mt-1 w-full rounded-xl border border-line bg-surface-raised px-3 py-2" /></label>
              <label className="block text-body-sm font-bold text-ink">หลักฐานการชำระเงิน<input required name="slip" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 w-full text-body-sm" /></label>
            </>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-line px-4 py-2 font-bold text-ink">ปิด</button>
              {!state.success && <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 font-bold text-white disabled:opacity-60">{pending && <Loader2 className="h-4 w-4 animate-spin" />} ส่งตรวจสอบ</button>}
            </div>
          </form>
        </div>
      )}
    </>
  );
}
