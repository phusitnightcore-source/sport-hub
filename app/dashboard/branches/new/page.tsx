import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { BranchForm } from "../BranchForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewBranchPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/branches"
          className="rounded-full bg-surface p-2 text-ink-soft shadow-sm transition-all hover:bg-line hover:text-ink"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="font-display text-display-sm font-semibold text-ink">
            เพิ่มสาขาใหม่
          </h1>
          <p className="text-body-sm text-ink-soft">
            กรอกข้อมูลเพื่อสร้างสาขาใหม่สำหรับระบบจอง
          </p>
        </div>
      </div>

      <BranchForm />
    </main>
  );
}
