import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Plus, Trophy } from "lucide-react";
import { requireTournamentOrganizer } from "@/lib/organizer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function MyOrganizerTournamentsPage() {
  const access = await requireTournamentOrganizer();
  if (!access) redirect("/me/organizer");
  const admin = createAdminClient();
  const { data: tournaments } = await admin.from("tournaments")
    .select("id,name,sport,start_date,status,max_teams,entry_fee")
    .eq("organizer_id", access.userId)
    .order("created_at", { ascending: false });
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="flex items-center gap-2 font-display text-3xl font-black text-ink"><Trophy className="h-7 w-7 text-amber-500" /> การแข่งขันของฉัน</h1><p className="text-body-sm text-ink-soft">จัดสาย ตรวจผู้สมัคร เช็กอิน และบันทึกผลในที่เดียว</p></div><Link href="/me/organizer/tournaments/new" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-bold text-white"><Plus className="h-4 w-4" /> สร้างการแข่งขัน</Link></header>
    <section className="grid gap-4 sm:grid-cols-2">{(tournaments ?? []).length === 0 ? <div className="card-floating col-span-full p-12 text-center text-ink-soft">ยังไม่มีการแข่งขัน</div> : (tournaments ?? []).map((t) => <Link key={t.id} href={`/me/organizer/tournaments/${t.id}`} className="card-floating rounded-2xl border border-line p-5 hover:border-brand"><div className="flex items-center justify-between"><span className="rounded-lg bg-brand-soft px-2 py-1 text-xs font-bold text-brand">{t.sport}</span><span className="text-xs font-bold text-ink-soft">{t.status}</span></div><h2 className="mt-3 font-display text-lg font-bold text-ink">{t.name}</h2><p className="mt-2 flex items-center gap-1 text-body-sm text-ink-soft"><Calendar className="h-4 w-4" /> {t.start_date}</p></Link>)}</section>
  </main>;
}
