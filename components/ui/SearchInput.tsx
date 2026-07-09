import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<React.ComponentPropsWithRef<"input">, "type">;

// Search Input ตาม DESIGN_SYSTEM.md §4 — pill, พื้น surface, ไม่มีขอบ
// focus แล้ว shadow ขยับ sm→md + ring brand
export function SearchInput({ className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        aria-hidden
      />
      <input
        type="search"
        className={cn(
          "w-full rounded-full bg-surface py-2.5 pl-11 pr-4 text-body text-ink",
          "shadow-sm outline-none transition-shadow duration-fast",
          "placeholder:text-ink-soft focus:shadow-md focus:ring-2 focus:ring-brand",
        )}
        {...props}
      />
    </div>
  );
}
