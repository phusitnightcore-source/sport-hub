import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureException } from "@/lib/logger";

// นับคลิกโฆษณา (banner + affiliate) แล้ว redirect ไปปลายทาง
//  - /api/ad/click?banner=<uuid>       → นับคลิก banner + ไป link_url ของ banner
//  - /api/ad/click?u=<url>&label=<ร้าน> → affiliate/outbound: log + ไป url นั้น

function safeExternal(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const admin = createAdminClient();
  const path = request.headers.get("referer") ?? null;

  const bannerId = url.searchParams.get("banner");
  if (bannerId && z.string().uuid().safeParse(bannerId).success) {
    try {
      const { data: banner } = await admin
        .from("banners")
        .select("link_url, clicks")
        .eq("id", bannerId)
        .maybeSingle();
      if (banner) {
        await admin
          .from("banners")
          .update({ clicks: banner.clicks + 1 })
          .eq("id", bannerId);
        await admin
          .from("ad_events")
          .insert({ kind: "banner", label: bannerId, path });
        const dest = safeExternal(banner.link_url);
        if (dest) return NextResponse.redirect(dest);
      }
    } catch (e) {
      captureException("ad.click.banner", e);
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const u = url.searchParams.get("u");
  const dest = u ? safeExternal(u) : null;
  if (dest) {
    try {
      await admin.from("ad_events").insert({
        kind: "affiliate",
        label: url.searchParams.get("label")?.slice(0, 80) ?? null,
        path,
      });
    } catch (e) {
      captureException("ad.click.affiliate", e);
    }
    return NextResponse.redirect(dest);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
