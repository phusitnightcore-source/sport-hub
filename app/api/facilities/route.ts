import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiOk } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";

// Directory สาธารณะ: เปิดเฉพาะข้อมูลที่ผู้เล่นต้องใช้เลือกสนาม ไม่เปิดข้อมูลเจ้าของ/บัญชี
export async function GET(request: Request) {
  const limited = await rateLimit(request, "facility-directory", 60, 60_000);
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().replace(/[,()%*]/g, "").slice(0, 80).toLocaleLowerCase();
  const admin = createAdminClient();
  const { data: tenants, error } = await admin
    .from("tenants")
    .select("id, name, address, logo_url, rating_avg, review_count")
    .in("status", ["active", "trial", "free"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return apiError("INTERNAL_ERROR", "ไม่สามารถค้นหาสนามได้", 500);
  const tenantIds = (tenants ?? []).map((tenant) => tenant.id);
  if (tenantIds.length === 0) return apiOk({ facilities: [] });

  const [{ data: branches }, { data: courts }] = await Promise.all([
    admin
      .from("branches")
      .select("id, tenant_id, name, address, province, latitude, longitude, amenities, open_time, close_time")
      .in("tenant_id", tenantIds)
      .eq("status", "active"),
    admin
      .from("courts")
      .select("id, tenant_id, branch_id, type, price_standard, is_indoor")
      .in("tenant_id", tenantIds)
      .eq("status", "open"),
  ]);

  const courtsByBranch = new Map<string, NonNullable<typeof courts>>();
  for (const court of courts ?? []) {
    const values = courtsByBranch.get(court.branch_id) ?? [];
    values.push(court);
    courtsByBranch.set(court.branch_id, values);
  }
  const branchesByTenant = new Map<string, NonNullable<typeof branches>>();
  for (const branch of branches ?? []) {
    const values = branchesByTenant.get(branch.tenant_id) ?? [];
    values.push(branch);
    branchesByTenant.set(branch.tenant_id, values);
  }

  const facilities = (tenants ?? [])
    .map((tenant) => {
      const venueBranches = (branchesByTenant.get(tenant.id) ?? []).map((branch) => {
        const branchCourts = courtsByBranch.get(branch.id) ?? [];
        const sports = [...new Set(branchCourts.map((court) => court.type))];
        const hasIndoor = branchCourts.some((court) => court.is_indoor);
        const hasOutdoor = branchCourts.some((court) => !court.is_indoor);
        const lowestPrice = branchCourts.reduce<number | null>(
          (lowest, court) => lowest === null || Number(court.price_standard) < lowest ? Number(court.price_standard) : lowest,
          null,
        );
        return {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          province: branch.province,
          latitude: branch.latitude,
          longitude: branch.longitude,
          amenities: branch.amenities,
          openTime: branch.open_time,
          closeTime: branch.close_time,
          courtCount: branchCourts.length,
          sports,
          hasIndoor,
          hasOutdoor,
          lowestPrice,
        };
      }).filter((branch) => branch.courtCount > 0);
      return { 
        id: tenant.id, 
        name: tenant.name, 
        address: tenant.address, 
        logoUrl: tenant.logo_url, 
        ratingAvg: tenant.rating_avg,
        reviewCount: tenant.review_count,
        branches: venueBranches 
      };
    })
    .filter((facility) => facility.branches.length > 0)
    .filter((facility) => {
      const searchable = `${facility.name} ${facility.address ?? ""} ${facility.branches.map((branch) => `${branch.name} ${branch.address ?? ""} ${branch.province ?? ""} ${branch.sports.join(" ")}`).join(" ")}`.toLocaleLowerCase();
      const matchesQuery = !q || searchable.includes(q);
      return matchesQuery;
    });

  return apiOk({ facilities });
}
