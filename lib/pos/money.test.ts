import { describe, it, expect } from "vitest";
import { cartTotals, cashChange, satang } from "./money";

describe("POS settlement", () => {
  it("combines the SOW example into one 560 baht payment", () => {
    expect(cartTotals([{ price: 20, quantity: 2 }, { price: 120, quantity: 1 }, { price: 100, quantity: 1 }], 0, false, 300).total).toBe(560);
  });
  it("discounts products only, preserving the court payment", () => {
    expect(cartTotals([{ price: 100, quantity: 1 }], 10, true, 300)).toEqual({ subtotal: 100, discount: 10, total: 390 });
  });
  it("accepts court-only settlement but not discounts against court fees", () => {
    expect(cartTotals([], 0, false, 300).total).toBe(300);
    expect(() => cartTotals([], 1, false, 300)).toThrow();
    expect(() => cartTotals([], 0, false, -1)).toThrow();
  });
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
