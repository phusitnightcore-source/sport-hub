import "server-only";

// Structured logger — แทน console.error/log กระจัดกระจาย
// - dev: อ่านง่าย (pretty)  - production: JSON บรรทัดเดียว (ให้ log platform parse ได้)
// - พร้อมต่อ Sentry: ถ้าตั้ง SENTRY_DSN แล้วติดตั้ง @sentry/nextjs ให้ wire ใน captureException()
//   (ตอนนี้ไม่มี hard dependency — ทำงานได้ทันทีแบบ log อย่างเดียว)

type Level = "debug" | "info" | "warn" | "error";
type Meta = Record<string, unknown>;

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, msg: string, meta?: Meta) {
  const entry = { level, msg, ...meta, ts: new Date().toISOString() };
  const line = isProd ? JSON.stringify(entry) : `[${level}] ${msg}`;
  const fn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (isProd) fn(line);
  else fn(line, meta ?? "");
}

export const logger = {
  debug: (msg: string, meta?: Meta) => emit("debug", msg, meta),
  info: (msg: string, meta?: Meta) => emit("info", msg, meta),
  warn: (msg: string, meta?: Meta) => emit("warn", msg, meta),
  error: (msg: string, meta?: Meta) => emit("error", msg, meta),
};

export function sentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}

// cache โมดูล Sentry (import ครั้งเดียว) — โหลดเฉพาะเมื่อมี DSN
let sentryMod: typeof import("@sentry/nextjs") | null = null;

// จุดเดียวสำหรับรายงาน error — เรียกที่ catch สำคัญแทน console.error
// log เสมอ + ส่งเข้า Sentry เมื่อมี SENTRY_DSN (ไม่มี DSN = log อย่างเดียว)
export function captureException(
  context: string,
  error: unknown,
  meta?: Meta,
) {
  let message: string;
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    message =
      typeof errObj.message === "string"
        ? errObj.message
        : JSON.stringify(error);
    stack = typeof errObj.stack === "string" ? errObj.stack : undefined;
  } else {
    message = String(error);
  }

  logger.error(context, { ...meta, error: message, stack });

  if (!sentryConfigured()) return;
  const send = (S: typeof import("@sentry/nextjs")) =>
    S.captureException(error, { extra: { context, ...meta } });
  if (sentryMod) {
    send(sentryMod);
  } else {
    import("@sentry/nextjs")
      .then((S) => {
        sentryMod = S;
        send(S);
      })
      .catch(() => {});
  }
}
