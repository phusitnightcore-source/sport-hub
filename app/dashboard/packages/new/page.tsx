import { getStaffContext } from "@/lib/auth";
import { PackageForm } from "../PackageForm";
import { redirect } from "next/navigation";

export default async function NewPackagePage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-display-md font-semibold text-ink">
        เพิ่มแพ็กเกจใหม่
      </h1>
      <PackageForm />
    </main>
  );
}
