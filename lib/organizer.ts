import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveOrganizerCapabilities, type OrganizerPlanCode } from "@/lib/organizer-policy";

export type OrganizerBadgeType =
  | "facility_owner"
  | "group_host"
  | "tournament_host"
  | "organizer_pro"
  | "verified_coach";

export type OrganizerBadge = {
  type: OrganizerBadgeType;
  label: string;
  validUntil: string | null;
};

export type OrganizerAccess = {
  userId: string;
  tenantId: string | null;
  isFacilityOwner: boolean;
  canManageGroups: boolean;
  canManageTournaments: boolean;
  badges: OrganizerBadge[];
  subscription: {
    planCode: OrganizerPlanCode;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
};

type AdminClient = ReturnType<typeof createAdminClient>;

export async function getOrganizerAccessForUser(
  admin: AdminClient,
  userId: string,
): Promise<OrganizerAccess | null> {
  const [{ data: profile }, { data: subscription }, { data: badgeRows }] = await Promise.all([
    admin.from("profiles").select("id, tenant_id, role, is_active, tenants(status)").eq("id", userId).maybeSingle(),
    admin
      .from("organizer_subscriptions")
      .select("plan_code, status, current_period_end")
      .eq("profile_id", userId)
      .maybeSingle(),
    admin
      .from("organizer_badges")
      .select("badge_type, label, valid_until, priority")
      .eq("profile_id", userId)
      .order("priority"),
  ]);

  if (!profile?.is_active) return null;

  const tenantStatus = profile.tenants?.status as string | undefined;
  const isFacilityOwner =
    profile.role === "super_admin" ||
    (profile.role === "venue_admin" && ["active", "trial", "free"].includes(tenantStatus ?? ""));
  const planCode = subscription?.plan_code as OrganizerPlanCode;
  const capabilities = deriveOrganizerCapabilities({
    isFacilityOwner,
    subscriptionStatus: subscription?.status,
    currentPeriodEnd: subscription?.current_period_end,
    planCode,
  });

  return {
    userId,
    tenantId: profile.tenant_id,
    isFacilityOwner,
    canManageGroups: capabilities.canManageGroups,
    canManageTournaments: capabilities.canManageTournaments,
    badges: ((badgeRows ?? []) as Array<{ badge_type: OrganizerBadgeType; label: string; valid_until: string | null }>).map(
      (badge) => ({ type: badge.badge_type, label: badge.label, validUntil: badge.valid_until }),
    ),
    subscription: subscription
      ? {
          planCode,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        }
      : null,
  };
}

export async function getCurrentOrganizerAccess(): Promise<OrganizerAccess | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getOrganizerAccessForUser(createAdminClient(), user.id);
}

export async function requireTournamentOrganizer() {
  const access = await getCurrentOrganizerAccess();
  return access?.canManageTournaments ? access : null;
}

export async function requireGroupOrganizer() {
  const access = await getCurrentOrganizerAccess();
  return access?.canManageGroups ? access : null;
}
