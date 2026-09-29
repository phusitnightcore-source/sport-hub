"use client";

import { useEffect } from "react";
import Script from "next/script";

// Google AdSense slot — ทำงานเฉพาะเมื่อตั้ง NEXT_PUBLIC_ADSENSE_CLIENT (Publisher ID)
// ก่อนได้รับอนุมัติจาก Google จะไม่แสดงอะไร (return null) — วางไว้ล่วงหน้าได้
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

type AdWindow = Window & { adsbygoogle?: unknown[] };

export function AdSlot({ slot, className }: { slot?: string; className?: string }) {
  useEffect(() => {
    if (!CLIENT) return;
    try {
      const w = window as AdWindow;
      (w.adsbygoogle = w.adsbygoogle ?? []).push({});
    } catch {
      /* AdSense ยังไม่พร้อม — ข้าม */
    }
  }, []);

  if (!CLIENT) return null;

  return (
    <div className={className}>
      <Script
        id="adsense-lib"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
