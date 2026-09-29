import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Node 22 loads local values without adding a dotenv dependency. Values are
// deliberately never printed by this script.
if (typeof process.loadEnvFile === "function") {
  const localEnv = join(root, ".env.local");
  if (existsSync(localEnv)) process.loadEnvFile(localEnv);
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "CRON_SECRET",
  "SPORTHUB_PROMPTPAY_ID",
];

const recommended = [
  "SENDGRID_API_KEY",
  "SENDGRID_FROM_EMAIL",
  "OMISE_PUBLIC_KEY",
  "OMISE_SECRET_KEY",
  "OMISE_WEBHOOK_SECRET",
  "LINE_LOGIN_CHANNEL_ID",
  "LINE_LOGIN_CHANNEL_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "SENTRY_DSN",
];

const placeholder = /^(change[-_ ]?me|example|your[-_ ]?(key|secret|url)|todo)$/i;
const populated = (name) => {
  const value = process.env[name]?.trim();
  return Boolean(value && !placeholder.test(value));
};

const errors = [];
const missingRequired = required.filter((name) => !populated(name));
if (missingRequired.length) {
  errors.push(`ตัวแปรบังคับที่ยังไม่ได้ตั้ง: ${missingRequired.join(", ")}`);
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
if (appUrl && !/^https:\/\/[^/]+/i.test(appUrl)) {
  errors.push("NEXT_PUBLIC_APP_URL ต้องเป็น URL production ที่ขึ้นต้นด้วย https://");
}

if (
  populated("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  errors.push("Supabase anon key และ service role key ต้องไม่ใช่ค่าเดียวกัน");
}

const migrationsDir = join(root, "supabase", "migrations");
const migrations = existsSync(migrationsDir)
  ? readdirSync(migrationsDir).filter((file) => /^\d{14}_.+\.sql$/.test(file)).sort()
  : [];

if (migrations.length === 0) {
  errors.push("ไม่พบ migration ใน supabase/migrations");
}

console.log("SportHub production preflight");
console.log(`- Required environment: ${required.length - missingRequired.length}/${required.length} configured`);
console.log(`- Recommended integrations: ${recommended.filter(populated).length}/${recommended.length} configured`);
console.log(`- Local migrations ready to push: ${migrations.length}`);

if (errors.length) {
  console.error("\nPreflight ยังไม่ผ่าน:");
  for (const error of errors) console.error(`- ${error}`);
  console.error("\nดูขั้นตอน deploy ได้ที่ docs/PRODUCTION_RELEASE_RUNBOOK.md");
  process.exitCode = 1;
} else {
  console.log("\nPreflight ผ่าน — ขั้นต่อไปคือยืนยัน migration กับ Supabase production ตาม runbook");
}
