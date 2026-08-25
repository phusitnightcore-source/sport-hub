import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffContext, hasPermission } from "@/lib/auth";
import {
  PosClient,
  type PosProduct,
  type ShiftHistoryItem,
  type SaleHistoryItem,
} from "./PosClient";

export default async function PosPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  if (!hasPermission(ctx, "use_pos")) redirect("/dashboard");

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
    const ids = (staffAccess?.staff_branches ?? []).map((item: { branch_id: string }) => item.branch_id);
    if (ids.length === 0) redirect("/dashboard");
    branchQuery.in("id", ids);
  }

  const { data: branches } = await branchQuery;
  const branchIds = (branches ?? []).map((branch) => branch.id);

  if (!branchIds.length) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface/30 p-6">
        <div className="card-floating max-w-md p-10 text-center text-body-sm text-ink-soft">
          ยังไม่มีสาขาที่คุณสามารถใช้งาน POS ได้ กรุณาติดต่อผู้ดูแลระบบ
        </div>
      </main>
    );
  }

  const [
    productsResult,
    inventoryResult,
    activeShiftsResult,
    allShiftsResult,
    recentSalesResult,
  ] = await Promise.all([
    admin
      .from("products")
      .select("id, name, sku, product_type, selling_price, track_stock, low_stock_threshold")
      .eq("tenant_id", ctx.tenantId)
      .eq("is_active", true)
      .order("name"),
    admin
      .from("inventory")
      .select("branch_id, product_id, quantity")
      .eq("tenant_id", ctx.tenantId)
      .in("branch_id", branchIds),
    admin
      .from("pos_shifts")
      .select("id, branch_id, opened_at, starting_cash")
      .eq("tenant_id", ctx.tenantId)
      .in("branch_id", branchIds)
      .eq("status", "open"),
    admin
      .from("pos_shifts")
      .select("id, branch_id, opened_by, closed_by, opened_at, closed_at, status, starting_cash, actual_closing_cash, expected_closing_cash, notes")
      .eq("tenant_id", ctx.tenantId)
      .in("branch_id", branchIds)
      .order("opened_at", { ascending: false })
      .limit(30),
    admin
      .from("sales")
      .select(`
        id,
        receipt_number,
        sale_number,
        customer_name,
        customer_phone,
        total_amount,
        discount_amount,
        subtotal,
        completed_at,
        branch_id,
        shift_id,
        pos_payments(method, amount)
      `)
      .eq("tenant_id", ctx.tenantId)
      .in("branch_id", branchIds)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(40),
  ]);

  const stockByProduct = new Map<string, Record<string, number>>();
  for (const row of inventoryResult.data ?? []) {
    const productStock = stockByProduct.get(row.product_id) ?? {};
    productStock[row.branch_id] = row.quantity;
    stockByProduct.set(row.product_id, productStock);
  }

  const products: PosProduct[] = (productsResult.data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    type: product.product_type,
    sellingPrice: Number(product.selling_price),
    trackStock: product.track_stock,
    stockByBranch: stockByProduct.get(product.id) ?? {},
  }));

  const pastShifts: ShiftHistoryItem[] = (allShiftsResult.data ?? []).map((s) => ({
    id: s.id,
    branch_id: s.branch_id,
    opened_by: s.opened_by,
    closed_by: s.closed_by,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    status: s.status as "open" | "closed",
    starting_cash: Number(s.starting_cash),
    actual_closing_cash: s.actual_closing_cash !== null ? Number(s.actual_closing_cash) : null,
    expected_closing_cash: s.expected_closing_cash !== null ? Number(s.expected_closing_cash) : null,
    notes: s.notes,
  }));

  const pastSales: SaleHistoryItem[] = (recentSalesResult.data ?? []).map((s: any) => ({
    id: s.id,
    receipt_number: s.receipt_number,
    sale_number: s.sale_number,
    customer_name: s.customer_name,
    customer_phone: s.customer_phone,
    total_amount: Number(s.total_amount),
    discount_amount: Number(s.discount_amount),
    subtotal: Number(s.subtotal),
    completed_at: s.completed_at,
    branch_id: s.branch_id,
    shift_id: s.shift_id,
    payment_method: s.pos_payments?.[0]?.method ?? "cash",
  }));

  return (
    <PosClient
      branches={branches ?? []}
      products={products}
      activeShifts={activeShiftsResult.data ?? []}
      pastShifts={pastShifts}
      pastSales={pastSales}
    />
  );
}
