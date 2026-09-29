import { describe, expect, it } from "vitest";
import { coversBookingSlot, shiftBookingDate, validBookingDate } from "./dates";

describe("booking dates and occupied slots", () => {
  it("rejects impossible dates rather than rolling into another month", () => {
    expect(validBookingDate("2026-02-29")).toBe(false);
    expect(validBookingDate("2026-09-31")).toBe(false);
    expect(validBookingDate("2028-02-29")).toBe(true);
    expect(validBookingDate("invalid")).toBe(false);
  });
  it("moves between calendar dates without a local timezone shift", () => {
    expect(shiftBookingDate("2026-01-01",-1)).toBe("2025-12-31");
    expect(shiftBookingDate("2028-02-28",1)).toBe("2028-02-29");
  });
  it("shows a booking throughout its hours, excluding the end boundary", () => {
    expect(coversBookingSlot("10:00:00","13:00:00","10:00")).toBe(true);
    expect(coversBookingSlot("10:00:00","13:00:00","12:00")).toBe(true);
    expect(coversBookingSlot("10:00:00","13:00:00","13:00")).toBe(false);
    expect(coversBookingSlot("10:00:00","13:00:00","09:00")).toBe(false);
  });
});
