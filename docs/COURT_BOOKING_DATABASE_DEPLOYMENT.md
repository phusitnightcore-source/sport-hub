# Court Booking — Database handoff

วันที่ 14 กันยายน 2026

## สถานะ

เตรียมโค้ดและ migration ไว้ใน repository เท่านั้น ยังไม่ได้ apply production หรือยืนยัน SQL บน PostgreSQL จริง ห้ามตีความผล TypeScript/unit tests เป็นผลทดสอบธุรกรรมฐานข้อมูล

ผลตรวจในเครื่อง: production build ผ่าน (รวม TypeScript และ 100 static pages), unit tests 106/106 ผ่าน, ESLint เฉพาะส่วนที่แก้ผ่าน การตรวจเหล่านี้ไม่รวม visual QA ใน browser หรือ PostgreSQL runtime

## สิ่งที่เพิ่ม

- งานหน้าสนาม: เช็กอิน → จบการใช้งาน และไม่มาตามนัดหลังหมดเวลาจอง แยกจากสถานะเงิน
- ประวัติการจัดการ 50 รายการล่าสุด พร้อมผู้ดำเนินการในฐานข้อมูลและเหตุผล
- เจ้าหน้าที่เลื่อนวันเวลาได้สำหรับการจอง confirmed ที่ยังไม่มา ตามนโยบายสนาม โดยคงสนาม ระยะเวลาและราคาก่อนส่วนลดเดิม
- การยกเลิกของลูกค้าและการตรวจสลิปจองทำใน transaction พร้อมล็อกการจองก่อนเปลี่ยน payment
- บิล POS ต้องคืนผ่าน POS ใบเสร็จเดิม ป้องกันการคืนเงินซ้ำจากหน้าลูกค้า
- เจ้าหน้าที่ต้องผ่านสิทธิ์และสาขาที่ได้รับมอบหมายทุกครั้ง ทั้งอ่านประวัติและเปลี่ยนสถานะ

## ลำดับ deploy

1. สำรองฐานข้อมูลและบันทึก migration history ของ production ก่อน ตรวจว่า project reference ตรงกับสนามที่ต้องการ
2. ทดสอบสำเนาข้อมูลใน staging ก่อน ห้ามใช้ seed-dev กับ production
3. ใช้ Supabase CLI ที่ล็อกอินแล้วรัน `supabase migration list` ตรวจรายการ local/remote ให้ตรง หากไม่ตรงให้ตรวจสาเหตุก่อน ห้าม repair history โดยเดา
4. รัน `supabase db push --dry-run` ตรวจรายการทั้งหมดที่จะ apply ไม่ใช่แค่ไฟล์ล่าสุด
5. ต้องมี migrations ก่อนหน้าทั้งหมด โดยเฉพาะ `20260913000000_pos_counter_operations.sql` และ `20260913000100_pos_booking_settlement.sql` ก่อน `20260914000000_booking_operations.sql` แล้วจึง `20260929000000_integrated_coach_court_flow.sql`
6. บน staging รัน `supabase db push` แล้วทำ UAT ด้านล่าง จากนั้นทำขั้นตอนเดียวกันบน production ภายใต้ maintenance window
7. Deploy แอปชุดนี้หลัง schema สำเร็จ เพราะหน้ารายการใช้ attendance_status และ API ใหม่เรียก RPC ใหม่ หากขาด migration ระบบจะแจ้งข้อมูลไม่พร้อม ไม่ย้อนกลับไปเขียนหลายคำสั่งแบบเดิม
8. ตรวจ error logs และทดสอบรายการใหม่หนึ่งรายการด้วยบัญชีทดสอบที่แยกจากลูกค้าจริง

ไม่มีการเพิ่มข้อมูลสนาม ลูกค้า หรือยอดเงินสมมติใน migration ตารางประวัติเดิมเริ่มว่าง ไม่สร้างประวัติย้อนหลังปลอม

## ตรวจหลัง apply

ใช้ SQL Editor ตรวจแบบอ่านอย่างเดียว:

```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='bookings'
and column_name in ('attendance_status','checked_in_at','completed_at');

select proname, has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in
('set_booking_attendance','cancel_guest_booking','verify_booking_payment','booking_operation_history','reschedule_booking');
```

ต้องพบ 3 columns และ 5 functions ทุก function ต้อง false / false / true ตามลำดับ

## UAT ที่ต้องผ่านก่อนเปิดจริง

- ลูกค้าจองว่าง → ส่งสลิป → เจ้าหน้าที่สาขาเดียวกันอนุมัติ → ใบเสร็จออกครั้งเดียว → เช็กอิน → จบการใช้งาน
- ไม่อนุญาตเช็กอิน booking ที่ไม่ confirmed, ผิดวัน หรือหมดเวลาแล้ว; ไม่มาตามนัดได้หลังเวลาสิ้นสุดเท่านั้น
- กดสถานะเดิมซ้ำไม่สร้าง event ซ้ำ; ไม่ย้อน completed/no_show กลับโดยไม่มีโฟลว์แก้ไข
- Staff คนละ tenant/ไม่มีสิทธิ์/ถูกพักงาน/คนละสาขา ต้องอ่านประวัติหรือเขียนไม่ได้
- ยกเลิกก่อนเริ่ม: ยังไม่จ่าย → cancelled; มี payment รอตรวจหรือ verified → awaiting_refund พร้อมค่าธรรมเนียมตามนโยบาย
- ตรวจสลิปและยกเลิกพร้อมกันจากสอง session: ต้องไม่มี confirmed ที่ payment รอคืนจาก race
- ชำระ POS → การยกเลิกหน้าลูกค้าถูกปฏิเสธ → คืนจากบิล POS ตามเงื่อนไขกะเดิม
- เลื่อนเข้า slot ว่าง ราคาเท่าเดิม; slot ชน booking ถูกปฏิเสธโดย exclusion constraint; ปิดสนาม/ช่วงบล็อก/พ้น deadline/ราคาเปลี่ยน ต้องปฏิเสธ
- ทดสอบสร้าง block พร้อมเลื่อนจองจากสอง session: trigger ใหม่ล็อกสนามร่วมกับ reschedule และปฏิเสธ block ทับการจอง ต้องยืนยันผล concurrency บน PostgreSQL จริง
- ทดสอบ dark/light, มือถือ, แป้นพิมพ์, dialog, เน็ตหลุดขณะบันทึก และ refresh ก่อนกดซ้ำ
- Regression: POS สินค้า/สต็อก/ใบเสร็จ/คืนเงิน, membership verification, รายงานไม่บวกรายได้ค่าสนามซ้ำ

## ข้อจำกัดที่ยังต้องทราบ

- เลื่อนข้ามสนาม/สาขา เปลี่ยนระยะเวลาหรือราคา และคืนเงินส่วนต่างอัตโนมัติ ไม่รองรับในรอบนี้ ให้จองใหม่และใช้โฟลว์คืนเงินเดิม
- การแก้ attendance ที่บันทึกผิดยังไม่มี UI ย้อนสถานะ ต้องมีขั้นตอนผู้ดูแลตรวจสอบและบันทึกเหตุผลก่อนแก้ข้อมูล
- ประวัติแสดงเฉพาะ operations ใหม่ ไม่ใช่ timeline รวมทุก event เก่าและทุก integration
- ยังไม่มีการยืนยัน UAT ด้วยบัญชีจริง, SQL concurrency tests และภาพ UI จริงในสภาพแวดล้อมนี้
- หาก deploy แอปล้มเหลว ให้ rollback แอปไปชุดก่อนหน้าได้โดยเก็บ schema แบบ additive นี้ไว้ ห้าม drop ตารางประวัติหรือคอลัมน์เพื่อล้างผลทดสอบบน production
