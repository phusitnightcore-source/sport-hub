# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public.spec.ts >> public pages >> Badminton Group สลับ light/dark mode ได้
- Location: e2e\public.spec.ts:31:7

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('html')
Expected: "dark"
Received: "light"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('html')
    13 × locator resolved to <html lang="th" class="h-full" data-theme="light">…</html>
       - unexpected value "light"

```

```yaml
- document:
  - navigation
  - main
  - contentinfo
  - alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // Smoke tests หน้า public (ไม่ต้องล็อกอิน) — ยืนยันแอปขึ้น + เส้นทางสำคัญเรนเดอร์
  4  | test.describe("public pages", () => {
  5  |   test("landing โหลดได้", async ({ page }) => {
  6  |     await page.goto("/", { waitUntil: "domcontentloaded" });
  7  |     await expect(page).toHaveTitle(/SportHub/i);
  8  |   });
  9  | 
  10 |   test("login แสดงฟอร์ม", async ({ page }) => {
  11 |     await page.goto("/login", { waitUntil: "domcontentloaded" });
  12 |     await expect(page.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeVisible();
  13 |   });
  14 | 
  15 |   test("signup แสดงตัวเลือกบทบาท", async ({ page }) => {
  16 |     await page.goto("/signup", { waitUntil: "domcontentloaded" });
  17 |     await expect(page.getByText("เจ้าของสนาม")).toBeVisible();
  18 |     await expect(page.getByRole("button", { name: /ผู้ใช้ทั่วไป.*จองคอร์ท/ })).toBeVisible();
  19 |   });
  20 | 
  21 |   test("blog เปิดได้", async ({ page }) => {
  22 |     await page.goto("/blog", { waitUntil: "domcontentloaded" });
  23 |     await expect(page.getByRole("heading", { name: "บทความ" })).toBeVisible();
  24 |   });
  25 | 
  26 |   test("หน้าในระบบเด้ง login เมื่อไม่ล็อกอิน (auth gate)", async ({ page }) => {
  27 |     await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  28 |     await expect(page).toHaveURL(/\/login/);
  29 |   });
  30 | 
  31 |   test("Badminton Group สลับ light/dark mode ได้", async ({ page }) => {
  32 |     await page.addInitScript(() => localStorage.setItem("theme", "light"));
  33 |     await page.goto("/badminton-group", { waitUntil: "domcontentloaded" });
  34 | 
  35 |     const toggle = page.getByRole("button", { name: "เปลี่ยนเป็นโหมดมืด" });
  36 |     // The landing page is data-backed; wait for client hydration before testing
  37 |     // the interactive control rather than clicking the SSR markup immediately.
  38 |     await page.waitForTimeout(500);
  39 |     await toggle.click();
> 40 |     await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
     |                                        ^ Error: expect(locator).toHaveAttribute(expected) failed
  41 | 
  42 |     await page.getByRole("button", { name: "เปลี่ยนเป็นโหมดสว่าง" }).click();
  43 |     await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  44 |   });
  45 | });
  46 | 
  47 | // ── authenticated flow (โครงไว้ — ต้อง seed ผู้ใช้เทส + login ก่อน) ─────────────
  48 | // เปิดใช้เมื่อพร้อม: สร้าง storageState จากการ login (globalSetup) แล้ว use.storageState
  49 | // ตัวอย่าง flow ที่ควรครอบ: จอง → แนบสลิป → super/venue verify → เห็น notification,
  50 | // กัน double booking (จอง slot เดิมซ้ำ), plan gating (member เข้า /dashboard ถูกเด้ง)
  51 | 
```