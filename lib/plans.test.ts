import { describe, it, expect, afterEach, vi } from "vitest";
import { daysUntil } from "./plans";

describe("daysUntil", () => {
  afterEach(() => vi.useRealTimers());

  it("นับจำนวนวันที่เหลือ (ปัดขึ้น)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T00:00:00Z"));
    expect(daysUntil("2026-07-26T00:00:00Z")).toBe(10);
  });

  it("คืน 0 เมื่อวันที่ผ่านไปแล้ว (ไม่ติดลบ)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T00:00:00Z"));
    expect(daysUntil("2026-07-10T00:00:00Z")).toBe(0);
  });

  it("ปัดเศษวันขึ้นเมื่อยังไม่ครบวัน", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T00:00:00Z"));
    expect(daysUntil("2026-07-16T06:00:00Z")).toBe(1);
  });
});
