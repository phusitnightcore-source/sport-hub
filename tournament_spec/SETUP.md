# SETUP.md — ขั้นตอนตั้งโปรเจคตั้งแต่ศูนย์ (ทำตามลำดับ)

## 1. สร้างโปรเจค Next.js

```bash
npx create-next-app@latest badminton-tournament --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd badminton-tournament
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest
```

## 2. ตั้งค่า Supabase

1. สร้างโปรเจคที่ https://supabase.com (เลือก region Singapore ใกล้ไทยสุด)
2. ไปที่ **SQL Editor** → วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ → Run
3. ไปที่ **Authentication > Providers > Email** → ระหว่าง dev ปิด "Confirm email" เพื่อทดสอบเร็ว
4. ไปที่ **Project Settings > API** คัดลอกค่า:
   - Project URL
   - anon public key
   - service_role key (ลับ! ห้าม commit)

## 3. คัดลอกไฟล์จากชุดนี้เข้าโปรเจค

| ไฟล์ในชุดนี้ | วางที่ |
|---|---|
| `SCOPE.md` | root |
| `CLAUDE.md` | root |
| `supabase/schema.sql` | `supabase/schema.sql` (เก็บไว้อ้างอิง/รันซ้ำ) |
| `.env.example` | root แล้ว copy เป็น `.env.local` ใส่ค่าจริง |
| `src/lib/supabase/client.ts` | ตามพาธเดิม |
| `src/lib/supabase/server.ts` | ตามพาธเดิม |
| `src/lib/supabase/middleware.ts` | ตามพาธเดิม |
| `src/middleware.ts` | `src/middleware.ts` |
| `src/lib/auth.ts` | ตามพาธเดิม |
| `src/types/database.ts` | ตามพาธเดิม |

```bash
cp .env.example .env.local   # แล้วเปิดแก้ใส่ค่าจริงจากข้อ 2.4
```

## 4. สร้าง admin คนแรก

1. `npm run dev` → เข้า `/register` สมัครบัญชีแรก (หรือสร้าง user ใน Supabase Dashboard > Authentication)
2. ใน SQL Editor รัน:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'อีเมลของคุณ');
```

## 5. Deploy Vercel

1. push ขึ้น GitHub
2. Vercel > New Project > import repo
3. ใส่ Environment Variables 3 ตัวตาม `.env.example` (service role ใส่เฉพาะฝั่ง server ปกติ Vercel env ปลอดภัยอยู่แล้ว แค่ห้ามตั้งชื่อขึ้นต้น NEXT_PUBLIC_)
4. Deploy — Vercel รัน `npm run build` ดังนั้น**ก่อน push ทุกครั้งรัน build ให้ผ่านใน local ก่อน**

## 6. เริ่มพัฒนา

เปิด `SCOPE.md` → ทำ checklist **เฟส 1** จากบนลงล่างทีละข้อ โดยยึดกฎใน `CLAUDE.md`

ลำดับที่แนะนำในเฟส 1:
1. Auth (login/register) + `requireRole()` + redirect ตาม role
2. Admin CRUD: tournaments → skill levels → players → events
3. Entries + generate สาย single elimination
4. Scoring engine + unit tests (ทำให้ผ่านหมดก่อนแตะ UI)
5. Scoring console + UI สนาม (ผูก engine + บันทึก score_events)
6. หน้า `/umpire` + มอบหมายกรรมการ
7. หน้าสาธารณะ + realtime

## ปัญหาที่เจอบ่อย

- **Session หายตอน refresh** → ลืมใส่ `src/middleware.ts` หรือ matcher ไม่ครอบ route
- **RLS ปฏิเสธ query** → เช็คว่า login แล้วจริง และ role ถูกต้อง ลอง query ใน SQL Editor ด้วย `set role authenticated;` เพื่อ debug
- **Realtime ไม่มา** → ตารางนั้นยังไม่อยู่ใน publication (schema.sql จัดการให้แล้ว แต่ถ้าสร้างตารางใหม่ต้อง add เอง)
- **Build ผ่าน local แต่พังบน Vercel** → มักเป็น env variable ไม่ครบ หรือใช้ dynamic API ใน static page
