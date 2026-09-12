"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function CounterDialog({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-line bg-surface p-0 text-ink shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm">
    <header className="flex items-center justify-between border-b border-line px-6 py-5"><h2 className="text-lg font-bold">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="ปิดหน้าต่าง" className="rounded-full p-2 hover:bg-brand-soft disabled:opacity-40"><X size={20}/></button></header>
    <div className="space-y-5 p-6">{children}</div>
  </dialog>;
}
