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
  31 |   test("Badminton Group สลับ light/dark mode ได้", async ({ page }) => {
  32 |     await page.addInitScript(() => localStorage.setItem("theme", "light"));
  33 |     await page.goto("/badminton-group", { waitUntil: "domcontentloaded" });
  35 |     const toggle = page.getByRole("button", { name: "เปลี่ยนเป็นโหมดมืด" });
  38 |     await page.waitForTimeout(500);
  39 |     await toggle.click();
> 40 |     await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  42 |     await page.getByRole("button", { name: "เปลี่ยนเป็นโหมดสว่าง" }).click();
  43 |     await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  44 |   });
```
