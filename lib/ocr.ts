import "server-only";
import { toSatang } from "@/lib/money";
import { captureException } from "@/lib/logger";

// OCR ตรวจยอดในสลิปอัตโนมัติ (ลดงาน manual verify §9.6)
// dep-free: เรียก HTTP OCR API ทั่วไป (เช่น Google Vision, Typhoon OCR, iApp)
// ผ่าน env OCR_API_URL + OCR_API_KEY — ทำงานเฉพาะเมื่อตั้งค่าแล้ว ("รอใส่ key")
//
// สัญญา API ที่คาดหวัง: POST { imageUrl } → { text } (raw OCR text)
// เราดึงตัวเลขที่ดูเหมือนจำนวนเงินจาก text แล้วเทียบกับยอดที่ต้องชำระ

export function ocrConfigured(): boolean {
  return Boolean(process.env.OCR_API_URL && process.env.OCR_API_KEY);
}

export type SlipAmountCheck = {
  configured: boolean;
  /** จำนวนเงินที่ OCR อ่านได้ (สตางค์) — null ถ้าอ่านไม่ได้ */
  detectedSatang: number | null;
  /** ยอดที่อ่านได้ตรงกับที่ต้องชำระหรือไม่ */
  matches: boolean | null;
};

// ดึงจำนวนเงินที่ "มากสุด" จากข้อความ (มักเป็นยอดโอนในสลิป) — รูปแบบ 1,234.56 / 1234
export function extractAmountSatang(text: string): number | null {
  const matches = text.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\.\d{2}/g);
  if (!matches) return null;
  let best = 0;
  for (const m of matches) {
    const n = Number(m.replace(/,/g, ""));
    if (Number.isFinite(n) && n > best) best = n;
  }
  return best > 0 ? Math.round(best * 100) : null;
}

export async function checkSlipAmount(params: {
  imageUrl: string;
  expectedBaht: string | number;
}): Promise<SlipAmountCheck> {
  if (!ocrConfigured()) {
    return { configured: false, detectedSatang: null, matches: null };
  }
  try {
    const res = await fetch(process.env.OCR_API_URL!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OCR_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl: params.imageUrl }),
    });
    if (!res.ok) {
      return { configured: true, detectedSatang: null, matches: null };
    }
    const json = (await res.json()) as { text?: string };
    const detectedSatang = extractAmountSatang(json.text ?? "");
    if (detectedSatang == null) {
      return { configured: true, detectedSatang: null, matches: null };
    }
    const expectedSatang = toSatang(params.expectedBaht);
    return {
      configured: true,
      detectedSatang,
      matches: detectedSatang === expectedSatang,
    };
  } catch (e) {
    captureException("ocr.checkSlipAmount", e);
    return { configured: true, detectedSatang: null, matches: null };
  }
}
