"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
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
  branches,
  openCheckins,
}: {
  branches: Branch[];
  openCheckins: OpenCheckin[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCheckout(id: string) {
    setBusyId(id);
    await checkoutMember(id);
    router.refresh();
    setBusyId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-body-lg font-semibold text-ink">
        คนในสนามตอนนี้
      </h2>
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
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCheckout(c.id)}
                        disabled={busyId === c.id}
                      >
                        <LogOut aria-hidden className="h-4 w-4" />
                        เช็คเอาท์
                      </Button>
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
