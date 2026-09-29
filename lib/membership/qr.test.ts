import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemberQrToken, verifyMemberQrToken } from "./qr";

describe("fitness member QR", () => {
  beforeEach(() => {
    process.env.MEMBER_QR_SECRET = "test-secret-that-is-long-enough-for-hmac";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T03:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.MEMBER_QR_SECRET;
  });

  it("creates a signed token that resolves to the member", () => {
    const qr = createMemberQrToken("33bf8c78-4317-4bd0-95de-ff153b10cc3f");
    expect(verifyMemberQrToken(qr.token)).toEqual({
      valid: true,
      memberId: "33bf8c78-4317-4bd0-95de-ff153b10cc3f",
    });
  });

  it("rejects a modified signature", () => {
    const qr = createMemberQrToken("33bf8c78-4317-4bd0-95de-ff153b10cc3f");
    const tampered = `${qr.token.slice(0, -1)}${qr.token.endsWith("a") ? "b" : "a"}`;
    expect(verifyMemberQrToken(tampered)).toEqual({ valid: false, reason: "signature" });
  });

  it("rejects a token after its short validity window", () => {
    const qr = createMemberQrToken("33bf8c78-4317-4bd0-95de-ff153b10cc3f");
    vi.advanceTimersByTime(46_000);
    expect(verifyMemberQrToken(qr.token)).toEqual({ valid: false, reason: "expired" });
  });
});
