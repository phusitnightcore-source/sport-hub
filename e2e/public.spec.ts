import { test, expect } from "@playwright/test";

// Smoke tests หน้า public (ไม่ต้องล็อกอิน) — ยืนยันแอปขึ้น + เส้นทางสำคัญเรนเดอร์
test.describe("public pages", () => {
  test("landing โหลดได้", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SportHub/i);
  });

  test("login แสดงฟอร์ม", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ" })).toBeVisible();
  });

  test("signup แสดงตัวเลือกบทบาท", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByText("เจ้าของสนาม")).toBeVisible();
    await expect(page.getByText("ผู้ใช้ทั่วไป")).toBeVisible();
  });

  test("blog เปิดได้", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "บทความ" })).toBeVisible();
  });

  test("หน้าในระบบเด้ง login เมื่อไม่ล็อกอิน (auth gate)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── authenticated flow (โครงไว้ — ต้อง seed ผู้ใช้เทส + login ก่อน) ─────────────
// เปิดใช้เมื่อพร้อม: สร้าง storageState จากการ login (globalSetup) แล้ว use.storageState
// ตัวอย่าง flow ที่ควรครอบ: จอง → แนบสลิป → super/venue verify → เห็น notification,
// กัน double booking (จอง slot เดิมซ้ำ), plan gating (member เข้า /dashboard ถูกเด้ง)
