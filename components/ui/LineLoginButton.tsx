import { MessageCircle } from "lucide-react";

// ปุ่ม "เข้าสู่ระบบด้วย LINE" — anchor ไป /api/auth/line/start (สี LINE #06C755)
// แสดงเฉพาะเมื่อ lineLoginConfigured() (ตรวจฝั่ง server ที่หน้าเรียกใช้)
export function LineLoginButton({ label = "เข้าสู่ระบบด้วย LINE" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <a
        href="/api/auth/line/start?mode=login"
        className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#06C755] px-4 text-body-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      >
        <MessageCircle aria-hidden className="h-5 w-5" />
        {label}
      </a>
      <div className="flex items-center gap-3 text-body-sm text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        หรือ
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
