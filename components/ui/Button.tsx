import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
};

// Button ตาม DESIGN_SYSTEM.md §4 — pill shape, shadow ตาม hierarchy
// Primary: พื้น brand ตัวหนังสือขาว hover ยกตัว / Secondary: พื้น surface ไม่มีขอบ
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-dark hover:-translate-y-px",
  secondary: "bg-surface text-ink shadow-sm hover:shadow-md hover:-translate-y-px",
  danger: "bg-danger text-white shadow-sm hover:-translate-y-px",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-4 py-1.5 text-body-sm",
  md: "px-6 py-2.5 text-body",
  lg: "px-8 py-3 text-body-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium",
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
