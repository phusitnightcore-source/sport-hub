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

// 4) ตั้ง promptpay_id ให้ tenant (จำเป็นต่อการสร้าง QR หน้าโอนเงิน)
await supabase
  .from("tenants")
  .update({ promptpay_id: "0800000000" })
  .eq("id", tenant.id);

// 5) สาขา + สนาม + ช่วง Peak (idempotent: หาแล้วค่อยสร้าง)
let { data: branch } = await supabase
  .from("branches")
  .select("id, name")
  .eq("tenant_id", tenant.id)
  .eq("name", "สาขาหลัก")
  .maybeSingle();
if (!branch) {
  const { data, error } = await supabase
    .from("branches")
    .insert({
      tenant_id: tenant.id,
      name: "สาขาหลัก",
      address: "123 ถ.นครสวรรค์ ต.ตลาด อ.เมือง มหาสารคาม",
      open_time: "08:00",
      close_time: "22:00",
    })
    .select("id, name")
    .single();
  if (error) throw error;
  branch = data;
  console.log("สร้าง branch:", branch.name);
} else {
  console.log("branch มีอยู่แล้ว:", branch.name);
}

let { data: court } = await supabase
  .from("courts")
  .select("id, name")
  .eq("tenant_id", tenant.id)
  .eq("name", "แบดมินตัน คอร์ท 1")
  .maybeSingle();
if (!court) {
  const { data, error } = await supabase
    .from("courts")
    .insert({
      tenant_id: tenant.id,
      branch_id: branch.id,
      name: "แบดมินตัน คอร์ท 1",
      type: "แบดมินตัน",
      price_standard: 150,
      price_peak: 220,
      open_time: "08:00",
      close_time: "22:00",
      free_cancel_hours: 24,
      cancel_fee_percent: 50,
    })
    .select("id, name")
    .single();
  if (error) throw error;
  court = data;
  console.log("สร้าง court:", court.name);

  // Peak: จันทร์-ศุกร์ 17:00-21:00 + เสาร์-อาทิตย์ทั้งวัน
  const windows = [
    ...[1, 2, 3, 4, 5].map((d) => ({
      court_id: court.id,
      tenant_id: tenant.id,
      day_of_week: d,
      start_time: "17:00",
      end_time: "21:00",
    })),
    ...[0, 6].map((d) => ({
      court_id: court.id,
      tenant_id: tenant.id,
      day_of_week: d,
      start_time: "08:00",
      end_time: "22:00",
    })),
  ];
  const { error: peakErr } = await supabase
    .from("court_peak_windows")
    .insert(windows);
  if (peakErr) throw peakErr;
  console.log("สร้าง peak windows 7 วัน");
} else {
  console.log("court มีอยู่แล้ว:", court.name);
}

// 6) Subscription trial ให้ tenant เดโม่ (จำเป็นหลังมี plan gating)
const { data: existingSub } = await supabase
  .from("subscriptions")
  .select("id")
  .eq("tenant_id", tenant.id)
  .maybeSingle();
if (!existingSub) {
  const { error } = await supabase.from("subscriptions").insert({
    tenant_id: tenant.id,
    plan: "growth",
    status: "trial",
    trial_start: new Date().toISOString(),
    trial_end: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  });
  if (error) throw error;
  console.log("สร้าง subscription trial ให้ tenant เดโม่");
} else {
  console.log("subscription มีอยู่แล้ว");
}

// 7) Super Admin ของทีม SportHub
const SUPER_EMAIL = "super@sporthub.dev";
const SUPER_PASSWORD = "SportHub-Super1234!";
let superId;
const { data: superCreated, error: superErr } =
  await supabase.auth.admin.createUser({
    email: SUPER_EMAIL,
    password: SUPER_PASSWORD,
    email_confirm: true,
  });
if (superErr) {
  if (!/already/i.test(superErr.message) && superErr.code !== "email_exists")
    throw superErr;
  const { data: list } = await supabase.auth.admin.listUsers();
  superId = list.users.find((u) => u.email === SUPER_EMAIL)?.id;
  console.log("super admin auth user มีอยู่แล้ว");
} else {
  superId = superCreated.user.id;
  console.log("สร้าง super admin:", SUPER_EMAIL);
}
const { error: superProfileErr } = await supabase.from("profiles").upsert({
  id: superId,
  tenant_id: null, // super_admin ไม่ผูก tenant
  role: "super_admin",
  full_name: "SportHub Super Admin",
  email: SUPER_EMAIL,
});
if (superProfileErr) throw superProfileErr;
console.log("super admin profile พร้อม");

console.log(`\nหน้าจองลูกค้า: /book/${tenant.id}`);
console.log(`หน้าสมัครสนามใหม่: /signup`);
console.log(`Login ทดสอบได้ที่ /login`);
console.log(`  venue admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
console.log(`  super admin: ${SUPER_EMAIL} / ${SUPER_PASSWORD}`);
