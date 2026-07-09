// Seed ข้อมูล dev ขั้นต่ำ: tenant ทดสอบ 1 แห่ง + venue_admin 1 คน
// รัน: node --env-file=.env.local scripts/seed-dev.mjs
// ใช้ service role — รันจากเครื่อง dev เท่านั้น ห้ามใช้กับ production จริง
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("ต้องมี NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@demo.sporthub.dev";
const ADMIN_PASSWORD = "SportHub-Dev1234!";

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) Tenant ทดสอบ (idempotent: หาแล้วค่อยสร้าง)
let { data: tenant } = await supabase
  .from("tenants")
  .select("id, name")
  .eq("email", ADMIN_EMAIL)
  .maybeSingle();

if (!tenant) {
  const { data, error } = await supabase
    .from("tenants")
    .insert({
      name: "สนามเดโม่ SportHub",
      owner_name: "ผู้ดูแลเดโม่",
      phone: "0800000000",
      email: ADMIN_EMAIL,
      business_type: "both",
      status: "trial",
    })
    .select("id, name")
    .single();
  if (error) throw error;
  tenant = data;
  console.log("สร้าง tenant:", tenant.name);
} else {
  console.log("tenant มีอยู่แล้ว:", tenant.name);
}

// 2) Auth user (venue_admin)
let userId;
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  email_confirm: true,
});

if (createErr) {
  if (!/already/i.test(createErr.message) && createErr.code !== "email_exists") throw createErr;
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  userId = list.users.find((u) => u.email === ADMIN_EMAIL)?.id;
  if (!userId) throw new Error("หา user เดิมไม่เจอ");
  console.log("auth user มีอยู่แล้ว");
} else {
  userId = created.user.id;
  console.log("สร้าง auth user:", ADMIN_EMAIL);
}

// 3) Profile ผูก role + tenant
const { error: profileErr } = await supabase.from("profiles").upsert({
  id: userId,
  tenant_id: tenant.id,
  role: "venue_admin",
  full_name: "ผู้ดูแลเดโม่",
  email: ADMIN_EMAIL,
});
if (profileErr) throw profileErr;
console.log("profile พร้อม (role: venue_admin)");

console.log(`\nLogin ทดสอบได้ที่ /login\n  email:    ${ADMIN_EMAIL}\n  password: ${ADMIN_PASSWORD}`);
