"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOnlinePayment } from "@/lib/subscription";

export async function submitApplication(data: {
  tenantId: string;
  packageId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  healthInfo: string;
  emergencyName: string;
  emergencyPhone: string;
}) {
  const admin = createAdminClient();

  // Gate: สมัครสมาชิกออนไลน์ต้องเป็นแพลนที่รับชำระออนไลน์ (Growth+) — §5
  const gate = await requireOnlinePayment(
    admin,
    data.tenantId,
    "สนามนี้ยังไม่เปิดรับสมัครสมาชิกออนไลน์ กรุณาสมัครที่เคาน์เตอร์",
  );
  if (!gate.ok) return { success: false, error: gate.reason };

  // 1. Get package and tenant info
  const { data: pkg } = await admin
    .from("packages")
    .select("*, tenants(promptpay_id)")
    .eq("id", data.packageId)
    .single();

  if (!pkg || !pkg.tenants?.promptpay_id) {
    return { success: false, error: "แพ็กเกจหรือร้านค้าไม่พร้อมใช้งาน" };
  }

  // 2. We skip Auth creation for now to simplify, or we can use admin to create user.
  // Actually, we must use admin.auth.admin.createUser
  let userId: string;
  const tempPassword = Math.random().toString(36).slice(-10) + "A1!";

  // Check if user already exists
  const { data: existingUser } = await admin.auth.admin.listUsers();
  const foundUser = existingUser.users.find((u) => u.email === data.email);

  if (foundUser) {
    userId = foundUser.id;
    // Check if already a member of this tenant
    const { data: existingMember } = await admin
      .from("members")
      .select("id")
      .eq("tenant_id", data.tenantId)
      .eq("profile_id", userId)
      .single();
    if (existingMember) {
      return { success: false, error: "อีเมลนี้เป็นสมาชิกของสาขานี้แล้ว กรุณาเข้าสู่ระบบเพื่อต่ออายุ" };
    }
  } else {
    // Create new user
    const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (authErr || !newUser.user) return { success: false, error: authErr?.message };
    userId = newUser.user.id;
    
    // Create profile
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    await admin.from("profiles").insert({
      id: userId,
      tenant_id: data.tenantId,
      role: "member",
      full_name: fullName,
      display_name: fullName || data.email.split("@")[0],
      phone: data.phone,
      email: data.email,
    });
  }

  // 3. Create member record
  const memberNumber = `M-${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;
  
  const { data: newMember, error: memberErr } = await admin
    .from("members")
    .insert({
      tenant_id: data.tenantId,
      profile_id: userId,
      member_number: memberNumber,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      email: data.email,
      health_info: data.healthInfo,
      emergency_contact_name: data.emergencyName,
      emergency_contact_phone: data.emergencyPhone,
      package_id: data.packageId,
      status: "expired", // will be active after payment
      consent_given_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (memberErr) return { success: false, error: memberErr.message };

  // 4. Create payment record (B2C PromptPay) — amount เก็บเป็นบาท (numeric) ตาม schema
  //    ผูก member_id + package_id เพื่อให้ verify route เปิดใช้สมาชิกได้ (§34.2)
  //    QR สร้างที่หน้าชำระเงินจาก promptpay_id + amount ไม่ต้องเก็บ payload
  const { data: payment, error: paymentErr } = await admin
    .from("payments")
    .insert({
      tenant_id: data.tenantId,
      amount: pkg.price,
      status: "awaiting_verification",
      member_id: newMember.id,
      package_id: data.packageId,
    })
    .select("id")
    .single();

  if (paymentErr) return { success: false, error: paymentErr.message };

  return {
    success: true,
    paymentId: payment.id,
    tempPassword: foundUser ? undefined : tempPassword,
  };
}
