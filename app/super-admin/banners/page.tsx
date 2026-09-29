import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, Trash2, MousePointerClick } from "lucide-react";
import { getSuperAdminContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { ConfirmSubmit } from "@/components/ui/ConfirmDialog";
import { deleteBanner } from "./actions";

export const dynamic = "force-dynamic";

const PLACE_LABEL: Record<string, string> = {
  home: "หน้าแรก",
  blog: "บทความ",
  sidebar: "แถบข้าง",
};

export default async function BannersAdminPage() {
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");

  const admin = createAdminClient();
  const { data: banners } = await admin
    .from("banners")
    .select("id, name, placement, is_active, weight, clicks, impressions")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-display-md font-semibold text-ink">
            แบนเนอร์โฆษณา
          </h1>
          <p className="text-body-sm text-ink-soft">
            ขายพื้นที่โฆษณาให้แบรนด์/ร้านกีฬา — นับคลิกอัตโนมัติ
          </p>
        </div>
        <Link href="/super-admin/banners/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            เพิ่มแบนเนอร์
          </Button>
        </Link>
      </div>

      {(banners ?? []).length === 0 ? (
        <div className="card-floating p-10 text-center text-body-sm text-ink-soft">
          ยังไม่มีแบนเนอร์
          <br />
          <span className="text-mono-sm">(ถ้าบันทึกไม่ได้ ให้ push migration banners ก่อน)</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(banners ?? []).map((b) => (
            <div key={b.id} className="card-floating flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-ink">{b.name}</p>
                <p className="text-body-sm text-ink-soft">
                  {PLACE_LABEL[b.placement] ?? b.placement} · น้ำหนัก {b.weight}
                </p>
              </div>
              <span className="flex items-center gap-1 text-body-sm text-ink-soft">
                <MousePointerClick className="h-4 w-4" />
                {b.clicks} คลิก
              </span>
              <StatusPill tone={b.is_active ? "success" : "warning"}>
                {b.is_active ? "แสดงอยู่" : "ปิด"}
              </StatusPill>
              <Link
                href={`/super-admin/banners/${b.id}`}
                className="rounded-full p-2 text-ink-soft hover:bg-brand-soft hover:text-brand"
                aria-label="แก้ไข"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <ConfirmSubmit
                action={deleteBanner}
                hidden={{ id: b.id }}
                title="ลบแบนเนอร์นี้?"
                message="ลบแล้วกู้คืนไม่ได้"
                confirmLabel="ลบ"
                ariaLabel="ลบ"
                triggerClassName="rounded-full p-2 text-ink-soft hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </ConfirmSubmit>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
