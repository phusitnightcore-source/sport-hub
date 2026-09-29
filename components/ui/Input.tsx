import { useId } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentPropsWithRef<"input"> & {
  label?: string;
  error?: string;
  /** ข้อความช่วยเหลือใต้ช่อง (แสดงเมื่อไม่มี error) */
  hint?: string;
  /** ไอคอนนำหน้าช่อง (lucide) — เพิ่มระยะห่างซ้ายให้อัตโนมัติ */
  icon?: React.ReactNode;
};

// Text input มาตรฐาน — radius-sm (12px) ตาม DESIGN_SYSTEM.md §3
// v2 polish: มี ring บางๆ (--line) ตอนพักให้ช่องมีขอบเขตชัด ไม่ "โล้น",
// hover เรืองขอบ brand จางๆ, focus → ring brand + shadow ยก
export function Input({ label, error, hint, icon, className, id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-body-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full rounded-sm bg-surface py-2.5 text-body text-ink",
            "shadow-sm outline-none transition-all duration-fast",
            "ring-1 ring-inset ring-line",
            "placeholder:text-ink-soft",
            "hover:ring-brand/40",
            "focus:shadow-md focus:ring-2 focus:ring-brand",
            "disabled:cursor-not-allowed disabled:opacity-60",
            icon ? "pl-11 pr-4" : "px-4",
            error && "ring-2 ring-danger hover:ring-danger focus:ring-danger",
          )}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-body-sm text-ink-soft">{hint}</p>}
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
