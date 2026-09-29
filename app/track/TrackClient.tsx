"use client";

import { useState } from "react";
import { Search, Phone, Hash, CalendarSearch } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BookingRow, type BookingRowData } from "@/components/ui/BookingRow";

type Result = BookingRowData & { venue: string };

export function TrackClient() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "ตรวจสอบไม่สำเร็จ");
      } else {
        setResults(json.data.bookings as Result[]);
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="card-floating flex flex-col gap-4 p-6">
        <p className="text-body-sm text-ink-soft">
          กรอกเบอร์โทรและรหัสการจอง 1 ใบที่คุณได้รับ เพื่อดูการจองทั้งหมดของคุณ
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="เบอร์โทรศัพท์"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="08XXXXXXXX"
            icon={<Phone />}
            required
          />
          <Input
            label="รหัสการจอง"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="เช่น A1B2C3D4"
            icon={<Hash />}
            maxLength={8}
            required
          />
        </div>
        {error && <p className="text-body-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>
          <Search className="h-4 w-4" />
          {busy ? "กำลังค้นหา…" : "ค้นหาการจองของฉัน"}
        </Button>
      </form>

      {results && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-body-lg font-semibold text-ink">
            พบ {results.length} รายการ
          </h2>
          {results.length === 0 ? (
            <div className="card-floating flex flex-col items-center gap-3 p-10 text-center">
              <CalendarSearch className="h-10 w-10 text-ink-soft" />
              <p className="text-body-sm text-ink-soft">ยังไม่มีการจอง</p>
            </div>
          ) : (
            results.map((b) => <BookingRow key={b.code} booking={b} />)
          )}
        </section>
      )}
    </div>
  );
}
