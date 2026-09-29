# CLAUDE.md — กติกาการพัฒนาโปรเจคนี้ (อ่านก่อนเขียนโค้ดทุกครั้ง)

> ไฟล์นี้วางไว้ root ของโปรเจค Next.js ใช้กำกับ AI coding assistant และคนในทีม
> **ห้ามทำนอกเหนือจาก SCOPE.md และห้ามข้ามเฟส** ถ้าไม่แน่ใจให้ถามก่อน ไม่ใช่เดา

## Stack (ห้ามเปลี่ยน/ห้ามเพิ่ม lib โดยไม่ถาม)

- **Next.js 15+ (App Router, TypeScript strict)** — ห้ามใช้ Pages Router
- **Supabase**: Auth (email+password), Postgres, Realtime — ใช้ `@supabase/supabase-js` + `@supabase/ssr` เท่านั้น (**ห้าม**ใช้ `@supabase/auth-helpers-nextjs` ตัวเก่า deprecated แล้ว)
- **Tailwind CSS** — ห้ามเพิ่ม UI library ใหญ่ (MUI/AntD) ถ้าจำเป็นใช้ shadcn/ui ได้
- **Vitest** สำหรับ unit test scoring engine
- Deploy: **Vercel**

## โครงสร้างโฟลเดอร์ (ยึดตามนี้เท่านั้น)

```
src/
  app/
    (public)/                 # หน้าสาธารณะ ไม่ต้อง auth
      page.tsx                # /
      t/[tournamentId]/...
      live/[matchId]/page.tsx
      display/[matchId]/page.tsx
    (auth)/login, register
    me/                       # นักแข่ง
    umpire/                   # กรรมการ
    admin/                    # แอดมิน
  components/
    court/                    # UI สนาม + scoring console
    bracket/                  # แสดงสาย
    ui/                       # ปุ่ม การ์ด ฯลฯ ใช้ซ้ำ
  lib/
    supabase/client.ts        # browser client
    supabase/server.ts        # server client (Server Component / Route Handler)
    supabase/middleware.ts    # refresh session
    scoring/                  # ★ scoring engine (pure functions เท่านั้น)
      engine.ts
      engine.test.ts
    bracket/                  # generate สาย, คำนวณ next_match
    auth.ts                   # requireRole() helpers
  types/
    database.ts               # types ตรงกับ schema.sql
```

## กฎเหล็ก

1. **Scoring engine = pure function ใน `src/lib/scoring/` เท่านั้น**
   - รับ state + action → คืน state ใหม่ ห้ามยุ่ง DB / React ใน engine
   - ทุกการแก้ engine ต้องรัน `npm run test` ผ่านก่อน commit
   - source of truth ของคะแนน = ตาราง `score_events` — Undo คือลบ event ล่าสุดแล้วคำนวณ state ใหม่จาก events ที่เหลือ
2. **การเขียน DB ที่กระทบผลแข่ง** (จบเกม/จบแมตช์/ขยับสาย) ทำผ่าน Server Action / Route Handler เท่านั้น ห้ามให้ client เขียน `matches.winner_id` ตรงๆ (การขยับสายมี trigger `advance_winner` ใน DB จัดการอยู่แล้ว — ห้ามเขียน logic ซ้ำฝั่ง client)
3. **Auth & Role**
   - ทุกหน้าใน `admin/`, `umpire/`, `me/` ต้องเช็ค role ฝั่ง server (ใช้ `requireRole()` ใน `lib/auth.ts`) — เช็คฝั่ง client อย่างเดียวไม่นับ
   - RLS คือแนวป้องกันจริง อย่า bypass ด้วย service role key ยกเว้นใน Server Action ที่จำเป็นและระบุเหตุผลใน comment
   - `SUPABASE_SERVICE_ROLE_KEY` ห้ามหลุดไป client (ห้ามขึ้นต้น NEXT_PUBLIC_)
4. **Realtime**: หน้าสาธารณะ subscribe ตาราง `games` + `matches` (filter ตาม id ที่ดูอยู่) อย่า subscribe ทั้งตารางโดยไม่ filter
5. **TypeScript**: ห้าม `any` ทุก query ใช้ types จาก `src/types/database.ts` ถ้าแก้ schema.sql ต้องแก้ไฟล์ types ให้ตรงกันในการแก้เดียวกัน
6. **ภาษา UI = ไทย** โค้ด/ตัวแปร/commit = อังกฤษ
7. Mobile-first: scoring console ออกแบบให้ใช้บนแท็บเล็ต/มือถือข้างสนามเป็นหลัก ปุ่มบวกแต้มต้องใหญ่ (แตะง่าย ≥ 80px)
8. ทำทีละงานตาม checklist ใน SCOPE.md เฟสปัจจุบัน เสร็จแล้วติ๊ก แล้วค่อยไปข้อถัดไป

## กติกาแบดที่ engine ต้องรองรับ (สรุปสำหรับเขียน test)

- 21 แต้ม / ดิวส์ห่าง 2 / ตัน 30 / ชนะ 2 ใน 3 เกม
- แต้มฝั่งเสิร์ฟคู่→เสิร์ฟขวา, คี่→ซ้าย
- คู่: ฝั่งเสิร์ฟได้แต้ม = คนเดิมเสิร์ฟสลับช่อง / ฝั่งรับได้แต้ม = สิทธิ์ย้ายฝั่ง ผู้เล่นไม่สลับตำแหน่ง
- interval ที่ 11, เปลี่ยนฝั่งจบเกม + เกม 3 ที่ 11
- Undo ไม่จำกัด, walkover, retired
- ป้ายสถานะ: game point / match point / interval

## เช็คก่อนจบทุก task

- [ ] `npm run build` ผ่าน (Vercel ใช้คำสั่งนี้ ถ้า local พังบน Vercel ก็พัง)
- [ ] `npm run test` ผ่าน
- [ ] ไม่มี `any`, ไม่มี unused import
- [ ] ทดสอบ role ที่ไม่มีสิทธิ์เข้าหน้านั้นแล้วถูกเด้งจริง
