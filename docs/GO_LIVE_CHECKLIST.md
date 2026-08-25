# SportHub — Go-Live Checklist (เตรียมขึ้น Production)

อัปเดต: 2026-07-16 — โค้ดฟีเจอร์ครบแล้ว เอกสารนี้รวม "งานตั้งค่าภายนอกที่ต้องทำเอง" ก่อนเปิดใช้จริง
สัญลักษณ์: 🔴 จำเป็น (ไม่ทำ = flow หลักพัง) · 🟡 แนะนำ · ⚪ ไม่บังคับ

---

## 1. Environment Variables (Vercel → Project → Settings → Environment Variables)

### 🔴 จำเป็น
| ตัวแปร | ใช้ทำอะไร | ได้จากไหน |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | DB/Auth/Storage | Supabase → Project Settings → API |
| `NEXT_PUBLIC_APP_URL` | โดเมนจริง (ใช้สร้าง callback/webhook/redirect) | เช่น `https://app.sporthub.co.th` |
| `CRON_SECRET` | กัน endpoint `/api/cron/*` | สุ่มเอง (ตั้งให้ตรงกับ Vercel Cron header) |
| `SPORTHUB_PROMPTPAY_ID` | รับเงินค่า subscription จากสนาม | เลขพร้อมเพย์ของ SportHub |

### 🟡 แนะนำ (ระบบทำงานได้แต่ฟีเจอร์บางส่วนปิดจนกว่าจะใส่)
| ตัวแปร | เปิดฟีเจอร์ | ไม่ใส่แล้วเป็นยังไง |
|---|---|---|
| `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` | อีเมล/ใบเสร็จ | แจ้งเตือนได้แค่ in-app + LINE (ไม่มีอีเมล) |
| `OMISE_PUBLIC_KEY` / `SECRET_KEY` / `WEBHOOK_SECRET` | เก็บเงิน subscription อัตโนมัติ | ใช้เส้นทาง PromptPay + ตรวจสลิปแทน |
| `LINE_LOGIN_CHANNEL_ID` / `SECRET` | ลูกค้าสมัคร/ล็อกอินด้วย LINE | ปุ่ม LINE ซ่อน (สมัครด้วยอีเมลตามปกติ) |
| `LINE_CHANNEL_ACCESS_TOKEN` | แจ้งเตือน LINE กลาง (fallback) | ใช้ token ต่อสนามที่ตั้งใน Dashboard แทน |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Rate limit ข้าม instance | ใช้ in-memory ต่อ instance (กันได้ระดับพื้นฐาน) |
| `OCR_API_URL` / `OCR_API_KEY` | อ่านยอดสลิปอัตโนมัติ | ตรวจสลิปด้วยมือ (มี UI แสดงผลรออยู่) |
| `NEXT_PUBLIC_LIFF_ID` | บัตร/ประวัติในแอป LINE | หน้า `/liff` ขึ้น "ยังไม่ตั้งค่า" |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | โฆษณา AdSense | slot คืน null (ไม่มีโฆษณา) |

---

## 2. 🔴 Vercel Cron (สำคัญมาก — ลืมง่าย)
ไปที่ Vercel → Project → Settings → Cron Jobs (หรือ `vercel.json`) ตั้ง 2 ตัว:
- `GET /api/cron/bookings` — **ทุก 5 นาที** (`*/5 * * * *`) → ยกเลิก slot หมดเวลา, เตือน 1 ชม., แจ้ง waitlist
- `GET /api/cron/subscriptions` — **รายวัน** (`0 1 * * *`) → เตือน/ตัดสมาชิก+trial ใกล้หมด

ต้องแนบ header `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron ใส่ให้ถ้าตั้ง env `CRON_SECRET`)
**ไม่ตั้ง = การจองค้าง slot ตลอด, ไม่มีเตือน, สมาชิกไม่หมดอายุอัตโนมัติ**

---

## 3. Supabase
- [x] Migration ครบ (14 ไฟล์ — `npx supabase migration list` local=remote) 🔴
- [ ] เปิด **Point-in-Time Recovery / Backup** (Project → Database → Backups) 🔴
- [ ] ตรวจ RLS เปิดทุกตาราง (มีใน migration แล้ว — ยืนยันหลัง deploy) 🟡
- [ ] Storage buckets `slips`, `tenant-media` มีอยู่ (จาก migration) 🟡

---

## 4. LINE (ต่อสนาม — ทีมทำให้ได้จาก /super-admin/tenants แล้ว)
- สร้าง Messaging API channel/OA ที่ developers.line.biz แล้ว **ทีมกรอก token/secret ให้สนาม**ที่
  หน้า Super Admin → สนามทั้งหมด → ปุ่ม "เชื่อม LINE OA" (ใหม่)
- ตั้ง **Webhook URL** = `{APP_URL}/api/line/webhook/{tenantId}` + เปิด Use webhook + ปิด auto-reply
- **LINE Login** (ถ้าใช้): ตั้ง Callback URL = `{APP_URL}/api/auth/line/callback`

---

## 5. Testing ก่อนเปิด
- [x] Unit tests: `npm test` (39 ผ่าน)
- [ ] **Authenticated e2e (manual)** ตาม `docs/PLAN_GATING_CHECKLIST.md` — login เป็น venue_admin/staff/member
      ทดสอบ จอง→สลิป→verify→แจ้งเตือน+เสียง, กัน double booking, plan gating 🔴
- [ ] ทดสอบ realtime notification: เปิด dashboard ค้าง + จองจากอีกเบราว์เซอร์ → เห็น toast+เสียง+badge

---

## 6. Known gaps (ยังไม่ทำ — ตัดสินใจก่อนเปิด)
| เรื่อง | สถานะ | หมายเหตุ |
|---|---|---|
| **Sentry** (error monitoring) | 🟡 โค้ดพร้อม | ติดตั้ง `@sentry/nextjs` + เปิด hook ใน `instrumentation.ts`/`lib/logger.ts` แล้ว — แค่ใส่ `SENTRY_DSN` ก็ทำงาน (ไม่ใส่ = inert) |
| **Web Push** (เด้งตอนปิดแท็บ) | 🔴 ไม่มี | ต้อง service worker + VAPID keys — realtime ปัจจุบันทำงานเฉพาะตอนเปิดเว็บ |
| **Email verification ตอนสมัคร** | 🟡 ข้ามอยู่ | สมัครแบบ `email_confirm: true` (ไม่ยืนยันอีเมล) — เปิดได้เมื่อ SendGrid/SMTP พร้อม ไม่งั้นผู้ใช้ยืนยันไม่ได้ = ล็อกอินไม่ได้ |
| **Load/Security review** (§29) | 🟡 ยังไม่ทำ | ควรรันก่อน scale |
