import { redirect } from "next/navigation";
import { AlertTriangle, Boxes } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { InventoryManager, type InventoryProduct, type StockMovement } from "./InventoryManager";

export default async function InventoryPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (!hasPermission(ctx, "manage_inventory")) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: staffAccess } =
    ctx.role === "staff" && ctx.staffId
      ? await admin
          .from("staff")
          .select("multi_branch_access, staff_branches(branch_id)")
          .eq("id", ctx.staffId)
          .maybeSingle()
      : { data: null };

  const branchQuery = admin
    .from("branches")
    .select("id, name")
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active")
    .order("name");
  if (ctx.role === "staff" && !staffAccess?.multi_branch_access) {
    const ids = (staffAccess?.staff_branches ?? []).map((row) => row.branch_id);
    if (ids.length === 0) redirect("/dashboard");
    branchQuery.in("id", ids);
  }
  const { data: branches } = await branchQuery;
  const branchIds = (branches ?? []).map((branch) => branch.id);

  const [productsResult, categoriesResult, inventoryResult, movementResult] = await Promise.all([
    admin
      .from("products")
      .select("id, category_id, sku, barcode, name, product_type, cost_price, selling_price, low_stock_threshold, track_stock, is_active")
      .eq("tenant_id", ctx.tenantId)
      .order("name"),
    admin.from("product_categories").select("id, name").eq("tenant_id", ctx.tenantId),
    branchIds.length
      ? admin
          .from("inventory")
          .select("branch_id, product_id, quantity, updated_at")
          .eq("tenant_id", ctx.tenantId)
          .in("branch_id", branchIds)
      : Promise.resolve({ data: [] }),
    branchIds.length
      ? admin
          .from("stock_movements")
          .select("id, branch_id, product_id, movement_type, quantity_change, quantity_after, note, created_at")
          .eq("tenant_id", ctx.tenantId)
          .in("branch_id", branchIds)
          .order("created_at", { ascending: false })
          .limit(16)
      : Promise.resolve({ data: [] }),
  ]);

  const categoryNames = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));
  const stockByProduct = new Map<string, Record<string, number>>();
  for (const inventory of inventoryResult.data ?? []) {
    const byBranch = stockByProduct.get(inventory.product_id) ?? {};
    byBranch[inventory.branch_id] = inventory.quantity;
    stockByProduct.set(inventory.product_id, byBranch);
  }
  const products: InventoryProduct[] = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    category: product.category_id ? categoryNames.get(product.category_id) ?? null : null,
    productType: product.product_type,
    costPrice: Number(product.cost_price),
    sellingPrice: Number(product.selling_price),
    lowStockThreshold: product.low_stock_threshold,
    trackStock: product.track_stock,
    isActive: product.is_active,
    stockByBranch: stockByProduct.get(product.id) ?? {},
  }));
  const productNames = new Map(products.map((product) => [product.id, product.name]));
  const movements: StockMovement[] = (movementResult.data ?? []).map((movement) => ({
    id: movement.id,
    branchId: movement.branch_id,
    productName: productNames.get(movement.product_id) ?? "สินค้าที่ถูกลบ",
    movementType: movement.movement_type,
    quantityChange: movement.quantity_change,
    quantityAfter: movement.quantity_after,
    note: movement.note,
    createdAt: movement.created_at,
  }));
  const lowStockCount = products.reduce(
    (total, product) => total + (product.trackStock && branchIds.some((id) => (product.stockByBranch[id] ?? 0) <= product.lowStockThreshold) ? 1 : 0),
    0,
  );

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-display-md font-semibold text-ink">คลังสินค้า</h1>
          <p className="mt-1 text-body-sm text-ink-soft">
            ทุกการเปลี่ยนแปลงยอดคงเหลือถูกบันทึกเป็นประวัติสต็อก
          </p>
        </div>
        {lowStockCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-body-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            สินค้าสต็อกต่ำ {lowStockCount} รายการ
          </div>
        )}
      </div>

      {branches?.length ? (
        <InventoryManager branches={branches} products={products} movements={movements} />
      ) : (
        <div className="card-floating flex flex-col items-center gap-3 p-10 text-center text-body-sm text-ink-soft">
          <Boxes className="h-9 w-9" />
          ยังไม่มีสาขาที่คุณสามารถจัดการคลังสินค้าได้
        </div>
      )}
    </main>
  );
}
