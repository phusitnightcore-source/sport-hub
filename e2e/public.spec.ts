import { test, expect } from "@playwright/test";

// Smoke tests หน้า public (ไม่ต้องล็อกอิน) — ยืนยันแอปขึ้น + เส้นทางสำคัญเรนเดอร์
test.describe("public pages", () => {
  test("landing โหลดได้", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/SportHub/i);
  });

  test("login แสดงฟอร์ม", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });

  test("signup แสดงตัวเลือกบทบาท", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("เจ้าของสนาม")).toBeVisible();
    await expect(page.getByRole("button", { name: /ผู้ใช้ทั่วไป.*จองคอร์ท/ })).toBeVisible();
  });

  test("blog เปิดได้", async ({ page }) => {
    await page.goto("/blog", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "บทความ" })).toBeVisible();
  });

  test("หน้าในระบบเด้ง login เมื่อไม่ล็อกอิน (auth gate)", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });

  test("Badminton Group สลับ light/dark mode ได้", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await page.goto("/badminton-group", { waitUntil: "domcontentloaded" });

    const toggle = page.getByRole("button", { name: "เปลี่ยนเป็นโหมดมืด" });
    // The landing page is data-backed; wait for client hydration before testing
    // the interactive control rather than clicking the SSR markup immediately.
    await page.waitForTimeout(500);
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "เปลี่ยนเป็นโหมดสว่าง" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

// ── authenticated flow (โครงไว้ — ต้อง seed ผู้ใช้เทส + login ก่อน) ─────────────
// เปิดใช้เมื่อพร้อม: สร้าง storageState จากการ login (globalSetup) แล้ว use.storageState
// ตัวอย่าง flow ที่ควรครอบ: จอง → แนบสลิป → super/venue verify → เห็น notification,
// กัน double booking (จอง slot เดิมซ้ำ), plan gating (member เข้า /dashboard ถูกเด้ง)
