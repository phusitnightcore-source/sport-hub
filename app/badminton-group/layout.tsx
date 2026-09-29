import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { ConfirmProvider } from "@/components/badminton/ConfirmProvider";
import "./badminton.css";

export const metadata: Metadata = {
  title: "Badminton Group | จัดก๊วนแบดมินตัน",
  description:
    "ระบบจัดการก๊วนแบดมินตัน จัดคิว จับคู่ บันทึกผล และคำนวณค่าใช้จ่ายอัตโนมัติ",
};

export default function BadmintonGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="badminton-group-theme antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen transition-colors duration-200">
      <ConfirmProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              padding: "14px 20px",
              fontSize: "14px",
              fontFamily: "var(--font-outfit), var(--font-prompt), sans-serif",
            },
          }}
        />
      </ConfirmProvider>
    </div>
  );
}
