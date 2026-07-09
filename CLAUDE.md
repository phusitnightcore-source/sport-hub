# SportHub — Multi-tenant Sports Venue & Fitness SaaS (Thailand)

## What this is
SaaS platform ที่สนามกีฬา/ฟิตเนสสมัครเป็น Tenant จ่าย Subscription รายเดือนผ่าน Omise
ลูกค้าจ่ายค่าจอง/ค่าสมาชิกตรงเข้าสนามผ่าน QR PromptPay + แนบสลิป (SportHub ไม่แตะเงินส่วนนี้)
Full scope: `docs/SCOPE.md` — อ่านเฉพาะ Section ที่เกี่ยวกับงานที่ทำอยู่ อย่าโหลดทั้งไฟล์เข้า context

## Stack (ห้ามเปลี่ยนโดยไม่ถาม)
- Next.js 14+ App Router, TypeScript strict, Tailwind CSS
- Supabase: Postgres + RLS, Auth, Storage, Realtime — schema อยู่ที่ `supabase/migrations/`
- Payments B2B: Omise (Node SDK) | Notifications: LINE Messaging API | Email: SendGrid
- Deploy: Vercel

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (ต้องผ่านก่อน commit เสมอ)
- `npm run lint && npm run typecheck` — รันหลังแก้โค้ดทุกครั้ง
- `npx supabase db push` — apply migrations (local: `npx supabase db reset`)
- `npm test` — vitest

## Architecture rules (สำคัญมาก)
1. **Multi-tenant**: ทุก table มี `tenant_id` + RLS บังคับ ไม่มีข้อยกเว้น
   ห้าม query ข้าม tenant ห้าม bypass RLS ยกเว้นใน API Route ที่ใช้ service role อย่างจงใจ
2. **Service role key** ใช้ได้เฉพาะใน server-side (API Routes / Server Actions / Edge Functions)
   ห้ามหลุดไป client ห้าม hardcode secret — ใช้ env vars เท่านั้น (ดู `.env.example`)
3. **Roles (RBAC)**: super_admin / venue_admin / staff (default = สาขาตัวเอง) / staff extended
   (via `staff.extra_permissions[]`) / member — Permission Matrix อยู่ใน SCOPE.md §26
4. **Booking**: กัน double booking ที่ DB แล้ว (exclusion constraint) — โค้ดต้อง handle
   error 23P01 อย่างสวยงาม / slot lock 30 นาที / advance booking limit ต่อ court
5. **Payment flow**: PromptPay = manual slip verify เท่านั้น ไม่มี auto-charge ฝั่งลูกค้า
   สถานะ: pending_payment → awaiting_verification → confirmed | rejected → awaiting_refund → refunded
6. **เงินทุกจำนวน** ใช้ `numeric` ใน DB, จัดการเป็นสตางค์หรือ decimal.js ใน TS — ห้าม float
7. **PDPA**: บันทึก consent + timestamp ทุกจุดสมัคร / มี data export (CSV) / erasure flow
8. **ภาษา UI**: ไทยเป็นหลัก — error messages ตาม SCOPE.md §28 (23 error codes)

## Code conventions
- Server Components เป็น default; `"use client"` เฉพาะที่จำเป็น
- Data access ผ่าน `lib/supabase/` helpers เท่านั้น ห้ามสร้าง client กระจัดกระจาย
- API responses ตาม format §28.1: `{ success, error: { code, message, details } }`
- Zod validate ทุก input ที่ API boundary
- ทุก mutation สำคัญต้องเขียน `audit_logs` (ผ่าน helper `lib/audit.ts`)

## Boundaries
- อย่าแตะ `supabase/migrations/` ที่ apply แล้ว — สร้าง migration ใหม่เสมอ
- Out of scope v1.0: Native app, POS, IoT, Loyalty, Marketplace, Multi-currency (§37)
- อย่าติดตั้ง dependency ใหม่โดยไม่บอกเหตุผลก่อน

## UI / Design
ก่อนสร้างหรือแก้หน้าใดๆ ต้องเปิดอ่าน `docs/DESIGN_SYSTEM.md` (v2 — โทนฟ้า การ์ดขาวลอย shadow
เป็นค่าเริ่มต้น) ก่อนเสมอ — เป็น source of truth เรื่องสี ฟอนต์ radius shadow motion และ
component pattern ห้าม inline hex/px ที่ไม่อยู่ใน `tailwind.config.ts` ห้ามสร้างปุ่ม/การ์ด/
status pill ใหม่ซ้ำ — ใช้จาก `components/ui/` เท่านั้น (Button, IconButton, ListRowCard,
StatCard, StatusPill, SearchInput, SlotGrid) ถ้า component ที่ต้องการยังไม่มี ให้สร้างใน
`components/ui/` ก่อนแล้วค่อยประกอบเป็นหน้า

## Current phase
Phase 2 (MVP): Module 1 Booking + Module 3 PromptPay Payment + Module 5 Omise Subscription
ลำดับถัดไป: Module 2 Membership + Module 4 Check-in
