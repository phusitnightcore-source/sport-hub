import { describe, expect, it } from "vitest";
import { deriveOrganizerCapabilities } from "./organizer-policy";

const NOW = new Date("2026-09-29T12:00:00.000Z");

describe("organizer membership policy", () => {
  it("allows a facility owner to manage groups and tournaments without an add-on", () => {
    expect(deriveOrganizerCapabilities({ isFacilityOwner: true }, NOW)).toMatchObject({
      canManageGroups: true,
      canManageTournaments: true,
    });
  });

  it("limits each active monthly plan to its purchased feature", () => {
    const common = {
      isFacilityOwner: false,
      subscriptionStatus: "active",
      currentPeriodEnd: "2026-10-29T12:00:00.000Z",
    };
    expect(deriveOrganizerCapabilities({ ...common, planCode: "group_host" }, NOW)).toMatchObject({
      canManageGroups: true,
      canManageTournaments: false,
    });
    expect(deriveOrganizerCapabilities({ ...common, planCode: "tournament_host" }, NOW)).toMatchObject({
      canManageGroups: false,
      canManageTournaments: true,
    });
  });

  it("allows Organizer Pro to manage both features", () => {
    expect(deriveOrganizerCapabilities({
      isFacilityOwner: false,
      subscriptionStatus: "active",
      currentPeriodEnd: "2026-10-29T12:00:00.000Z",
      planCode: "organizer_pro",
    }, NOW)).toMatchObject({ canManageGroups: true, canManageTournaments: true });
  });

  it("denies expired, pending, and cancelled subscriptions", () => {
    for (const item of [
      { subscriptionStatus: "active", currentPeriodEnd: "2026-09-29T11:59:59.000Z" },
      { subscriptionStatus: "pending", currentPeriodEnd: "2026-10-29T12:00:00.000Z" },
      { subscriptionStatus: "cancelled", currentPeriodEnd: "2026-10-29T12:00:00.000Z" },
    ]) {
      expect(deriveOrganizerCapabilities({
        isFacilityOwner: false,
        planCode: "organizer_pro",
        ...item,
      }, NOW)).toMatchObject({ canManageGroups: false, canManageTournaments: false });
    }
  });
});
