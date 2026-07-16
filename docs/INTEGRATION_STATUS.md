# สถานะการเชื่อมต่อระบบ (Integration Status)

อัปเดต: 2026-07-16 — รวมทุกจุดที่ "โค้ดพร้อมแล้ว เหลือใส่ข้อมูล/ตั้งค่าภายนอก" และฟีเจอร์ที่ยังไม่ได้สร้าง

สัญลักษณ์: ✅ เสร็จ/ทำงาน · 🟡 โค้ดพร้อม รอ config/key · 🔴 ยังไม่สร้าง

---

## 1. External Integrations (รอใส่ key / ตั้งค่าภายนอก)

| ระบบ | สถานะ | ใส่ตรงไหน | เหลืออะไร |
|---|---|---|---|
| **Supabase** (DB/Auth/Storage) | ✅ | `.env.local` | ใช้งานจริงแล้ว (migration ครบ 10 ไฟล์) |
| **LINE OA (per-tenant)** | 🟡 | Dashboard → ตั้งค่า → เชื่อมต่อ LINE OA | สนามวาง Channel Access Token + Secret เอง + ตั้ง Webhook URL ในคอนโซล |
| ↳ LINE webhook (เก็บ userId) | 🟡 | `/api/line/webhook/{tenantId}` | ลูกค้าแอด OA + พิมพ์เบอร์ → ผูกอัตโนมัติ (โค้ดพร้อม รอสนามตั้ง URL) |
| ↳ LINE token กลาง (fallback) | 🟡 | `.env` `LINE_CHANNEL_ACCESS_TOKEN` | ไม่บังคับ — ใช้เมื่อสนามไม่ได้ตั้งเอง |
| **SendGrid** (อีเมล/ใบเสร็จ) | 🟡 | `.env` `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | สมัคร SendGrid → ใส่ key (dispatcher fallback เป็น email อยู่แล้ว) |
| **Omise** (Subscription B2B) | 🟡 | `.env` `OMISE_PUBLIC_KEY`, `OMISE_SECRET_KEY`, `OMISE_WEBHOOK_SECRET` | ใส่ key จริง (ตอนไม่มี key ใช้เส้นทาง PromptPay แทน) |
| **OCR ตรวจสลิป** | 🟡 | `.env` `OCR_API_URL`, `OCR_API_KEY` | ใส่ key + **ยังไม่ wire เข้า UI หน้า verify สลิป** (lib/ocr.ts พร้อม) |
| **Sentry** (error monitoring) | 🔴 | `.env` `SENTRY_DSN` | ต้อง `npm i @sentry/nextjs` ก่อน (ตอนนี้ instrumentation.ts เป็น no-op; logger มี hook รอ) |
| **Google AdSense** | 🟡 | `.env` `NEXT_PUBLIC_ADSENSE_CLIENT` | Google อนุมัติก่อน → ใส่ Publisher ID (AdSlot พร้อม) |
| **Affiliate** (Lazada/Shopee) | 🟡 | ในบทความ / AffiliateCard | สมัคร affiliate เอาลิงก์มาวาง (นับคลิกผ่าน `/api/ad/click` พร้อม) |
| **LINE LIFF** (บัตร/จองในแอป LINE) | 🔴 | `.env` `NEXT_PUBLIC_LIFF_ID` | มี env slot แต่ **ยังไม่สร้างหน้า LIFF** |

---

## 2. ฟีเจอร์ที่ยังไม่ได้สร้าง (🔴)

| ฟีเจอร์ | หมายเหตุ |
|---|---|
| **จองซ้ำรายสัปดาห์** (recurring) | ยังไม่เริ่ม |
| Waitlist — dashboard list | ✅ join+auto-notify ทำงานแล้ว แต่ยังไม่มีหน้าให้ admin ดูรายชื่อคิว (nice-to-have) |
| **LINE Login / LIFF** | สำหรับผูก userId แบบลื่นกว่าพิมพ์เบอร์ (ทางเลือกของ webhook) |
| Member search box | `dashboard/members/page.tsx` มี TODO |

---

## 3. งานตั้งค่าภายนอก (คอนโซล/แดชบอร์ด — โค้ดแตะไม่ได้)

- **LINE Developers Console**: สร้าง Messaging API channel ต่อสนาม → เอา token/secret มาใส่ + วาง Webhook URL + เปิด "Use webhook" + ปิด auto-reply
- **Google AdSense**: สมัคร + ผ่านการอนุมัติ (ต้องมีคอนเทนต์/ทราฟฟิกก่อน) → เอา Publisher ID มาใส่
- **Affiliate**: สมัคร Lazada/Shopee/Decathlon affiliate → เอาลิงก์มาวางในบทความ
- **Supabase Dashboard**: ตรวจ Backup + Point-in-Time Recovery เปิดอยู่ (§31) — ยังไม่ได้ verify
- **Vercel**: ตั้ง Cron (`/api/cron/bookings` ทุก 5 นาที, `/api/cron/subscriptions` รายวัน) + env `CRON_SECRET`

---

## 4. จุดที่ระบบ "เชื่อมกันแล้ว" (✅ ทำงานจริง)

- Booking → Payment (PromptPay + สลิป) → Verify → Notification (in-app + LINE/email ถ้าตั้งค่า)
- Plan entitlements (แก้ที่ /super-admin/plans) → gate หน้า members/packages/analytics/guest-passes/reports + court/branch quota
- Blog (ทีม + user เขียน→อนุมัติ) → เผยแพร่ → SEO (sitemap/robots) → Banner/Affiliate/AdSense slots
- Visit tracking → /super-admin/traffic
- Cron: ยกเลิก slot หมดเวลา + เตือนจอง 1 ชม. + เตือนสมาชิก/trial ใกล้หมด (ผ่าน dispatcher)
- ผู้ใช้ทั่วไป: สมัคร → จองผูก profile_id → /me/bookings ข้ามสนาม
- **Kiosk self check-in**: หน้าสาธารณะ `/checkin/[token]` (token ต่อสาขา, gate ด้วย entitlement kiosk_mode) ลูกค้ากรอกเบอร์เช็คอินเอง (method=kiosk) → ลิงก์อยู่ในหน้า Dashboard → Check-in
- **Waitlist**: slot เต็ม → กด "แจ้งเตือนเมื่อว่าง" ในหน้าจอง → เก็บ `waitlists` → auto-notify เมื่อ slot ว่าง (cron cancel + refund) ผ่าน dispatcher
- **Sidebar เมนู**: กรองตาม role/permission (§26 — staff เห็นเฉพาะที่มีสิทธิ์, venue_admin เห็นครบ) + จัด 4 หมวด (ดำเนินงาน/สมาชิก&การตลาด/รายงาน/ตั้งค่าระบบ) + เมนูที่แพลนไม่รองรับโชว์พร้อม 🔒 ชวนอัปเกรด

---

## 5. Testing gaps

- ✅ Unit tests (vitest): 22 ผ่าน (money/slots/status)
- ✅ Build + lint + tsc เขียว
- 🔴 **Authenticated e2e ยังไม่ได้ทำ** — ต้อง login เป็น venue_admin/super_admin/member คลิกจริง
  (AI กรอกรหัสผ่านไม่ได้ตามกฎ) → ใช้ `docs/PLAN_GATING_CHECKLIST.md`
- 🔴 Integration test (จอง→สลิป→notification จริง, LINE webhook จริง) — ต้องมี key + login
