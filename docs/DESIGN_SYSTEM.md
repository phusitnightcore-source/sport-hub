# SportHub — Design System (v2 — Soft Blue Dashboard)

หลักการเดียว: **ไฟล์นี้คือ Source of Truth ด้าน UI** — Claude Code ต้องอ่านไฟล์นี้ก่อนสร้างหรือแก้หน้าใดๆ
เสมอ (อ้างจาก `CLAUDE.md`) ห้ามเดาสี ฟอนต์ หรือ spacing เอง ห้ามใช้ค่า hex/px ที่ไม่ได้อยู่ในตารางนี้
ถ้าต้องการ token ใหม่ ให้เพิ่มลงไฟล์นี้ก่อน ไม่ใช่เขียนแทรกในไฟล์ component

> **v2 เปลี่ยนอะไร**: อัปเดตทิศทางตาม reference ที่ผู้ใช้ส่งมา — สลับจากธีม "เขียวคอร์ท + shadow
> น้อย" เป็น **"ฟ้าอ่อนละมุน การ์ดขาวลอยด้วย shadow นุ่มเป็นค่าเริ่มต้น radius ใหญ่ขึ้น"**
> แบบ Dashboard SaaS สมัยใหม่ สีเขียวเดิมยังอยู่แต่ลดบทบาทเหลือแค่ semantic
> (แปลว่า "ว่าง/สำเร็จ") ไม่ใช่สีหลักของ UI อีกต่อไป

---

## 0. แนวคิดหลัก

Reference ที่ได้มาคือ dashboard โทนฟ้า: พื้นหลังไล่เฉดฟ้าอ่อน การ์ดขาวลอยตัวชัดเจนด้วย shadow
นุ่มสีฟ้า มุมโค้งใหญ่ ปุ่ม/ไอคอนวงกลมทึบสีฟ้าสด และแพทเทิร์น "แถวรายชื่อ" (avatar + ข้อมูล +
เมนู) ซึ่งเข้ากับ SportHub ได้พอดี เพราะเรามีรายชื่อสมาชิก/Staff/ตารางจองเต็มไปหมด

ยึดสูตรเดิมเรื่อง "Live Slot Grid" เป็น signature element (ข้อ 6) แต่ **reskin สีให้เข้ากับพาเลตใหม่**
และเพิ่ม 2 pattern จาก reference ที่ใช้ซ้ำได้ทั้งระบบ: **List Row Card** (ใช้กับสมาชิก/Staff/
รายการจอง) และ **Floating Stat Card** (ใช้กับ KPI Dashboard)

---

## 1. Color Tokens

| Token | Hex | ใช้ทำอะไร |
|---|---|---|
| `--brand` | `#2E77F5` | สีหลัก (Primary) — ปุ่มหลัก, ไอคอน active, ลิงก์, ขอบ avatar, focus ring |
| `--brand-dark` | `#1B5FE0` | Hover/active ของสีหลัก |
| `--brand-soft` | `#EAF2FE` | พื้นหลังไอคอนวงกลมที่ไม่ active, พื้น badge อ่อน, พื้นหลัง sidebar item ตอน hover |
| `--bg-top` / `--bg-bottom` | `#EAF2FE` → `#CFE3FC` | Gradient พื้นหลังหน้าเว็บ |
| `--surface` | `#FFFFFF` | พื้น Card/Panel ที่ลอยเหนือพื้นหลัง |
| `--ink` | `#16213E` | ตัวอักษรหลัก (กรมท่าเข้ม ไม่ใช่ดำสนิท) |
| `--ink-soft` | `#8A93A6` | ตัวอักษรรอง / label / caption / meta text |
| `--line` | `#E7EEFC` | เส้นขอบบางๆ (ใช้น้อย — v2 แยก card ด้วย shadow เป็นหลักไม่ใช่เส้นขอบ) |
| `--success` | `#1FAE6E` | Semantic เท่านั้น: สนาม/slot "ว่าง", สถานะ "ยืนยันแล้ว" — ไม่ใช่สีหลักของ UI แล้ว |
| `--danger` | `#FF6B57` | ปฏิเสธ/ยกเลิก/Peak time/Error |
| `--warning` | `#F5A524` | รอดำเนินการ/รอยืนยัน/Pro badge |

Semantic mapping:

| Semantic | Token |
|---|---|
| `primary action` | `--brand` |
| `available` / `confirmed` | `--success` |
| `danger` / `reject` / `peak` | `--danger` |
| `pending` / `warning` | `--warning` |
| `bg` | gradient `--bg-top` → `--bg-bottom` |
| `surface` | `--surface` |
| `text-primary` | `--ink` |
| `text-secondary` | `--ink-soft` |

**Dark mode**: ยังไม่ทำในเวอร์ชัน 1.0 — เว็บโทนฟ้าอ่อนแบบนี้เข้ากับ light mode เป็นหลัก

---

## 2. Typography

| Role | Font | น้ำหนักที่ใช้ | ใช้ตรงไหน |
|---|---|---|---|
| Display | **Prompt** | 600, 700 | H1/H2, ตัวเลขใหญ่ใน Stat Card, ราคา |
| Body | **Prompt** | 400, 500 | เนื้อหาทั่วไป, ปุ่ม, ฟอร์ม, list row, sidebar label |
| Mono/Data | **IBM Plex Mono** | 400, 500 | รหัสการจอง, เลขที่ใบเสร็จ, timestamp |

เปลี่ยนจาก Chakra Petch (v1, ฟีลสปอร์ต/สกอร์บอร์ด) มาเป็น **Prompt ตัวเดียวคุมทั้ง Display และ
Body** เพราะ reference เป็นเส้น geometric sans โค้งมนอ่านง่าย ไม่ใช่ฟีลเทคนิคัล — Prompt เป็นฟอนต์
ไทยที่รองรับทั้งไทย/อังกฤษ น้ำหนักครบ ให้ความรู้สึกทันสมัยแบบ SaaS ตรงกับ reference ที่สุด

โหลดผ่าน `next/font/google` ใน `app/layout.tsx`:
```ts
import { Prompt, IBM_Plex_Mono } from 'next/font/google'
```

**Type scale** (rem, base 16px) — เหมือน v1 ไม่เปลี่ยน:

| Token | Size | Line-height | ใช้ |
|---|---|---|---|
| `text-display-xl` | 3rem (48px) | 1.1 | Hero headline |
| `text-display-lg` | 2.25rem (36px) | 1.15 | H1 หน้า |
| `text-display-md` | 1.5rem (24px) | 1.2 | H2, ตัวเลข Stat Card |
| `text-body-lg` | 1.125rem (18px) | 1.5 | Intro text |
| `text-body` | 1rem (16px) | 1.6 | เนื้อหาปกติ |
| `text-body-sm` | 0.875rem (14px) | 1.5 | Label, caption, meta text |
| `text-mono-sm` | 0.8125rem (13px) | 1.4 | รหัส/เลขที่ (font mono) |

---

## 3. Spacing / Radius / Shadow / Border

- **Spacing scale**: Tailwind default (4px increments)
- **Radius** — ใหญ่ขึ้นชัดเจนจาก v1 ตาม reference:
  - `--radius-sm: 12px` (input, chip เล็ก, ปุ่มไอคอนเล็ก)
  - `--radius-md: 20px` (card มาตรฐาน — list row, stat card)
  - `--radius-lg: 28px` (panel ใหญ่, hero card, modal)
  - `--radius-full: 9999px` (ปุ่ม pill, avatar, badge, ปุ่มไอคอนวงกลม)
- **Border**: ใช้น้อยมาก — v2 แยก card ออกจากพื้นหลังด้วย **shadow เป็นหลัก** ไม่ใช่เส้นขอบ
  ใช้ `--line` เฉพาะจุดที่ต้องแบ่งภายใน card เดียวกัน (เช่น แถวในตาราง)
- **Shadow** — เปลี่ยนหลักการจาก v1 ชัดเจน: v1 บอกว่าใส่ shadow เฉพาะตอน interactive
  ห้ามใส่ตอนนิ่ง — **v2 ยกเลิกกฎนั้น** เพราะ reference ให้ card ลอยด้วย shadow เป็นค่าเริ่มต้นเสมอ
  แต่ยังคุมด้วย hierarchy 3 ระดับชัดเจน ไม่ใช่ shadow เดียวกันหมดทุก element

```css
--shadow-sm: 0 4px 12px rgba(47, 119, 245, 0.10);   /* ปุ่มไอคอนเล็ก, chip */
--shadow-md: 0 10px 28px rgba(22, 33, 62, 0.08);    /* card ปกติ (list row, stat card) */
--shadow-lg: 0 20px 48px rgba(22, 33, 62, 0.12);    /* card ที่ยกเด่น, popover, modal */
```

---

## 4. Component Patterns

**Button**
- Primary: พื้น `brand`, ตัวหนังสือขาว, radius `full`, shadow `sm`, hover → `brand-dark` +
  translateY(-1px)
- Icon Button: พื้น `brand` + ไอคอนขาว สำหรับ action หลัก (เช่น "+" เพิ่มสมาชิก, แก้ไข) / พื้น
  `surface` + ไอคอน `ink-soft` สำหรับ action รอง (pin, ลบ) — ตาม reference มุมขวาบนที่มีปุ่มแก้ไข
  (ฟ้า) คู่กับปุ่มปักหมุด/ลบ(ขาว)
- Ghost/Secondary: พื้น `surface`, ไม่มีขอบ, shadow `sm`, ตัวหนังสือ `ink`

**List Row Card** (ใช้กับ: รายชื่อสมาชิกฟิตเนส, รายชื่อ Staff, รายการจองในตาราง Admin)
- พื้น `surface`, radius `md`, shadow `md`, padding แนวนอนกว้าง
- โครงสร้างซ้าย→ขวา: avatar วงกลม (หรือ icon วงกลมพื้น `brand-soft` ถ้าไม่มีรูป) → ชื่อ (ตัวหนา) +
  บรรทัดรอง (`ink-soft`) → คอลัมน์ข้อมูลเพิ่ม (แผนก/สาขา/แพ็กเกจ) → ปุ่ม action หรือ status pill
  ขวาสุด → เมนู 3 จุดท้ายแถว (optional)
- Hover: shadow เพิ่มเป็น `lg` เล็กน้อย + translateY(-1px)

**Floating Stat Card** (ใช้กับ: Dashboard KPI §21 ทั้งหมด — Today's Revenue, Occupancy ฯลฯ)
- พื้น `surface`, radius `md`, shadow `md`, padding กว้าง
- ตัวเลขใหญ่ font Prompt 700 (`text-display-md` ขึ้นไป) + หน่วย/สัญลักษณ์เล็กติดกัน + label เล็ก
  `ink-soft` อยู่ใต้ตัวเลข — วางหลายตัวเลขในการ์ดเดียวแบ่งด้วย spacing ไม่ใช่เส้นคั่น

**Status Pill**
- รูปทรง pill (`radius-full`), พื้นสีอ่อน 10-12% ของ semantic color + ตัวหนังสือสีเข้มของสีเดียวกัน
- ตัวอย่าง: "ยืนยันแล้ว" = พื้น success 10% + ตัวหนังสือ success, "รอยืนยัน" = พื้น warning 12%

**Search Input**
- พื้น `surface`, radius `full`, shadow `sm`, ไม่มีขอบ, ไอคอนแว่นขยายสี `ink-soft`
- Focus: shadow เพิ่มเป็น `md` + ring `brand`

**Attachment/File Chip**
- พื้น `surface`, radius `full`, shadow `sm`, ไอคอนไฟล์ซ้าย + ชื่อไฟล์ + ปุ่มดาวน์โหลด/ปิดขวา
  (ใช้กับ: แสดงรูปสลิปที่แนบ, ไฟล์ export ที่ดาวน์โหลดได้)

**Sidebar (Admin)**
- แถบแนวตั้ง พื้น `surface`, radius `lg`, shadow `md`, ไอคอนเรียงกลาง
- Active item: พื้นหลังไอคอน `brand-soft` เป็นสี่เหลี่ยมโค้งมน + ไอคอนสี `brand`
- Item ปกติ: ไอคอนสี `ink-soft`, hover → พื้น `brand-soft` จางๆ

**Slot Grid Cell** (signature element, reskin ตามพาเลตใหม่ — ดูข้อ 6)

**ตาราง (Admin, ตารางแบบละเอียด ไม่ใช่ list row)**
- Header: พื้นหลังโปร่ง ตัวหนังสือ `ink-soft` uppercase `text-body-sm`
- ครอบทั้งตารางด้วย card เดียว shadow `md` เส้นแบ่งแถวใช้ `line` บางๆ ไม่มีขอบตาราง

**Empty / Error state**
- ไอคอนเส้น (lucide-react) ในวงกลมพื้น `brand-soft` ขนาดใหญ่ + ข้อความสั้น + ปุ่ม action

---

## 5. Motion Guide

หลักเดิม: **Motion มีหน้าที่สื่อสาร ไม่ใช่ตกแต่ง**

| เหตุการณ์ | Animation | Duration/Easing |
|---|---|---|
| List Row / Stat Card hover | translateY(-2px) + shadow md→lg | 150ms ease-out |
| เปลี่ยนขั้นตอนการจอง | slide + fade เข้าจากขวา | 200ms ease-out |
| Slot ว่าง realtime (Live Slot Grid) | opacity breathing 0.85↔1 | 2s ease-in-out infinite |
| สลิปถูกยืนยัน / จองสำเร็จ | checkmark path-draw ครั้งเดียว | 400ms ease-out, ไม่ทำซ้ำ ไม่มี confetti |
| Loading | skeleton shimmer สี `line` ไล่ `surface` | 1.5s linear infinite |
| Toast แจ้งเตือน | slide up + fade | 200ms ease-out / auto dismiss 4s |
| ปุ่ม/icon button กด | scale 0.97 momentary | 100ms ease-out |

ทุก animation เช็ค `prefers-reduced-motion: reduce` เสมอ — ใส่เป็น utility กลาง ไม่เช็คแยกทุกที่

---

## 6. Signature Element: Live Slot Grid (reskin ตามพาเลตใหม่)

กติกาสี slot (v2):
- ว่าง = พื้น `brand-soft`, ขอบไม่มี, จุด/label สี `brand`
- ว่าง + peak time = พื้น `brand-soft` + ป้ายเล็กมุมขวาบนสี `danger` "Peak"
- ถูกจอง = พื้นเต็ม `success`, ตัวหนังสือขาว
- ถูกบล็อก = พื้น `line` (เทาฟ้าจาง) + ลาย hatch เฉียงบางๆ สี `ink-soft` โปร่ง 20%
- Live pulse เฉพาะช่อง "ว่าง" ที่ใกล้เวลาปัจจุบันที่สุด

---

## 7. Copy Voice — ไม่เปลี่ยนจาก v1

- Active voice เสมอ, ปุ่ม↔Toast ใช้คำเดียวกัน, Error บอกตรงไม่ขอโทษ, Empty state ชวน action
- Error message ใช้ตาม `docs/SCOPE.md` §28.2 เป๊ะๆ

---

## 8. Do / Don't (v2)

| ทำ | เลี่ยง |
|---|---|
| พื้นหลัง gradient ฟ้าอ่อน + card ขาวลอย shadow ชัดเจน | พื้นเรียบสีเดียวไม่มี depth |
| Shadow 3 ระดับตาม hierarchy (sm/md/lg) ใช้ตามบทบาท | Shadow แบบเดียวกันหมดทุก element |
| Radius ใหญ่สม่ำเสมอ 20-28px ตามระดับ card | ผสม radius มั่วในหน้าเดียว |
| Prompt ฟอนต์เดียวคุมทั้งหน้า น้ำหนักต่างกันตาม role | ผสมหลายฟอนต์แข่งกัน |
| ปุ่มไอคอนวงกลม/โค้งมนสีพื้น `brand` เด่นชัด 1-2 จุดต่อหน้า | ปุ่มไอคอนสีเดียวกันหมดจนไม่รู้ปุ่มไหนสำคัญ |
| List Row / Stat Card pattern ใช้ซ้ำสม่ำเสมอทั้งระบบ | แต่ละหน้าออกแบบ card คนละแบบ |

---

## 9. วิธีให้ Claude Code ยึดธีมนี้ทุกหน้า

1. `CLAUDE.md` อ้างถึงไฟล์นี้ไว้แล้ว — ทุก session จะเห็น instruction ให้เปิดอ่านก่อนทำ UI
2. Token ทั้งหมด implement จริงใน `tailwind.config.ts` และ `app/globals.css` (v2) —
   สั่ง Claude Code ว่า **"ใช้ token จาก tailwind.config.ts เท่านั้น ห้าม inline hex"**
3. สร้าง `components/ui/` เป็น component กลาง (Button, IconButton, ListRowCard, StatCard,
   StatusPill, SearchInput, SlotGrid) แล้วบังคับให้หน้าอื่นเรียกใช้
4. Prompt แนะนำ:
   > สร้างหน้า [ชื่อหน้า] ตาม docs/DESIGN_SYSTEM.md (v2 โทนฟ้า) ใช้ component จาก components/ui/
   > ที่มีอยู่แล้ว ถ้ายังไม่มี component ที่ต้องใช้ ให้สร้างใน components/ui/ ก่อน
5. ทุกๆ 3-4 หน้า สั่ง "เทียบหน้าที่เพิ่งสร้างกับ docs/DESIGN_SYSTEM.md ว่าตรง token ทุกอย่างไหม
   โดยเฉพาะ shadow กับ radius ที่เพิ่งเปลี่ยนเป็น v2 แก้ส่วนที่หลุด"
