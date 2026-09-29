import { defineConfig, devices } from "@playwright/test";

// E2E ด้วย Playwright — สำหรับ smoke test หน้า public + (ในอนาคต) authenticated flow
// ติดตั้งก่อนใช้:  npm i -D @playwright/test  &&  npx playwright install chromium
// รัน:            npm run e2e
export default defineConfig({
  testDir: "./e2e",
  // First requests on a cold Next dev server can compile route bundles before
  // the page loads. Keep smoke tests stable without relaxing assertions.
  timeout: 60_000,
  // Public pages make server-side Supabase reads. Run the small smoke suite in
  // sequence so a local/preview database is not artificially saturated.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  expect: { timeout: 30_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // ถ้าไม่ได้ชี้ E2E_BASE_URL ไปเซิร์ฟเวอร์ที่รันอยู่ → ให้ Playwright สตาร์ท dev ให้เอง
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
