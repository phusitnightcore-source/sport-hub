# Plan Gating Checklist (§5 / §26)

สิทธิ์ต่อแพลนอ่านจากตาราง `plan_entitlements` (Super Admin แก้ได้ที่ `/super-admin/plans`)
ค่าเริ่มต้น = `lib/entitlements.ts` `DEFAULT_ENTITLEMENTS`. helper: `getTenantEntitlements(client, tenantId)`.

## สิทธิ์ตามค่าเริ่มต้น

| Entitlement | Free | Growth | Pro | บังคับใช้ที่ |
|---|---|---|---|---|
| online_payment | ❌ | ✅ | ✅ | `POST /api/bookings` (จองออนไลน์) |
| monthly_booking_limit | 30 | ∞ | ∞ | `POST /api/bookings` |
| max_courts | 1 | ∞ | ∞ | สร้างสนาม (`checkCourtQuota`) |
| max_branches | 1 | ∞ | ∞ | สร้างสาขา |
| member_system | ❌ | ✅ | ✅ | `/dashboard/members`, `/dashboard/packages` → UpgradeLock |
| analytics | ❌ | ✅ | ✅ | `/dashboard/analytics` → UpgradeLock |
| export_reports | ❌ | ✅ | ✅ | ปุ่ม Export + `GET /api/admin/reports/export` (402) |
| guest_pass | ❌ | ❌ | ✅ | `/dashboard/guest-passes` → UpgradeLock |
| peak_pricing | ❌ | ✅ | ✅ | (คิดราคา peak ใน buildSlots — ตาม court config) |
| broadcast | ❌ | ✅ | ✅ | `/dashboard/broadcast` (BroadcastForm + action) |
| line_notify | ❌ | ✅ | ✅ | (dispatcher ส่ง LINE เมื่อ configured) |
| kiosk_mode | ❌ | ❌ | ✅ | `/checkin/[token]` (self check-in) + KioskLinkPanel |
| custom_domain | ❌ | ❌ | ✅ | (infra) |

หมายเหตุ: trial = ใช้สิทธิ์ Growth เต็ม (§4) / grace = สิทธิ์แพลนเดิมจนหมด grace / หมดอายุ → free ทันที
(`effectivePlan()` ใน lib/plans.ts)

## Checklist ทดสอบ (หลัง `supabase db push`)

**Free plan**
- [ ] `/dashboard/analytics` → เห็นหน้า UpgradeLock (🔒 + ปุ่มอัปเกรด)
- [ ] `/dashboard/members` และ `/dashboard/packages` → UpgradeLock
- [ ] `/dashboard/guest-passes` → UpgradeLock
- [ ] `/dashboard/reports` → เห็นสถิติ แต่ปุ่ม Export เป็นชิป "อัปเกรดแพลน"
- [ ] เรียก `/api/admin/reports/export?...` ตรง → 402
- [ ] จองออนไลน์ผ่าน `/book/[tenantId]` → 402 (Free ไม่มี online_payment)
- [ ] สร้างสนามที่ 2 → บล็อก (max_courts=1)

**Growth plan (หรือ trial)**
- [ ] analytics / members / packages / export → เข้าได้ปกติ
- [ ] guest-passes → ยัง UpgradeLock (Pro เท่านั้น)
- [ ] จองออนไลน์ + จองไม่จำกัด

**Pro plan**
- [ ] ทุกอย่างของ Growth + guest-passes เข้าได้

**Super Admin แก้สิทธิ์**
- [ ] เปิด `analytics` ให้ Free ที่ `/super-admin/plans` → Free เข้า analytics ได้ทันที (มีผลจริง)
