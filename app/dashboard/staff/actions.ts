"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const staffSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อพนักงาน"),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  phone: z.string().optional(),
  multi_branch_access: z.boolean().default(false),
  branch_ids: z.array(z.string().uuid()).default([]),
  extra_permissions: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function createStaff(formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx || ctx.role !== "venue_admin") {
    return { error: "เฉพาะผู้ดูแลสนามเท่านั้นที่จัดการพนักงานได้" };
  }

  const multi_branch_access = formData.get("multi_branch_access") === "true";
  const branch_ids = formData.getAll("branch_ids") as string[];
  const extra_permissions = formData.getAll("extra_permissions") as string[];

  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    status: formData.get("status") || "active",
    multi_branch_access,
    branch_ids,
    extra_permissions,
  };

  const parsed = staffSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // ใช้ admin client เพื่อสร้าง auth user + profile ให้ staff login ได้จริง (§26)
  const admin = createAdminClient();

  // กันอีเมลซ้ำ auth — ถ้ามี user เดิมและมี profile อยู่แล้ว ปฏิเสธ (1 user 1 profile)
  const { data: userList } = await admin.auth.admin.listUsers();
  if (userList.users.find((u) => u.email === parsed.data.email)) {
    return { error: "อีเมลนี้ถูกใช้ในระบบแล้ว" };
  }

  const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    console.error("Create staff auth error:", authErr);
    return { error: "ไม่สามารถสร้างบัญชีเข้าใช้งานได้" };
  }
  const userId = created.user.id;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    tenant_id: ctx.tenantId,
    role: "staff",
    full_name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(userId);
    console.error("Create staff profile error:", profileErr);
    return { error: "ไม่สามารถสร้างโปรไฟล์พนักงานได้" };
  }

  // Insert Staff (ผูก profile_id ให้ getStaffContext/เช็คอินหาเจอ)
  const { data: staff, error: staffError } = await admin
    .from("staff")
    .insert({
      tenant_id: ctx.tenantId,
      profile_id: userId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      multi_branch_access: parsed.data.multi_branch_access,
      extra_permissions: parsed.data.extra_permissions,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (staffError) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    console.error("Create staff error:", staffError);
    if (staffError.code === "23505") {
      return { error: "อีเมลนี้มีอยู่ในระบบแล้ว" };
    }
    return { error: "ไม่สามารถสร้างพนักงานได้" };
  }

  // Insert Branches Mapping
  if (!parsed.data.multi_branch_access && parsed.data.branch_ids.length > 0) {
    const branchMapping = parsed.data.branch_ids.map((branchId) => ({
      staff_id: staff.id,
      branch_id: branchId,
    }));
    const { error: mappingError } = await admin
      .from("staff_branches")
      .insert(branchMapping);
    if (mappingError) {
      console.error("Mapping branch error:", mappingError);
    }
  }

  await logAudit({
    tenantId: ctx.tenantId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "create",
    module: "staff",
    referenceId: staff.id,
    after: { name: parsed.data.name, email: parsed.data.email },
  });

  revalidatePath("/dashboard/staff");
  return { success: true, tempPassword };
}

export async function updateStaff(id: string, formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx) throw new Error("Unauthorized");

  const multi_branch_access = formData.get("multi_branch_access") === "true";
  const branch_ids = formData.getAll("branch_ids") as string[];
  const extra_permissions = formData.getAll("extra_permissions") as string[];

  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    status: formData.get("status") || "active",
    multi_branch_access,
    branch_ids,
    extra_permissions,
  };

  const parsed = staffSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Verify ownership
  const { data: currentStaff } = await supabase
    .from("staff")
    .select("tenant_id")
    .eq("id", id)
    .single();
    
  if (!currentStaff || currentStaff.tenant_id !== ctx.tenantId) {
    return { error: "ไม่มีสิทธิ์แก้ไขพนักงานนี้" };
  }

  // Update Staff
  const { error: updateError } = await supabase
    .from("staff")
    .update({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      multi_branch_access: parsed.data.multi_branch_access,
      extra_permissions: parsed.data.extra_permissions,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("Update staff error:", updateError);
    return { error: "ไม่สามารถแก้ไขข้อมูลพนักงานได้" };
  }

  // Handle Branches Mapping
  await supabase.from("staff_branches").delete().eq("staff_id", id);
  
  if (!parsed.data.multi_branch_access && parsed.data.branch_ids.length > 0) {
    const branchMapping = parsed.data.branch_ids.map(branchId => ({
      staff_id: id,
      branch_id: branchId,
    }));
    
    await supabase.from("staff_branches").insert(branchMapping);
  }

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${id}`);
  redirect("/dashboard/staff");
}

export async function toggleStaffStatus(id: string, status: "active" | "inactive") {
  const ctx = await getStaffContext();
  if (!ctx) throw new Error("Unauthorized");

  const supabase = await createClient();
  
  const { error } = await supabase
    .from("staff")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    return { error: "ไม่สามารถเปลี่ยนสถานะพนักงานได้" };
  }

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${id}`);
}
