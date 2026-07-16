-- Kiosk / self check-in: token ต่อสาขา สำหรับหน้า check-in สาธารณะ (/checkin/[token])
-- ใช้ gen_random_uuid() (built-in) แทน gen_random_bytes (อยู่ใน schema extensions)
alter table branches add column if not exists kiosk_token text unique
  default replace(gen_random_uuid()::text, '-', '');

-- เติม token ให้สาขาที่มีอยู่แล้ว (ถ้ายังไม่มี)
update branches set kiosk_token = replace(gen_random_uuid()::text, '-', '')
  where kiosk_token is null;
