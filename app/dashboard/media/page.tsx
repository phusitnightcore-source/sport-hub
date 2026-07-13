import { redirect } from "next/navigation";
import { getStaffContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MEDIA_BUCKET, isValidFolder } from "./folders";
import { MediaClient } from "./MediaClient";

// Media Library (§25) — จัดการไฟล์ทั้งหมดของ tenant แยกตามหมวด
export const dynamic = "force-dynamic";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const folder =
    sp.folder && isValidFolder(sp.folder) ? sp.folder : "court-images";

  const admin = createAdminClient();
  const base = `${ctx.tenantId}/${folder}`;

  const { data: list } = await admin.storage.from(MEDIA_BUCKET).list(base, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  // ตัด placeholder ของโฟลเดอร์ว่าง (id === null)
  const objects = (list ?? []).filter((o) => o.id !== null);
  const paths = objects.map((o) => `${base}/${o.name}`);

  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await admin.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(paths, 3600);
    for (const u of urls ?? []) {
      if (u.signedUrl && u.path) signed.set(u.path, u.signedUrl);
    }
  }

  const files = objects.map((o) => {
    const path = `${base}/${o.name}`;
    const size =
      typeof o.metadata?.size === "number" ? (o.metadata.size as number) : 0;
    return { name: o.name, path, size, url: signed.get(path) ?? null };
  });
  const usedBytes = files.reduce((s, f) => s + f.size, 0);

  return <MediaClient folder={folder} files={files} usedBytes={usedBytes} />;
}
