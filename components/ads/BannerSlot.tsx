/* eslint-disable @next/next/no-img-element */
import { createAdminClient } from "@/lib/supabase/admin";
import { nowIso } from "@/lib/api";

// ช่องแบนเนอร์โฆษณา (ขายตรงให้แบรนด์/ร้าน) — เลือกแบนเนอร์ active ตาม placement + น้ำหนัก
// ไม่มีแบนเนอร์ = ไม่แสดงอะไร (return null) — จึงวางไว้ล่วงหน้าได้โดยไม่รก
export async function BannerSlot({
  placement,
  className,
}: {
  placement: string;
  className?: string;
}) {
  const admin = createAdminClient();
  const now = nowIso();
  const { data } = await admin
    .from("banners")
    .select("id, name, image_url, starts_at, ends_at")
    .eq("placement", placement)
    .eq("is_active", true)
    .order("weight", { ascending: false })
    .limit(10);

  const active = (data ?? []).filter(
    (b) => (!b.starts_at || b.starts_at <= now) && (!b.ends_at || b.ends_at >= now),
  );
  if (active.length === 0) return null;
  const banner = active[0];

  return (
    <a
      href={`/api/ad/click?banner=${banner.id}`}
      target="_blank"
      rel="sponsored noopener"
      className={className}
      aria-label={`โฆษณา: ${banner.name}`}
    >
      <img
        src={banner.image_url}
        alt={banner.name}
        className="w-full rounded-md shadow-md"
      />
    </a>
  );
}
