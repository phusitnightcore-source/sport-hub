import Link from "next/link";
import { Lock, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

// แสดงแทนเนื้อหาฟีเจอร์ที่แพลนปัจจุบันไม่มีสิทธิ์ (ล็อก 🔒 + ชวนอัปเกรด)
export function UpgradeLock({
  feature,
  plan,
  hint,
}: {
  feature: string;
  plan?: string;
  hint?: string;
}) {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-5 px-6 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Lock className="h-7 w-7" />
      </span>
      <div>
        <h1 className="font-display text-display-md font-semibold text-ink">
          {feature} — ต้องอัปเกรดแพลน
        </h1>
        <p className="mt-2 text-body text-ink-soft">
          {hint ??
            `ฟีเจอร์นี้ไม่รวมอยู่ในแพลน${plan ? ` ${plan}` : "ปัจจุบัน"} — อัปเกรดเพื่อปลดล็อก`}
        </p>
      </div>
      <Link href="/dashboard/subscription">
        <Button size="lg">
          <ArrowUpCircle className="h-5 w-5" />
          ดูแพลน & อัปเกรด
        </Button>
      </Link>
    </main>
  );
}
