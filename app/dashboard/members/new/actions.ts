"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { notifyMemberSafely } from "@/lib/membership/notifications";
import { createMemberNumber } from "@/lib/membership/member-number";

export async function manualCreateMember(data: {
  packageId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  paymentMethod: "cash" | "transfer";
}) {
  const ctx = await getStaffContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();

  // 1. Get package info
  const { data: pkg } = await admin
    .from("packages")
    .select("*")
    .eq("id", data.packageId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!pkg) return { success: false, error: "แพ็กเกจไม่ถูกต้อง" };

  // 2. Auth creation
  let userId: string;
  const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
  let isNewUser = false;

  const { data: existingUser } = await admin.auth.admin.listUsers();
  const foundUser = existingUser.users.find((u) => u.email === data.email);

  if (foundUser) {
    userId = foundUser.id;
    const { data: existingMember } = await admin
      .from("members")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("profile_id", userId)
      .single();
    if (existingMember) {
      return { success: false, error: "อีเมลนี้เป็นสมาชิกของสาขานี้แล้ว" };
    }
  } else {
    isNewUser = true;
    const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
    });
    if (authErr || !newUser.user) return { success: false, error: authErr?.message };
    userId = newUser.user.id;
    
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    await admin.from("profiles").insert({
      id: userId,
      tenant_id: ctx.tenantId,
      role: "member",
      full_name: fullName,
      display_name: fullName || data.email.split("@")[0],
      phone: data.phone,
      email: data.email,
    });
  }

  // Calculate dates
  const startDate = new Date();
  let endDate = null;
  if (pkg.duration_days) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + pkg.duration_days);
  }

  // 3. Create member record
  const memberNumber = await createMemberNumber(admin, ctx.tenantId);
  
  const { data: newMember, error: memberErr } = await admin
    .from("members")
    .insert({
      tenant_id: ctx.tenantId,
      profile_id: userId,
      member_number: memberNumber,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      email: data.email,
      package_id: data.packageId,
      status: "active", // Active immediately for manual creation
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate ? endDate.toISOString().split("T")[0] : null,
      created_by: ctx.staffId,
    })
    .select()
    .single();

  if (memberErr) {
    if (isNewUser) await admin.auth.admin.deleteUser(userId);
    return { success: false, error: memberErr.message };
  }

  // 4. Create payment record (verified ทันทีสำหรับรับเงินหน้าเคาน์เตอร์ §8.2)
  //    ช่องทาง (เงินสด/โอน) บันทึกใน sender_name เพราะ payments ไม่มีคอลัมน์ method
  const { error: paymentErr } = await admin
    .from("payments")
    .insert({
      tenant_id: ctx.tenantId,
      amount: pkg.price,
      status: "verified",
      member_id: newMember.id,
      package_id: data.packageId,
      verified_by: ctx.staffId,
      verified_at: new Date().toISOString(),
      sender_name: data.paymentMethod === "cash" ? "เงินสด (หน้าเคาน์เตอร์)" : "โอน (หน้าเคาน์เตอร์)",
    });

  if (paymentErr) {
    await admin.from("members").delete().eq("id", newMember.id);
    if (isNewUser) await admin.auth.admin.deleteUser(userId);
    return { success: false, error: paymentErr.message };
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create",
    module: "members",
    referenceId: newMember.id,
    after: newMember,
  });

  await notifyMemberSafely({
    tenantId: ctx.tenantId,
    memberId: newMember.id,
    title: "เปิดใช้งานสมาชิกแล้ว",
    body: `ยินดีต้อนรับ ${data.firstName} หมายเลขสมาชิก ${memberNumber} แพ็กเกจ ${pkg.name}${endDate ? ` ใช้ได้ถึง ${endDate.toLocaleDateString("th-TH")}` : " ใช้งานได้ไม่จำกัดวัน"}`,
  });

  revalidatePath("/dashboard/members");

  return { 
    success: true, 
    tempPassword: isNewUser ? tempPassword : undefined
  };
}
