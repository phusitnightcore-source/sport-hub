"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// ส่ง page view ไปบันทึก (cookieless) ทุกครั้งที่เปลี่ยนหน้า
// การกรองหน้าภายใน/บอทอยู่ฝั่ง API (/api/track/view)
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/track/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      /* เงียบไว้ — การนับ view ล้มเหลวต้องไม่กระทบผู้ใช้ */
    });
    return () => controller.abort();
  }, [pathname]);

  return null;
}
