// เงินทุกจำนวนจัดการเป็น "สตางค์" (integer) — ห้าม float ตาม CLAUDE.md ข้อ 6
// ค่าจาก DB เป็น numeric(10,2) ส่งมาเป็น number/string — แปลงผ่าน string เสมอ

/** แปลงค่าเงินบาท (เช่น "150.00", 150.5) เป็นสตางค์ (integer) */
export function toSatang(baht: string | number): number {
  const s = String(baht).trim();
  const m = s.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw new Error(`ค่าเงินไม่ถูกต้อง: ${baht}`);
  const sign = m[1] === "-" ? -1 : 1;
  const whole = parseInt(m[2], 10);
  const frac = m[3] ? parseInt(m[3].padEnd(2, "0"), 10) : 0;
  return sign * (whole * 100 + frac);
}

/** สตางค์ → สตริงบาททศนิยม 2 ตำแหน่ง (สำหรับเก็บลง DB/สร้าง QR) เช่น 15000 → "150.00" */
export function satangToBahtString(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const abs = Math.abs(satang);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** สตางค์ → ข้อความแสดงผลมี comma เช่น 123456700 → "1,234,567.00" */
export function formatBaht(satang: number): string {
  const [whole, frac] = satangToBahtString(satang).split(".");
  return `${Number(whole).toLocaleString("th-TH")}.${frac}`;
}

/** ค่าจาก DB (numeric) → ข้อความแสดงผล */
export function formatBahtFromDb(value: string | number): string {
  return formatBaht(toSatang(value));
}
