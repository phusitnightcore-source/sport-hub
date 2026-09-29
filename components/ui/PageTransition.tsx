"use client";

import { usePathname } from "next/navigation";

// เล่น enter-animation เบาๆ ทุกครั้งที่เปลี่ยนหน้า (key ตาม pathname → remount)
// animate-slide-fade-in = 200ms ease-out (§5) และปิดอัตโนมัติเมื่อ prefers-reduced-motion
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-slide-fade-in">
      {children}
    </div>
  );
}
