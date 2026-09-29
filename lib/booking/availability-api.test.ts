import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ single:vi.fn(), result:vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table:string) => {
  const query = { select:() => query, eq:() => query, in:() => query, single:mocks.single,
    then:(resolve:(value:unknown) => unknown) => Promise.resolve(mocks.result(table)).then(resolve) };
  return query;
} }) }));
vi.mock("@/lib/api", () => ({ bangkokToday:() => "2026-09-14", bangkokNowTime:() => "08:00",
  apiOk:(data:unknown) => Response.json({success:true,data}),
  apiError:(code:string,message:string,status:number) => Response.json({success:false,error:{code,message}},{status}),
}));
import { GET } from "@/app/api/slots/route";
const request = () => new Request("http://localhost/api/slots?courtId=11111111-1111-4111-8111-111111111111&date=2026-09-14");
beforeEach(() => {
  vi.clearAllMocks();
  mocks.single.mockResolvedValue({data:{status:"open",branches:{status:"active"},tenants:{status:"active"},open_time:"09:00",close_time:"12:00",price_standard:300,price_peak:400}});
  mocks.result.mockReturnValue({data:[],error:null});
});
describe("public court availability", () => {
  it("returns a failure when bookings cannot be read, never a false free court", async () => {
    mocks.result.mockImplementation(table => table === "bookings" ? {data:null,error:{message:"unavailable"}} : {data:[],error:null});
    expect((await GET(request())).status).toBe(503);
  });
  it("returns a failure when block schedules cannot be read", async () => {
    mocks.result.mockImplementation(table => table === "block_schedules" ? {data:null,error:{message:"unavailable"}} : {data:[],error:null});
    expect((await GET(request())).status).toBe(503);
  });
  it("does not expose availability for an inactive branch", async () => {
    mocks.single.mockResolvedValue({data:{status:"open",branches:{status:"inactive"},tenants:{status:"active"}}});
    expect((await GET(request())).status).toBe(404);
  });
  it("returns occupied slots without customer details", async () => {
    mocks.result.mockImplementation(table => ({data:table === "bookings" ? [{start_time:"10:00",end_time:"12:00",user_name:"PRIVATE_CUSTOMER"}] : [],error:null}));
    const response = await GET(request());
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("PRIVATE_CUSTOMER");
    expect(JSON.parse(text).data.slots.map((s:{status:string}) => s.status)).toEqual(["available","booked","booked"]);
  });
});
