"use server";

import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCoupon(formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx?.tenantId) return { error: "Unauthorized" };

  const supabase = await createClient();

  const code = formData.get("code")?.toString().trim().toUpperCase();
  const name = formData.get("name")?.toString().trim();
  const discountType =
    formData.get("discount_type")?.toString() === "percent" ? "percent" : "fixed";
  const discountValue = parseFloat(formData.get("discount_value")?.toString() || "0");
  const minPurchase = parseFloat(formData.get("min_purchase")?.toString() || "0");
  const applicableTo = formData.get("applicable_to")?.toString() || "all";
  const startDate = formData.get("start_date")?.toString();
  const endDate = formData.get("end_date")?.toString();
  const usageLimitStr = formData.get("usage_limit")?.toString();
  const usageLimit = usageLimitStr ? parseInt(usageLimitStr) : null;
  const firstBookingOnly = formData.get("first_booking_only")?.toString() === "true";

  if (!code || !name || !discountType || !startDate || !endDate) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  const { error } = await supabase.from("coupons").insert({
    tenant_id: ctx.tenantId,
    code,
    name,
    discount_type: discountType,
    discount_value: discountValue,
    min_purchase: minPurchase,
    applicable_to: applicableTo,
    start_date: startDate,
    end_date: endDate,
    usage_limit: usageLimit,
    first_booking_only: firstBookingOnly,
    created_by: ctx.staffId,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "โค้ดส่วนลดนี้มีอยู่แล้วในระบบ" };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/coupons");
  return { success: true };
}

export async function updateCoupon(id: string, formData: FormData) {
  const ctx = await getStaffContext();
  if (!ctx?.tenantId) return { error: "Unauthorized" };

  const supabase = await createClient();

  const code = formData.get("code")?.toString().trim().toUpperCase();
  const name = formData.get("name")?.toString().trim();
  const discountType =
    formData.get("discount_type")?.toString() === "percent" ? "percent" : "fixed";
  const discountValue = parseFloat(formData.get("discount_value")?.toString() || "0");
  const minPurchase = parseFloat(formData.get("min_purchase")?.toString() || "0");
  const applicableTo = formData.get("applicable_to")?.toString() || "all";
  const startDate = formData.get("start_date")?.toString();
  const endDate = formData.get("end_date")?.toString();
  const usageLimitStr = formData.get("usage_limit")?.toString();
  const usageLimit = usageLimitStr ? parseInt(usageLimitStr) : null;
  const firstBookingOnly = formData.get("first_booking_only")?.toString() === "true";

  if (!code || !name || !discountType || !startDate || !endDate) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  const { error } = await supabase
    .from("coupons")
    .update({
      code,
      name,
      discount_type: discountType,
      discount_value: discountValue,
      min_purchase: minPurchase,
      applicable_to: applicableTo,
      start_date: startDate,
      end_date: endDate,
      usage_limit: usageLimit,
      first_booking_only: firstBookingOnly,
    })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) {
    if (error.code === "23505") {
      return { error: "โค้ดส่วนลดนี้มีอยู่แล้วในระบบ" };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/coupons");
  revalidatePath(`/dashboard/coupons/${id}`);
  return { success: true };
}

export async function toggleCouponStatus(id: string, currentStatus: string) {
  const ctx = await getStaffContext();
  if (!ctx?.tenantId) return { error: "Unauthorized" };

  const newStatus = currentStatus === "active" ? "inactive" : "active";

  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/coupons");
  revalidatePath(`/dashboard/coupons/${id}`);
  return { success: true };
}
