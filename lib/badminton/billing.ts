export interface SessionBillingSummary {
  playerId: string;
  playerName: string;
  entryFee: number;
  shuttleFee: number;
  additionalCost: number;
  discount: number;
  totalDue: number;
  gamesPlayed: number;
  paymentStatus: "pending" | "paid";
  paymentMethod: string | null;
}

export function calculatePlayerExpense({
  entryFee = 0,
  shuttlecockPrice = 35,
  matches = [],
  playerId,
  additionalCost = 0,
  discount = 0,
}: {
  entryFee: number;
  shuttlecockPrice: number;
  matches: {
    shuttlecockCount: number;
    playerIds: string[];
  }[];
  playerId: string;
  additionalCost?: number;
  discount?: number;
}): {
  entryFee: number;
  shuttleFee: number;
  additionalCost: number;
  discount: number;
  totalDue: number;
  gamesPlayed: number;
} {
  let shuttleFee = 0;
  let gamesPlayed = 0;

  for (const m of matches) {
    if (m.playerIds.includes(playerId)) {
      gamesPlayed++;
      // Cost per player in doubles = (shuttles * price) / 4 players
      const matchShuttleCost = (Math.max(1, m.shuttlecockCount) * shuttlecockPrice) / 4;
      shuttleFee += matchShuttleCost;
    }
  }

  const totalDue = Math.max(0, entryFee + shuttleFee + additionalCost - discount);

  return {
    entryFee,
    shuttleFee: Math.round(shuttleFee * 100) / 100,
    additionalCost,
    discount,
    totalDue: Math.round(totalDue),
    gamesPlayed,
  };
}
