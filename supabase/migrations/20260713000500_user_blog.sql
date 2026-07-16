-- ผู้ใช้ทั่วไปเขียนบทความได้ (community content) — ต้องผ่านการอนุมัติก่อนเผยแพร่
-- (กัน spam/เนื้อหาแย่ ที่กระทบ SEO และการอนุมัติ AdSense โดยตรง)

-- สถานะใหม่: รอตรวจ (PG15 รองรับ add value in transaction; ไม่ใช้ในไฟล์เดียวกัน)
alter type blog_status add value if not exists 'pending_review';

-- ผู้เขียน (โยงกับ profiles) — บทความของทีม SportHub author_id = null
alter table blog_posts add column if not exists author_id uuid references profiles(id) on delete set null;
create index if not exists idx_blog_posts_author on blog_posts (author_id);
