// Next.js instrumentation hook
// NOTE: Sentry ยังไม่เปิดใช้ — ติดตั้ง @sentry/nextjs ไม่สำเร็จ (SSL cert ของ npm registry)
// เมื่อติดตั้งได้แล้ว เพิ่มกลับ:
//   if (process.env.SENTRY_DSN) {
//     const Sentry = await import("@sentry/nextjs");
//     Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
//   }
export async function register() {
  // no-op จนกว่าจะติดตั้ง @sentry/nextjs ได้ (ดู lib/logger.ts captureException)
}
