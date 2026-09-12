import { describe, it, expect } from "vitest";
import { cartTotals, cashChange, satang } from "./money";

describe("POS settlement", () => {
  it("rounds percentage discount once in satang", () => {
    expect(cartTotals([{ price: 19.99, quantity: 3 }], 10, true)).toEqual({ subtotal: 59.97, discount: 6, total: 53.97 });
  });
  it("handles decimal cash without phantom shortfalls", () => {
    expect(cashChange(0.3, 0.1 + 0.2)).toBe(0);
    expect(cashChange(53.97, 100)).toBe(46.03);
  });
  it("rejects invalid tender and discounts", () => {
    expect(() => cashChange(100, 99.99)).toThrow();
    expect(() => satang(Infinity)).toThrow();
    expect(() => cartTotals([{ price: 20, quantity: 1 }], 21)).toThrow();
    expect(() => cartTotals([{ price: 20, quantity: 1 }], -1, true)).toThrow();
  });
});
