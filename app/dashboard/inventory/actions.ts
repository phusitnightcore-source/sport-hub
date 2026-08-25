"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffContext, hasPermission, type StaffContext } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (ctx.role === "venue_admin") return true;
  if (!ctx.staffId) return false;
  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("staff")
    .select("multi_branch_access, status, staff_branches(branch_id)")
    .eq("id", ctx.staffId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  if (!staff || staff.status !== "active") return false;
  return staff.multi_branch_access || (staff.staff_branches ?? []).some((row: any) => row.branch_id === branchId);
}

function canManageInventory(ctx: StaffContext | null) {
  return Boolean(ctx && hasPermission(ctx, "manage_inventory"));
}

export async function createProduct(input: z.input<typeof productSchema>) {
  const ctx = await getStaffContext();
  if (!canManageInventory(ctx)) return { error: "คุณไม่มีสิทธิ์จัดการคลังสินค้า" };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "ข้อมูลสินค้าไม่ถูกต้อง" };
  const product = parsed.data;
  if (!(await canUseBranch(ctx!, product.branchId))) return { error: "คุณไม่มีสิทธิ์ใช้งานสาขานี้" };

  const admin = createAdminClient();
  let categoryId: string | null = null;
  if (product.category) {
    const { data: category, error } = await admin
      .from("product_categories")
      .upsert({ tenant_id: ctx!.tenantId, name: product.category }, { onConflict: "tenant_id,name" })
      .select("id")
      .single();
    if (error || !category) return { error: "ไม่สามารถบันทึกหมวดสินค้าได้" };
    categoryId = category.id;
  }

  const { data: created, error } = await admin
    .from("products")
    .insert({
      tenant_id: ctx!.tenantId,
      category_id: categoryId,
      name: product.name,
      sku: product.sku || null,
      barcode: product.barcode || null,
      product_type: product.productType,
      cost_price: product.costPrice,
      selling_price: product.sellingPrice,
      low_stock_threshold: product.lowStockThreshold,
      track_stock: product.trackStock,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("create product failed:", error);
    return { error: error?.code === "23505" ? "SKU หรือ Barcode นี้ถูกใช้งานแล้ว" : "ไม่สามารถเพิ่มสินค้าได้" };
  }

  if (product.trackStock && product.initialStock > 0) {
    const { error: stockError } = await admin.rpc("adjust_inventory", {
      p_tenant_id: ctx!.tenantId,
      p_branch_id: product.branchId,
      p_product_id: created.id,
      p_quantity_change: product.initialStock,
      p_movement_type: "initial",
      p_note: "ยอดตั้งต้นเมื่อสร้างสินค้า",
      p_created_by: ctx!.staffId,
      p_sale_id: null,
    });
    if (stockError) {
      console.error("initial stock failed:", stockError);
      return { error: "เพิ่มสินค้าแล้ว แต่บันทึกยอดตั้งต้นไม่สำเร็จ" };
    }
  }

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
