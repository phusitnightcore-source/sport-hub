import * as Sentry from "@sentry/nextjs";

// Sentry ฝั่ง browser — เปิดเมื่อมี NEXT_PUBLIC_SENTRY_DSN เท่านั้น (ไม่ตั้ง = ไม่ init)
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NODE_ENV,
  });
}

// จับ error ระหว่างเปลี่ยนหน้า (App Router) — no-op ถ้ายังไม่ init
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
