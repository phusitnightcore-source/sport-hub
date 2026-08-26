export interface AvailablePlayer {
  id: string;
  name: string;
  mmr: number;
  skillLevel: string;
  gamesPlayed: number;
  isPlaying: boolean;
}

export function autoGenerateMatch(availablePlayers: AvailablePlayer[]): {
  teamA: AvailablePlayer[];
  teamB: AvailablePlayer[];
} | null {
  // 1. Filter out players currently playing on court
  const waitingPlayers = availablePlayers.filter((p) => !p.isPlaying);

  if (waitingPlayers.length < 4) {
    return null;
  }

  // 2. Sort by fewest games played first, then by MMR similarity
  const sorted = [...waitingPlayers].sort((a, b) => {
    if (a.gamesPlayed !== b.gamesPlayed) {
      return a.gamesPlayed - b.gamesPlayed;
    }
    return b.mmr - a.mmr;
  });

  // Pick top 4 priority players
  const candidatePool = sorted.slice(0, Math.min(8, sorted.length));

  // Find the combination of 4 players with the closest MMR variance
  let bestFour = candidatePool.slice(0, 4);

  // 3. Balance 2 teams (Team A vs Team B) from these 4 players: (P1 + P4) vs (P2 + P3)
  const sortedFour = [...bestFour].sort((a, b) => b.mmr - a.mmr);
  const p1 = sortedFour[0];
  const p2 = sortedFour[1];
  const p3 = sortedFour[2];
  const p4 = sortedFour[3];

  return {
    teamA: [p1, p4],
    teamB: [p2, p3],
  };
}
