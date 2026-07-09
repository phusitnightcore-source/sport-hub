import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";

import QRCode from "react-qr-code";
import { formatThaiDate } from "@/lib/date";
import { UnfreezeButton } from "./UnfreezeButton";

export default async function MemberPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("*, packages(name, type, sessions_limit)")
    .eq("profile_id", user.id)
    .single();

  if (!member) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <h1 className="font-display text-display-md font-semibold text-ink">
          คุณยังไม่ได้เป็นสมาชิก
        </h1>
        <LogoutButton />
      </main>
    );
  }

  // Use member.id as the data string for QR code, or a specific format
  const qrData = `sport-hub:checkin:${member.member_number}`;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-md font-semibold text-brand">
          SportHub Member
        </h1>
        <LogoutButton />
      </div>

      <div className="card-floating flex flex-col items-center justify-center p-8">
        <StatusPill
          tone={
            member.status === "active"
              ? "success"
              : member.status === "frozen"
                ? "brand"
                : "danger"
          }
          className="mb-4 text-body-lg px-4 py-1"
        >
          {member.status.toUpperCase()}
        </StatusPill>
        
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <QRCode value={qrData} size={192} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
        </div>
        <p className="font-mono text-body-lg font-bold text-ink">
          {member.member_number}
        </p>
        <h2 className="mt-2 text-display-sm font-semibold text-brand">
          {member.first_name} {member.last_name}
        </h2>
        <p className="mt-1 text-body text-ink-soft">
          แพ็กเกจ: <span className="font-medium text-ink">{member.packages?.name}</span>
        </p>

        <div className="mt-6 flex w-full flex-col gap-2 rounded-lg bg-surface p-4 text-body-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">วันหมดอายุ</span>
            <span className="font-medium text-ink">{member.end_date ? formatThaiDate(member.end_date) : "-"}</span>
          </div>
          {member.packages?.type === "session_based" && (
            <div className="flex justify-between">
              <span className="text-ink-soft">จำนวนครั้งที่ใช้</span>
              <span className="font-medium text-ink">
                {member.sessions_used} / {member.packages.sessions_limit}
              </span>
            </div>
          )}
        </div>
      </div>

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
    </main>
  );
}
