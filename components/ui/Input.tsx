import { useId } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentPropsWithRef<"input"> & {
  label?: string;
  error?: string;
};

// Text input มาตรฐานสำหรับฟอร์ม — radius-sm (12px) ตาม DESIGN_SYSTEM.md §3
// error state ใช้ ring danger + ข้อความใต้ช่อง
export function Input({ label, error, className, id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-body-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-sm bg-surface px-4 py-2.5 text-body text-ink",
          "shadow-sm outline-none transition-shadow duration-fast",
          "placeholder:text-ink-soft focus:shadow-md focus:ring-2",
          error ? "ring-2 ring-danger" : "focus:ring-brand",
        )}
        {...props}
      />
      {error && <p className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}
