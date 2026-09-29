import { redirect } from "next/navigation";
import { BadgeCheck, Clock3 } from "lucide-react";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewOrganizerOrder } from "./actions";

export const dynamic = "force-dynamic";

export default async function OrganizerApprovalsPage() {
  if (!(await getSuperAdminContext())) redirect("/login");
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("organizer_subscription_orders")
    .select("id,profile_id,plan_code,amount_satang,status,sender_name,transfer_at,payment_reference,slip_path,created_at,review_note,subscriber:profiles!organizer_subscription_orders_profile_id_fkey(display_name,full_name,email)")
    .order("created_at", { ascending: false })
    .limit(100);
  const ordersWithSlips = await Promise.all(
    (orders ?? []).map(async (order) => {
      if (!order.slip_path) return { ...order, slipUrl: null };
      const { data } = await admin.storage
        .from("organizer-slips")
        .createSignedUrl(order.slip_path, 10 * 60);
      return { ...order, slipUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <main className="space-y-6">
      <header><h1 className="flex items-center gap-2 font-display text-3xl font-black text-ink"><BadgeCheck className="h-7 w-7 text-brand" /> Organizer Membership</h1><p className="mt-1 text-body-sm text-ink-soft">ตรวจหลักฐานและเปิดสิทธิ์รายเดือน ระบบจะต่ออายุจากวันหมดอายุเดิมอัตโนมัติ</p></header>
      <section className="space-y-3">
        {ordersWithSlips.length === 0 ? <div className="card-floating p-12 text-center text-ink-soft">ยังไม่มีรายการสมัคร</div> : ordersWithSlips.map((order) => (
          <article key={order.id} className="card-floating rounded-2xl border border-line p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="font-display text-lg font-bold text-ink">{order.subscriber?.display_name || order.subscriber?.full_name || order.subscriber?.email}</h2><p className="text-body-sm text-ink-soft">{order.plan_code} · ฿{(order.amount_satang / 100).toLocaleString("th-TH")} · ผู้โอน {order.sender_name}</p><p className="mt-1 flex items-center gap-1 text-body-xs text-ink-soft"><Clock3 className="h-3.5 w-3.5" /> {new Date(order.transfer_at).toLocaleString("th-TH")} {order.payment_reference ? `· Ref ${order.payment_reference}` : ""}</p></div>
              <div className="flex items-center gap-2">
                {order.slipUrl && <a href={order.slipUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-line px-3 py-2 text-body-sm font-bold text-brand hover:border-brand">ดูหลักฐานการโอน</a>}
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">{order.status}</span>
              </div>
            </div>
            {order.status === "awaiting_verification" && <form action={reviewOrganizerOrder} className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4"><input type="hidden" name="order_id" value={order.id} /><input name="note" placeholder="หมายเหตุ (ถ้ามี)" className="min-w-48 flex-1 rounded-xl border border-line bg-surface-raised px-3 py-2 text-body-sm" /><button name="decision" value="approve" className="rounded-xl bg-success px-4 py-2 text-body-sm font-bold text-white">อนุมัติ 1 เดือน</button><button name="decision" value="reject" className="rounded-xl bg-danger px-4 py-2 text-body-sm font-bold text-white">ปฏิเสธ</button></form>}
          </article>
        ))}
      </section>
    </main>
  );
}
