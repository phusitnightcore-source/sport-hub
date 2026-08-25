# เอกสารขอบเขตโครงการ (Project Scope of Work)

# Sports Hub & Facility Management Platform

**ลักษณะโครงการ:** Marketplace + B2B SaaS + Facility POS Ecosystem  
**เอกสาร:** Detailed Project Scope of Work  
**Version:** 1.1  
**วันที่:** 24 สิงหาคม 2569

## Document History

| Version | วันที่ | ผู้แก้ไข | รายละเอียด |
|---|---|---|---|
| 1.0 | 24 สิงหาคม 2569 | — | Draft แรก |
| 1.1 | 24 สิงหาคม 2569 | Senior BA Review | เพิ่ม Pricing Logic, Hold Timer, Cancellation Policy, Coach Payment Flow, Group Booking Detail, Staff Permission Matrix, Subscription Enforcement, Walk-in Payment, Notification Matrix, Sprint Timeline, API Methods, Glossary, Assumptions, Risk Assessment, Stakeholder Sign-off, Module Dependency |

---

# 1. วิสัยทัศน์ของระบบ

Sports Hub ไม่ใช่เพียงเว็บไซต์จองสนาม แต่เป็น **ระบบนิเวศด้านกีฬา (Sports Ecosystem)** ที่รวมผู้เล่น โค้ช เจ้าของสนาม และผู้ดูแลแพลตฟอร์มไว้ภายในฐานข้อมูลเดียวกัน

เป้าหมายของระบบคือสร้างวงจรการใช้งานดังนี้

```text
                    SPORTS HUB
                        │
                    ┌───▼───┐
                    │ Player │
                    └───┬───┘
                        │
             ค้นหาสนาม / โค้ช
                        │
                    ┌───▼──────┐
                    │  Search  │
                    │  Filter  │
                    │ GPS      │
                    └───┬──────┘
                        │
                    ┌───▼──────┐
                    │ Booking  │
                    │  Engine  │
                    └───┬──────┘
                        │
                  QR / Bank Transfer
                        │
                  Upload Payment Slip
                        │
                    ┌───▼────────┐
                    │  Facility  │
                    │  Dashboard │
                    └───┬────────┘
                        │
             ┌──────────┼──────────┐
             │          │          │
            POS      Calendar   Inventory
             │          │          │
             └──────────┼──────────┘
                        │
              ┌─────────▼─────────┐
              │ Community / Group │
              │ Tournament / Elo  │
              │ Review / Ranking  │
              └───────────────────┘
```

ผู้ใช้ทุกคนอยู่ในระบบบัญชีเดียว แต่สิทธิ์และข้อมูลที่มองเห็นแตกต่างกันตาม Role

---

# 2. ขอบเขตระบบทั้งหมด

ระบบแบ่งออกเป็น 8 โมดูลหลัก

## 2.1 Player Hub

Mobile First

- ค้นหาสนาม
- ค้นหาโค้ช
- GPS Search
- Filter
- ดูรายละเอียดสนาม
- จองคอร์ท
- ชำระเงิน
- อัปโหลดสลิป
- รีวิว
- สร้างก๊วน
- เข้าร่วมก๊วน
- ดูการแข่งขัน
- ดู Elo Rating
- ดู Leaderboard

## 2.2 Facility SaaS

Desktop First

- Facility Dashboard
- Multi Branch
- Court Management
- Calendar
- Booking Management
- Payment Slip Approval
- Walk-in
- Block Court
- POS
- Inventory
- Staff
- Reports
- Tournament Organizer

## 2.3 Coach Marketplace

- Coach Profile
- Portfolio
- Certificates
- Services
- Pricing
- Schedule
- Booking
- Review

## 2.4 Platform Admin

- User Management
- Facility Approval
- Coach Approval
- Subscription
- Package Management
- Platform Analytics
- Audit Logs
- System Configuration

## 2.5 Booking Engine

เป็น Core Service ของระบบ

- Availability
- Booking
- Hold
- Payment
- Slip
- Approval
- Cancellation
- Check-in
- Completion
- Booking History

## 2.6 POS & Inventory

- Product
- Category
- Stock
- Stock Movement
- Sales
- Rental
- Receipt
- Checkout
- Report

## 2.7 Tournament & Elo

- Tournament
- Category
- Team
- Match
- Bracket
- Result
- Elo
- Leaderboard

## 2.8 Notification Center

- Web Notification
- Realtime
- Sound
- Popup
- LINE OA
- Email
- Notification History

---

# 3. User Roles และสิทธิ์

## 3.1 Role Structure

ระบบแบ่งผู้ใช้งานออกเป็น 4 Role หลัก

### Player

ผู้เล่นทั่วไป

สิทธิ์:

- สมัครสมาชิกฟรี
- ค้นหาสนาม
- ค้นหาโค้ช
- จองสนาม
- อัปโหลดสลิป
- สร้างก๊วน
- เข้าร่วมก๊วน
- เข้าร่วมการแข่งขัน
- ดูสถิติ
- ดู Elo
- รีวิวสนาม
- รีวิวโค้ช

### Coach

เป็น Player ที่ Upgrade Role

เงื่อนไข:

1. สมัครแพ็กเกจ Coach
2. ชำระเงิน
3. ส่งข้อมูล/เอกสาร
4. Admin ตรวจสอบ
5. Admin Approve
6. Role = Active Coach

สิทธิ์:

- สร้าง Coach Profile
- เพิ่มประวัติ
- เพิ่มใบรับรอง
- เพิ่มผลงาน
- เพิ่มวิดีโอ
- กำหนดบริการ
- กำหนดราคา
- กำหนดเวลาว่าง
- รับ Booking
- ปฏิเสธ Booking
- ดูรายได้/ประวัติการสอน
- รับ Review

### Facility Owner

เป็น Player ที่ Upgrade Role

เงื่อนไข:

1. สมัครแพ็กเกจ Facility
2. ชำระเงิน
3. เพิ่มข้อมูลสนาม
4. ส่งเอกสาร
5. Admin ตรวจสอบ
6. Admin Approve
7. Role = Active Owner

สิทธิ์:

- สร้าง Organization
- เพิ่ม Branch
- เพิ่ม Court
- ตั้งราคา
- ตั้งเวลาเปิด-ปิด
- จัดการ Booking
- Approve Slip
- Block Court
- POS
- Inventory
- Staff
- Reports
- Tournament

### Platform Admin

ผู้ดูแลแพลตฟอร์ม

สิทธิ์สูงสุด:

- User Management
- Role Management
- Facility Approval
- Coach Approval
- Subscription Management
- Pricing
- Platform Analytics
- Audit Logs
- System Configuration

---

# 4. Account Architecture

ผู้ใช้หนึ่งคนสามารถมีหลาย Role ได้

ตัวอย่าง:

```text
User A
 ├── Player
 ├── Coach
 └── Facility Owner
```

ไม่ควรสร้าง Account ใหม่เมื่อ Upgrade

แต่ใช้โครงสร้าง:

```text
users
   │
   ├── user_roles
   │
   ├── coach_profile
   │
   └── organization_members
```

ข้อดี:

- Single Sign-On
- ใช้บัญชีเดียว
- ลดข้อมูลซ้ำ
- รองรับ Multi-role
- ขยายระบบง่าย

---

# 5. Authentication & Account

## 5.1 Registration

รองรับ:

- Email
- Password
- Google Login
- LINE Login Ready

ข้อมูลพื้นฐาน:

| Field | รายละเอียด |
|---|---|
| user_id | UUID |
| name | ชื่อ |
| email | อีเมล |
| phone | เบอร์โทร |
| avatar | รูปโปรไฟล์ |
| birthdate | วันเกิด |
| gender | เพศ |
| province | จังหวัด |
| GPS Consent | ความยินยอม GPS |
| PDPA Consent | ความยินยอม PDPA |

## 5.2 Login

รองรับ:

- Login
- Logout
- Forgot Password
- Reset Password
- Session Management
- Refresh Token
- Device Session

## 5.3 Account Upgrade

Player สามารถ Upgrade เป็น:

- Coach
- Facility Owner

Flow:

```text
Player
  ↓
เลือก Role
  ↓
เลือก Package
  ↓
ชำระเงิน
  ↓
กรอกข้อมูลเพิ่มเติม
  ↓
Submit Application
  ↓
Pending
  ↓
Admin Review
  ↓
Approved
  ↓
Role Active
```

---

# 6. Player Hub

## 6.1 Home

หน้า Home ประกอบด้วย:

- Search
- Sport Categories
- สนามใกล้ฉัน
- สนามยอดนิยม
- Coach แนะนำ
- Tournament
- ก๊วนที่กำลังเปิด
- Leaderboard
- Booking ล่าสุด

## 6.2 Location-based Directory

ระบบสามารถใช้ GPS เพื่อค้นหา:

- สนามใกล้ฉัน
- โค้ชใกล้ฉัน
- ก๊วนใกล้ฉัน
- Tournament ใกล้ฉัน

### Filter

- ประเภทกีฬา
- ระยะทาง
- ราคา
- Rating
- Open Now
- สิ่งอำนวยความสะดวก
- จำนวนคอร์ท
- Indoor / Outdoor

## 6.3 Facility Detail

ข้อมูล:

- ชื่อสนาม
- รูปภาพ
- Cover
- รายละเอียด
- ที่อยู่
- แผนที่
- GPS
- เวลาเปิด-ปิด
- ราคา
- Court
- Amenities
- Rating
- Review
- Contact
- Payment Information

---

# 7. Booking Engine

Booking Engine เป็น Core Service ที่ทุกส่วนของระบบต้องใช้ร่วมกัน

## 7.1 Court Structure

```text
Organization
   │
   ├── Branch A
   │     ├── Court 1
   │     ├── Court 2
   │     └── Court 3
   │
   └── Branch B
         ├── Court 1
         └── Court 2
```

## 7.2 Court Status

- Available
- Hold
- Pending
- Confirmed
- Playing
- Completed
- Blocked
- Cancelled

## 7.3 Pricing Model

ราคาของ Court กำหนดโดย Facility Owner ตามโครงสร้างดังนี้:

### Pricing Structure

| หัวข้อ | รายละเอียด |
|---|---|
| Pricing Type | Time-based (ต่อชั่วโมง) |
| Peak Hour | Owner กำหนดเอง (เช่น 17:00 - 21:00) |
| Off-peak Hour | นอกเหนือจาก Peak |
| ราคาวันหยุด | Owner สามารถตั้งราคาแยกวันหยุดได้ |
| Minimum Duration | 1 ชั่วโมง |
| Maximum Duration | Owner กำหนดเอง (Default: 4 ชั่วโมง) |
| Booking Slot | จองเป็นหน่วยชั่วโมง (1, 1.5, 2, ...) |

### ตัวอย่าง Pricing

```text
Court 1 (Badminton)

Weekday Off-peak (08:00-16:59)  = 200 บาท/ชม.
Weekday Peak (17:00-21:00)      = 300 บาท/ชม.
Weekend/Holiday                 = 350 บาท/ชม.

Min Duration = 1 ชั่วโมง
Max Duration = 3 ชั่วโมง
```

ราคาเก็บในโครงสร้าง:

```text
court_pricing
 ├── court_id
 ├── day_type (WEEKDAY / WEEKEND / HOLIDAY)
 ├── time_type (PEAK / OFF_PEAK)
 ├── start_time
 ├── end_time
 ├── price_per_hour
 └── is_active
```

## 7.4 Availability

ผู้เล่นเลือก:

1. วันที่
2. เวลา
3. กีฬา
4. Court
5. ระยะเวลา

ระบบตรวจสอบ:

```text
Court
+
Date
+
Start Time
+
End Time
+
Existing Booking
+
Block Schedule
=
Availability
```

## 7.5 Booking Creation

เมื่อเลือกคอร์ท:

ระบบสร้าง Booking

สถานะแรก:

```text
HOLD
```

เพื่อป้องกันผู้เล่นคนอื่นจองซ้อนในช่วงเวลาสั้น ๆ

### Hold Timer Specification

| หัวข้อ | ค่า |
|---|---|
| Hold Duration | 15 นาที |
| Extend | ไม่อนุญาต |
| Timeout Action | Auto Release → Court กลับเป็น Available |
| Notification | แจ้ง Player เมื่อเหลือ 5 นาที ("กรุณาอัปโหลดสลิปภายใน 5 นาที") |
| Notification on Expire | แจ้ง Player ว่า Hold หมดอายุแล้ว |

```text
Hold Flow:

เลือก Court → HOLD (15 นาที)
                  │
      ┌───────────┼───────────┐
      │           │           │
  Upload Slip   10 นาที     15 นาที
      │        แจ้งเตือน    หมดเวลา
      ↓           │           ↓
  PENDING         │       AUTO RELEASE
                  │        → Available
                  │
           Player ยังไม่ Upload
```

## 7.6 Booking Lifecycle

```text
Available
   ↓
Hold (15 นาที)
   ↓
Upload Slip
   ↓
Pending Review
   ↓
 ┌──────────────┐
 │              │
Approve       Reject
 │              │
 ↓              ↓
Confirmed     Cancelled
 │
 ↓
Check-in
 │
 ↓
Playing
 │
 ↓
Completed
```

## 7.7 Booking History

ผู้เล่นเห็น:

- Booking ID
- สนาม
- Court
- วันที่
- เวลา
- ราคา
- Payment Status
- Booking Status
- Slip
- Cancellation Status

## 7.8 Cancellation Policy

Cancellation Policy **กำหนดโดย Facility Owner แต่ละราย** ผ่านหน้า Settings

### Policy Structure

| หัวข้อ | รายละเอียด |
|---|---|
| Policy Owner | Facility Owner กำหนดเอง |
| Default Policy | สามารถ Set Default ให้ทุก Court |
| Custom Policy | Override ได้ตาม Court |

### ระดับ Cancellation

| ระดับ | เงื่อนไข | ผลลัพธ์ |
|---|---|---|
| Free Cancellation | ก่อน Booking ≥ 24 ชั่วโมง | คืนเงินเต็ม (Manual Refund) |
| Partial Refund | ก่อน Booking 12-24 ชั่วโมง | คืนเงิน 50% (Manual Refund) |
| No Refund | ก่อน Booking < 12 ชั่วโมง | ไม่คืนเงิน |
| Facility Cancel | สนามยกเลิกเอง | คืนเงินเต็มเสมอ |

> **หมายเหตุ:** ค่า 24/12 ชั่วโมง เป็น Default — Owner ปรับเปลี่ยนได้

### Refund Process

```text
Player/Facility กดยกเลิก
       ↓
ระบบตรวจสอบ Policy
       ↓
 ┌─────────────────────┐
 │ ก่อน 24 ชม.         │ → สถานะ: REFUND_PENDING
 │ 12-24 ชม.           │ → สถานะ: PARTIAL_REFUND_PENDING
 │ น้อยกว่า 12 ชม.     │ → สถานะ: NO_REFUND
 │ Facility ยกเลิก     │ → สถานะ: REFUND_PENDING
 └─────────────────────┘
       ↓
Owner / Admin ดำเนิน Refund แบบ Manual
       ↓
อัปเดตสถานะ → REFUNDED
       ↓
แจ้ง Player
```

> **MVP:** Refund ดำเนินการแบบ Manual โดย Owner ติดต่อ Player
> **Phase 2:** เชื่อมกับ Payment Gateway สำหรับ Auto Refund

### ข้อมูลที่ต้องเก็บ

```text
booking_cancellations
 ├── id
 ├── booking_id
 ├── cancelled_by (PLAYER / FACILITY / ADMIN)
 ├── cancellation_reason
 ├── cancellation_policy_applied
 ├── refund_status (NONE / PENDING / PARTIAL / FULL / COMPLETED)
 ├── refund_amount
 ├── refund_note
 ├── cancelled_at
 └── refunded_at
```

---

# 8. Payment Flow

ระบบมีเงิน 2 ประเภทที่ต้องแยกกันอย่างชัดเจน

## 8.1 Platform Revenue

เกิดจาก:

- Coach Subscription
- Facility Subscription
- Package Upgrade
- Renewal

เงิน:

```text
Player/Owner/Coach
        ↓
Payment Gateway
        ↓
Platform Account
```

## 8.2 Facility Revenue

เกิดจาก:

- Court Booking
- POS
- Rental
- Tournament Fee

เงิน:

```text
Player
  ↓
QR / Bank Transfer
  ↓
Facility Bank Account
```

แพลตฟอร์มไม่หัก Commission

---

# 9. Payment Slip

## 9.1 Upload

ผู้เล่นสามารถ:

- ถ่ายรูป
- Upload Image
- Upload PDF Ready

ข้อมูล:

- Booking ID
- User ID
- Amount
- Transfer Time
- Bank
- Slip Image

## 9.2 Slip Status

- Uploaded
- Pending
- Approved
- Rejected
- Expired

## 9.3 Facility Approval

Owner เห็นรายการ:

```text
Booking #BK00125

Player: A
Court: 2
Time: 18:00-20:00
Amount: 300

[ดูสลิป]

[Approve] [Reject]
```

เมื่อ Approve:

- Booking → Confirmed
- แจ้ง Player
- Update Calendar
- Update Report
- เก็บ Audit Log

---

# 10. Facility SaaS

## 10.1 Facility Dashboard

Dashboard แสดง:

- Today's Booking
- Revenue Today
- Pending Slip
- Court Usage
- POS Sales
- Low Stock
- Upcoming Tournament

## 10.2 Multi Branch

รองรับ:

```text
Organization
 ├── Branch 1
 ├── Branch 2
 ├── Branch 3
 └── Branch N
```

ข้อมูลต้องแยกตาม:

- organization_id
- branch_id

## 10.3 Court Management

Owner สามารถ:

- เพิ่ม Court
- แก้ไข Court
- ตั้งชื่อ
- ตั้งประเภทกีฬา
- ตั้งราคา
- เปิด/ปิด Court
- Block Court
- Maintenance

---

# 11. Smart Calendar

รองรับ:

- Day View
- Week View
- Month View

สามารถ:

- ดู Booking
- Approve Booking
- Block Court
- Create Walk-in
- Check-in
- Cancel
- Reschedule
- Drag & Drop Ready

Calendar ต้องใช้ Booking Engine เดียวกับ Player

ไม่สร้างระบบจองแยก

---

# 12. Walk-in Booking

พนักงานสามารถสร้าง Booking จากหน้า POS/Calendar

ข้อมูล:

- ชื่อลูกค้า
- เบอร์โทร
- Court
- Date
- Time
- Price
- Payment Method

### Walk-in Payment Methods

| Method | รายละเอียด |
|---|---|
| เงินสด | จ่ายหน้าร้าน ไม่ต้อง Upload Slip |
| QR / โอนเงิน | จ่ายหน้าร้าน สามารถ Upload Slip ได้ (ไม่บังคับ) |

> **หมายเหตุ:** Walk-in Booking **ไม่ต้อง** Upload Slip — เพราะพนักงานเป็นผู้รับเงินเอง
> Walk-in สถานะจะข้ามจาก HOLD ไป CONFIRMED โดยตรง

Booking Walk-in ต้องเข้าสู่ Booking Table เดียวกับ Online Booking

โดยมี:

```text
booking_source =
ONLINE
WALK_IN
ADMIN
```

---

# 13. POS System

POS เป็นระบบขายหน้าร้านที่เชื่อมกับ Booking

## 13.1 Product Types

### Product

- น้ำ
- เครื่องดื่ม
- ลูกแบด
- ผ้า
- อุปกรณ์กีฬา

### Rental

- รองเท้า
- ไม้
- อุปกรณ์

### Service

- ค่าคอร์ท
- ค่าเช่าเพิ่ม
- บริการอื่น

## 13.2 POS Flow

```text
เปิด POS
 ↓
เลือก Customer / Booking
 ↓
เลือกสินค้า
 ↓
เลือกจำนวน
 ↓
รวมราคา
 ↓
Discount Ready
 ↓
Payment
 ↓
Checkout
 ↓
ตัด Stock
 ↓
สร้าง Receipt
```

## 13.3 Booking + POS

ตัวอย่าง:

```text
Court Fee        300
Water x2          40
Badminton Ball   120
Rental Shoes     100
--------------------
Total            560
```

ลูกค้าได้รับใบเสร็จเดียว

---

# 14. Inventory Management

## 14.1 Product

ข้อมูล:

- Product ID
- SKU
- Barcode
- Name
- Category
- Cost
- Selling Price
- Minimum Stock
- Current Stock

## 14.2 Stock Movement

ห้ามแก้ Stock โดยตรง

ทุกการเปลี่ยนแปลงต้องเกิดจาก Movement

ประเภท:

- Purchase
- Sale
- Return
- Adjustment
- Damage
- Transfer
- Initial Stock

ตัวอย่าง:

```text
Opening Stock = 100

Sale -2
= 98

Damage -1
= 97

Purchase +20
= 117
```

## 14.3 Low Stock

ถ้า:

```text
Current Stock <= Minimum Stock
```

ระบบแจ้งเตือน Owner

---

# 15. Receipt & Thermal Printer

รองรับ:

- 58mm
- 80mm

ใช้:

```css
@media print
```

ข้อมูลใบเสร็จ:

- Logo
- Organization
- Branch
- Address
- Invoice Number
- Date
- Staff
- Booking
- Product
- Quantity
- Price
- Discount
- Total
- Payment Method

ต้องรองรับ:

- Print Preview
- Thermal Printer
- Browser Print
- Receipt Reprint

---

# 16. Staff Management

Facility Owner สามารถเพิ่มพนักงาน

Role:

- Owner
- Manager
- Cashier
- Staff

Permission ตัวอย่าง:

```text
Cashier
✓ POS
✓ Checkout
✓ Receipt
✗ Inventory Setting
✗ Subscription
✗ Owner Setting
```

### Staff Permission Matrix

| Permission | Owner | Manager | Cashier | Staff |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✗ | ✗ |
| Calendar | ✓ | ✓ | ✓ (View) | ✓ (View) |
| Booking Management | ✓ | ✓ | ✗ | ✗ |
| Approve Slip | ✓ | ✓ | ✗ | ✗ |
| Walk-in Booking | ✓ | ✓ | ✓ | ✗ |
| Check-in | ✓ | ✓ | ✓ | ✓ |
| POS | ✓ | ✓ | ✓ | ✗ |
| Checkout | ✓ | ✓ | ✓ | ✗ |
| Receipt | ✓ | ✓ | ✓ | ✗ |
| Inventory (View) | ✓ | ✓ | ✓ | ✗ |
| Inventory (Edit) | ✓ | ✓ | ✗ | ✗ |
| Staff Management | ✓ | ✗ | ✗ | ✗ |
| Court Settings | ✓ | ✓ | ✗ | ✗ |
| Pricing Settings | ✓ | ✗ | ✗ | ✗ |
| Reports | ✓ | ✓ | ✗ | ✗ |
| Tournament | ✓ | ✓ | ✗ | ✗ |
| Subscription | ✓ | ✗ | ✗ | ✗ |
| Organization Settings | ✓ | ✗ | ✗ | ✗ |

Permission ควรออกแบบแบบ granular เพื่อขยายในอนาคต

---

# 17. Coach Marketplace

## 17.1 Coach Profile

ข้อมูล:

- Profile Photo
- Cover
- Name
- Sport
- Skill Level
- Experience
- Biography
- Certificate
- Achievement
- Video
- Price
- Location
- Rating

## 17.2 Coach Service

Coach สร้างบริการ:

```text
Private Training
60 Minutes
ราคา 600 บาท
```

หรือ:

```text
Beginner Course
4 Sessions
ราคา 2,000 บาท
```

## 17.3 Coach Schedule

Coach กำหนด:

```text
Monday
18:00 - 21:00

Tuesday
18:00 - 21:00

Wednesday
Unavailable
```

Player เห็นเฉพาะ Slot ที่ว่าง

---

# 18. Coach Booking

## 18.1 Booking Flow

```text
Player
 ↓
Coach Profile
 ↓
เลือก Service
 ↓
เลือก Date
 ↓
เลือก Time
 ↓
Request
 ↓
Coach Accept / Reject
 ↓
Confirmed
```

สามารถต่อยอดให้ Coach Booking ใช้ Event และ Notification Engine เดียวกับ Facility Booking

## 18.2 Coach Payment Flow

### Payment Model

| หัวข้อ | รายละเอียด |
|---|---|
| Payment Method | Player โอนเงินตรงให้ Coach (เหมือน Facility Booking) |
| Payment Timing | หลัง Coach Accept Booking |
| Slip Upload | รองรับ (Optional ตามที่ Coach กำหนด) |
| Platform Commission | ไม่หัก (0%) ใน MVP |
| VAT | ไม่รวม (จัดการโดย Coach เอง) |

### Coach Booking Payment Flow

```text
Player ขอจอง
      ↓
Coach Accept
      ↓
ระบบแสดงข้อมูลชำระเงินของ Coach
      ↓
Player โอนเงิน / Upload Slip
      ↓
Coach ตรวจสอบ
      ↓
Booking Confirmed
      ↓
Training Session
      ↓
Completed
      ↓
Player Review
```

### Coach Cancellation Policy

| สถานการณ์ | ผล |
|---|---|
| Player ยกเลิกก่อน 24 ชม. | คืนเงินเต็ม (Manual) |
| Player ยกเลิกภายใน 24 ชม. | ไม่คืนเงิน |
| Coach ยกเลิกเอง | คืนเงินเต็มเสมอ |

---

# 19. Group & Matchmaking

## 19.1 Create Group

ข้อมูล:

- Sport
- Facility
- Date
- Time
- จำนวนผู้เล่น
- Skill Level
- ค่าใช้จ่าย
- รายละเอียด

ตัวอย่าง:

```text
Badminton
ABC Arena
24 Aug
18:00-20:00

ต้องการอีก 2 คน
Level: Intermediate
หารค่าสนามคนละ 150 บาท
```

## 19.2 Join Group

ผู้เล่นกด Join

ระบบ:

- ตรวจจำนวน
- ตรวจ Skill
- เพิ่มสมาชิก
- แจ้งสมาชิก
- Update Capacity

เมื่อครบ:

```text
Group Status = FULL
```

## 19.3 Group → Booking

สามารถเชื่อม Group เข้ากับ Booking

ทำให้กลุ่มหนึ่งสามารถอ้างอิง Booking จริงได้

### Group Booking Rules

| หัวข้อ | รายละเอียด |
|---|---|
| ผู้จอง | **ผู้สร้างก๊วน** เป็นผู้จองสนาม (จองให้ทั้งกลุ่ม) |
| การหารค่าสนาม | จัดการกันเองนอกระบบ (ระบบแสดงค่าใช้จ่ายต่อคน) |
| Deadline รวมคน | ผู้สร้างกำหนดเอง |
| คนไม่ครบ | ก๊วนยังเปิดรับสมัคร ไม่ Auto Cancel |
| Auto Cancel | ไม่มีใน MVP (ผู้สร้างยกเลิกเองได้) |

### Group Status Flow

```text
OPEN (รับสมัคร)
   ↓
สมาชิก Join
   ↓
FULL (ครบจำนวน)
   ↓
ผู้สร้างกด "จองสนาม"
   ↓
Booking Created (ใช้ Booking Engine เดียวกับ Online)
   ↓
Upload Slip / Approval Flow ตามปกติ
```

> **หมายเหตุ:** Group เป็นส่วน Social/Community — Booking เป็นส่วน Transaction  
> เมื่อ Group พร้อม ผู้สร้างจึงสร้าง Booking และดำเนินการชำระเงินตามปกติ

---

# 20. Tournament System

## 20.1 Create Tournament

ข้อมูล:

- Tournament Name
- Sport
- Category
- Date
- Facility
- Entry Fee
- Max Teams
- Registration Deadline
- Rules
- Prize
- Organizer

## 20.2 Tournament Category

ตัวอย่าง:

- Men's Singles
- Women's Singles
- Men's Doubles
- Women's Doubles
- Mixed Doubles

## 20.3 Registration

ผู้เล่น:

```text
Tournament
 ↓
Category
 ↓
Register
 ↓
Team / Player
 ↓
Payment
 ↓
Confirmed
```

---

# 21. Bracket Engine

รองรับ:

- Single Elimination
- Double Elimination
- Round Robin
- Group + Knockout

ตัวอย่าง Single Elimination:

```text
Quarter Final
 ├── Match 1 ──┐
 ├── Match 2 ──┤
                ├── Semi Final ──┐
 ├── Match 3 ──┤                 │
 └── Match 4 ──┘                 ├── Final
                                  │
 ─────────────────────────────────┘
```

ระบบสร้าง Match ต่อไปอัตโนมัติหลังบันทึกผล

---

# 22. Match Result

กรรมการ/Organizer สามารถกรอก:

- Score
- Winner
- Duration
- Notes

หลัง Submit:

```text
Match Result
      ↓
Winner
      ↓
Next Match
      ↓
Elo Update
      ↓
Leaderboard Update
```

---

# 23. Elo Rating

สูตร:

```text
R' = R + K(S - E)
```

เก็บ:

- Rating Before
- Rating After
- Opponent
- Match ID
- Tournament ID
- Sport
- Result

Leaderboard สามารถแสดง:

- National
- Province
- Facility
- Sport
- Monthly
- All Time

---

# 24. Review & Rating

Review จะเปิดได้เมื่อ Service Completed เท่านั้น

## Facility Review

- ความสะอาด
- พื้นสนาม
- ห้องน้ำ
- ที่จอดรถ
- บริการ

## Coach Review

- เทคนิค
- การสื่อสาร
- ความตรงเวลา
- ความคุ้มค่า

Review ต้องเชื่อมกับ:

```text
User
+
Booking
+
Entity
```

เพื่อป้องกัน Fake Review

---

# 25. Notification Center

ทุก Module ไม่ควรส่ง Notification โดยตรง

ใช้ Event Center กลาง

```text
Event
 ↓
Notification Center
 ├── Web
 ├── Sound
 ├── Popup
 ├── LINE
 └── Email
```

## 25.1 Web Realtime

ตัวอย่าง:

```text
Player Upload Slip
        ↓
Supabase Realtime
        ↓
Facility Dashboard
        ↓
Popup + Sound
```

## 25.2 LINE OA

ส่ง:

- Booking Created
- Booking Approved
- Booking Rejected
- Booking Cancelled
- Tournament
- Coach Booking

ใช้ Flex Message

## 25.3 Email

ใช้:

- Receipt
- Booking Confirmation
- Subscription
- Password Reset
- Approval
- Cancellation

สามารถใช้ Resend + React Email

## 25.4 Notification History

เก็บ:

- Notification ID
- User
- Event
- Channel
- Status
- Sent At
- Read At
- Error

Status:

- Pending
- Sent
- Delivered
- Read
- Failed

## 25.5 Notification Trigger Matrix

| Event | Receiver | Web | Sound | LINE | Email |
|---|---|---|---|---|---|
| Booking Created | Facility Owner | ✓ | ✓ | ✓ | ✗ |
| Slip Uploaded | Facility Owner | ✓ | ✓ | ✓ | ✗ |
| Booking Approved | Player | ✓ | ✗ | ✓ | ✓ |
| Booking Rejected | Player | ✓ | ✗ | ✓ | ✓ |
| Booking Cancelled | Player / Owner | ✓ | ✗ | ✓ | ✓ |
| Hold Expiring (5 min) | Player | ✓ | ✗ | ✗ | ✗ |
| Hold Expired | Player | ✓ | ✗ | ✗ | ✗ |
| Coach Booking Request | Coach | ✓ | ✓ | ✓ | ✗ |
| Coach Booking Confirmed | Player | ✓ | ✗ | ✓ | ✓ |
| Group Join | Group Creator | ✓ | ✗ | ✗ | ✗ |
| Group Full | Group Members | ✓ | ✗ | ✓ | ✗ |
| Tournament Registration | Organizer | ✓ | ✗ | ✗ | ✗ |
| Match Result | Participants | ✓ | ✗ | ✓ | ✗ |
| Low Stock Alert | Owner | ✓ | ✓ | ✗ | ✗ |
| Subscription Expiring | Owner / Coach | ✓ | ✗ | ✓ | ✓ |
| Subscription Expired | Owner / Coach | ✓ | ✗ | ✓ | ✓ |
| Facility Approved | Owner | ✓ | ✗ | ✓ | ✓ |
| Coach Approved | Coach | ✓ | ✗ | ✓ | ✓ |
| Password Reset | User | ✗ | ✗ | ✗ | ✓ |

---

# 26. Subscription Management

Admin สร้าง Package แบบ Dynamic

ตัวอย่าง:

```text
FACILITY STARTER

1 Branch
5 Courts
2 Staff
Basic Report

999 บาท / เดือน
```

หรือ:

```text
FACILITY PRO

Unlimited Branch
Unlimited Court
Unlimited Staff
Advanced Report
Tournament

1,999 บาท / เดือน
```

## Package Fields

- Name
- Description
- Price
- Billing Cycle
- Trial Days
- Max Branch
- Max Court
- Max Staff
- Feature Flags
- Status

Admin เปลี่ยนค่าได้โดยไม่ต้อง Deploy

---

# 27. Subscription Lifecycle

```text
Created
 ↓
Pending Payment
 ↓
Paid
 ↓
Active
 ↓
Renewal
 ↓
Active

หรือ

Active
 ↓
Expired
```

สถานะ:

- Pending
- Active
- Past Due
- Expired
- Cancelled
- Refunded

## 27.1 Subscription Enforcement

เมื่อ Subscription หมดอายุหรือเปลี่ยนสถานะ:

### Expiration Behavior

| ช่วงเวลา | พฤติกรรมระบบ |
|---|---|
| 7 วันก่อนหมดอายุ | แจ้งเตือนผ่าน Web + LINE + Email |
| 3 วันก่อนหมดอายุ | แจ้งเตือนอีกครั้ง |
| วันหมดอายุ | สถานะ → PAST_DUE |
| Grace Period (7 วัน) | ยังใช้งานได้ตามปกติ แต่แสดง Banner เตือน |
| หลัง Grace Period | สถานะ → EXPIRED |

### Expired Behavior

| สิ่งที่ยังใช้ได้ | สิ่งที่ถูกล็อค |
|---|---|
| ดูข้อมูลเดิม (Read-only) | สร้าง Booking ใหม่ |
| ดู Booking เก่า | เพิ่ม Court / Branch / Staff |
| ดู Report | POS / Inventory (Create) |
| ดู POS History | สร้าง Tournament |
| Renew Subscription | รับ Booking ใหม่จาก Player |

> **หลักการ:** Expired ไม่ลบข้อมูล — แค่จำกัดการสร้างข้อมูลใหม่ เพื่อจูงใจให้ Renew

### Downgrade Policy

| สถานการณ์ | พฤติกรรม |
|---|---|
| PRO → STARTER | มีผลเมื่อสิ้นรอบ Billing Cycle ปัจจุบัน |
| Branch/Court/Staff เกิน Limit | ไม่อนุญาต Downgrade — ต้องลดจำนวนก่อน |
| Cancel Subscription | Read-only เมื่อสิ้นรอบ |

---

# 28. Admin Dashboard

## 28.1 Overview

แสดง:

- Total Users
- Active Users
- Facilities
- Coaches
- Bookings
- Platform Revenue
- Pending Approvals
- Active Subscriptions

## 28.2 User Management

Admin สามารถ:

- Search
- View
- Suspend
- Activate
- Change Role
- Reset Status

## 28.3 Facility Approval

Flow:

```text
Application
 ↓
Pending
 ↓
Review Documents
 ↓
Review Facility
 ↓
Approve / Reject
 ↓
Active
```

## 28.4 Coach Approval

ตรวจ:

- Profile
- Certificate
- Experience
- Identity/Required Documents

สถานะ:

```text
Pending
Approved
Rejected
Suspended
```

---

# 29. Platform Analytics

## KPI

- MAU
- DAU
- Total Booking
- Completed Booking
- Cancellation Rate
- GMV / Facility Revenue Ready
- Subscription Revenue
- Active Facility
- Active Coach
- Active Player

## Facility Analytics

- Booking per day
- Court utilization
- Revenue
- POS sales
- Top products
- Peak hours

## Player Analytics

- Booking frequency
- Favorite sports
- Favorite facilities
- Elo progression

---

# 30. Reporting

## Daily Report

- จำนวน Booking
- รายได้ Court
- รายได้ POS
- Tournament Revenue
- จำนวนลูกค้า
- Cancellation

## Monthly Report

- Revenue
- Booking
- Court Utilization
- Product Sales
- Top Customers
- Peak Time

## Export

รองรับ:

- CSV
- Excel Ready
- PDF Ready

---

# 31. Audit Log

ทุก Action สำคัญต้องถูกบันทึก

ตัวอย่าง:

```text
Owner A
Approve Slip
Booking #BK00125
24 Aug 2026 18:22
```

ข้อมูล:

- User ID
- Action
- Entity
- Entity ID
- Before
- After
- IP
- User Agent
- Timestamp

ตัวอย่าง Event:

- LOGIN
- CREATE_BOOKING
- UPLOAD_SLIP
- APPROVE_SLIP
- REJECT_SLIP
- CANCEL_BOOKING
- CREATE_PRODUCT
- UPDATE_STOCK
- CHECKOUT
- APPROVE_FACILITY
- APPROVE_COACH
- CHANGE_SUBSCRIPTION

---

# 32. Multi-Tenant Architecture

หัวใจของ SaaS คือการแยกข้อมูลแต่ละ Organization

โครงสร้าง:

```text
Platform
│
├── Organization A
│   ├── Branch 1
│   ├── Branch 2
│   ├── Courts
│   ├── POS
│   └── Inventory
│
├── Organization B
│   ├── Branch 1
│   ├── Courts
│   ├── POS
│   └── Inventory
│
└── Organization C
```

ข้อมูลธุรกิจต้องมี:

```text
organization_id
branch_id
```

เพื่อป้องกันข้อมูลข้าม Tenant

---

# 33. RLS Security

Supabase PostgreSQL ใช้ Row Level Security

ตัวอย่าง Concept:

```text
User A
Organization A
      ↓
สามารถอ่านข้อมูล
Organization A

ไม่สามารถอ่าน
Organization B
```

RLS ต้องครอบคลุม:

- Booking
- Payment
- Slip
- POS
- Inventory
- Staff
- Reports
- Tournament
- Organization

---

# 34. Storage Architecture

แบ่ง Bucket:

| Bucket | Public |
|---|---|
| avatars | Yes |
| facility-images | Yes |
| coach-media | Yes |
| certificates | No |
| payment-slips | No |
| receipts | No |

ไฟล์ Sensitive ต้องใช้:

- Private Bucket
- Signed URL
- Storage Policy
- RLS/Role Verification

---

# 35. PDPA

ระบบต้องมี:

- Privacy Policy
- Terms of Service
- Consent Version
- Consent Timestamp
- GPS Consent
- Marketing Consent
- Data Access
- Data Deletion Ready

ข้อมูลที่ต้องคำนึงถึง:

- ชื่อ
- เบอร์โทร
- Email
- GPS
- รูปภาพ
- Slip
- Payment Information
- Certificate

---

# 36. Slip Verification Readiness

Version แรกสามารถตรวจสอบด้วยคน

แต่ Database ต้องเตรียมรองรับ API ในอนาคต

ตัวอย่าง:

```text
payment_slips
 ├── id
 ├── booking_id
 ├── image_url
 ├── amount
 ├── transferred_at
 ├── verification_status
 ├── verification_provider
 ├── verification_reference
 └── verified_at
```

อนาคตสามารถต่อ:

```text
Slip
 ↓
Slip Verification API
 ↓
Verified / Suspicious
 ↓
Facility Review
```

---

# 37. API Architecture

แบ่ง API ตาม Domain

```text
/api/auth
/api/users
/api/facilities
/api/branches
/api/courts
/api/bookings
/api/payments
/api/slips
/api/pos
/api/products
/api/inventory
/api/coaches
/api/groups
/api/tournaments
/api/elo
/api/reviews
/api/notifications
/api/subscriptions
/api/admin
```

Business Logic สำคัญไม่ควรอยู่เฉพาะ Client

ต้อง Validate Server-side

## 37.1 API Method Summary

| Endpoint | GET | POST | PUT/PATCH | DELETE | หมายเหตุ |
|---|---|---|---|---|---|
| /api/auth | ✗ | Login, Register | Reset Password | ✗ | Public |
| /api/users | List, Detail | ✗ | Update Profile | ✗ | Auth Required |
| /api/facilities | List, Detail, Search | Create | Update | ✗ | RLS |
| /api/branches | List by Org | Create | Update | Soft Delete | RLS |
| /api/courts | List by Branch | Create | Update, Block | Soft Delete | RLS |
| /api/bookings | List, Detail, History | Create, Walk-in | Update Status | Cancel | RLS |
| /api/payments | List by Booking | ✗ | Update Status | ✗ | RLS |
| /api/slips | View | Upload | Approve/Reject | ✗ | RLS + Signed URL |
| /api/pos | Sales List | Create Sale | ✗ | Void | RLS |
| /api/products | List, Detail | Create | Update | Soft Delete | RLS |
| /api/inventory | Stock View | ✗ | Movement | ✗ | RLS |
| /api/coaches | List, Detail | Create Profile | Update | ✗ | Auth |
| /api/groups | List, Detail | Create | Update, Join | Close | Auth |
| /api/tournaments | List, Detail | Create | Update | Cancel | RLS |
| /api/elo | View, Leaderboard | ✗ | ✗ | ✗ | Public (Read) |
| /api/reviews | List by Entity | Create | ✗ | Report | Auth |
| /api/notifications | List, Unread Count | Mark Read | ✗ | ✗ | Auth |
| /api/subscriptions | Current, Plans | Subscribe | ✗ | Cancel | Auth |
| /api/admin | Dashboard, Users | Approve | Update Config | ✗ | Admin Only |

### Response Format

```text
{
  "success": true/false,
  "data": { ... },
  "error": { "code": "...", "message": "..." },
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### HTTP Status Codes

| Code | ความหมาย |
|---|---|
| 200 | สำเร็จ |
| 201 | สร้างสำเร็จ |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (เช่น Booking ซ้อนเวลา) |
| 429 | Rate Limited |
| 500 | Server Error |

---

# 38. Realtime Events

ตัวอย่าง:

| Event | Receiver |
|---|---|
| booking.created | Facility |
| slip.uploaded | Facility |
| booking.approved | Player |
| booking.rejected | Player |
| booking.cancelled | Player |
| stock.low | Owner |
| tournament.updated | Participants |
| coach.booking.created | Coach |

---

# 39. Tech Stack

| ส่วนประกอบ | เทคโนโลยี | วัตถุประสงค์ |
|---|---|---|
| UX/UI | Figma | Wireframe / Prototype |
| Frontend | Next.js | Web Application |
| UI | React | Component |
| Language | TypeScript | Type Safety |
| Styling | Tailwind CSS | Responsive UI |
| Component | Material UI V6 | Complex UI |
| Backend | Supabase | Backend Platform |
| Database | PostgreSQL | Relational DB |
| Auth | Supabase Auth | Authentication |
| Realtime | Supabase Realtime | Live Event |
| Storage | Supabase Storage | File |
| Functions | Edge Functions | Server Logic |
| Deployment | Vercel | Hosting |
| Version Control | Git | Source Control |
| Email | Resend | Transactional Email |
| Email Template | React Email | Email UI |
| Messaging | LINE Messaging API | Notification |
| Payment | Payment Gateway | Subscription |

---

# 40. Database Scope

คาดการณ์ประมาณ 40+ ตาราง

## Identity

```text
users
profiles
user_roles
consents
sessions
```

## Organization

```text
organizations
organization_members
branches
facilities
courts
amenities
facility_amenities
```

## Booking

```text
bookings
booking_items
booking_status_logs
booking_cancellations
court_blocks
payments
payment_slips
```

## POS

```text
products
product_categories
sales
sale_items
pos_payments
```

> **หมายเหตุ:** ใช้ `pos_payments` แทน `payments` เพื่อไม่ซ้ำกับตาราง `payments` ในกลุ่ม Booking

## Inventory

```text
inventory
stock_movements
suppliers
stock_transfers
```

## Coach

```text
coach_profiles
coach_certificates
coach_media
coach_services
coach_schedules
coach_bookings
```

## Community

```text
groups
group_members
group_posts
```

## Tournament

```text
tournaments
tournament_categories
tournament_registrations
teams
team_members
matches
brackets
match_results
elo_ratings
elo_history
```

## Review

```text
facility_reviews
coach_reviews
review_reports
```

## Platform

```text
subscription_plans
subscriptions
subscription_payments
notifications
notification_logs
audit_logs
```

---

# 41. Data Relationship หลัก

```text
USER
 │
 ├── PLAYER
 │
 ├── COACH
 │     └── COACH SERVICES
 │
 └── ORGANIZATION MEMBER
        │
        └── ORGANIZATION
              │
              ├── BRANCH
              │     ├── COURT
              │     │     └── BOOKING
              │     │            ├── PAYMENT
              │     │            ├── SLIP
              │     │            └── REVIEW
              │     │
              │     ├── POS
              │     │     └── SALES
              │     │            └── INVENTORY
              │     │
              │     └── TOURNAMENT
              │            └── MATCH
              │                  └── ELO
              │
              └── REPORTS
```

---

# 42. UX/UI Scope

## Player

Mobile First

หลักการ:

- Bottom Navigation
- Thumb Friendly
- Search First
- Booking Fast
- Minimal Steps
- Responsive
- Dark Mode Ready

Navigation:

```text
Home
Search
Bookings
Community
Profile
```

## Facility

Desktop First

Navigation:

```text
Dashboard
Calendar
Bookings
POS
Inventory
Tournament
Reports
Staff
Settings
```

## Coach

```text
Dashboard
Profile
Bookings
Schedule
Services
Reviews
Settings
```

## Admin

```text
Dashboard
Users
Facilities
Coaches
Subscriptions
Analytics
Audit Logs
Settings
```

---

> **หมายเหตุ:** รายละเอียดใบเสร็จและ Thermal Print ดูที่ Section 15 (Receipt & Thermal Printer)

---

# 44. Development Sprint

> **Total Project Duration:** ประมาณ 28-35 สัปดาห์ (7 Sprints x 4-5 สัปดาห์/Sprint)

| Sprint | ชื่อ | Duration | Dependencies |
|---|---|---|---|
| 1 | System Foundation | 4 สัปดาห์ | — |
| 2 | UI/UX Design | 4 สัปดาห์ | Sprint 1 (ทำคู่ขนานได้) |
| 3 | Booking Core | 5 สัปดาห์ | Sprint 1 |
| 4 | POS & Inventory | 4 สัปดาห์ | Sprint 1, Sprint 3 |
| 5 | Subscription & Notification | 4 สัปดาห์ | Sprint 1 |
| 6 | Community & Tournament | 4 สัปดาห์ | Sprint 3 |
| 7 | Admin & Launch | 4 สัปดาห์ | Sprint 1-6 |

> Sprint 2 (UI/UX) สามารถทำคู่ขนานกับ Sprint 3 ได้

## Sprint 1 — System Foundation (4 สัปดาห์)

### Scope

- Architecture
- ER Diagram
- Database
- Auth
- Role
- Multi Tenant
- RLS
- Storage
- Base UI

### Output

ระบบ Login + Role + Database Foundation

---

## Sprint 2 — UI/UX (4 สัปดาห์)

### Scope

Figma:

- Design System
- Player
- Facility
- Coach
- Admin
- POS
- Calendar
- Responsive

### Output

Interactive Prototype

---

## Sprint 3 — Booking Core (5 สัปดาห์)

### Scope

- Facility Search
- Facility Detail
- Court
- Availability
- Booking
- Hold
- Slip
- Approval
- Calendar

### Output

สามารถจองสนามจริงได้

---

## Sprint 4 — POS & Inventory (4 สัปดาห์)

### Scope

- POS
- Product
- Category
- Inventory
- Stock Movement
- Checkout
- Receipt
- Reports

### Output

Facility สามารถบริหารหน้าร้านได้

---

## Sprint 5 — Subscription & Notification (4 สัปดาห์)

### Scope

- Subscription
- Package
- Payment Gateway
- Web Realtime
- Sound
- Popup
- LINE OA
- Email

### Output

ระบบ SaaS และ Automation

---

## Sprint 6 — Community & Tournament (4 สัปดาห์)

### Scope

- Group
- Matchmaking
- Coach
- Tournament
- Bracket
- Match Result
- Elo
- Leaderboard
- Review

### Output

Sports Ecosystem

---

## Sprint 7 — Admin & Launch (4 สัปดาห์)

### Scope

- Admin Dashboard
- Analytics
- Approval
- Audit Logs
- Security
- UAT
- Performance
- Bug Fix
- Production Deployment

### Output

Production-Ready Platform

---

# 45. MVP Scope

ฟีเจอร์ที่ต้องมีใน MVP:

- Authentication
- Player
- Facility
- Facility Search
- GPS
- Court
- Availability
- Booking
- Payment Slip
- Approval
- Calendar
- POS
- Inventory
- Receipt
- Subscription
- Admin
- Basic Notification
- Basic Report
- RLS
- Multi Tenant

---

# 46. Phase 2

ฟีเจอร์ต่อยอด:

- LINE Login
- Coach Marketplace เต็มรูปแบบ
- Tournament
- Bracket หลายรูปแบบ
- Elo
- National Leaderboard
- Community Feed
- Advanced Analytics
- Slip Verification API
- Advanced Promotion
- Coupon
- Membership
- Loyalty Program

---

# 47. Future Scope ที่ไม่รวม MVP

เพื่อควบคุม Scope ไม่ให้บานปลาย

- Native iOS
- Native Android
- Wallet
- Escrow
- Auto Refund
- AI วิเคราะห์ฟอร์ม
- Live Streaming
- Accounting ERP
- Payroll
- IoT เปิดไฟสนาม
- Hardware POS Integration แบบ Native
- Automated Slip Verification

ระบบ Architecture ต้องออกแบบให้สามารถเพิ่มสิ่งเหล่านี้ภายหลังได้โดยไม่ต้องรื้อ Core System

---

# 48. Business Rules สำคัญ

## Booking

ห้ามจอง Court ซ้อนเวลา

```text
Same Court
+
Same Date
+
Overlapping Time
=
Cannot Create Booking
```

## Review

Review ได้เมื่อ:

```text
Booking Status = COMPLETED
```

## POS

Stock ลดเมื่อ:

```text
Sale Status = COMPLETED
```

ไม่ลดตอน Cart

## Subscription

Feature ต้องตรวจจาก:

```text
Active Subscription
+
Feature Flag
+
Usage Limit
```

## Organization

User ต้องเป็น Member ของ Organization ก่อนจึงเข้าถึงข้อมูลธุรกิจ

## Slip

Player เห็นเฉพาะ Slip ของตัวเอง

Facility เห็นเฉพาะ Slip ของ Booking ใน Organization ของตัวเอง

Admin เห็นตาม Permission

---

# 49. Error Handling

ทุกระบบต้องรองรับ:

- Network Error
- Duplicate Request
- Expired Session
- Unauthorized
- Forbidden
- Invalid Input
- Payment Failed
- Upload Failed
- Realtime Disconnect
- Booking Conflict

ต้องแสดงข้อความที่ User เข้าใจได้

ไม่แสดง Database Error ตรง ๆ

---

# 50. Performance Requirements

เป้าหมาย:

- Mobile First
- Lazy Load Image
- Pagination
- Database Index
- Server-side Query
- Caching Ready
- Optimistic UI เฉพาะจุดที่ปลอดภัย
- Realtime เฉพาะ Event ที่จำเป็น

ห้ามโหลดข้อมูลทั้งหมดของสนามมา Client โดยไม่จำเป็น

---

# 51. Security Requirements

ต้องมี:

- Authentication
- Authorization
- RLS
- Input Validation
- Server-side Validation
- Rate Limiting Ready
- Private Storage
- Signed URL
- Audit Log
- Secure Environment Variables
- HTTPS
- CSRF/XSS Protection ตาม Framework
- SQL Injection Protection ผ่าน ORM/Parameterized Query

---

# 52. Testing Scope

## Unit Test

ทดสอบ:

- Pricing
- Booking Availability
- Elo
- Inventory
- Subscription

## Integration Test

ทดสอบ:

```text
Booking
→ Payment
→ Slip
→ Approval
→ Notification
```

และ:

```text
POS
→ Sale
→ Inventory
→ Receipt
→ Report
```

## UAT

ทดสอบตาม Role:

- Player
- Coach
- Owner
- Staff
- Admin

---

# 53. Acceptance Criteria

ระบบถือว่า Feature เสร็จเมื่อ:

1. UI ทำงานตาม Flow
2. Database บันทึกถูกต้อง
3. Permission ถูกต้อง
4. RLS ทำงาน
5. Error Handling ครบ
6. Mobile/Desktop Responsive
7. Realtime ทำงานตาม Requirement
8. Audit Log ถูกบันทึก
9. UAT ผ่าน
10. ไม่มี Critical Bug

---

# 54. End-to-End Example

## Scenario 1 — Player จองสนาม

```text
Player Login
 ↓
ค้นหา Badminton
 ↓
เลือกสนาม
 ↓
ดู Court Availability
 ↓
เลือก Court 2
 ↓
18:00 - 20:00
 ↓
Create Booking
 ↓
HOLD
 ↓
แสดง QR
 ↓
โอนเงิน
 ↓
Upload Slip
 ↓
PENDING
 ↓
Facility ได้ Notification
 ↓
Owner เปิด Dashboard
 ↓
ตรวจ Slip
 ↓
Approve
 ↓
CONFIRMED
 ↓
Player ได้ LINE/Email
 ↓
Booking Calendar Update
 ↓
ถึงเวลา
 ↓
Check-in
 ↓
Playing
 ↓
Completed
 ↓
Player ได้สิทธิ์ Review
```

---

# 55. End-to-End Example — POS

```text
ลูกค้ามาถึงสนาม
 ↓
ค้นหา Booking
 ↓
Check-in
 ↓
เปิด POS
 ↓
เพิ่มน้ำ 2 ขวด
 ↓
เพิ่มลูกแบด
 ↓
เพิ่มรองเท้าเช่า
 ↓
รวมค่าคอร์ท
 ↓
Checkout
 ↓
Payment
 ↓
Sale Completed
 ↓
Inventory ลด
 ↓
สร้าง Receipt
 ↓
Report Update
```

---

# 56. End-to-End Example — Tournament

```text
Owner
 ↓
Create Tournament
 ↓
กำหนด Category
 ↓
เปิด Registration
 ↓
Player สมัคร
 ↓
Payment
 ↓
Registration Confirmed
 ↓
ปิดรับสมัคร
 ↓
Generate Bracket
 ↓
Match
 ↓
ใส่ Result
 ↓
Winner
 ↓
Next Match
 ↓
Elo Update
 ↓
Leaderboard Update
 ↓
Tournament Completed
```

---

# 57. End-to-End Example — Coach

```text
Player
 ↓
ค้นหา Coach
 ↓
ดู Profile
 ↓
เลือก Service
 ↓
ดู Schedule
 ↓
เลือกเวลา
 ↓
Request Booking
 ↓
Coach ได้ Notification
 ↓
Accept
 ↓
Confirmed
 ↓
Training
 ↓
Completed
 ↓
Review
```

---

# 58. Platform Architecture Summary

```text
                     NEXT.JS APPLICATION
                            │
            ┌───────────────┼───────────────┐
            │               │               │
         PLAYER          FACILITY         ADMIN
            │               │               │
         COACH          POS / SaaS       CONTROL
            │               │               │
            └───────────────┼───────────────┘
                            │
                     DOMAIN SERVICES
                            │
       ┌──────────┬─────────┼─────────┬──────────┐
       │          │         │         │          │
    Booking     Payment     POS    Tournament   Coach
       │          │         │         │          │
       └──────────┴─────────┼─────────┴──────────┘
                            │
                    SUPABASE PLATFORM
                            │
       ┌──────────┬─────────┼─────────┬──────────┐
       │          │         │         │          │
   PostgreSQL    Auth    Realtime   Storage   Functions
       │
      RLS
       │
    Multi Tenant
       │
       ▼
    ORGANIZATION
       │
     BRANCH
       │
     COURT
       │
    BOOKING
       │
 ┌─────┼───────────┐
 │     │           │
POS  Payment     Review
 │
Inventory
 │
Reports
```

---

# 59. สรุป Product Structure

ระบบทั้งหมดสามารถมองเป็น 4 Layer

## Layer 1 — Marketplace

```text
Player
 ├── Search
 ├── Booking
 ├── Coach
 ├── Group
 ├── Tournament
 └── Review
```

## Layer 2 — Facility SaaS

```text
Facility
 ├── Calendar
 ├── Booking
 ├── POS
 ├── Inventory
 ├── Staff
 ├── Tournament
 └── Reports
```

## Layer 3 — Platform

```text
Platform
 ├── Subscription
 ├── Payment
 ├── Approval
 ├── Analytics
 ├── Notification
 └── Audit
```

## Layer 4 — Core Infrastructure

```text
Supabase
 ├── Auth
 ├── PostgreSQL
 ├── RLS
 ├── Storage
 ├── Realtime
 └── Edge Functions
```

---

# 60. Final Product Flow

```text
                    SPORTS HUB
                         │
                         ▼
                 ┌───────────────┐
                 │     USER      │
                 └───────┬───────┘
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          PLAYER       COACH       OWNER
             │           │           │
             └───────────┼───────────┘
                         ▼
                  SPORTS PLATFORM
                         │
       ┌─────────────────┼──────────────────┐
       ▼                 ▼                  ▼
   MARKETPLACE       BOOKING             COMMUNITY
       │                 │                  │
       │                 ▼                  │
       │             PAYMENT                │
       │                 │                  │
       │                 ▼                  │
       │            FACILITY                │
       │                 │                  │
       │          ┌──────┼──────┐           │
       │          ▼      ▼      ▼           │
       │         POS   COURT  STOCK         │
       │          │      │      │           │
       │          └──────┼──────┘           │
       │                 ▼                  │
       │              REPORT                │
       │                                    │
       └────────────────┬───────────────────┘
                        ▼
                 TOURNAMENT / ELO
                        │
                        ▼
                  LEADERBOARD
                        │
                        ▼
                 NOTIFICATION
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
             WEB       LINE      EMAIL
```

---

# 61. Project Definition

Sports Hub & Facility Management Platform คือแพลตฟอร์มที่รวม:

> **Sports Marketplace + Court Booking + Facility SaaS + POS + Inventory + Coach Marketplace + Community + Tournament + Elo + Subscription + Notification**

โดยมีหลักการสำคัญคือ:

1. **Single Account**
2. **Multi Role**
3. **Multi Tenant**
4. **0% Booking Commission**
5. **Central Booking Engine**
6. **Integrated POS**
7. **Integrated Inventory**
8. **Real-time Notification**
9. **RLS Security**
10. **Subscription-based SaaS**
11. **Extensible Architecture**
12. **Marketplace + SaaS ใน Platform เดียว**

Architecture นี้ทำให้ระบบสามารถเริ่มจากสนามจำนวนไม่กี่แห่ง แล้วขยายเป็นแพลตฟอร์มหลายจังหวัดและหลายพัน Facility ได้โดยไม่จำเป็นต้องเปลี่ยน Core Architecture ใหม่ทั้งหมด

---

# 62. Definition of Done

Feature ใด ๆ จะถือว่าเสร็จสมบูรณ์เมื่อ:

- [ ] UI เสร็จตาม Design
- [ ] Responsive
- [ ] Database Schema พร้อม
- [ ] API/Server Logic พร้อม
- [ ] Validation พร้อม
- [ ] Authorization พร้อม
- [ ] RLS พร้อม
- [ ] Error Handling พร้อม
- [ ] Loading State พร้อม
- [ ] Empty State พร้อม
- [ ] Success State พร้อม
- [ ] Audit Log พร้อมใน Feature ที่เกี่ยวข้อง
- [ ] Notification พร้อมใน Event ที่เกี่ยวข้อง
- [ ] Unit Test ผ่าน
- [ ] Integration Test ผ่าน
- [ ] UAT ผ่าน
- [ ] ไม่มี Critical Bug
- [ ] Production Ready

---

# 63. Final Scope Statement

โครงการนี้มีเป้าหมายเพื่อพัฒนา Sports Hub ให้เป็นแพลตฟอร์มกลางด้านกีฬา โดยเชื่อมต่อ **Player, Coach, Facility Owner และ Platform Admin** ผ่านระบบบัญชีและฐานข้อมูลกลาง

หัวใจของระบบคือ **Booking Engine** ซึ่งเชื่อมต่อกับ Payment Slip, Facility Calendar, POS, Inventory, Review, Reporting และ Notification ทำให้ข้อมูลตั้งแต่การค้นหาสนามจนถึงการชำระเงิน การใช้บริการ และการรีวิวสามารถทำงานเป็น Workflow เดียวกัน

ในฝั่งธุรกิจ ระบบจะทำหน้าที่เป็น **B2B SaaS** ให้เจ้าของสนามบริหารกิจการ ขณะที่ฝั่งผู้เล่นทำหน้าที่เป็น **Marketplace** และ Community

รายได้ของแพลตฟอร์มมาจาก Subscription ของ Coach และ Facility Owner ขณะที่รายได้จากการจองสนามยังคงเป็นของ Facility โดยตรงตามแนวคิด **0% Booking Commission**

สถาปัตยกรรมถูกออกแบบเป็น **Multi-Tenant SaaS + Role-Based Access Control + PostgreSQL + RLS + Realtime** เพื่อรองรับการขยายจำนวนผู้ใช้งาน สนาม สาขา และธุรกิจในอนาคต

---

# 64. Glossary

| คำศัพท์ | ความหมาย |
|---|---|
| Hold | สถานะชั่วคราวเมื่อ Player เลือก Court แต่ยังไม่ชำระเงิน (15 นาที) |
| Elo Rating | ระบบจัดอันดับผู้เล่นตามผลการแข่งขัน สูตร R' = R + K(S - E) |
| RLS (Row Level Security) | กลไกของ PostgreSQL ที่จำกัดการเข้าถึงข้อมูลระดับแถว |
| Multi-Tenant | สถาปัตยกรรมที่แต่ละ Organization มีข้อมูลแยกกัน |
| Walk-in | ลูกค้าที่มาจองหน้าร้านโดยไม่ผ่านระบบ Online |
| Slip | รูปถ่ายหลักฐานการโอนเงินที่ Player อัปโหลด |
| POS (Point of Sale) | ระบบขายหน้าร้าน จัดการ Stock และออกใบเสร็จ |
| Booking Engine | Service กลางที่จัดการการจอง ตรวจสอบ Availability และสถานะ |
| Bracket | สายการแข่งขันที่สร้างอัตโนมัติหลังปิดรับสมัคร |
| SaaS (Software as a Service) | โมเดลธุรกิจเก็บค่าบริการรายเดือน |
| Grace Period | ช่วงเวลาผ่อนผันหลัง Subscription หมดอายุ (7 วัน) |
| Soft Delete | การลบข้อมูลโดยไม่ลบจริง ใช้ flag เช่น `deleted_at` |
| Edge Functions | Serverless Functions ของ Supabase สำหรับ Business Logic |
| PDPA | พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 |
| Signed URL | URL ที่มีลายเซ็นดิจิทัลสำหรับเข้าถึงไฟล์ Private แบบจำกัดเวลา |
| Flex Message | รูปแบบข้อความ LINE ที่ออกแบบ Layout ได้ |
| GMV (Gross Merchandise Value) | มูลค่ารวมของ Booking ทั้งหมดบนแพลตฟอร์ม |
| MAU / DAU | Monthly Active Users / Daily Active Users |

---

# 65. Assumptions & Constraints

## Assumptions (สมมติฐาน)

1. **Infrastructure:** ใช้ Supabase (Hosted) เป็น Backend หลัก ไม่ Self-host
2. **Payment:** MVP ใช้การโอนเงินผ่าน QR/Bank Transfer + Manual Slip Approval เท่านั้น ไม่เชื่อมกับ Payment Gateway ในเฟสแรก
3. **Notification:** LINE OA ต้องสมัครบัญชี LINE Official Account แยกต่างหาก
4. **Design:** Figma Design จะทำเสร็จก่อนเริ่ม Sprint 3 (Booking Core)
5. **User Base:** ระบบออกแบบรองรับ ≤ 10,000 Users และ ≤ 500 Facilities ใน Year 1
6. **Browser:** รองรับ Chrome, Safari, Firefox เวอร์ชันล่าสุดเท่านั้น
7. **Mobile:** เป็น Mobile-First Web App (PWA Ready) ไม่ใช่ Native App
8. **Language:** UI ภาษาไทยเป็นหลัก (Internationalization เป็น Phase 2)
9. **Currency:** ใช้สกุลเงินบาทเท่านั้น

## Constraints (ข้อจำกัด)

1. **Budget:** ต้องใช้ Supabase Free/Pro Plan ในช่วง MVP
2. **Storage:** Supabase Storage มี Limit ตาม Plan (ต้องวางแผน Image Compression)
3. **Realtime:** Supabase Realtime มี Connection Limit ตาม Plan
4. **LINE API:** ต้องมี LINE Official Account ที่ Verify แล้วจึงจะส่ง Push Message ได้
5. **Thermal Printer:** รองรับผ่าน Browser Print API เท่านั้น (ไม่มี Driver เฉพาะ)
6. **Team:** ต้องมี Developer ที่มีประสบการณ์ Next.js + Supabase อย่างน้อย 1 คน
7. **No Auto Refund:** MVP ไม่รองรับ Refund อัตโนมัติ ต้องดำเนินการ Manual

---

# 66. Risk Assessment

| # | ความเสี่ยง | ระดับ | ผลกระทบ | แผนรับมือ |
|---|---|---|---|---|
| 1 | Supabase Limit เกินแพลน | สูง | ระบบช้า / ไม่สามารถรับผู้ใช้เพิ่ม | Monitor Usage, เตรียม Upgrade Plan |
| 2 | Booking ซ้อนเวลา (Race Condition) | สูง | ลูกค้าจองซ้อนกัน | ใช้ Database Lock + Hold Timer |
| 3 | Slip ปลอม | กลาง | Facility เสียรายได้ | Manual Review + เตรียม Verification API |
| 4 | Realtime Connection Drop | กลาง | Facility ไม่ได้รับ Notification | Fallback เป็น Polling + LINE Notification |
| 5 | LINE OA ถูก Block | ต่ำ | ส่ง Notification ไม่ได้ | Fallback เป็น Email + Web Notification |
| 6 | Design ล่าช้า | กลาง | Development Sprint ถูกเลื่อน | Sprint 2 ทำคู่ขนานกับ Sprint 3 |
| 7 | Scope Creep | สูง | โปรเจกต์ล่าช้าเกินกำหนด | ยึด MVP Scope อย่างเคร่งครัด |
| 8 | Data Migration ในอนาคต | ต่ำ | ย้ายข้อมูลยาก | ออกแบบ Schema ให้ Extensible |
| 9 | Performance ช้าเมื่อข้อมูลเยอะ | กลาง | UX แย่ | Database Index + Pagination + Caching |
| 10 | PDPA Compliance | กลาง | โดนปรับ / ฟ้อง | เก็บ Consent + Data Deletion Ready |

---

# 67. Module Dependency Matrix

```text
Layer 0 (Foundation)
├── Auth & Account
├── Database Schema
├── RLS
├── Storage
└── Base UI Components

Layer 1 (Core - ต้อง Build หลัง Layer 0)
├── Facility Management (Organization, Branch, Court)
├── Booking Engine (ต้องมี Court ก่อน)
├── Payment Slip (ต้องมี Booking ก่อน)
└── Smart Calendar (ต้องมี Booking ก่อน)

Layer 2 (Operations - ต้อง Build หลัง Layer 1)
├── POS (ต้องมี Booking + Product)
├── Inventory (ต้องมี Product)
├── Walk-in (ต้องมี Booking Engine)
├── Receipt (ต้องมี POS + Booking)
└── Staff (ต้องมี Organization)

Layer 3 (Platform - ต้อง Build หลัง Layer 0)
├── Subscription (ต้องมี Auth + Payment)
├── Notification Center (ต้องมี Auth)
├── Admin Dashboard (ต้องมี Auth + Subscription)
└── Reporting (ต้องมี Booking + POS)

Layer 4 (Community - ต้อง Build หลัง Layer 1)
├── Coach Marketplace (ต้องมี Auth + Booking Engine)
├── Group / Matchmaking (ต้องมี Auth + Booking)
├── Tournament (ต้องมี Facility + Booking)
├── Bracket Engine (ต้องมี Tournament)
├── Elo Rating (ต้องมี Match Result)
├── Leaderboard (ต้องมี Elo)
└── Review (ต้องมี Booking Completed)
```

### Build Order Summary

| ลำดับ | Module | ขึ้นอยู่กับ |
|---|---|---|
| 1 | Auth & Account | — |
| 2 | Database & RLS | Auth |
| 3 | Organization & Court | Database |
| 4 | Booking Engine | Court |
| 5 | Payment Slip | Booking |
| 6 | Smart Calendar | Booking |
| 7 | POS & Inventory | Organization, Booking |
| 8 | Walk-in & Receipt | POS, Booking |
| 9 | Staff Management | Organization |
| 10 | Subscription | Auth |
| 11 | Notification Center | Auth |
| 12 | Coach Marketplace | Auth, Booking |
| 13 | Group & Matchmaking | Auth, Booking |
| 14 | Tournament & Bracket | Facility, Booking |
| 15 | Elo & Leaderboard | Tournament |
| 16 | Review & Rating | Booking |
| 17 | Admin Dashboard | All Modules |
| 18 | Reporting | Booking, POS |

---

# 68. Stakeholder Sign-off

| ลำดับ | บทบาท | ชื่อ | ลายเซ็น | วันที่ |
|---|---|---|---|---|
| 1 | Project Owner | _________________ | _________________ | ____/____/____ |
| 2 | Product Manager | _________________ | _________________ | ____/____/____ |
| 3 | Technical Lead | _________________ | _________________ | ____/____/____ |
| 4 | Senior BA | _________________ | _________________ | ____/____/____ |
| 5 | UX/UI Lead | _________________ | _________________ | ____/____/____ |

> เอกสารฉบับนี้ได้รับการตรวจสอบและอนุมัติโดยผู้มีส่วนเกี่ยวข้องข้างต้น การเปลี่ยนแปลงใด ๆ หลังจากนี้ต้องผ่านกระบวนการ Change Request

---

*End of Document — Sports Hub & Facility Management Platform SOW v1.1*


