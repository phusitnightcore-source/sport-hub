import { cn } from "@/lib/utils";

type IconButtonProps = React.ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "surface";
  size?: "sm" | "md";
  /** บังคับใส่เสมอ — ปุ่มมีแต่ไอคอน screen reader ต้องรู้ว่าคือปุ่มอะไร */
  "aria-label": string;
};

// IconButton ตาม DESIGN_SYSTEM.md §4 — วงกลมทึบ
// primary (พื้น brand ไอคอนขาว) = action หลัก / surface = action รอง (pin, ลบ)
const variantClasses: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  primary: "bg-brand text-white shadow-sm hover:bg-brand-dark",
  surface: "bg-surface text-ink-soft shadow-sm hover:text-ink hover:shadow-md",
};

const sizeClasses: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-9 w-9 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-11 w-11 [&_svg]:h-5 [&_svg]:w-5",
};

export function IconButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "transition-all duration-fast active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
