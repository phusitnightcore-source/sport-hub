import { z } from "zod";
import { apiOk, apiError } from "@/lib/api";
import { createBooking } from "@/lib/booking/create";
import { rateLimit } from "@/lib/ratelimit";

const bodySchema = z.object({
  courtId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  userName: z.string().trim().min(2).max(100),
  userPhone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง"),
  note: z.string().trim().max(500).optional(),
  couponCode: z.string().trim().max(40).optional(),
  acceptPolicy: z.literal(true), // ต้องกดยอมรับ Cancellation Policy ก่อนเสมอ (§7.1)
});

// สร้างการจอง (guest) — logic หลักอยู่ใน lib/booking/create.ts (reuse กับ recurring)
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

  const res = await createBooking(parsed.data);
  if (!res.ok) return apiError(res.code, res.message, res.status);

  return apiOk(
    {
      bookingCode: res.bookingCode,
      totalPrice: res.totalPrice,
      slotLockedUntil: res.slotLockedUntil,
    },
    201,
  );
}
