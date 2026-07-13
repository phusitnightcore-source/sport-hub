// Next.js instrumentation hook — เริ่ม Sentry ฝั่ง server เมื่อมี SENTRY_DSN เท่านั้น
// (inert โดยดีฟอลต์ — ไม่ตั้ง DSN = ไม่ทำงาน ไม่กระทบ build/dev)
// หมายเหตุ: การ instrument ฝั่ง client + source maps เต็มรูปแบบให้รัน `npx @sentry/wizard`
export async function register() {
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: true,
    });
  }
}
