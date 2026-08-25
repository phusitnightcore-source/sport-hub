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
| **Sentry** (error monitoring) | 🟡 | `.env` `SENTRY_DSN` | ติดตั้ง + เปิด hook แล้ว (instrumentation `register`/`onRequestError` + logger captureException) — ใส่ DSN ก็ทำงานทันที |
| **Google AdSense** | 🟡 | `.env` `NEXT_PUBLIC_ADSENSE_CLIENT` | Google อนุมัติก่อน → ใส่ Publisher ID (AdSlot พร้อม) |
| **Affiliate** (Lazada/Shopee) | 🟡 | ในบทความ / AffiliateCard | สมัคร affiliate เอาลิงก์มาวาง (นับคลิกผ่าน `/api/ad/click` พร้อม) |
| **LINE LIFF** (บัตร/จองในแอป LINE) | 🟡 | `.env` `NEXT_PUBLIC_LIFF_ID` | หน้า `/liff` พร้อม — รอใส่ LIFF ID |
| **LINE Login** (ผู้ใช้ทั่วไป สมัคร/ล็อกอิน/ผูกบัญชี) | 🟡 | `.env` `LINE_LOGIN_CHANNEL_ID/SECRET` | โค้ด OAuth พร้อม (`/api/auth/line/start`+`/callback`) — ตั้ง Callback URL `{APP_URL}/api/auth/line/callback` ในคอนโซล. ไม่มี key = ปุ่มซ่อน ไม่ crash |

---

## 2. ฟีเจอร์ที่ยังไม่ได้สร้าง (🔴)

_ครบทุกฟีเจอร์ในสโคปแล้ว — เหลือเฉพาะการตั้งค่าภายนอก/ใส่ key (ดู §1, §3) และ Sentry (§30, ต้อง `npm i`)_

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
- **โปรไฟล์ผู้ใช้ทั่วไป** `/me/profile`: avatar hero + แก้ชื่อ/เบอร์ + ดูอีเมล/วันสมัคร + เชื่อม/ยกเลิก LINE
- **Navbar ผู้ที่ล็อกอินแล้ว** (`app/me/layout.tsx` + `MemberNav`): โลโก้ + เมนู (จอง/โปรไฟล์/เขียนบทความ) + ธีม + avatar + ออกจากระบบ ครอบทุกหน้า /me (active state + responsive)
- **LINE Login** (รอใส่ key): ปุ่ม "เข้าสู่ระบบ/สมัครด้วย LINE" ที่ /login + /signup → OAuth → สร้าง/ผูกบัญชี profile (role=member, synthetic email กัน takeover) + สร้าง session ผ่าน magiclink OTP. โหมด link ผูก line_user_id ให้บัญชีที่ล็อกอินอยู่
- **Confirm dialogs**: action ทำลายข้อมูล (ยกเลิกบัญชี/ลบสาขา-พนักงาน-คูปอง-แพ็กเกจ/หมดอายุสมาชิก/ขอลบบัญชี/ยกเลิก LINE) ใช้ modal `ConfirmButton` (แทน native confirm/alert)
- **Motion polish**: `PageTransition` (slide-fade ทุกหน้าใน layout /me,/dashboard,/blog) + loading skeleton (dashboard, me/bookings, me/blog, book) — เคารพ prefers-reduced-motion
- **Member search** (`/dashboard/members?q=`) + **Waitlist admin** (`/dashboard/waitlist`) + **OCR verify UI** (แสดงยอดที่อ่านได้เทียบยอดจริง) + **Package edit** (updatePackage)
- **Customer recurring booking**: จองซ้ำรายสัปดาห์ 2–8 ครั้งใน `/book` → `POST /api/bookings/recurring` (reuse `lib/booking/create.ts createBooking`) ข้ามสัปดาห์ที่เต็ม
- **Tests**: vitest 39 ผ่าน (เพิ่ม plans/line-login/ocr)
- **แจ้งเตือนเรียลไทม์ + เสียง** (ทุก role): migration `20260716000000` เพิ่ม `notifications` เข้า realtime publication + RLS ให้ staff/member เห็นของตน. `NotificationBell` (กระดิ่ง+badge+toast+เสียง) วางที่ dashboard/`/me`/super-admin. เสียง default = WebAudio synth แยกตามประเภท (`lib/sounds.ts`); สนามอัปโหลดเสียงเองได้ต่อประเภท (Settings → tenant-media). จุด dispatch หา admin: จองใหม่/แนบสลิป/ขอ Freeze/ลงคิว waitlist + super_admin เมื่อสนามออก invoice. หน้า `/me/notifications` ใหม่. **แก้ gap เดิม**: dashboard/notifications เคยว่าง เพราะไม่มีใคร dispatch หา admin

---

## 5. Testing gaps

- ✅ Unit tests (vitest): 22 ผ่าน (money/slots/status)
- ✅ Build + lint + tsc เขียว
- 🔴 **Authenticated e2e ยังไม่ได้ทำ** — ต้อง login เป็น venue_admin/super_admin/member คลิกจริง
  (AI กรอกรหัสผ่านไม่ได้ตามกฎ) → ใช้ `docs/PLAN_GATING_CHECKLIST.md`
- 🔴 Integration test (จอง→สลิป→notification จริง, LINE webhook จริง) — ต้องมี key + login
