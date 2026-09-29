import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // ไม่ให้ index หน้าหลังบ้าน/ส่วนตัว
      disallow: ["/dashboard", "/super-admin", "/api", "/me"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
