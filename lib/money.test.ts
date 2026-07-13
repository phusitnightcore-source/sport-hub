import { describe, it, expect } from "vitest";
import {
  toSatang,
  satangToBahtString,
  formatBaht,
  formatBahtFromDb,
} from "@/lib/money";

describe("toSatang", () => {
  it("แปลงสตริงทศนิยม 2 ตำแหน่ง", () => {
    expect(toSatang("150.00")).toBe(15000);
    expect(toSatang("150.50")).toBe(15050);
  });
  it("แปลงตัวเลข", () => {
    expect(toSatang(150)).toBe(15000);
    expect(toSatang(150.5)).toBe(15050);
  });
  it("ทศนิยมตำแหน่งเดียว pad เป็น 2", () => {
    expect(toSatang("0.5")).toBe(50);
  });
  it("จำนวนเต็มไม่มีจุด", () => {
    expect(toSatang("150")).toBe(15000);
  });
  it("ค่าติดลบ", () => {
    expect(toSatang("-10.50")).toBe(-1050);
  });
  it("โยน error เมื่อรูปแบบผิด", () => {
    expect(() => toSatang("abc")).toThrow();
    expect(() => toSatang("1.234")).toThrow(); // เกิน 2 ตำแหน่ง
  });
});

describe("satangToBahtString", () => {
  it("จัดรูปแบบทศนิยม 2 ตำแหน่งเสมอ", () => {
    expect(satangToBahtString(15000)).toBe("150.00");
    expect(satangToBahtString(15050)).toBe("150.50");
    expect(satangToBahtString(5)).toBe("0.05");
    expect(satangToBahtString(0)).toBe("0.00");
  });
  it("ค่าติดลบ", () => {
    expect(satangToBahtString(-1050)).toBe("-10.50");
  });
});

describe("formatBaht", () => {
  it("ใส่ comma หลักพัน", () => {
    expect(formatBaht(123456700)).toBe("1,234,567.00");
    expect(formatBaht(15000)).toBe("150.00");
  });
});

describe("round-trip", () => {
  it("baht -> satang -> baht ไม่เพี้ยน (กัน float error)", () => {
    for (const v of ["0.01", "99.99", "1500.00", "0.10", "1234567.89"]) {
      expect(satangToBahtString(toSatang(v))).toBe(
        v.includes(".") ? (v.split(".")[1].length === 1 ? v + "0" : v) : v + ".00",
      );
    }
  });
  it("formatBahtFromDb ตรงกับ formatBaht(toSatang())", () => {
    expect(formatBahtFromDb("1500.50")).toBe(formatBaht(toSatang("1500.50")));
  });
});
