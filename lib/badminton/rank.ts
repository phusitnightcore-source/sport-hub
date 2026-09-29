export interface RankTier {
  name: string;
  minMMR: number;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const SKILL_LEVEL_MAP: Record<string, number> = {
  "เปาะแปะ": 300,
  BG: 600,
  N: 1000,
  S: 1400,
  "P-": 1800,
  P: 2200,
  "P+": 2600,
  C: 3100,
  B: 3700,
  A: 4400,
};

export const RANK_TIERS: RankTier[] = [
  {
    name: "Wood",
    minMMR: 0,
    color: "#78350f",
    badgeBg: "bg-amber-950/20 text-amber-800 dark:text-amber-300",
    badgeBorder: "border-amber-700/30",
    badgeText: "text-amber-800 dark:text-amber-300",
  },
  {
    name: "Stone",
    minMMR: 400,
    color: "#4b5563",
    badgeBg: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
    badgeBorder: "border-gray-500/30",
    badgeText: "text-gray-700 dark:text-gray-300",
  },
  {
    name: "Coal",
    minMMR: 750,
    color: "#1f2937",
    badgeBg: "bg-slate-700/20 text-slate-800 dark:text-slate-300",
    badgeBorder: "border-slate-600/30",
    badgeText: "text-slate-800 dark:text-slate-300",
  },
  {
    name: "Iron",
    minMMR: 1000,
    color: "#94a3b8",
    badgeBg: "bg-slate-400/20 text-slate-700 dark:text-slate-200",
    badgeBorder: "border-slate-400/30",
    badgeText: "text-slate-700 dark:text-slate-200",
  },
  {
    name: "Bronze",
    minMMR: 1300,
    color: "#b45309",
    badgeBg: "bg-orange-500/20 text-orange-800 dark:text-orange-300",
    badgeBorder: "border-orange-500/30",
    badgeText: "text-orange-800 dark:text-orange-300",
  },
  {
    name: "Silver",
    minMMR: 1650,
    color: "#64748b",
    badgeBg: "bg-blue-500/20 text-blue-800 dark:text-blue-300",
    badgeBorder: "border-blue-500/30",
    badgeText: "text-blue-800 dark:text-blue-300",
  },
  {
    name: "Gold",
    minMMR: 2000,
    color: "#ca8a04",
    badgeBg: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300",
    badgeBorder: "border-yellow-500/30",
    badgeText: "text-yellow-800 dark:text-yellow-300",
  },
  {
    name: "Platinum",
    minMMR: 2400,
    color: "#0ea5e9",
    badgeBg: "bg-sky-500/20 text-sky-800 dark:text-sky-300",
    badgeBorder: "border-sky-500/30",
    badgeText: "text-sky-800 dark:text-sky-300",
  },
  {
    name: "Emerald",
    minMMR: 2850,
    color: "#10b981",
    badgeBg: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300",
    badgeBorder: "border-emerald-500/30",
    badgeText: "text-emerald-800 dark:text-emerald-300",
  },
  {
    name: "Diamond",
    minMMR: 3300,
    color: "#8b5cf6",
    badgeBg: "bg-purple-500/20 text-purple-800 dark:text-purple-300",
    badgeBorder: "border-purple-500/30",
    badgeText: "text-purple-800 dark:text-purple-300",
  },
  {
    name: "Master",
    minMMR: 3800,
    color: "#f43f5e",
    badgeBg: "bg-rose-500/20 text-rose-800 dark:text-rose-300",
    badgeBorder: "border-rose-500/30",
    badgeText: "text-rose-800 dark:text-rose-300",
  },
  {
    name: "Grandmaster",
    minMMR: 4300,
    color: "#fbbf24",
    badgeBg: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
    badgeBorder: "border-amber-500/30",
    badgeText: "text-amber-800 dark:text-amber-300",
  },
  {
    name: "Challenger",
    minMMR: 4800,
    color: "#ec4899",
    badgeBg: "bg-pink-500/20 text-pink-800 dark:text-pink-300",
    badgeBorder: "border-pink-500/30",
    badgeText: "text-pink-800 dark:text-pink-300",
  },
];

export function getRankFromMMR(mmr: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (mmr >= RANK_TIERS[i].minMMR) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export function calculateMMRChange(
  winnerTeamAvgMMR: number,
  loserTeamAvgMMR: number
): { winnerGain: number; loserLoss: number } {
  const K = 32;
  const expectedWin = 1 / (1 + Math.pow(10, (loserTeamAvgMMR - winnerTeamAvgMMR) / 400));
  const gain = Math.max(8, Math.min(48, Math.round(K * (1 - expectedWin))));
  return {
    winnerGain: gain,
    loserLoss: gain,
  };
}
