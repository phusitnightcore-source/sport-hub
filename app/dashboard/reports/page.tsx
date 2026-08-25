import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext } from "@/lib/auth";
import { getTenantEntitlements } from "@/lib/entitlements.server";
import { bangkokToday } from "@/lib/api";
import {
  ReportsClient,
  type ReportPayment,
  type ReportPosSale,
  type ReportBooking,
  type ReportMember,
  type TopProductItem,
  type ReportShift,
} from "./ReportsClient";

export default async function ReportsPage() {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const admin = createAdminClient();
  const { entitlements } = await getTenantEntitlements(supabase, ctx.tenantId);

  const today = bangkokToday();
  const currentMonthStr = today.slice(0, 7);

  const [
    branchesResult,
    courtsResult,
    paymentsResult,
    posSalesResult,
    bookingsResult,
    membersResult,
    saleItemsResult,
    shiftsResult,
  ] = await Promise.all([
    admin
      .from("branches")
      .select("id, name")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "active")
      .order("name"),
    admin
      .from("courts")
      .select("id, name, branch_id")
      .eq("tenant_id", ctx.tenantId)
      .order("name"),
    admin
      .from("payments")
      .select("id, amount, method, booking_id, member_id, verified_at, status")
      .eq("status", "verified")
      .order("verified_at", { ascending: false }),
    admin
      .from("sales")
      .select(`
        id,
        branch_id,
        total_amount,
        subtotal,
        discount_amount,
        completed_at,
        receipt_number,
        customer_name,
        pos_payments(method)
      `)
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false }),
    admin
      .from("bookings")
      .select("id, court_id, branch_id, booking_date, total_price, status, created_at, payment_method")
      .order("created_at", { ascending: false }),
    admin
      .from("members")
      .select("id, status, start_date, end_date, created_at")
      .eq("tenant_id", ctx.tenantId)
      .order("created_at", { ascending: false }),
    admin
      .from("sale_items")
      .select("product_name, quantity, line_total, sales!inner(branch_id, status, tenant_id)")
      .eq("sales.tenant_id", ctx.tenantId)
      .eq("sales.status", "completed"),
    admin
      .from("pos_shifts")
      .select("id, branch_id, opened_by, closed_by, opened_at, closed_at, status, starting_cash, actual_closing_cash, expected_closing_cash, notes")
      .eq("tenant_id", ctx.tenantId)
      .order("opened_at", { ascending: false }),
  ]);

  const branches = branchesResult.data ?? [];
  const courts = courtsResult.data ?? [];

  const payments: ReportPayment[] = (paymentsResult.data ?? []).map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    method: p.method,
    booking_id: p.booking_id,
    member_id: p.member_id,
    verified_at: p.verified_at ?? "",
  }));

  const posSales: ReportPosSale[] = (posSalesResult.data ?? []).map((s: any) => ({
    id: s.id,
    branch_id: s.branch_id,
    total_amount: Number(s.total_amount),
    subtotal: Number(s.subtotal),
    discount_amount: Number(s.discount_amount),
    completed_at: s.completed_at,
    receipt_number: s.receipt_number,
    customer_name: s.customer_name,
    method: s.pos_payments?.[0]?.method ?? "cash",
  }));

  const bookings: ReportBooking[] = (bookingsResult.data ?? []).map((b) => ({
    id: b.id,
    court_id: b.court_id,
    branch_id: b.branch_id,
    booking_date: b.booking_date,
    total_price: Number(b.total_price),
    status: b.status,
    created_at: b.created_at,
    payment_method: b.payment_method,
  }));

  const members: ReportMember[] = (membersResult.data ?? []).map((m) => ({
    id: m.id,
    status: m.status,
    start_date: m.start_date,
    end_date: m.end_date,
    created_at: m.created_at,
  }));

  const shifts: ReportShift[] = (shiftsResult.data ?? []).map((s) => ({
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

  // Aggregate Top Products
  const productAgg = new Map<string, { name: string; quantity: number; revenue: number; branch_id: string }>();
  for (const item of (saleItemsResult.data as any[]) ?? []) {
    const key = `${item.sales?.branch_id}_${item.product_name}`;
    const curr = productAgg.get(key) ?? {
      name: item.product_name,
      quantity: 0,
      revenue: 0,
      branch_id: item.sales?.branch_id ?? "",
    };
    curr.quantity += item.quantity;
    curr.revenue += Number(item.line_total);
    productAgg.set(key, curr);
  }

  const topProducts: TopProductItem[] = [...productAgg.values()].sort((a, b) => b.revenue - a.revenue);

  return (
    <ReportsClient
      branches={branches}
      courts={courts}
      payments={payments}
      posSales={posSales}
      bookings={bookings}
      members={members}
      topProducts={topProducts}
      shifts={shifts}
      entitlements={entitlements}
      currentMonthStr={currentMonthStr}
    />
  );
}
