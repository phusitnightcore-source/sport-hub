-- ============================================================================
-- เพิ่มคอลัมน์ plan (structured) ให้ subscription_invoices
-- เพื่อเลิกเดาแพลนจากสตริง plan_name ตอนยืนยันรับชำระ (ปลอดภัย/ถูกต้องกว่า)
-- ============================================================================
alter table subscription_invoices
  add column if not exists plan plan_type;

-- Backfill row เดิมจาก plan_name (ชื่อขึ้นต้นด้วย Growth/Pro)
update subscription_invoices
   set plan = case
     when plan_name ilike 'Pro%'    then 'pro'::plan_type
     when plan_name ilike 'Growth%' then 'growth'::plan_type
     else plan
   end
 where plan is null;
