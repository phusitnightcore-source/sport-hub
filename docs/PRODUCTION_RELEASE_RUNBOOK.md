# Production Release Runbook

เอกสารนี้ใช้สำหรับปล่อย SportHub สู่ production โดยไม่ใส่ secret ลงใน source control และไม่ apply migration ไปยัง Supabase ผิด project

## 1. ตรวจโปรเจกต์ก่อนเชื่อมต่อ production

จาก root ของโปรเจกต์ รัน:

```powershell
npm run preflight:production
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\vitest\vitest.mjs run
node .\node_modules\next\dist\bin\next build
```

`preflight:production` จะไม่แสดงค่า secret และตรวจตัวแปรบังคับ, URL production, key ที่ไม่ควรซ้ำกัน และจำนวน migration ที่พร้อม deploy

## 2. Apply Supabase migrations

ผู้รับผิดชอบต้องยืนยัน Supabase project ref และสร้าง database backup/snapshot ก่อนเสมอ แล้วจึงรัน:

```powershell
npx supabase login
npx supabase link --project-ref <PRODUCTION_PROJECT_REF>
npx supabase migration list
npx supabase db push
npx supabase migration list
```

ก่อน `db push` ให้ตรวจว่า project ref เป็น production ที่ถูกต้อง และหลัง push ให้ `migration list` แสดง local/remote ตรงกันทั้งหมด รวม migration POS, Marketplace, Badminton Group และ Tournament

หลัง apply ให้ตรวจใน Supabase Dashboard:

- backup/PITR เปิดใช้งาน
- RLS เปิดบนตารางใหม่ และ policy อ่าน/เขียนแยก tenant ถูกต้อง
- bucket `slips` และ `tenant-media` ใช้งานได้ตาม policy
- Realtime publication มีตาราง notification/check-in ที่ต้องใช้

## 3. ตั้งค่า production environment

ตั้งค่าใน hosting provider จาก [.env.example](../.env.example) โดยค่าบังคับคือ Supabase URL/anon key/service role key, `NEXT_PUBLIC_APP_URL` (https), `CRON_SECRET` และ `SPORTHUB_PROMPTPAY_ID`

ตั้ง integration ตามฟีเจอร์ที่เปิดใช้:

- Omise: public key, secret key, webhook secret
- LINE Login: callback `{APP_URL}/api/auth/line/callback`; LINE OA: webhook ต่อ tenant
- SendGrid: API key และผู้ส่งที่ verify แล้ว
- Upstash Redis: URL/token สำหรับ rate limit บนหลาย instance
- Sentry: DSN สำหรับ error monitoring

Cron มีใน [vercel.json](../vercel.json) แล้ว: booking ทุก 5 นาที และ subscription รายวัน โดยต้องตั้ง `CRON_SECRET` ใน hosting provider ให้ตรงกัน

## 4. UAT ที่ต้องทำกับบัญชีจริง

| Role | Flow ที่ต้องยืนยัน |
| --- | --- |
| Member | ค้นหาสนาม → จอง → แนบสลิป → เห็นสถานะและแจ้งเตือน |
| Venue admin | อนุมัติสลิป → เปิด POS → ตัดสต็อก → ตรวจใบเสร็จ |
| Staff | สิทธิ์จำกัดเมนูและทำงานเฉพาะ permission ที่ได้รับ |
| Coach | สร้างบริการ/ช่วงเวลา → รับ booking → ตรวจรายได้ |
| Tournament admin | สร้างรายการ → รับสมัคร → สร้างสายแข่ง → บันทึกผล/Elo |
| Super admin | plan gating, subscription และ tenant administration |

ให้ทดสอบ double booking, แยกข้อมูลข้าม tenant, webhook signature และ notification แบบ realtime อย่างน้อยสอง browser/session ก่อนเปิดรับผู้ใช้จริง

## 5. หลัง deploy

- ตรวจ `/api/cron/bookings` และ `/api/cron/subscriptions` จาก log ว่าถูกเรียกตาม schedule
- ตรวจ Sentry/hosting logs ใน 24 ชั่วโมงแรก
- เก็บผล UAT, project ref และ migration version ที่ deploy ไว้ใน release record
