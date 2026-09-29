// อุปกรณ์กีฬาลอยประดับ (decorative) — กระจายทั่วหน้า สลับซ้าย-ขวา ไล่ลงมาตามความสูงหน้า
// glass chip + emoji + float animation (เคารพ prefers-reduced-motion), ไม่บังการคลิก
const ITEMS: { e: string; cls: string; delay: string }[] = [
  { e: "🏸", cls: "left-[4%] top-[8%] h-14 w-14 text-3xl rotate-6 animate-float", delay: "0s" },
  { e: "🎾", cls: "right-[6%] top-[14%] h-12 w-12 text-2xl -rotate-6 animate-float-slow hidden sm:flex", delay: "1.1s" },
  { e: "🏓", cls: "left-[8%] top-[26%] h-12 w-12 text-2xl rotate-3 animate-float-slow hidden md:flex", delay: "0.6s" },
  { e: "🏀", cls: "right-[4%] top-[33%] h-14 w-14 text-3xl -rotate-6 animate-float", delay: "1.8s" },
  { e: "🎾", cls: "left-[5%] top-[45%] h-12 w-12 text-2xl rotate-6 animate-float hidden lg:flex", delay: "2.4s" },
  { e: "🏸", cls: "right-[7%] top-[52%] h-12 w-12 text-2xl -rotate-3 animate-float-slow", delay: "0.3s" },
  { e: "🏀", cls: "left-[6%] top-[64%] h-12 w-12 text-2xl rotate-6 animate-float-slow hidden sm:flex", delay: "1.4s" },
  { e: "🏓", cls: "right-[5%] top-[71%] h-14 w-14 text-3xl -rotate-6 animate-float", delay: "2s" },
  { e: "🏸", cls: "left-[4%] top-[83%] h-12 w-12 text-2xl rotate-3 animate-float hidden lg:flex", delay: "0.9s" },
  { e: "🎾", cls: "right-[7%] top-[90%] h-12 w-12 text-2xl -rotate-6 animate-float-slow", delay: "1.6s" },
];

export function FloatingSports() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className={`absolute items-center justify-center rounded-2xl bg-surface/70 shadow-lg ring-1 ring-white/40 backdrop-blur ${it.cls} ${
            it.cls.includes("hidden") ? "" : "flex"
          }`}
          style={{ animationDelay: it.delay }}
        >
          {it.e}
        </span>
      ))}
    </div>
  );
}
