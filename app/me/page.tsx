import Link from "next/link";
import { CalendarSearch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";

import { UnfreezeButton } from "./UnfreezeButton";
import { PrivacyPanel } from "./PrivacyPanel";
import { MemberCard } from "./card/MemberCard";

export default async function MemberPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("*, packages(name, type, sessions_limit), tenants(name)")
    .eq("profile_id", user.id)
    .maybeSingle();

  // ผู้ใช้ทั่วไป (ไม่ใช่สมาชิกฟิตเนสรายสนาม) → ไปหน้าการจอง/พื้นที่ของฉัน
  if (!member) redirect("/me/bookings");


  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-8 sm:px-6">
      <MemberCard member={member} tenantName={member.tenants?.name || "SportHub"} />

      <Link href="/me/bookings">
        <Button variant="secondary" className="w-full">
          <CalendarSearch className="h-4 w-4" />
          การจองของฉัน
        </Button>
      </Link>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/me/renew">
          <Button variant="primary" className="w-full">
            ต่ออายุแพ็กเกจ
          </Button>
        </Link>
        {member.status === "frozen" ? (
          <UnfreezeButton />
        ) : member.status === "active" ? (
          <Link href="/me/freeze">
            <Button variant="secondary" className="w-full">
              ระงับชั่วคราว (Freeze)
            </Button>
          </Link>
        ) : null}
      </div>

      <PrivacyPanel optOut={member.broadcast_opt_out} />
    </main>
  );
}
