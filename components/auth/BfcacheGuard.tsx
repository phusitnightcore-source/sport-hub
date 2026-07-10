"use client";

import { useEffect } from "react";

const PROTECTED_PREFIXES = ["/dashboard", "/super-admin", "/me"];

/**
 * กัน back-button หลัง logout/สลับบัญชีเห็นหน้าเดิมจาก bfcache
 * เมื่อหน้าถูกกู้จาก bfcache (pageshow.persisted) ในพื้นที่ที่ต้อง auth
 * บังคับ reload → ยิงเซิร์ฟเวอร์ใหม่ → middleware เด้งไป login/พื้นที่บัญชีปัจจุบัน
 */
export function BfcacheGuard() {
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return;
      const inProtected = PROTECTED_PREFIXES.some((p) =>
        window.location.pathname.startsWith(p),
      );
      if (inProtected) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
