import type { Instrumentation } from "next";

// Sentry — เปิดใช้เมื่อมี SENTRY_DSN เท่านั้น (ไม่ตั้ง = inert สนิท ไม่กระทบอะไร)
// จับ error ฝั่ง server (route handlers / server components) + ที่เรียก captureException เอง
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}

// ส่ง error ของ request (server) เข้า Sentry — no-op ถ้ายังไม่ตั้ง DSN
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
};
