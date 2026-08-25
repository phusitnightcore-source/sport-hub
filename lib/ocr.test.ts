import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractAmountSatang, ocrConfigured, checkSlipAmount } from "./ocr";

describe("extractAmountSatang", () => {
  it("อ่านยอดมีคอมมา+ทศนิยม → สตางค์", () => {
    expect(extractAmountSatang("โอนเงิน 1,234.56 บาท")).toBe(123456);
  });
  it("เลือกจำนวนที่มากสุดในข้อความ (มักเป็นยอดโอน)", () => {
    expect(extractAmountSatang("ค่าธรรมเนียม 0.00 ยอด 300.00")).toBe(30000);
  });
  it("จำนวนเต็มไม่มีทศนิยม", () => {
    expect(extractAmountSatang("จำนวน 500")).toBe(50000);
  });
  it("คืน null เมื่อไม่มีตัวเลข", () => {
    expect(extractAmountSatang("ไม่มีจำนวนเงิน")).toBeNull();
  });
});

describe("ocrConfigured / checkSlipAmount (unconfigured)", () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    process.env.OCR_API_URL = "";
    process.env.OCR_API_KEY = "";
  });
  afterEach(() => {
    process.env = { ...ORIG };
  });

  it("ocrConfigured false เมื่อไม่มี key", () => {
    expect(ocrConfigured()).toBe(false);
  });

  it("checkSlipAmount คืน configured:false โดยไม่เรียก network", async () => {
    const res = await checkSlipAmount({ imageUrl: "https://x/y.jpg", expectedBaht: 300 });
    expect(res).toEqual({ configured: false, detectedSatang: null, matches: null });
  });
});
