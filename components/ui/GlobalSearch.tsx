"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, User, CalendarDays, Loader2 } from "lucide-react";

type MemberHit = {
  id: string;
  first_name: string;
  last_name: string | null;
  member_number: string;
  phone: string | null;
};
type BookingHit = {
  id: string;
  booking_code: string;
  user_name: string;
  user_phone: string;
  booking_date: string;
  status: string;
};

// Global Search (§22) — ช่องค้นหาบน header ค้นสมาชิก/การจองแบบ debounce
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberHit[]>([]);
  const [bookings, setBookings] = useState<BookingHit[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return; // ผลลัพธ์เดิมถูกซ่อนด้วยเงื่อนไข render อยู่แล้ว
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (json.success) {
          setMembers(json.data.members ?? []);
          setBookings(json.data.bookings ?? []);
        }
      } catch {
        /* aborted หรือ network — เงียบไว้ */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const hasResults = members.length > 0 || bookings.length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="ค้นหาสมาชิก / การจอง…"
          className="w-full rounded-full bg-surface py-2 pl-9 pr-3 text-body-sm text-ink shadow-sm outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-brand"
        />
        {loading && (
          <Loader2
            aria-hidden
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-soft"
          />
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-md border border-line bg-surface p-1 shadow-lg">
          {!hasResults && !loading && (
            <p className="px-3 py-4 text-center text-body-sm text-ink-soft">
              ไม่พบผลลัพธ์
            </p>
          )}

          {members.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase text-ink-soft">
                สมาชิก
              </p>
              {members.map((m) => (
                <Link
                  key={m.id}
                  href={`/dashboard/members/${m.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-body-sm text-ink hover:bg-brand-soft hover:text-brand"
                >
                  <User aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {m.first_name} {m.last_name ?? ""}
                  </span>
                  <span className="ml-auto font-mono text-mono-sm text-ink-soft">
                    {m.member_number}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {bookings.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase text-ink-soft">
                การจอง
              </p>
              {bookings.map((b) => (
                <Link
                  key={b.id}
                  href={`/booking/${b.booking_code}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-body-sm text-ink hover:bg-brand-soft hover:text-brand"
                >
                  <CalendarDays aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="truncate">{b.user_name}</span>
                  <span className="ml-auto font-mono text-mono-sm text-ink-soft">
                    {b.booking_code}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
