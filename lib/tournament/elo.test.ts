import { describe, expect, it } from "vitest";
import { calculateEloChange, expectedScore } from "./elo";

describe("tournament Elo", () => {
  it("gives equal-rated opponents a 50% expected score", () => {
    expect(expectedScore(1200, 1200)).toBe(0.5);
    expect(calculateEloChange(1200, 1200, "win")).toBe(16);
    expect(calculateEloChange(1200, 1200, "loss")).toBe(-16);
  });

  it("rewards an upset more than an expected result", () => {
    expect(calculateEloChange(1000, 1400, "win")).toBeGreaterThan(calculateEloChange(1400, 1000, "win"));
  });
});
