import { z } from "zod";
import { apiOk, apiError } from "@/lib/api";
import { createBooking, addDaysYmd } from "@/lib/booking/create";
import { rateLimit } from "@/lib/ratelimit";

// จองซ้ำรายสัปดาห์ฝั่งลูกค้า (§7.1) — สร้างหลาย booking วันเดียวกันของสัปดาห์ถัดๆ ไป
// reuse createBooking ต่อสัปดาห์: ชนวันไหน (เต็ม/บล็อก/เกิน advance) ข้ามแล้วรายงาน
// คูปองใช้กับสัปดาห์แรกเท่านั้น (กันนับ usage ซ้ำ)
const bodySchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  userName: z.string().trim().min(2).max(100),
  userPhone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  note: z.string().trim().max(500).optional(),
  couponCode: z.string().trim().max(40).optional(),
  acceptPolicy: z.literal(true),
  repeatWeeks: z.number().int().min(2).max(8),
});

export async function POST(request: Request) {
  const limited = await rateLimit(request, "bookings", 15, 60_000);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "รูปแบบข้อมูลไม่ถูกต้อง", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "ข้อมูลไม่ครบหรือไม่ถูกต้อง", 400, {
      issues: parsed.error.issues,
    });
  }
  const body = parsed.data;

  const createdCodes: string[] = [];
  const conflicts: string[] = [];

  for (let k = 0; k < body.repeatWeeks; k++) {
    const date = addDaysYmd(body.date, 7 * k);
    const res = await createBooking(
      {
        courtId: body.courtId,
        date,
        startTime: body.startTime,
        endTime: body.endTime,
        userName: body.userName,
        userPhone: body.userPhone,
        note: body.note,
        couponCode: k === 0 ? body.couponCode : undefined,
      },
      { notifyAdmin: k === 0 }, // แจ้งสนามครั้งเดียวสำหรับชุดจองซ้ำ
    );

    if (res.ok) {
      createdCodes.push(res.bookingCode);
    } else if (
      k === 0 &&
      res.code !== "BOOKING_SLOT_UNAVAILABLE" &&
      res.code !== "BOOKING_SLOT_BLOCKED"
    ) {
      // สัปดาห์แรกผิดพลาดแบบไม่ใช่ slot ชน (เช่น เวลาไม่ถูกต้อง/สนามปิด) → แจ้ง error เลย
      return apiError(res.code, res.message, res.status);
    } else {
      // ชน/บล็อก/เกิน advance ในสัปดาห์นั้นๆ → ข้าม
      conflicts.push(date);
    }
  }

  if (createdCodes.length === 0) {
    return apiError(
      "BOOKING_SLOT_UNAVAILABLE",
      "ทุกสัปดาห์ที่เลือกถูกจองแล้วหรือไม่พร้อมให้บริการ",
      409,
    );
  }

  // primaryCode = การจองแรก — ให้ลูกค้าไปชำระเงินก่อน ที่เหลือดู/ชำระใน "การจองของฉัน"
  return apiOk(
    {
      primaryCode: createdCodes[0],
      created: createdCodes.length,
      conflicts,
    },
    201,
  );
}
