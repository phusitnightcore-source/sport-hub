// สร้าง test accounts ทุก role
// รัน: node --env-file=.env.local scripts/seed-dev.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("ต้องมี NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ========== CONFIG ==========
const PASSWORD = "Test1234!";

const TENANT_EMAIL = "admin@test.sporthub.dev";
const TENANT_NAME = "สนามทดสอบ SportHub";

const accounts = [
  { email: "super@test.sporthub.dev", role: "super_admin", fullName: "Super Admin ทดสอบ", tenantBound: false },
  { email: "admin@test.sporthub.dev", role: "venue_admin", fullName: "เจ้าของสนามทดสอบ", tenantBound: true },
  { email: "staff@test.sporthub.dev", role: "staff", fullName: "พนักงานทดสอบ", tenantBound: true },
  { email: "member@test.sporthub.dev", role: "member", fullName: "สมาชิกทดสอบ", tenantBound: true },
];

console.log("=".repeat(60));
console.log("  Creating Test Accounts for All Roles");
console.log("=".repeat(60));
console.log();

// 1) Create/find tenant
let { data: tenant } = await supabase
  .from("tenants")
  .select("id, name")
  .eq("email", TENANT_EMAIL)
  .maybeSingle();

if (!tenant) {
  const { data, error } = await supabase
    .from("tenants")
    .insert({
      name: TENANT_NAME,
      owner_name: "ผู้ดูแลทดสอบ",
      phone: "0900000000",
      email: TENANT_EMAIL,
      business_type: "both",
      status: "trial",
      promptpay_id: "0900000000",
    })
    .select("id, name")
    .single();
  if (error) throw error;
  tenant = data;
  console.log("✅ สร้าง tenant:", tenant.name);
} else {
  console.log("⬜ tenant มีอยู่แล้ว:", tenant.name);
}

// 2) Subscription trial
const { data: existingSub } = await supabase
  .from("subscriptions")
  .select("id")
  .eq("tenant_id", tenant.id)
  .maybeSingle();
if (!existingSub) {
  await supabase.from("subscriptions").insert({
    tenant_id: tenant.id,
    plan: "growth",
    status: "trial",
    trial_start: new Date().toISOString(),
    trial_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
  console.log("✅ สร้าง subscription trial (30 วัน)");
} else {
  console.log("⬜ subscription มีอยู่แล้ว");
}

// 3) Branch
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
      address: "99 ถ.ทดสอบ ต.ทดสอบ อ.เมือง",
      open_time: "08:00",
      close_time: "22:00",
    })
    .select("id, name")
    .single();
  if (error) throw error;
  branch = data;
  console.log("✅ สร้าง branch:", branch.name);
} else {
  console.log("⬜ branch มีอยู่แล้ว:", branch.name);
}

// 4) Court
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
  console.log("✅ สร้าง court:", court.name);

  // Peak windows
  const windows = [
    ...[1, 2, 3, 4, 5].map((d) => ({
      court_id: court.id, tenant_id: tenant.id, day_of_week: d,
      start_time: "17:00", end_time: "21:00",
    })),
    ...[0, 6].map((d) => ({
      court_id: court.id, tenant_id: tenant.id, day_of_week: d,
      start_time: "08:00", end_time: "22:00",
    })),
  ];
  await supabase.from("court_peak_windows").insert(windows);
  console.log("✅ สร้าง peak windows 7 วัน");
} else {
  console.log("⬜ court มีอยู่แล้ว:", court.name);
}

// 5) Create auth users + profiles for all roles
console.log();
console.log("-".repeat(60));
console.log("  Creating Auth Users & Profiles");
console.log("-".repeat(60));

for (const account of accounts) {
  // Auth user
  let userId;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: account.email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (createErr) {
    if (!/already/i.test(createErr.message) && createErr.code !== "email_exists") throw createErr;
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === account.email)?.id;
    if (!userId) throw new Error(`หา user ${account.email} ไม่เจอ`);
    // Update password
    await supabase.auth.admin.updateUserById(userId, { password: PASSWORD });
    console.log(`  ⬜ ${account.email} มีอยู่แล้ว (reset password)`);
  } else {
    userId = created.user.id;
    console.log(`  ✅ สร้าง auth user: ${account.email}`);
  }

  // Profile
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    tenant_id: account.tenantBound ? tenant.id : null,
    role: account.role,
    full_name: account.fullName,
    display_name: account.fullName,
    email: account.email,
  });
  if (profileErr) throw profileErr;
  console.log(`  ✅ profile: ${account.role} → ${account.fullName}`);

  // Staff record (for staff role)
  if (account.role === "staff") {
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("id")
      .eq("profile_id", userId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (!existingStaff) {
      const { data: staffRow, error: staffErr } = await supabase.from("staff").insert({
        tenant_id: tenant.id,
        profile_id: userId,
        name: account.fullName,
        email: account.email,
        phone: "0900000001",
        status: "active",
        multi_branch_access: true,
        extra_permissions: ["cancel_booking", "verify_slip", "confirm_refund", "use_pos", "manage_inventory"],
      }).select("id").single();
      if (staffErr) throw staffErr;
      console.log(`  ✅ staff record สร้างเรียบร้อย (POS + Inventory permissions)`);

      // Link staff to branch
      if (staffRow) {
        await supabase.from("staff_branches").upsert({
          staff_id: staffRow.id,
          branch_id: branch.id,
        });
        console.log(`  ✅ staff linked to branch: ${branch.name}`);
      }
    } else {
      console.log(`  ⬜ staff record มีอยู่แล้ว`);
    }
  }
}

console.log();
console.log("=".repeat(60));
console.log("  🎉 All Test Accounts Ready!");
console.log("=".repeat(60));
console.log();
console.log(`  Password สำหรับทุก account: ${PASSWORD}`);
console.log();
console.log("  ┌─────────────────┬─────────────────────────────┬──────────────┐");
console.log("  │ Role            │ Email                       │ Login Path   │");
console.log("  ├─────────────────┼─────────────────────────────┼──────────────┤");
console.log("  │ super_admin     │ super@test.sporthub.dev     │ /login       │");
console.log("  │ venue_admin     │ admin@test.sporthub.dev     │ /login       │");
console.log("  │ staff           │ staff@test.sporthub.dev     │ /login       │");
console.log("  │ member          │ member@test.sporthub.dev    │ /login       │");
console.log("  └─────────────────┴─────────────────────────────┴──────────────┘");
console.log();
console.log(`  หน้าจอง: /book/${tenant.id}`);
console.log(`  Dashboard: /dashboard`);
console.log(`  POS: /pos`);
console.log(`  Super Admin: /super-admin`);
