import {beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({user:vi.fn(),rows:new Map<string,unknown>(),rpc:vi.fn(),notify:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.user}})}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({from:(table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:mocks.rows.get(table)??null})};return q;},rpc:mocks.rpc})}));
vi.mock("@/lib/notify",()=>({dispatchNotification:mocks.notify}));
vi.mock("@/lib/audit",()=>({logAudit:mocks.audit}));
import {POST} from "@/app/api/coach-bookings/route";

const coach="11111111-1111-4111-8111-111111111111",service="22222222-2222-4222-8222-222222222222",court="33333333-3333-4333-8333-333333333333";
function request(extra:Record<string,string>={}) {const f=new FormData();f.set("coach_profile_id",coach);f.set("service_id",service);f.set("court_booking_code","COURT123");f.set("player_note","ฝึกเสิร์ฟ");for(const [k,v] of Object.entries(extra))f.set(k,v);return new NextRequest("http://localhost/api/coach-bookings",{method:"POST",body:f});}
beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue({data:{user:{id:"player-id"}}});mocks.rows=new Map([
  ["coach_services",{id:service,coach_profile_id:coach,is_active:true}],
  ["coach_profiles",{id:coach,profile_id:"coach-user",display_name:"Coach A",approval_status:"approved",is_visible:true}],
  ["bookings",{id:court,tenant_id:"tenant-id",booking_code:"COURT123"}],
]);mocks.rpc.mockResolvedValue({data:{id:"coach-booking-id"},error:null});});
describe("integrated coach booking request",()=>{
  it("requires a signed-in player",async()=>{mocks.user.mockResolvedValue({data:{user:null}});expect((await POST(request())).headers.get("location")).toContain("/login");expect(mocks.rpc).not.toHaveBeenCalled();});
  it("uses a confirmed court booking transaction as the source of truth",async()=>{const response=await POST(request({total_price:"1",start_time:"03:00"}));expect(response.status).toBe(303);expect(mocks.rpc).toHaveBeenCalledWith("create_linked_coach_booking",{p_player_id:"player-id",p_coach_id:coach,p_service_id:service,p_court_booking_id:court,p_note:"ฝึกเสิร์ฟ"});const args=mocks.rpc.mock.calls[0][1];expect(args).not.toHaveProperty("total_price");expect(args).not.toHaveProperty("start_time");});
  it("does not create requests for hidden or unapproved coaches",async()=>{mocks.rows.set("coach_profiles",{id:coach,approval_status:"pending",is_visible:false});expect((await POST(request())).headers.get("location")).toContain("error=unavailable");expect(mocks.rpc).not.toHaveBeenCalled();});
  it("returns a clear conflict result instead of creating overlapping work",async()=>{mocks.rpc.mockResolvedValue({data:null,error:{message:"COACH_SLOT_CONFLICT"}});expect((await POST(request())).headers.get("location")).toContain("error=slot_conflict");});
});
