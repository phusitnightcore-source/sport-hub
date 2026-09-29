"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";

type Tone = "danger" | "brand";
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

// เรนเดอร์ปุ่ม trigger — เป็น Button (ถ้าระบุ variant) หรือปุ่มเปล่า + className
function Trigger({
  variant,
  size,
  className,
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  if (variant) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size ?? "sm"}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// เชลล์ modal กลาง — overlay + การ์ด + ปิดด้วย Esc / คลิกนอก (รองรับ dark mode ผ่าน token)
function ModalShell({
  title,
  message,
  onClose,
  children,
  closable = true,
}: {
  title: string;
  message?: string;
  onClose: () => void;
  children: React.ReactNode;
  closable?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && closable) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, closable]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => closable && onClose()}
        aria-hidden
      />
      <div className="animate-dropdown-in relative flex w-full max-w-sm flex-col gap-4 rounded-lg bg-surface p-6 shadow-lg">
        <div>
          <h3 className="font-display text-body-lg font-semibold text-ink">{title}</h3>
          {message && <p className="mt-1 text-body-sm text-ink-soft">{message}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ยืนยันแล้ว submit ฟอร์ม server action (หุ้มปุ่ม trash/ลบ ที่เป็น <form action=...>)
export function ConfirmSubmit({
  action,
  hidden = {},
  children,
  title,
  message,
  confirmLabel = "ยืนยัน",
  tone = "danger",
  triggerClassName,
  triggerVariant,
  triggerSize,
  ariaLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  children: React.ReactNode;
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: Tone;
  triggerClassName?: string;
  triggerVariant?: Variant;
  triggerSize?: Size;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Trigger
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        ariaLabel={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {children}
      </Trigger>
      {open && (
        <ModalShell title={title} message={message} onClose={() => setOpen(false)}>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <form action={action}>
              {Object.entries(hidden).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} size="sm">
                {confirmLabel}
              </Button>
            </form>
          </div>
        </ModalShell>
      )}
    </>
  );
}

// ยืนยันแล้วเรียก callback (หุ้ม onClick handler เช่น fetch/มutation)
export function ConfirmButton({
  onConfirm,
  children,
  title,
  message,
  confirmLabel = "ยืนยัน",
  tone = "danger",
  triggerClassName,
  triggerVariant,
  triggerSize,
  ariaLabel,
  disabled,
}: {
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: Tone;
  triggerClassName?: string;
  triggerVariant?: Variant;
  triggerSize?: Size;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handle() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Trigger
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        ariaLabel={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {children}
      </Trigger>
      {open && (
        <ModalShell
          title={title}
          message={message}
          closable={!pending}
          onClose={() => setOpen(false)}
        >
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant={tone === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={handle}
              disabled={pending}
            >
              {pending ? "กำลังทำ…" : confirmLabel}
            </Button>
          </div>
        </ModalShell>
      )}
    </>
  );
}
