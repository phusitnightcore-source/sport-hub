export type OrganizerPlanCode = "group_host" | "tournament_host" | "organizer_pro";

type OrganizerPolicyInput = {
  isFacilityOwner: boolean;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  planCode?: OrganizerPlanCode | null;
};

export function deriveOrganizerCapabilities(
  input: OrganizerPolicyInput,
  now = new Date(),
) {
  const activeSubscription = Boolean(
    input.subscriptionStatus === "active" &&
      input.currentPeriodEnd &&
      new Date(input.currentPeriodEnd).getTime() > now.getTime(),
  );

  return {
    activeSubscription,
    canManageGroups:
      input.isFacilityOwner ||
      (activeSubscription &&
        (input.planCode === "group_host" || input.planCode === "organizer_pro")),
    canManageTournaments:
      input.isFacilityOwner ||
      (activeSubscription &&
        (input.planCode === "tournament_host" || input.planCode === "organizer_pro")),
  };
}
