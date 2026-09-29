import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({ctx:vi.fn(),branch:vi.fn(),rpc:vi.fn(),single:vi.fn(),permission:vi.fn()}));
vi.mock("@/lib/auth",()=>({getStaffContext:mocks.ctx,hasPermission:mocks.permission}));
vi.mock("@/lib/pos/access",()=>({canUsePosBranch:mocks.branch}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc:mocks.rpc,from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:mocks.single};return q;}})}));
import {updateAttendance,bookingHistory,rescheduleBooking} from "@/app/dashboard/bookings/actions";
const id="11111111-1111-4111-8111-111111111111";
beforeEach(()=>{vi.clearAllMocks();mocks.ctx.mockResolvedValue({tenantId:"tenant",userId:"actor"});mocks.permission.mockReturnValue(true);mocks.branch.mockResolvedValue(true);mocks.single.mockResolvedValue({data:{branch_id:"branch"}});mocks.rpc.mockResolvedValue({data:[],error:null});});
describe("booking operations authorization and validation",()=>{
  it("rejects anonymous writes",async()=>{mocks.ctx.mockResolvedValue(null);expect(await updateAttendance(id,"checked_in","arrived")).toHaveProperty("error");expect(mocks.rpc).not.toHaveBeenCalled();});
  it("rejects staff outside assigned branches",async()=>{mocks.branch.mockResolvedValue(false);expect(await updateAttendance(id,"checked_in","arrived")).toHaveProperty("error");expect(await bookingHistory(id)).toHaveProperty("error");expect(mocks.rpc).not.toHaveBeenCalled();});
  it("rejects missing operation permission",async()=>{mocks.permission.mockReturnValue(false);expect(await updateAttendance(id,"checked_in","arrived")).toHaveProperty("error");expect(mocks.rpc).not.toHaveBeenCalled();});
  it("rejects invented attendance states and empty reasons",async()=>{expect(await updateAttendance(id,"refunded","arrived")).toHaveProperty("error");expect(await updateAttendance(id,"completed","")).toHaveProperty("error");expect(mocks.rpc).not.toHaveBeenCalled();});
  it("uses authenticated actor and tenant in transaction",async()=>{expect(await updateAttendance(id,"checked_in"," arrived ")).toEqual({success:true});expect(mocks.rpc).toHaveBeenCalledWith("set_booking_attendance",{p_tenant_id:"tenant",p_actor_id:"actor",p_booking_id:id,p_status:"checked_in",p_reason:"arrived"});});
  it("does not report success after a database rejection",async()=>{mocks.rpc.mockResolvedValue({error:{message:"NO_SHOW_NOT_ALLOWED"}});expect(await updateAttendance(id,"no_show","absent")).toHaveProperty("error");});
  it("rejects impossible reschedule dates and times",async()=>{expect(await rescheduleBooking(id,"2026-02-30","10:00","request")).toHaveProperty("error");expect(await rescheduleBooking(id,"2026-09-20","24:00","request")).toHaveProperty("error");expect(mocks.rpc).not.toHaveBeenCalled();});
  it("explains price changes without changing payments",async()=>{mocks.rpc.mockResolvedValue({error:{message:"RESCHEDULE_PRICE_CHANGED"}});expect((await rescheduleBooking(id,"2026-09-20","10:00","request")).error).toContain("ราคาไม่เท่าเดิม");});
});
