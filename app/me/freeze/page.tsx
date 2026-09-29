import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FreezeForm } from "./FreezeForm";

export default function FreezePage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex items-center gap-4">
        <Link
          href="/me"
          className="rounded-full p-2 text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="font-display text-display-md font-semibold text-ink">
          ระงับสมาชิกชั่วคราว (Freeze)
        </h1>
      </div>

      <div className="card-floating p-6">
        <p className="mb-4 text-body-sm text-ink-soft">
          การระงับชั่วคราวจะทำให้คุณไม่สามารถเข้าใช้บริการได้ในระหว่างที่ระงับ และวันหมดอายุจะถูกยืดออกไปตามจำนวนวันที่ระงับ (เมื่อคุณกดยกเลิกการระงับ)
        </p>
        <FreezeForm />
      </div>
    </main>
  );
}
