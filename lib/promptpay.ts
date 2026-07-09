// สร้าง PromptPay payload ตามมาตรฐาน EMVCo QR (Tag 29 — PromptPay AID)
// รองรับ: เบอร์โทร 10 หลัก / เลขบัตรประชาชน 13 หลัก / e-Wallet 15 หลัก
// อ้างอิง SCOPE.md §9.7: ระบบสร้าง QR อัตโนมัติแยกต่อ tenant จาก promptpay_id

const PROMPTPAY_AID = "A000000677010111";

function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — ตามข้อกำหนด EMVCo Tag 63 */
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * @param target promptpay_id ของ tenant (เบอร์โทร/บัตรประชาชน/e-wallet)
 * @param amountBaht ยอดเงินสตริงทศนิยม 2 ตำแหน่ง เช่น "150.00" (จาก satangToBahtString)
 */
export function promptpayPayload(target: string, amountBaht: string): string {
  const digits = target.replace(/\D/g, "");
  let proxy: string;
  if (digits.length === 13) {
    proxy = tlv("02", digits); // เลขบัตรประชาชน
  } else if (digits.length === 15) {
    proxy = tlv("03", digits); // e-Wallet
  } else if (digits.length === 10 && digits.startsWith("0")) {
    proxy = tlv("01", "0066" + digits.slice(1)); // เบอร์โทร → 0066XXXXXXXXX
  } else {
    throw new Error(`promptpay_id ไม่ถูกต้อง: ${target}`);
  }

  const merchantInfo = tlv("00", PROMPTPAY_AID) + proxy;
  const body =
    tlv("00", "01") + // Payload Format Indicator
    tlv("01", "12") + // Dynamic QR (ยอดระบุแล้ว ใช้ครั้งเดียว)
    tlv("29", merchantInfo) +
    tlv("53", "764") + // สกุลเงิน THB
    tlv("54", amountBaht) +
    tlv("58", "TH");

  const withCrcTag = body + "6304";
  return withCrcTag + crc16(withCrcTag);
}
