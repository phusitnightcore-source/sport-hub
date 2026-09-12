# Tournament Database Deployment Runbook

อัปเดต: 12 กันยายน 2569  
ขอบเขต: ระบบแข่งขันแบดมินตัน ตั้งแต่สมัครทีม–สลิป–ตรวจสิทธิ์–จัดสาย–บันทึกผล–Elo

เอกสารนี้เตรียมสิ่งที่ต้องทำกับ Supabase ให้ครบแล้ว ปัจจุบันยัง **ไม่ได้ apply ไป production** เพราะ Supabase project `uakhqdalxxoetxrzqlkr` อยู่สถานะ `INACTIVE`.

## สิ่งที่พร้อมในโค้ด

Flow ที่รองรับหลัง migration:

```text
สร้างรายการและประเภทแข่งขัน
  → สมัครทีม + แนบสลิป
  → ผู้จัดยืนยันค่าสมัคร / ตรวจระดับ / เช็กอิน
  → จัดสายแยกตามประเภท
  → แข่งขัน + คะแนนสด + จอใหญ่
  → ผู้ชนะและผู้แพ้เลื่อนเข้าสายที่กำหนด
  → Elo history + Leaderboard
```

รูปแบบสายแข่งขัน:

- Single Elimination พร้อม BYE, seed และชิงอันดับ 3
- Round Robin
- Group + Knockout: แบ่งกลุ่ม → บันทึกผลครบ → อันดับ 1–2 เข้ารอบน็อกเอาต์
- Double Elimination สำหรับ 4 หรือ 8 ทีม พร้อมสายผู้แพ้และ Grand Final

## Migration ที่ต้องมี

Migration ใช้ลำดับตามชื่อไฟล์ ห้ามเปลี่ยนชื่อหรือรันข้ามลำดับ

| ลำดับ | ไฟล์ | วัตถุประสงค์ |
|---|---|---|
| 1 | `20260709000000_init.sql` ถึง `20260826000000_sync_badminton_profiles.sql` | โครงสร้างหลัก, Auth/RLS, Storage, Booking และข้อมูลเชื่อมโยง |
| 2 | `20260827000000_tournament_manager_pro.sql` | Event, group, เกม และ rally ของทัวร์นาเมนต์ |
| 3 | `20260827000100_integrate_platform_schemas.sql` | เชื่อม profile, court, event และ Elo |
| 4 | `20260827000200_tournament_full_lifecycle.sql` | วันปิดรับ, ตรวจระดับ, เช็กอิน และผลแมตช์ |
| 5 | `20260827000300_match_game_rally_tracking.sql` | สถานะเกม/เสิร์ฟ/รับ และ view rally |
| 6 | `20260912000000_tournament_draw_integrity.sql` | ป้องกันสมัครเกิน, เส้นทางผู้ชนะ/ผู้แพ้ และชิงอันดับ 3 |
| 7 | `20260912000100_tournament_complete_operations.sql` | แยก Event ตาม Category, ข้อมูลอนุมัติสลิป และ audit ผลแข่ง |

สองไฟล์สุดท้ายคือส่วนที่เพิ่มสำหรับ Tournament flow รอบล่าสุด:

- [20260912000000_tournament_draw_integrity.sql](../supabase/migrations/20260912000000_tournament_draw_integrity.sql)
- [20260912000100_tournament_complete_operations.sql](../supabase/migrations/20260912000100_tournament_complete_operations.sql)

## ก่อน deploy

1. เปิด/Restore Supabase project `uakhqdalxxoetxrzqlkr` ให้เป็น `ACTIVE`.
2. ใน Supabase Dashboard สร้าง backup หรือยืนยันว่า Point-in-Time Recovery ใช้งานได้.
3. ตรวจว่าบัญชีที่ใช้ CLI มีสิทธิ์ Owner หรือ Database Admin ของ project.
4. ตรวจ Storage bucket `slips` ว่ามีอยู่และเป็น private; ระบบใช้ bucket นี้เก็บสลิปค่าสมัคร.
5. ตรวจ environment production อย่างน้อย `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, และ `SUPABASE_SERVICE_ROLE_KEY`.
6. อ่านผลต่าง migration ก่อน push ทุกครั้ง ห้ามใช้ `db reset` กับ production.

## คำสั่ง deploy

เปิด PowerShell ที่ root ของโปรเจกต์ แล้วรันตามลำดับ:

```powershell
# ตรวจว่า CLI เห็น project และสถานะเป็น ACTIVE
.\node_modules\.bin\supabase.cmd projects list

# ตรวจ migration ที่ local และ remote
.\node_modules\.bin\supabase.cmd migration list

# หาก CLI ไม่ได้ link อยู่แล้ว ให้ link ด้วย project ref นี้
.\node_modules\.bin\supabase.cmd link --project-ref uakhqdalxxoetxrzqlkr

# Apply เฉพาะ migration ที่ remote ยังไม่มี
.\node_modules\.bin\supabase.cmd db push

# ตรวจผลอีกครั้ง: Local และ Remote ต้องมี version เดียวกัน
.\node_modules\.bin\supabase.cmd migration list
```

หาก `migration list` รายงาน connection timeout หรือ `INACTIVE` ให้หยุดทันทีและเปิด project ใน Dashboard ก่อน อย่าพยายาม push ซ้ำ.

## ตรวจสอบหลัง deploy

รันใน SQL Editor ของ Supabase:

```sql
-- Trigger สำคัญต้องมีครบ
select tgname
from pg_trigger
where tgrelid in ('public.matches'::regclass, 'public.tournament_registrations'::regclass)
  and not tgisinternal
order by tgname;

-- คอลัมน์สำคัญของ flow ใหม่
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('matches', 'tournament_events', 'tournament_registrations')
  and column_name in (
    'category_id', 'loser_next_match_id', 'loser_next_match_slot',
    'duration_seconds', 'result_recorded_by', 'result_recorded_at',
    'payment_notes', 'payment_verified_by', 'payment_verified_at'
  )
order by table_name, column_name;

-- Storage bucket สำหรับสลิป
select id, public, file_size_limit
from storage.buckets
where id = 'slips';
```

ผลที่คาดหวัง:

- Trigger `before_tournament_registration`, `before_tournament_registration_team` และ `on_tournament_match_finished` ปรากฏ
- คอลัมน์ตาม query มีครบ
- bucket `slips` มีอยู่และ `public = false`

## UAT หลัง deploy

ใช้บัญชีจริงแยกอย่างน้อย 3 บทบาท: Player, Venue Admin และ Umpire

1. Venue Admin สร้างรายการ มีอย่างน้อย 2 Category และตั้งค่าสลิป/ตรวจระดับ.
2. Player สมัครสองทีมในคนละ Category พร้อมแนบสลิป.
3. Venue Admin ยืนยันค่าสมัคร, อนุมัติระดับ และเช็กอิน.
4. Venue Admin สุ่มจัดสาย; ตรวจว่าแต่ละ Category มี bracket แยกกัน.
5. ทดสอบ Single Elimination: บันทึกผลรอบแรกและยืนยันว่าผู้ชนะเข้าช่องที่ถูกต้อง.
6. ทดสอบชิงอันดับ 3: บันทึกผลรอบรองและยืนยันว่าผู้แพ้เข้าคู่ชิงอันดับ 3.
7. ทดสอบ Group + Knockout: บันทึกผลรอบกลุ่มให้ครบ แล้วกดสร้างน็อกเอาต์จากกลุ่ม.
8. Umpire เปิดแมตช์, กดคะแนนหลายแต้ม และเปิด `/display/{matchId}` บนจอใหญ่อีกหน้าต่างเพื่อตรวจคะแนนสด.
9. จบแมตช์และตรวจ `elo_history` ว่ามี rating ก่อน/หลัง, match และ tournament ครบ.
10. ทดสอบ Double Elimination ด้วย 4 ทีมและ 8 ทีม; ผู้แพ้ต้องตกเข้าสายผู้แพ้ ไม่หลุดจากรายการทันที.

## Rollback และข้อควรระวัง

- Migration ของ PostgreSQL ที่ apply แล้วไม่ควรลบจาก `supabase_migrations.schema_migrations`.
- หากพบปัญหา ให้หยุดรับสมัคร/การแข่งขันก่อน แล้วทำ migration แก้ไขฉบับใหม่แทนการแก้ไฟล์ migration ที่ apply ไปแล้ว.
- ก่อนแก้ schema production ให้ backup database เสมอ.
- การ push เป็น schema change ไม่ได้สร้างรายการแข่งหรือแก้ผลการแข่งขันเดิมโดยตรง.

## สถานะการตรวจโค้ดก่อน deploy

- TypeScript ผ่าน
- Unit tests ผ่าน 58 tests
- Production build ผ่าน
- ยังต้องทำ UAT กับ Supabase production หลัง project กลับมา `ACTIVE`
