import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc:mocks.rpc})}));
vi.mock("@/lib/ratelimit",()=>({rateLimit:async()=>null}));
vi.mock("@/lib/api",()=>({apiOk:(data:unknown)=>Response.json({data}),apiError:(code:string,message:string,status:number)=>Response.json({code,message},{status})}));
import {POST} from "@/app/api/bookings/[code]/cancel/route";
const call=(code="ABCD1234")=>POST(new Request("http://localhost/api/bookings/ABCD1234/cancel",{method:"POST"}),{params:Promise.resolve({code})});
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:{status:"cancelled"},error:null});});
describe("atomic cancellation endpoint",()=>{
  it("validates the capability code before database access",async()=>{expect((await call("invalid")).status).toBe(400);expect(mocks.rpc).not.toHaveBeenCalled();});
  it("delegates the entire cancellation to one transaction",async()=>{expect((await call()).status).toBe(200);expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("cancel_guest_booking",{p_code:"ABCD1234"});});
  it("routes POS refunds back to the original receipt",async()=>{mocks.rpc.mockResolvedValue({error:{message:"CANCEL_AT_POS"}});expect((await call()).status).toBe(409);});
  it("reports stale state instead of false success",async()=>{mocks.rpc.mockResolvedValue({error:{message:"CANCEL_NOT_ALLOWED"}});expect((await call()).status).toBe(409);});
  it("fails safely when the migration is unavailable",async()=>{mocks.rpc.mockResolvedValue({error:{message:"function not found"}});expect((await call()).status).toBe(503);});
});
