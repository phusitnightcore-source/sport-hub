import { beforeEach, describe, expect, it, vi } from "vitest";

const id = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({ context: vi.fn(), permission: vi.fn(), branch: vi.fn(), rpc: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getStaffContext: mocks.context, hasPermission: mocks.permission }));
vi.mock("@/lib/pos/access", () => ({ canUsePosBranch: mocks.branch }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api", () => ({ bangkokToday: () => "2026-09-13", bangkokNowTime: () => "08:00" }));
vi.mock("@/lib/booking/slots", () => ({ toMinutes: (time: string) => Number(time.slice(0, 2)) * 60, buildSlots: () => [{ start: "10:00", end: "11:00", priceSatang: 30000, status: "available", isPeak: false }] }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  rpc: mocks.rpc,
  from: () => { const query = { select: () => query, eq: () => query, in: () => query, single: mocks.single }; return query; },
}) }));
import { createWalkInBooking, createRecurringWalkIn } from "@/app/dashboard/bookings/new/actions";

const input = { courtId: id, date: "2026-09-13", startTime: "10:00", endTime: "11:00", userName: "ลูกค้าทดสอบ", userPhone: "0812345678", method: "walk_in_cash" as const };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue({ userId: id, staffId: id, tenantId: id, role: "venue_admin" });
  mocks.permission.mockReturnValue(true);
  mocks.branch.mockResolvedValue(true);
  mocks.single.mockResolvedValue({ data: { id, branch_id: id, status: "open" } });
  mocks.rpc.mockResolvedValue({ data: [{ id, booking_code: "ABCD1234", total_price: 300 }], error: null });
});
describe("walk-in settlement handoff", () => {
  it("creates a pending booking through the atomic RPC before handing off to POS", async () => {
    expect(await createWalkInBooking({ ...input, collectAtPos: true })).toMatchObject({ success: true, bookingCode: "ABCD1234", branchId: id, collectAtPos: true });
    expect(mocks.rpc).toHaveBeenCalledWith("create_pos_walk_in", expect.objectContaining({ p_collect_at_pos: true, p_tenant_id: id, p_booking: expect.objectContaining({ total_price: 300, status: "pending_payment" }) }));
  });
  it("records already-paid walk-ins using the same atomic RPC", async () => {
    expect(await createWalkInBooking(input)).toHaveProperty("success", true);
    expect(mocks.rpc).toHaveBeenCalledWith("create_pos_walk_in", expect.objectContaining({ p_collect_at_pos: false, p_booking: expect.objectContaining({ payment_method: "walk_in_cash", status: "confirmed" }) }));
  });
  it("rejects POS handoff without POS permission", async () => {
    mocks.permission.mockReturnValue(false);
    expect(await createWalkInBooking({ ...input, collectAtPos: true })).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects inactive or inaccessible branches", async () => {
    mocks.branch.mockResolvedValue(false);
    expect(await createWalkInBooking(input)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not claim success if database creation conflicts", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23P01" } });
    expect(await createWalkInBooking(input)).toHaveProperty("error");
  });
  it("does not create multiple pending bookings for an unsupported combined bill", async () => {
    expect(await createRecurringWalkIn({ ...input, collectAtPos: true }, 4)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
