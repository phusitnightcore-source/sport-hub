"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, LogOut, Radio } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmDialog";
import { StatusPill } from "@/components/ui/StatusPill";
import { createClient } from "@/lib/supabase/client";
import { checkoutMember } from "./actions";

type Branch = { id: string; name: string; max_capacity: number };
type OpenCheckin = {
  id: string;
  branch_id: string;
  checkin_time: string;
  estimated_checkout_time: string | null;
  members: { first_name: string; last_name: string | null; member_number: string } | null;
};

// แผงแสดง Occupancy ปัจจุบันต่อสาขา + ปุ่มเช็คเอาท์ (§10.4)
export function OccupancyPanel({
  tenantId,
  branches,
  openCheckins,
}: {
  tenantId: string;
  branches: Branch[];
  openCheckins: OpenCheckin[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  // Realtime (§10.3-10.4): subscribe ความเปลี่ยนแปลงของ checkins ใน tenant นี้
  // แล้ว refresh ข้อมูลจาก server (RLS-safe) — occupancy อัปเดตภายใน ~1 วิ
  // ต้องเปิด realtime publication ให้ตาราง checkins (ดู migration realtime)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`occupancy-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => router.refresh(),
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, router]);

  async function handleCheckout(id: string) {
    setBusyId(id);
    await checkoutMember(id);
    router.refresh();
    setBusyId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-body-lg font-semibold text-ink">
          คนในสนามตอนนี้
        </h2>
        {live && (
          <span className="flex items-center gap-1.5 text-body-sm text-success">
            <Radio aria-hidden className="h-4 w-4 animate-pulse" />
            เรียลไทม์
          </span>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((branch) => {
          const inBranch = openCheckins.filter((c) => c.branch_id === branch.id);
          const full = inBranch.length >= branch.max_capacity;
          return (
            <div key={branch.id} className="card-floating flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users aria-hidden className="h-5 w-5 text-brand" />
                  <span className="text-body font-medium text-ink">{branch.name}</span>
                </div>
                <StatusPill tone={full ? "danger" : "success"}>
                  {inBranch.length} / {branch.max_capacity}
                </StatusPill>
              </div>
              {inBranch.length === 0 ? (
                <p className="text-body-sm text-ink-soft">ยังไม่มีผู้เข้าใช้บริการ</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {inBranch.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                      <div>
                        <p className="text-body-sm font-medium text-ink">
                          {c.members?.first_name} {c.members?.last_name}
                        </p>
                        <p className="font-mono text-mono-sm text-ink-soft">
                          {c.members?.member_number} · เข้า{" "}
                          {new Date(c.checkin_time).toLocaleTimeString("th-TH", {
                            timeZone: "Asia/Bangkok",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <ConfirmButton
                        onConfirm={() => handleCheckout(c.id)}
                        title="เช็คเอาท์สมาชิกคนนี้?"
                        message={`${c.members?.first_name ?? ""} ${c.members?.last_name ?? ""}`.trim()}
                        confirmLabel="เช็คเอาท์"
                        tone="brand"
                        triggerVariant="secondary"
                        triggerSize="sm"
                        disabled={busyId === c.id}
                      >
                        <LogOut aria-hidden className="h-4 w-4" />
                        เช็คเอาท์
                      </ConfirmButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
