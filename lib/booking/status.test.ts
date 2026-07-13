import { describe, it, expect } from "vitest";
import { BOOKING_STATUS_LABEL } from "@/lib/booking/status";

describe("BOOKING_STATUS_LABEL", () => {
  const statuses = [
    "pending_payment",
    "awaiting_verification",
    "confirmed",
    "rejected",
    "cancelled",
    "awaiting_refund",
    "refunded",
  ] as const;

  it("มีครบทุกสถานะ พร้อม label และ tone ที่ถูกต้อง", () => {
    for (const s of statuses) {
      const entry = BOOKING_STATUS_LABEL[s];
      expect(entry).toBeDefined();
      expect(entry.label.length).toBeGreaterThan(0);
      expect(["success", "danger", "warning", "brand"]).toContain(entry.tone);
    }
  });

  it("confirmed = success, rejected = danger", () => {
    expect(BOOKING_STATUS_LABEL.confirmed.tone).toBe("success");
    expect(BOOKING_STATUS_LABEL.rejected.tone).toBe("danger");
  });
});
