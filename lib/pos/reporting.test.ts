import { describe, expect, it } from "vitest";
import { reportPaymentMethod } from "./reporting";

describe("unified payment filters", () => {
  it("groups booking cash and POS cash together", () => {
    expect(reportPaymentMethod("walk_in_cash")).toBe("cash");
    expect(reportPaymentMethod("cash")).toBe("cash");
  });
  it("groups booking transfers and QR with POS transfers", () => {
    expect(reportPaymentMethod("walk_in_transfer")).toBe("transfer");
    expect(reportPaymentMethod("online_qr")).toBe("transfer");
  });
  it("preserves the actual POS card or other tender", () => {
    expect(reportPaymentMethod("card")).toBe("card");
    expect(reportPaymentMethod("other")).toBe("other");
  });
});
