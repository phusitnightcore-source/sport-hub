"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffContext, hasPermission, type StaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUsePosBranch } from "@/lib/pos/access";

const productSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(100).optional(),
  sku: z.string().trim().max(80).optional(),
  barcode: z.string().trim().max(80).optional(),
  productType: z.enum(["product", "rental", "service"]),
  costPrice: z.number().min(0).max(1_000_000),
  sellingPrice: z.number().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(1_000_000),
  trackStock: z.boolean(),
  initialStock: z.number().int().min(0).max(1_000_000),
});

const movementSchema = z.object({
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  movementType: z.enum(["purchase", "return", "adjustment", "damage"]),
  quantityChange: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  note: z.string().trim().max(500).optional(),
});

async function canUseBranch(ctx: StaffContext, branchId: string) {
  return canUsePosBranch(ctx, branchId);
}

function canManageInventory(ctx: StaffContext | null) {
  return Boolean(ctx && hasPermission(ctx, "manage_inventory"));
}

export async function updateProduct(input: z.input<typeof productSchema> & { productId: string; isActive: boolean }) {
  const ctx = await getStaffContext();
  if (!ctx || !canManageInventory(ctx)) return { error: "ไม่มีสิทธิ์แก้ไขสินค้า" };
  const parsed = productSchema.extend({ productId: z.string().uuid(), isActive: z.boolean() }).safeParse(input);
  if (!parsed.success || !(await canUseBranch(ctx, parsed.data.branchId))) return { error: "ข้อมูลสินค้าไม่ถูกต้องหรือไม่มีสิทธิ์" };
  const p = parsed.data;
  const admin = createAdminClient();
  const { data: before } = await admin.from("products").select("id, name, selling_price, is_active, track_stock, product_type").eq("id", p.productId).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!before) return { error: "ไม่พบสินค้า" };
  let categoryId: string | null = null;
  if (p.category) {
    const { data, error } = await admin.from("product_categories").upsert({ tenant_id: ctx.tenantId, name: p.category }, { onConflict: "tenant_id,name" }).select("id").single();
    if (error || !data) return { error: "บันทึกหมวดสินค้าไม่สำเร็จ" };
    categoryId = data.id;
  }
  // Type/tracking remain fixed so historic movements and refunds keep their meaning.
  const { error } = await admin.from("products").update({ name: p.name, category_id: categoryId, sku: p.sku || null, barcode: p.barcode || null, cost_price: p.costPrice, selling_price: p.sellingPrice, low_stock_threshold: p.lowStockThreshold, is_active: p.isActive }).eq("id", p.productId).eq("tenant_id", ctx.tenantId);
  if (error) return { error: error.code === "23505" ? "SKU หรือบาร์โค้ดนี้มีแล้ว" : "แก้ไขสินค้าไม่สำเร็จ" };
  await logAudit({ tenantId: ctx.tenantId, actorId: ctx.userId, actorRole: ctx.role, action: "update_product", module: "inventory", referenceId: p.productId, before, after: { name: p.name, sellingPrice: p.sellingPrice, isActive: p.isActive } });
  revalidatePath("/dashboard/inventory"); revalidatePath("/pos");
  return { success: true };
}

export async function createProduct(input: z.input<typeof productSchema>) {
  const ctx = await getStaffContext();
  if (!canManageInventory(ctx)) return { error: "คุณไม่มีสิทธิ์จัดการคลังสินค้า" };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "ข้อมูลสินค้าไม่ถูกต้อง" };
  const product = parsed.data;
  if (!(await canUseBranch(ctx!, product.branchId))) return { error: "คุณไม่มีสิทธิ์ใช้งานสาขานี้" };

  const admin = createAdminClient();
  const { data: productId, error } = await admin.rpc("create_pos_product", {
    p_tenant_id: ctx!.tenantId, p_branch_id: product.branchId, p_staff_id: ctx!.staffId, p_product: product,
  });
  if (error || !productId) return { error: error?.code === "23505" ? "SKU หรือ Barcode นี้ถูกใช้งานแล้ว" : "เพิ่มสินค้าไม่สำเร็จ ตรวจสอบว่าระบบคลังสินค้าอัปเดตครบแล้ว" };
  const created = { id: productId };

  await logAudit({
    tenantId: ctx!.tenantId,
    actorId: ctx!.userId,
    actorRole: ctx!.role,
    action: "create_product",
    module: "inventory",
    referenceId: created.id,
    after: { name: product.name, branch_id: product.branchId, initial_stock: product.initialStock },
  });
  revalidatePath("/dashboard/inventory");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function recordStockMovement(input: z.input<typeof movementSchema>) {
  const ctx = await getStaffContext();
  if (!canManageInventory(ctx)) return { error: "คุณไม่มีสิทธิ์ปรับสต็อก" };
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return { error: "ข้อมูลการปรับสต็อกไม่ถูกต้อง" };
  const movement = parsed.data;
  if (!(await canUseBranch(ctx!, movement.branchId))) return { error: "คุณไม่มีสิทธิ์ใช้งานสาขานี้" };

  if (["purchase", "return"].includes(movement.movementType) && movement.quantityChange < 0) {
    return { error: "รายการรับเข้า/คืนสินค้าต้องระบุจำนวนบวก" };
  }
  if (movement.movementType === "damage" && movement.quantityChange > 0) {
    return { error: "รายการสินค้าเสียหายต้องระบุจำนวนลบ" };
  }

  const admin = createAdminClient();
  const { data: quantityAfter, error } = await admin.rpc("adjust_inventory", {
    p_tenant_id: ctx!.tenantId,
    p_branch_id: movement.branchId,
    p_product_id: movement.productId,
    p_quantity_change: movement.quantityChange,
    p_movement_type: movement.movementType,
    p_note: movement.note || null,
    p_created_by: ctx!.staffId,
    p_sale_id: null,
  });
  if (error) {
    console.error("stock movement failed:", error);
    return { error: error.message.includes("สต็อกคงเหลือไม่เพียงพอ") ? "สต็อกคงเหลือไม่เพียงพอ" : "ไม่สามารถปรับสต็อกได้" };
  }

  await logAudit({
    tenantId: ctx!.tenantId,
    actorId: ctx!.userId,
    actorRole: ctx!.role,
    action: "adjust_inventory",
    module: "inventory",
    referenceId: movement.productId,
    after: { branch_id: movement.branchId, ...movement, quantity_after: quantityAfter },
  });
  revalidatePath("/dashboard/inventory");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { success: true, quantityAfter };
}
