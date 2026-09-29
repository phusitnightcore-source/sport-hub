import { BadgeCheck, Building2, Sparkles, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrganizerBadgeType } from "@/lib/organizer";

const BADGE_STYLE: Record<OrganizerBadgeType, { icon: typeof BadgeCheck; className: string }> = {
  facility_owner: { icon: Building2, className: "text-blue-600 dark:text-blue-400" },
  group_host: { icon: Users, className: "text-emerald-600 dark:text-emerald-400" },
  tournament_host: { icon: Trophy, className: "text-amber-600 dark:text-amber-400" },
  organizer_pro: { icon: Sparkles, className: "text-violet-600 dark:text-violet-400" },
  verified_coach: { icon: BadgeCheck, className: "text-brand" },
};

export function OrganizerBadge({
  type,
  label,
  showLabel = false,
  className,
}: {
  type: OrganizerBadgeType;
  label: string;
  showLabel?: boolean;
  className?: string;
}) {
  const config = BADGE_STYLE[type] ?? BADGE_STYLE.organizer_pro;
  const Icon = config.icon;
  return (
    <span
      title={label}
      aria-label={label}
      className={cn("inline-flex shrink-0 items-center gap-1 font-bold", config.className, className)}
    >
      <Icon className="h-4 w-4 fill-current/15" aria-hidden="true" />
      {showLabel && <span className="text-[11px]">{label}</span>}
    </span>
  );
}

export function OrganizerBadges({
  badges,
  showLabels = false,
}: {
  badges: Array<{ type: OrganizerBadgeType; label: string }>;
  showLabels?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {badges.map((badge) => (
        <OrganizerBadge key={`${badge.type}-${badge.label}`} {...badge} showLabel={showLabels} />
      ))}
    </span>
  );
}
