import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
import { requireTournamentOrganizer } from "@/lib/organizer";
import { NewTournamentForm } from "@/app/dashboard/tournaments/new/NewTournamentForm";

export default async function MyNewTournamentPage() {
  if (!(await requireTournamentOrganizer())) redirect("/me/organizer");
  const today = new Date().toISOString().split("T")[0];
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8"><Link href="/me/organizer/tournaments" className="inline-flex items-center gap-1 text-body-sm font-bold text-ink-soft"><ChevronLeft className="h-4 w-4" /> กลับรายการแข่งขัน</Link><header><h1 className="flex items-center gap-2 font-display text-3xl font-black text-ink"><Trophy className="h-7 w-7 text-amber-500" /> สร้างการแข่งขันใหม่</h1><p className="mt-1 text-body-sm text-ink-soft">สมาชิกผู้จัดสามารถระบุสถานที่ในรายละเอียดได้โดยไม่ต้องเป็นเจ้าของสนาม</p></header><NewTournamentForm branches={[]} today={today} basePath="/me/organizer/tournaments" /></main>;
}
