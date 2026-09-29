import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffContext, hasPermission } from "@/lib/auth";
import { bangkokToday } from "@/lib/api";
import { validBookingDate } from "@/lib/booking/dates";
import { BOOKING_STATUS_LABEL, type BookingStatus } from "@/lib/booking/status";
import { BookingsClient, type BookingItem } from "./BookingsClient";

export default async function BookingsPage({ searchParams }: {
  searchParams: Promise<{ date?: string; branch?: string; court?: string; status?: string; source?: string; q?: string; page?: string }>;
}) {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const today = bangkokToday();
  const date = validBookingDate(params.date) ? params.date : today;
  const supabase = await createClient();
  const branchesQuery = supabase.from("branches").select("id,name").eq("tenant_id",ctx.tenantId).eq("status","active").order("name");
  if (ctx.role === "staff") {
    if (!ctx.staffId) redirect("/dashboard");
    const { data: staff } = await supabase.from("staff").select("status,multi_branch_access,staff_branches(branch_id)").eq("id",ctx.staffId).eq("tenant_id",ctx.tenantId).maybeSingle();
    if (!staff || staff.status !== "active") redirect("/dashboard");
    if (!staff.multi_branch_access) {
      const ids = staff.staff_branches.map(b => b.branch_id);
      if (!ids.length) redirect("/dashboard");
      branchesQuery.in("id",ids);
    }
  }
  const { data: branches, error: branchError } = await branchesQuery;
  const branchIds = (branches ?? []).map(b => b.id);
  if (branchError || !branchIds.length) return <main className="card-floating p-8 text-ink">{branchError ? "โหลดสาขาไม่สำเร็จ กรุณาลองใหม่" : "ยังไม่มีสาขาที่เปิดให้จัดการการจอง"}</main>;
  const branch = branchIds.includes(params.branch ?? "") ? params.branch! : "all";
  const { data: courts, error: courtError } = await supabase.from("courts").select("id,name,branch_id").eq("tenant_id",ctx.tenantId).in("branch_id",branchIds).order("name");
  const court = (courts ?? []).some(c => c.id === params.court && (branch === "all" || c.branch_id === branch)) ? params.court! : "all";
  const status = params.status && Object.hasOwn(BOOKING_STATUS_LABEL,params.status) ? params.status as BookingStatus : "all";
  const source = params.source === "online" || params.source === "staff" ? params.source : "all";
  const q = (params.q ?? "").replace(/[^\p{L}\p{N}\s+\-]/gu,"").trim().slice(0,80);
  const page = /^\d+$/.test(params.page ?? "") ? Math.max(1,Math.min(10000,Number(params.page))) : 1;
  const query = supabase.from("bookings").select("id,attendance_status,booking_code,user_name,user_phone,booking_date,start_time,end_time,total_price,status,branch_id,court_id,created_by,note,created_at,courts(name),payments(id,status,submitted_at)",{count:"exact"})
    .eq("tenant_id",ctx.tenantId).eq("booking_date",date).in("branch_id",branchIds);
  if (branch !== "all") query.eq("branch_id",branch);
  if (court !== "all") query.eq("court_id",court);
  if (status !== "all") query.eq("status",status);
  if (source === "online") query.is("created_by",null);
  if (source === "staff") query.not("created_by","is",null);
  if (q) query.or(`booking_code.ilike.%${q}%,user_name.ilike.%${q}%,user_phone.ilike.%${q}%`);
  const { data, count, error } = await query.order("start_time").order("id").range((page-1)*40,page*40-1);
  const bookingIds=(data??[]).map(b=>b.id);
  const {data:coachAppointments,error:coachError}=bookingIds.length ? await supabase.from("coach_bookings")
    .select("court_booking_id,status,coach_profiles(display_name),coach_services(name)")
    .in("court_booking_id",bookingIds).in("status",["requested","accepted","confirmed","in_progress","completed"]) : {data:[],error:null};
  const coachByBooking=new Map((coachAppointments??[]).map(c=>[c.court_booking_id,{name:c.coach_profiles?.display_name??"โค้ช",service:c.coach_services?.name??"คอร์สสอน",status:c.status}]));
  const bookings: BookingItem[] = (data ?? []).map(b => ({
    attendance:b.attendance_status,id:b.id,code:b.booking_code,name:b.user_name,phone:b.user_phone,date:b.booking_date,start:b.start_time.slice(0,5),end:b.end_time.slice(0,5),
    amount:Number(b.total_price),status:b.status,branchId:b.branch_id,courtId:b.court_id,courtName:b.courts?.name ?? "สนาม",
    source:b.created_by ? "staff" : "online",note:b.note,createdAt:b.created_at,
    paymentId:[...b.payments].filter(p => p.status === "awaiting_verification").sort((a,b) => b.submitted_at.localeCompare(a.submitted_at))[0]?.id ?? null,
    coach:coachByBooking.get(b.id)??null,
  }));
  return <BookingsClient bookings={bookings} branches={branches ?? []} courts={courts ?? []} today={today}
    filters={{date,branch,court,status,source,q,page}} total={count ?? 0} loadFailed={!!error || !!courtError || !!coachError}
    permissions={{create:hasPermission(ctx,"create_booking"),verify:hasPermission(ctx,"verify_slip"),pos:hasPermission(ctx,"use_pos"),refund:hasPermission(ctx,"confirm_refund")}}/>;
}
