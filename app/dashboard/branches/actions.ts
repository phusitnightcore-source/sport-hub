"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { checkBranchQuota } from "@/lib/entitlements.server";

const branchSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อสาขา"),
  phone: z.string().optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  address: z.string().optional(),
  open_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "รูปแบบเวลาไม่ถูกต้อง (HH:mm)").optional(),
  close_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "รูปแบบเวลาไม่ถูกต้อง (HH:mm)").optional(),
  max_capacity: z.coerce.number().min(1).default(100),
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
});

export async function createBranch(formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx) throw new Error("Unauthorized");

  const data = Object.fromEntries(formData.entries());
  
  const parsed = branchSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Gate: เพดานจำนวนสาขาตามแพลน (Free = 1 สาขา) — §5
  const quota = await checkBranchQuota(supabase, ctx.tenantId);
  if (!quota.ok) return { error: quota.reason };

  const { error } = await supabase.from("branches").insert({
    tenant_id: ctx.tenantId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
    open_time: parsed.data.open_time || null,
    close_time: parsed.data.close_time || null,
    max_capacity: parsed.data.max_capacity,
    status: parsed.data.status,
  });

  if (error) {
    console.error("Create branch error:", error);
    return { error: "ไม่สามารถสร้างสาขาได้" };
  }

  revalidatePath("/dashboard/branches");
  redirect("/dashboard/branches");
}

export async function updateBranch(id: string, formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx) throw new Error("Unauthorized");

  const data = Object.fromEntries(formData.entries());
  
  const parsed = branchSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  
  // Verify tenant ownership
  const { data: branch } = await supabase
    .from("branches")
    .select("tenant_id")
    .eq("id", id)
    .single();
    
  if (!branch || branch.tenant_id !== ctx.tenantId) {
    return { error: "ไม่มีสิทธิ์แก้ไขสาขานี้" };
  }

  const { error } = await supabase
    .from("branches")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      open_time: parsed.data.open_time || null,
      close_time: parsed.data.close_time || null,
      max_capacity: parsed.data.max_capacity,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Update branch error:", error);
    return { error: "ไม่สามารถแก้ไขสาขาได้" };
  }

  revalidatePath("/dashboard/branches");
  revalidatePath(`/dashboard/branches/${id}`);
  redirect("/dashboard/branches");
}

export async function deleteBranch(id: string) {
  const ctx = await getStaffContext();
  if (!ctx) throw new Error("Unauthorized");

  const supabase = await createClient();
  
  // Verify ownership
  const { data: branch } = await supabase
    .from("branches")
    .select("tenant_id")
    .eq("id", id)
    .single();
    
  if (!branch || branch.tenant_id !== ctx.tenantId) {
    return { error: "ไม่มีสิทธิ์ลบสาขานี้" };
  }

  // Soft delete using status (or hard delete if preferred, but soft delete is safer)
  // Let's check if the database supports cascade delete. It does. But we should check if we want soft delete.
  // We will just do a hard delete for now since it cascades down to courts, or we can soft delete.
  // Actually, setting status to 'inactive' is safer to keep historical bookings.
  const { error } = await supabase
    .from("branches")
    .update({ status: "inactive" })
    .eq("id", id);

  if (error) {
    return { error: "ไม่สามารถลบสาขาได้ เนื่องจากอาจมีข้อมูลผูกพันอยู่" };
  }

  revalidatePath("/dashboard/branches");
  redirect("/dashboard/branches");
}
