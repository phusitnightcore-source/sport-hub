import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(), permission: vi.fn(), branch: vi.fn(), rpc: vi.fn(),
  single: vi.fn(), refresh: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getStaffContext: mocks.context, hasPermission: mocks.permission }));
vi.mock("@/lib/pos/access", () => ({ canUsePosBranch: mocks.branch }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.audit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  rpc: mocks.rpc,
  from: () => { const query = { select: () => query, eq: () => query, maybeSingle: mocks.single }; return query; },
}) }));

import { closeShift, completePosSale, getShiftReport, openShift, refundPosSale } from "@/app/pos/actions";

const id = "11111111-1111-4111-8111-111111111111";
const input = {
  branchId: id, shiftId: id, checkoutKey: id, paymentMethod: "cash" as const,
  items: [{ productId: id, quantity: 2 }], expectedTotal: 30, cashReceived: 100,
  paymentConfirmed: true as const, discountAmount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({ userId: id, staffId: id, tenantId: id, role: "staff", extraPermissions: ["use_pos"] });
  mocks.permission.mockImplementation((_ctx, permission) => permission === "use_pos");
  mocks.branch.mockResolvedValue(true);
  mocks.single.mockResolvedValue({ data: { id, branch_id: id }, error: null });
  mocks.rpc.mockResolvedValue({ data: [{ sale_id: id, receipt_number: "POS-TEST" }], error: null });
});

describe("POS server action boundaries", () => {
  it("accepts court-only payment through the combined transaction", async () => {
    expect(await completePosSale({ ...input, items: [], bookingCode: "ABCD1234", collectBooking: true })).toMatchObject({ success: true });
    expect(mocks.rpc).toHaveBeenCalledWith("checkout_pos_booking", expect.objectContaining({ p_booking_id: id, p_items: [], p_checkout_key: id }));
  });
  it("keeps reference-only bookings on merchandise checkout", async () => {
    await completePosSale({ ...input, bookingCode: "ABCD1234", collectBooking: false });
    expect(mocks.rpc).toHaveBeenCalledWith("checkout_pos_counter", expect.objectContaining({ p_booking_id: id }));
  });
  it("rejects empty bills and collecting a court without a booking", async () => {
    expect(await completePosSale({ ...input, items: [] })).toHaveProperty("error");
    expect(await completePosSale({ ...input, collectBooking: true })).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects a combined bill linked to another branch", async () => {
    mocks.single.mockResolvedValue({ data: { id, branch_id: "another-branch" } });
    expect(await completePosSale({ ...input, bookingCode: "ABCD1234", collectBooking: true })).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("routes refunds through the booking-aware transaction", async () => {
    mocks.permission.mockReturnValue(true);
    expect(await refundPosSale({ saleId: id, reason: "คืนทั้งบิล", restock: true, confirmed: true })).toMatchObject({ success: true });
    expect(mocks.rpc).toHaveBeenCalledWith("void_pos_booking_sale", expect.objectContaining({ p_sale_id: id, p_restock: true }));
  });
  it("rejects checkout without a session", async () => {
    mocks.context.mockResolvedValue(null);
    expect(await completePosSale(input)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects a sale for an inaccessible branch", async () => {
    mocks.branch.mockResolvedValue(false);
    expect(await completePosSale(input)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects payment without explicit confirmation", async () => {
    expect(await completePosSale({ ...input, paymentConfirmed: false as never })).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("passes the original retry key and expected price to atomic checkout", async () => {
    expect(await completePosSale(input)).toMatchObject({ success: true, saleId: id });
    expect(mocks.rpc).toHaveBeenCalledWith("checkout_pos_counter", expect.objectContaining({
      p_checkout_key: id, p_expected_total: 30, p_cash_received: 100,
      p_tenant_id: id, p_items: [{ product_id: id, quantity: 2 }],
    }));
  });
  it("does not return success or audit a rejected stock transaction", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "สต็อกคงเหลือไม่เพียงพอ" } });
    expect(await completePosSale(input)).toHaveProperty("error");
    expect(mocks.audit).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("requires branch access for report and closing, even within the tenant", async () => {
    mocks.branch.mockResolvedValue(false);
    expect(await getShiftReport(id)).toHaveProperty("error");
    expect(await closeShift(id, 100)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not permit a cashier without refund permission to refund", async () => {
    expect(await refundPosSale({ saleId: id, reason: "คืนสินค้า", restock: true, confirmed: true })).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects non-finite and negative cash amounts", async () => {
    expect(await openShift(id, Infinity)).toHaveProperty("error");
    expect(await closeShift(id, -1)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
