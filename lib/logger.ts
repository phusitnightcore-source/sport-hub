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

// จุดเดียวสำหรับรายงาน error — เรียกที่ catch สำคัญแทน console.error
// เมื่อพร้อมใช้ Sentry: ติดตั้ง @sentry/nextjs แล้วเรียก Sentry.captureException(error) ตรงนี้
export function captureException(
  context: string,
  error: unknown,
  meta?: Meta,
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(context, { ...meta, error: message, stack });
  // เมื่อติดตั้ง @sentry/nextjs ได้แล้ว (ตอนนี้ติดไม่ได้เพราะ SSL cert ของ npm) เพิ่มกลับ:
  //   if (sentryConfigured()) import("@sentry/nextjs")
  //     .then((S) => S.captureException(error, { extra: { context, ...meta } })).catch(() => {});
}
