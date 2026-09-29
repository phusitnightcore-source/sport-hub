"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  playNotificationSound,
  unlockAudio,
  type NotifSoundType,
} from "@/lib/sounds";
import { cn } from "@/lib/utils";
import {
  markTenantNotificationsRead,
  markSelfNotificationsRead,
  markPlatformNotificationsRead,
} from "@/lib/notify/read-actions";

export type BellItem = {
  id: string;
  type: NotifSoundType;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

type Mode = "tenant" | "self" | "platform";

type Props = {
  mode: Mode;
  /** tenant mode */
  tenantId?: string | null;
  /** self mode — [profileId, memberId?] */
  recipientIds?: string[];
  initialItems: BellItem[];
  initialUnread: number;
  /** custom sound URL ต่อประเภท (สนามอัปโหลด) — ไม่มี = ใช้ synth default */
  soundMap?: Partial<Record<NotifSoundType, string>>;
  /** ลิงก์ "ดูทั้งหมด" */
  href: string;
};

const SOUND_TYPES: NotifSoundType[] = [
  "booking",
  "payment",
  "membership",
  "promotion",
  "system",
];
function asSoundType(v: string): NotifSoundType {
  return (SOUND_TYPES as string[]).includes(v) ? (v as NotifSoundType) : "system";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return `${Math.floor(h / 24)} วันก่อน`;
}

export function NotificationBell({
  mode,
  tenantId,
  recipientIds = [],
  initialItems,
  initialUnread,
  soundMap,
  href,
}: Props) {
  const [items, setItems] = useState<BellItem[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<BellItem | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ปลดล็อก autoplay ที่ interaction แรกของผู้ใช้ (ครั้งเดียว)
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const accept = useCallback(
    (row: { recipient_type?: string | null; tenant_id?: string | null }): boolean => {
      if (mode === "tenant") return row.recipient_type === "admin" || row.recipient_type === "staff";
      if (mode === "platform") return row.tenant_id == null && row.recipient_type === "admin";
      return true; // self: filter recipient_id ครอบแล้ว
    },
    [mode],
  );

  // Realtime subscribe INSERT บน notifications (RLS กรองอีกชั้น)
  // ใช้ 1 channel ต่อ filter eq. (เลี่ยง in.() ที่บาง version ไม่รองรับ) — self mode = 1 channel ต่อ recipientId
  useEffect(() => {
    const filters: { key: string; filter: string }[] = [];
    if (mode === "tenant") {
      if (!tenantId) return;
      filters.push({ key: `t-${tenantId}`, filter: `tenant_id=eq.${tenantId}` });
    } else if (mode === "self") {
      if (recipientIds.length === 0) return;
      recipientIds.forEach((id) => filters.push({ key: `r-${id}`, filter: `recipient_id=eq.${id}` }));
    } else {
      filters.push({ key: "platform", filter: `recipient_type=eq.admin` });
    }

    const handleInsert = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new;
      // in_app เท่านั้น (dispatcher เขียนหลายช่อง — กัน toast ซ้ำจาก line/email row)
      if (row.channel !== "in_app") return;
      if (!accept(row)) return;
      const item: BellItem = {
        id: String(row.id),
        type: asSoundType(String(row.type)),
        title: String(row.title),
        body: row.body == null ? null : String(row.body),
        is_read: false,
        created_at: String(row.created_at),
      };
      setItems((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev; // กันซ้ำ (หลาย channel)
        return [item, ...prev].slice(0, 30);
      });
      setUnread((u) => u + 1);
      setToast(item);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4000);
      playNotificationSound(item.type, soundMap?.[item.type]);
    };

    const supabase = createClient();
    const channels = filters.map(({ key, filter }) =>
      supabase
        .channel(`notif-${mode}-${key}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter },
          handleInsert,
        )
        .subscribe(),
    );

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tenantId, recipientIds.join(","), accept, soundMap]);

  async function markRead() {
    if (mode === "tenant") await markTenantNotificationsRead();
    else if (mode === "self") await markSelfNotificationsRead();
    else await markPlatformNotificationsRead();
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    // เปิดกระดิ่ง = ถือว่าเห็นแล้ว → เคลียร์ badge
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
      void markRead();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="การแจ้งเตือน"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="animate-dropdown-in absolute right-0 top-11 z-50 w-80 max-w-[90vw] overflow-hidden rounded-lg bg-surface shadow-lg ring-1 ring-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-body-sm font-semibold text-ink">การแจ้งเตือน</span>
            <Link
              href={href}
              onClick={() => setOpen(false)}
              className="text-body-sm text-brand hover:underline"
            >
              ดูทั้งหมด
            </Link>
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-body-sm text-ink-soft">
                ยังไม่มีการแจ้งเตือน
              </li>
            ) : (
              items.slice(0, 8).map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex flex-col gap-0.5 px-4 py-3",
                    !n.is_read && "bg-brand-soft/40",
                  )}
                >
                  <span className="text-body-sm font-medium text-ink">{n.title}</span>
                  {n.body && (
                    <span className="line-clamp-2 text-body-sm text-ink-soft">{n.body}</span>
                  )}
                  <span className="text-[11px] text-ink-soft/70">{timeAgo(n.created_at)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Toast มุมขวาบน */}
      {toast && (
        <button
          type="button"
          onClick={() => {
            setToast(null);
            setOpen(true);
          }}
          className="animate-toast-in fixed right-4 top-20 z-[60] flex w-72 max-w-[85vw] items-start gap-3 rounded-lg bg-surface p-4 text-left shadow-lg ring-1 ring-brand/20"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Bell className="h-4 w-4" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-body-sm font-semibold text-ink">{toast.title}</span>
            {toast.body && (
              <span className="line-clamp-2 text-body-sm text-ink-soft">{toast.body}</span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
