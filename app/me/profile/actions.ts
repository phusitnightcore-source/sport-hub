"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  fullName: z.string().trim().min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง")
    .or(z.literal("")),
});

// แก้ไขโปรไฟล์ผู้ใช้ทั่วไป (ชื่อ + เบอร์) — เฉพาะเจ้าของบัญชี
export async function updateProfile(input: {
  fullName: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("id", user.id);
  if (error) return { success: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };

  await logAudit({
    tenantId: null,
    actorId: user.id,
    actorRole: "member",
    action: "update",
    module: "user",
    referenceId: user.id,
  });

  revalidatePath("/me/profile");
  return { success: true };
}

// ยกเลิกการเชื่อมต่อ LINE
export async function disconnectLine(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "กรุณาเข้าสู่ระบบ" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ line_user_id: null })
    .eq("id", user.id);
  if (error) return { success: false, error: "ยกเลิกไม่สำเร็จ" };

  await logAudit({
    tenantId: null,
    actorId: user.id,
    actorRole: "member",
    action: "unlink_line",
    module: "user",
    referenceId: user.id,
  });

  revalidatePath("/me/profile");
  return { success: true };
}
