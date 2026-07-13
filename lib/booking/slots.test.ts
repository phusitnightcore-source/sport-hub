import { describe, it, expect } from "vitest";
import { buildSlots, toMinutes, dayOfWeekOf } from "@/lib/booking/slots";

const court = {
  open_time: "08:00:00",
  close_time: "10:00:00",
  price_standard: "100.00",
  price_peak: "150.00",
};

// วันในอนาคตไกลๆ เพื่อไม่ให้ slot กลายเป็น "past"
const FUTURE = "2999-01-04"; // เป็นวันจันทร์ (dow=1)
const base = {
  court,
  peakWindows: [],
  bookings: [],
  blocks: [],
  date: FUTURE,
  today: "2999-01-01",
  nowTime: "00:00",
};

describe("toMinutes", () => {
  it("แปลง HH:MM และ HH:MM:SS", () => {
    expect(toMinutes("08:00")).toBe(480);
    expect(toMinutes("08:30:00")).toBe(510);
    expect(toMinutes("00:00")).toBe(0);
  });
});

describe("dayOfWeekOf", () => {
  it("คืนวันในสัปดาห์ถูกต้อง (ไม่ขึ้นกับ timezone)", () => {
    expect(dayOfWeekOf("2999-01-04")).toBe(1); // จันทร์
    expect(dayOfWeekOf("2999-01-03")).toBe(0); // อาทิตย์
  });
});

describe("buildSlots", () => {
  it("สร้าง slot รายชั่วโมงในช่วงเปิด-ปิด", () => {
    const slots = buildSlots(base);
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ start: "08:00", end: "09:00", status: "available" });
    expect(slots[1]).toMatchObject({ start: "09:00", end: "10:00" });
  });

  it("ราคา standard เมื่อไม่ใช่ peak (สตางค์)", () => {
    const slots = buildSlots(base);
    expect(slots[0].priceSatang).toBe(10000);
    expect(slots[0].isPeak).toBe(false);
  });

  it("ราคา peak เมื่ออยู่ในช่วง peak ของวันนั้น", () => {
    const slots = buildSlots({
      ...base,
      peakWindows: [{ day_of_week: 1, start_time: "08:00", end_time: "09:00" }],
    });
    expect(slots[0].isPeak).toBe(true);
    expect(slots[0].priceSatang).toBe(15000);
    expect(slots[1].isPeak).toBe(false);
    expect(slots[1].priceSatang).toBe(10000);
  });

  it("slot ที่ถูกจองทับ = booked", () => {
    const slots = buildSlots({
      ...base,
      bookings: [{ start_time: "08:00", end_time: "09:00" }],
    });
    expect(slots[0].status).toBe("booked");
    expect(slots[1].status).toBe("available");
  });

  it("slot ที่ถูกบล็อก = blocked (สำคัญกว่า booked)", () => {
    const slots = buildSlots({
      ...base,
      blocks: [{ start_time: "08:00", end_time: "09:00" }],
      bookings: [{ start_time: "08:00", end_time: "09:00" }],
    });
    expect(slots[0].status).toBe("blocked");
  });

  it("slot ในอดีตของวันนี้ = past", () => {
    const slots = buildSlots({
      ...base,
      date: "2999-01-04",
      today: "2999-01-04",
      nowTime: "09:00",
    });
    expect(slots[0].status).toBe("past"); // 08:00 ผ่านไปแล้ว
    expect(slots[1].status).toBe("available"); // 09:00 ยังไม่ถึง
  });

  it("price_peak = null → ใช้ราคา standard แทน", () => {
    const slots = buildSlots({
      ...base,
      court: { ...court, price_peak: null },
      peakWindows: [{ day_of_week: 1, start_time: "08:00", end_time: "09:00" }],
    });
    expect(slots[0].priceSatang).toBe(10000);
  });
});
