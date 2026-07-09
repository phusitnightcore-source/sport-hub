"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toSatang, satangToBahtString } from "@/lib/money";
import { redirect } from "next/navigation";

export async function createRenewalPayment(packageId: string, couponCode?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const admin = createAdminClient();

  // Get member info
  const { data: member } = await admin
    .from("members")
    .select("id, tenant_id")
    .eq("profile_id", user.id)
    .single();

  if (!member) return { success: false, error: "ไม่พบข้อมูลสมาชิก" };

  // Get package and tenant info
  const { data: pkg } = await admin
    .from("packages")
    .select("*, tenants(promptpay_id)")
    .eq("id", packageId)
    .eq("tenant_id", member.tenant_id)
    .single();

  if (!pkg || !pkg.tenants?.promptpay_id) {
    return { success: false, error: "แพ็กเกจหรือร้านค้าไม่พร้อมใช้งาน" };
  }

  // เงินคิดเป็นสตางค์ภายในเพื่อความแม่นยำ (§CLAUDE ข้อ 6) — amount เก็บเป็นบาท
  const priceSatang = toSatang(pkg.price);
  let payableSatang = priceSatang;
  let appliedCouponId: string | null = null;
  let discountSatang = 0;

  // Handle coupon (§13 — applicable_to = all/package เท่านั้นสำหรับค่าสมาชิก)
  if (couponCode) {
    const { data: coupon } = await admin
      .from("coupons")
      .select("*")
      .eq("tenant_id", member.tenant_id)
      .eq("code", couponCode.toUpperCase())
      .eq("status", "active")
      .single();

    if (!coupon) {
      return { success: false, error: "โค้ดส่วนลดไม่ถูกต้องหรือถูกยกเลิกแล้ว" };
    }

    const today = new Date().toISOString().split("T")[0];
    if (today < coupon.start_date || today > coupon.end_date) {
      return { success: false, error: "โค้ดส่วนลดนี้ไม่อยู่ในช่วงเวลาที่กำหนด" };
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { success: false, error: "โค้ดส่วนลดนี้ถูกใช้ครบจำนวนแล้ว" };
    }

    if (coupon.applicable_to !== "all" && coupon.applicable_to !== "package") {
      return { success: false, error: "โค้ดส่วนลดนี้ไม่สามารถใช้กับแพ็กเกจสมาชิกได้" };
    }

    if (priceSatang < toSatang(coupon.min_purchase)) {
      return { success: false, error: `โค้ดส่วนลดนี้ต้องมียอดซื้อขั้นต่ำ ${coupon.min_purchase} บาท` };
    }

    if (coupon.first_booking_only) {
      const { count } = await admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("member_id", member.id)
        .eq("status", "verified");

      if (count && count > 0) {
        return { success: false, error: "โค้ดส่วนลดนี้สำหรับลูกค้าใหม่เท่านั้น" };
      }
    }

    discountSatang =
      coupon.discount_type === "percent"
        ? Math.floor((priceSatang * coupon.discount_value) / 100)
        : toSatang(coupon.discount_value);
    if (discountSatang > priceSatang) discountSatang = priceSatang;

    payableSatang = priceSatang - discountSatang;
    appliedCouponId = coupon.id;
  }

  const { data: payment, error: paymentErr } = await admin
    .from("payments")
    .insert({
      tenant_id: member.tenant_id,
      amount: Number(satangToBahtString(payableSatang)),
      status: "awaiting_verification",
      member_id: member.id,
      package_id: packageId,
    })
    .select("id")
    .single();

  if (paymentErr) return { success: false, error: paymentErr.message };

  if (appliedCouponId) {
    await admin.from("coupon_usages").insert({
      coupon_id: appliedCouponId,
      tenant_id: member.tenant_id,
      member_id: member.id,
      discount_amount: Number(satangToBahtString(discountSatang)),
    });
    const { data: latestCoupon } = await admin
      .from("coupons")
      .select("usage_count")
      .eq("id", appliedCouponId)
      .single();
    if (latestCoupon) {
      await admin
        .from("coupons")
        .update({ usage_count: latestCoupon.usage_count + 1 })
        .eq("id", appliedCouponId);
    }
  }

  redirect(`/apply/${member.tenant_id}/payment/${payment.id}`);
}
