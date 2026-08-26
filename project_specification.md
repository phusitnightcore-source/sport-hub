# เอกสารขอบเขตและโครงสร้างโปรเจค (Project Specification)
**ชื่อโปรเจค:** ระบบจัดการก๊วนแบดมินตัน (Badminton Group Web)

เอกสารฉบับนี้จัดทำขึ้นเพื่อระบุขอบเขตการทำงาน (Scope), โครงสร้างระบบ (Architecture), และรายละเอียดทางเทคนิคของโปรเจค เพื่อใช้เป็นคู่มืออ้างอิงสำหรับการนำโปรเจคนี้ไปสร้างใหม่ (Rebuild) หรือพัฒนาต่อยอดในแพลตฟอร์มอื่น

---

## 1. ภาพรวมโครงการ (Project Overview)
ระบบเว็บแอปพลิเคชันสำหรับจัดการก๊วนแบดมินตันแบบครบวงจร ครอบคลุมตั้งแต่การลงทะเบียนผู้เล่น, การเช็คอินเข้าก๊วนรายวัน, การจัดแมตช์แข่งขันแบบสุ่มด้วยระดับฝีมือ (Smart Matchmaking), การติดตามการใช้งานลูกแบดมินตัน, การคำนวณค่าใช้จ่ายรายบุคคลโดยอัตโนมัติ ไปจนถึงระบบทำอันดับ (Leaderboard) และสถิติส่วนตัว

---

## 2. เทคโนโลยีที่ใช้งาน (Tech Stack)

### Frontend (Client-side & Server-side Rendering)
*   **Framework:** Next.js (ใช้ App Router รูปแบบใหม่ล่าสุด)
*   **Library:** React 19
*   **Language:** TypeScript (`.tsx`, `.ts`)
*   **Styling:** TailwindCSS (v4) ผสมกับ Vanilla CSS
*   **Icons:** Iconify (`@iconify/react`) & React Icons (`react-icons`)
*   **UI/UX Tools:** `react-hot-toast` (สำหรับ Notifications), `react-qr-code` (สำหรับการชำระเงิน)
*   **Image Processing:** `browser-image-compression` (สำหรับลดขนาดสลิปโอนเงินก่อนอัปโหลด)

### Backend & Database (BaaS)
*   **Platform:** Supabase (PostgreSQL)
*   **Authentication:** Supabase Auth (Email/Password)
*   **Database:** PostgreSQL พร้อมใช้งาน Row Level Security (RLS)
*   **Realtime:** Supabase Realtime (สำหรับ Live Board)
*   **Storage:** Supabase Storage (สำหรับเก็บรูปโปรไฟล์ และสลิปการโอนเงิน)

---

## 3. ขอบเขตฟีเจอร์ (Feature Scope)

ระบบแบ่งผู้ใช้งานออกเป็น 2 กลุ่มหลัก คือ **ผู้ใช้ทั่วไป (User)** และ **ผู้ดูแล (Admin)** โดยมีฟีเจอร์ดังต่อไปนี้:

### 3.1 ระบบผู้ใช้งาน (User System & Authentication)
*   **Authentication:** ระบบสมัครสมาชิก, เข้าสู่ระบบ, ลืมรหัสผ่าน และรีเซ็ตรหัสผ่าน
*   **Profile Management:** 
    *   ผู้เล่นสามารถแก้ไขข้อมูลส่วนตัว (ชื่อแสดงผล, ระดับฝีมือ, วันเกิด)
    *   การจัดเก็บและแสดงประวัติการใช้จ่ายรายเดือน (Billing History)
    *   ระบบคำนวณ MMR (Match Making Rating) ที่ปรับขึ้นลงตามผลการแข่งขันและระดับฝีมือเริ่มต้น
*   **Guest Support:** รองรับการเพิ่ม "ผู้เล่นชั่วคราว" (Guest) โดย Admin สำหรับคนที่ไม่ได้สมัครสมาชิกในระบบ

### 3.2 ระบบจัดการก๊วน (Event Management) - *Admin Only*
*   **Create Event:** สร้างกิจกรรม/รอบตีแบดมินตันรายวัน
    *   กำหนดวันที่จัดกิจกรรม
    *   กำหนดค่าคอร์ท (ค่าสนาม)
    *   กำหนดราคาลูกแบดมินตันต่อลูก และยี่ห้อที่ใช้
*   **Check-in System:** 
    *   ระบบสำหรับ Admin ในการกด Check-in ผู้เล่นที่มาถึงสนาม
    *   รองรับการเลือกสถานะเป็น "ตัวสำรอง" (Substitute)
*   **Event Status:** เปิด-ปิด สถานะของก๊วน (Open / Closed) เพื่อป้องกันการแก้ไขข้อมูลเมื่อกิจกรรมจบลง

### 3.3 ระบบการแข่งขันและจัดแมตช์ (Matchmaking & Live Board)
*   **Live Board (Real-time):**
    *   กระดานคิวแบบ Real-time แสดงสถานะของก๊วน (กำลังตี, รอคิว, จบแล้ว, รายชื่อคนว่าง)
*   **Smart Matchmaking:**
    *   ระบบสุ่มจับคู่อัตโนมัติ โดยคำนวณจาก **ระดับฝีมือ (Skill Level / MMR)** เพื่อให้ทั้ง 2 ทีมมีความสูสีกันมากที่สุด
    *   ระบบให้ความสำคัญกับ "คนที่เล่นน้อยที่สุด" ให้ได้ลงสนามก่อน (Fair play queue)
*   **Manual Matchmaking:**
    *   Admin สามารถลากวาง (Drag & Drop) หรือคลิกเลือกผู้เล่นเพื่อจัดทีม A และ B ด้วยตนเอง
    *   การกำหนดหมายเลขคอร์ทให้แต่ละแมตช์
*   **Shuttlecock Tracking:**
    *   ระบบบันทึกจำนวนลูกแบดที่ใช้ในแต่ละแมตช์ (+ / - ลูกแบด)
    *   ระบุหมายเลขบนลูกแบดที่ใช้เพื่อความโปร่งใส

### 3.4 ระบบการเงินและคำนวณค่าใช้จ่าย (Financial & Billing)
*   **Auto Calculation:**
    *   ระบบคำนวณเงินรายบุคคลอัตโนมัติ = ค่าคอร์ท + (ราคาลูกแบด × จำนวนลูกที่ใช้ในแมตช์ที่ตนเองลงเล่น)
    *   *เงื่อนไขพิเศษ:* คิดค่าลูกเต็มจำนวนต่อคนในแมตช์นั้น ไม่หารเฉลี่ย
*   **Payment Tracking:**
    *   ผู้เล่นเห็นยอดที่ต้องชำระของตนเองบนหน้า Live Board
    *   สร้าง QR Code พร้อมเพย์ของ Admin ให้อัตโนมัติสำหรับการโอนเงิน
    *   สถานะแสดงชัดเจน: รอการตรวจสอบ (Pending) / จ่ายแล้ว (Verified)
*   **Admin Finance Control:**
    *   Admin ดูภาพรวมกระแสเงินสดรายวัน (ยอดที่ควรได้ vs ยอดที่เก็บได้จริง)
    *   Admin กดเปลี่ยนสถานะยืนยันการจ่ายเงินของแต่ละคน

### 3.5 ระบบสถิติและการทำอันดับ (Leaderboard & Statistics)
*   **Scoring & Win/Loss:** บันทึกผลคะแนน (รองรับแบบเซตเดียวและหลายเซต) เพื่อคำนวณแพ้-ชนะ
*   **Leaderboard Filtering:** 
    *   จัดอันดับตาม: ชนะมากที่สุด, แมตช์ที่เล่นมากที่สุด, ทำคะแนนรวมสูงสุด, ใช้เงินมากที่สุด
    *   เลือกดูสถิติ "ตลอดกาล" (All-time) หรือ "รายเดือน" (Monthly)
*   **Hall of Fame & Achievements:** ระบบมอบเหรียญเกียรติยศหรือ Badge ตามความสำเร็จ (เช่น ชนะรวด 3 เกม, เล่นครบ 100 แมตช์)
*   **MMR & Rank Reset System:** 
    *   ระบบประวัติการขึ้นลงของคะแนน MMR (MMR History)
    *   **ระบบรีเซ็ตแรงค์ (Season Rank Reset):** รองรับการรีเซ็ตคะแนนเมื่อจบฤดูกาล โดยอิงจากคะแนนเก่าเพื่อจัดระดับเริ่มต้นในฤดูกาลใหม่ (Soft Reset)
*   **Penalty System (Absences):** มีระบบจัดการผู้เล่นที่สมัครแล้วไม่มา (Absences) พร้อมระบบหักคะแนน MMR อัตโนมัติ

### 3.6 ระบบเสริมอื่นๆ (Additional Features)
*   **Notifications System:** ระบบแจ้งเตือนภายในแอปฯ (เช่น แจ้งเตือนเมื่อถึงคิวลงสนาม, แจ้งเตือนเมื่อถูกหักคะแนน)
*   **Activity Logs (Audit Trail):** ระบบบันทึกประวัติการกระทำของแอดมิน เพื่อตรวจสอบความโปร่งใสย้อนหลัง
*   **Guest Management:** ฟีเจอร์สำหรับแอดมินในการเพิ่มผู้เล่นชั่วคราว (Guest) ที่ไม่มีบัญชีในระบบ ให้สามารถลงเล่นและคิดเงินได้ตามปกติ

---

## 4. โครงสร้างฐานข้อมูล (Database Schema)

ระบบใช้งาน PostgreSQL (ผ่าน Supabase) โครงสร้างหลักประกอบด้วยตารางดังนี้:

1.  **`profiles`**: จัดเก็บข้อมูลผู้ใช้ (UUID เชื่อมกับ Supabase Auth), ชื่อ, ระดับฝีมือ, บทบาท (Admin/User), ค่า MMR ปัจจุบัน, และสถิติรวม
2.  **`events`**: ข้อมูลก๊วนแต่ละวัน (วันที่, ค่าคอร์ท, ราคาลูกแบด, สถานะ)
3.  **`event_players`**: ผู้เข้าร่วมก๊วนในแต่ละ event (เชื่อม `profiles` กับ `events`), สถานะเช็คอิน, สถานะการชำระเงิน, ตัวสำรอง
4.  **`matches`**: ข้อมูลการแข่งขันแต่ละรอบ (เชื่อมกับ `events`), หมายเลขคอร์ท, จำนวนลูกแบดที่ใช้, สถานะ (กำลังแข่ง, จบแล้ว)
5.  **`match_players`**: รายชื่อผู้เล่นในแต่ละแมตช์ (แบ่งทีม A และ ทีม B), คะแนนที่ได้
6.  **`activity_logs`**: บันทึกประวัติการกระทำ (Audit log) ในระบบ
7.  **`notifications`**: ระบบแจ้งเตือนสำหรับผู้ใช้

*(หมายเหตุ: ระบบอาศัย PostgreSQL Triggers และ Views จำนวนมากในการคำนวณ MMR, Leaderboard และ Billing โดยอัตโนมัติ สามารถดูสคริปต์เต็มได้ที่แฟ้ม `supabase/`)*

---

## 5. โครงสร้างโฟลเดอร์หลัก (Folder Structure)

```text
badminton-group-web/
├── app/                      # Next.js App Router (หน้าเว็บทั้งหมด)
│   ├── (dashboard)/          # Layout สำหรับผู้ที่ Login แล้ว
│   │   ├── admin/            # หน้าสำหรับ Admin เท่านั้น (จัดการก๊วน, อนุมัติเงิน)
│   │   ├── leaderboard/      # หน้าแสดงอันดับสถิติผู้เล่น
│   │   ├── profile/          # หน้าโปรไฟล์ส่วนตัว
│   │   └── ...
│   ├── auth/                 # API Routes สำหรับ Authentication
│   ├── live/                 # หน้า Live Board กระดานคิว (Public)
│   ├── login/                # หน้าเข้าสู่ระบบ
│   ├── register/             # หน้าสมัครสมาชิก
│   └── page.tsx              # หน้า Landing Page
├── src/                      # โฟลเดอร์เก็บ Logic และ UI Component ทั่วไป
│   ├── components/           # React Components (Button, Card, Modal, etc.)
│   ├── lib/                  # Utility functions (เช่น การเชื่อมต่อ Supabase)
│   ├── styles/               # CSS Modules หรือ Global Styles
│   └── types/                # TypeScript Interfaces & Types
├── supabase/                 # โฟลเดอร์เก็บ SQL Scripts สำหรับสร้าง Database และ Migrations
│   ├── full_database_setup.sql
│   ├── add_notifications.sql
│   ├── fix_mmr_trigger.sql
│   └── ...
├── public/                   # ไฟล์ภาพนิ่ง, Favicon
├── package.json              # รายการ Dependencies และ Scripts
├── tailwind.config.js / postcss.config.mjs # ตั้งค่า CSS
└── README.md / USER_GUIDE.md # คู่มือโปรเจค
```

---

## 6. ข้อควรระวังเมื่อนำไปพัฒนาใหม่ (Key Takeaways for Rebuilding)

1.  **State Management & Real-time:** หัวใจหลักคือหน้า Live Board หากไปสร้างบนแพลตฟอร์มอื่น ต้องมั่นใจว่ามีเครื่องมือทำ WebSocket/Real-time (เช่น Firebase, Socket.io) เพื่อให้หน้าคิวอัปเดตตรงกันทุกคนในโรงยิม
2.  **Complex Logic in Database:** โปรเจคนี้ผลักภาระการคำนวณไปที่ Database ระดับหนึ่งผ่าน SQL Triggers และ Views (เช่น `fix_mmr_trigger.sql`, `view_leaderboard.sql`) หากเปลี่ยน Database ให้พิจารณาว่าต้องแปลง Logic เหล่านี้มาไว้ที่ Backend API แทนหรือไม่
3.  **Authentication:** ระวังเรื่อง RLS (Row Level Security) ของ Supabase ซึ่งตั้งค่าไว้เพื่อป้องกันไม่ให้ผู้ใช้คนอื่นแก้คะแนนหรือดูบิลค่าใช้จ่ายของคนอื่นได้ หากย้ายที่ต้องวางระบบ Permissions ใหม่ให้รัดกุม
4.  **UI/UX:** ก๊วนแบดมินตันมีการโต้ตอบ (Interaction) สูงขณะอยู่ที่สนาม (เหงื่อออก, รีบ) UI สำหรับฝั่ง Admin ในการจับคู่และบันทึกคะแนนต้องออกแบบให้คลิกง่ายและใหญ่เพียงพอ (Mobile First)
