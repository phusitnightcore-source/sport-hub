export interface TeamEntry {
  id: string;
  name: string;
  seed?: number | null;
  groupId?: string | null;
}

export interface GeneratedMatch {
  round: number;
  bracket_pos: number;
  team_a_id: string | null;
  team_b_id: string | null;
  status: "pending" | "scheduled" | "completed";
  stage: "group" | "knockout";
  match_type?: "group" | "knockout" | "third_place";
  group_id?: string | null;
  next_match_round?: number;
  next_match_pos?: number;
  next_match_slot?: 1 | 2;
  loser_next_match_round?: number;
  loser_next_match_pos?: number;
  loser_next_match_slot?: 1 | 2;
  notes?: string | null;
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;       // 1 point per match win
  gamesWon: number;
  gamesLost: number;
  gamesDiff: number;
  pointsWon: number;
  pointsLost: number;
  pointsDiff: number;
}

/**
 * Generates a Single Elimination bracket with automatic Byes, Seeds, and optional 3rd Place Match.
 */
export function generateSingleElimination(
  teams: TeamEntry[],
  options?: { hasThirdPlaceMatch?: boolean }
): GeneratedMatch[] {
  if (teams.length < 2) return [];

  // Determine bracket power of 2 (2, 4, 8, 16, 32, 64)
  let bracketSize = 2;
  while (bracketSize < teams.length) {
    bracketSize *= 2;
  }
  const totalRounds = Math.log2(bracketSize);

  // Prepare seed slots
  const slots: (TeamEntry | null)[] = new Array(bracketSize).fill(null);

  // Sort seeded teams first, then unseeded
  const seeded = teams.filter((t) => typeof t.seed === "number" && t.seed > 0);
  seeded.sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
  const unseeded = teams.filter((t) => !t.seed || t.seed <= 0);

  // Shuffle unseeded
  const shuffledUnseeded = [...unseeded].sort(() => Math.random() - 0.5);

  // Standard seed positions for bracketSize
  // Seed 1: top, Seed 2: bottom
  if (bracketSize >= 2) {
    if (seeded[0]) slots[0] = seeded[0];
    if (seeded[1]) slots[bracketSize - 1] = seeded[1];
  }
  if (bracketSize >= 4) {
    if (seeded[2]) slots[Math.floor(bracketSize / 2)] = seeded[2];
    if (seeded[3]) slots[Math.floor(bracketSize / 2) - 1] = seeded[3];
  }

  // Fill remaining slots with unseeded teams, rest are Byes (null)
  let unseededIdx = 0;
  for (let i = 0; i < bracketSize; i++) {
    if (!slots[i] && unseededIdx < shuffledUnseeded.length) {
      slots[i] = shuffledUnseeded[unseededIdx++];
    }
  }

  const allMatches: GeneratedMatch[] = [];

  // Generate structure from round 1 to Final (totalRounds)
  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRound = Math.pow(2, totalRounds - r);

    for (let pos = 0; pos < matchesInRound; pos++) {
      let teamAId: string | null = null;
      let teamBId: string | null = null;
      let status: "pending" | "scheduled" | "completed" = "scheduled";

      if (r === 1) {
        const teamA = slots[pos * 2];
        const teamB = slots[pos * 2 + 1];
        teamAId = teamA ? teamA.id : null;
        teamBId = teamB ? teamB.id : null;

        // If one side has Bye (null), the other automatically wins this round
        if (teamAId && !teamBId) {
          status = "completed"; // Bye win
        } else if (!teamAId && teamBId) {
          status = "completed";
        }
      } else {
        status = "pending";
      }

      const match: GeneratedMatch = {
        round: r,
        bracket_pos: pos,
        team_a_id: teamAId,
        team_b_id: teamBId,
        status,
        stage: "knockout",
        match_type: "knockout",
      };

      if (r < totalRounds) {
        match.next_match_round = r + 1;
        match.next_match_pos = Math.floor(pos / 2);
        match.next_match_slot = pos % 2 === 0 ? 1 : 2;
      }

      allMatches.push(match);
    }
  }

  // Advance byes from round 1 to round 2
  for (const m1 of allMatches.filter((m) => m.round === 1 && m.status === "completed")) {
    const winnerId = m1.team_a_id || m1.team_b_id;
    if (winnerId && m1.next_match_round && typeof m1.next_match_pos === "number") {
      const nextMatch = allMatches.find(
        (m) => m.round === m1.next_match_round && m.bracket_pos === m1.next_match_pos
      );
      if (nextMatch) {
        if (m1.next_match_slot === 1) nextMatch.team_a_id = winnerId;
        else nextMatch.team_b_id = winnerId;
        if (nextMatch.team_a_id && nextMatch.team_b_id) {
          nextMatch.status = "scheduled";
        }
      }
    }
  }

  // Add 3rd Place Match if enabled and tournament has semifinals (totalRounds >= 2)
  if (options?.hasThirdPlaceMatch && totalRounds >= 2) {
    const semiFinals = allMatches.filter((match) => match.round === totalRounds - 1);
    semiFinals.forEach((semiFinal, index) => {
      semiFinal.loser_next_match_round = totalRounds;
      semiFinal.loser_next_match_pos = 1;
      semiFinal.loser_next_match_slot = index === 0 ? 1 : 2;
    });

    allMatches.push({
      round: totalRounds,
      bracket_pos: 1, // 0 = Final, 1 = 3rd Place Match
      team_a_id: null,
      team_b_id: null,
      status: "pending",
      stage: "knockout",
      match_type: "third_place",
      notes: "ชิงอันดับ 3 (ผู้แพ้รอบรองชนะเลิศ)",
    });
  }

  return allMatches;
}

/**
 * Generates Round Robin matches for a list of teams using the circle/Berger method.
 */
export function generateRoundRobin(
  teams: TeamEntry[],
  groupId?: string | null
): GeneratedMatch[] {
  if (teams.length < 2) return [];

  const teamList = [...teams];
  // If odd, add a dummy team for Byes
  const isOdd = teamList.length % 2 !== 0;
  if (isOdd) {
    teamList.push({ id: "__BYE__", name: "Bye" });
  }

  const n = teamList.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const matches: GeneratedMatch[] = [];

  for (let r = 1; r <= totalRounds; r++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const t1 = teamList[i];
      const t2 = teamList[n - 1 - i];

      // Skip match if one of the teams is the dummy Bye
      if (t1.id === "__BYE__" || t2.id === "__BYE__") continue;

      matches.push({
        round: r,
        bracket_pos: matches.length,
        team_a_id: t1.id,
        team_b_id: t2.id,
        status: "scheduled",
        stage: "group",
        match_type: "group",
        group_id: groupId || null,
      });
    }

    // Rotate elements, keeping first element fixed
    const last = teamList.pop()!;
    teamList.splice(1, 0, last);
  }

  return matches;
}

/**
 * Double elimination for compact, one-day badminton events (4 or 8 teams).
 * Every winners-bracket loss has an explicit loser route; the grand final is
 * a single deciding match, which is the practical default for venue events.
 */
export function generateDoubleElimination(teams: TeamEntry[]): GeneratedMatch[] {
  if (teams.length !== 4 && teams.length !== 8) return [];
  const matches: GeneratedMatch[] = [];
  const add = (match: GeneratedMatch) => matches.push(match);

  const winnerFirstRoundCount = teams.length / 2;
  for (let index = 0; index < winnerFirstRoundCount; index++) {
    add({
      round: 1,
      bracket_pos: index,
      team_a_id: teams[index * 2].id,
      team_b_id: teams[index * 2 + 1].id,
      status: "scheduled",
      stage: "knockout",
      match_type: "knockout",
      notes: "สายผู้ชนะ",
    });
  }

  if (teams.length === 4) {
    add({ round: 2, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "รอบชิงสายผู้ชนะ" });
    add({ round: 2, bracket_pos: 1, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้แพ้ รอบ 1" });
    add({ round: 3, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "รอบชิงสายผู้แพ้" });
    add({ round: 4, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "Grand Final" });

    matches[0] = { ...matches[0], next_match_round: 2, next_match_pos: 0, next_match_slot: 1, loser_next_match_round: 2, loser_next_match_pos: 1, loser_next_match_slot: 1 };
    matches[1] = { ...matches[1], next_match_round: 2, next_match_pos: 0, next_match_slot: 2, loser_next_match_round: 2, loser_next_match_pos: 1, loser_next_match_slot: 2 };
    matches[2] = { ...matches[2], next_match_round: 4, next_match_pos: 0, next_match_slot: 1, loser_next_match_round: 3, loser_next_match_pos: 0, loser_next_match_slot: 2 };
    matches[3] = { ...matches[3], next_match_round: 3, next_match_pos: 0, next_match_slot: 1 };
    matches[4] = { ...matches[4], next_match_round: 4, next_match_pos: 0, next_match_slot: 2 };
    return matches;
  }

  add({ round: 2, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้ชนะ รอบรอง 1" });
  add({ round: 2, bracket_pos: 1, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้ชนะ รอบรอง 2" });
  add({ round: 2, bracket_pos: 2, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้แพ้ รอบ 1" });
  add({ round: 2, bracket_pos: 3, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้แพ้ รอบ 1" });
  add({ round: 3, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "รอบชิงสายผู้ชนะ" });
  add({ round: 3, bracket_pos: 1, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้แพ้ รอบ 2" });
  add({ round: 3, bracket_pos: 2, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้แพ้ รอบ 2" });
  add({ round: 4, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "สายผู้แพ้ รอบ 3" });
  add({ round: 5, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "รอบชิงสายผู้แพ้" });
  add({ round: 6, bracket_pos: 0, team_a_id: null, team_b_id: null, status: "pending", stage: "knockout", match_type: "knockout", notes: "Grand Final" });

  for (let index = 0; index < 4; index++) {
    const winnerTarget = index < 2 ? index : index - 2;
    const winnerSlot = index % 2 === 0 ? 1 : 2;
    const loserTarget = index < 2 ? 2 : 3;
    const loserSlot = index % 2 === 0 ? 1 : 2;
    matches[index] = { ...matches[index], next_match_round: 2, next_match_pos: winnerTarget, next_match_slot: winnerSlot, loser_next_match_round: 2, loser_next_match_pos: loserTarget, loser_next_match_slot: loserSlot };
  }
  matches[4] = { ...matches[4], next_match_round: 3, next_match_pos: 0, next_match_slot: 1, loser_next_match_round: 3, loser_next_match_pos: 1, loser_next_match_slot: 2 };
  matches[5] = { ...matches[5], next_match_round: 3, next_match_pos: 0, next_match_slot: 2, loser_next_match_round: 3, loser_next_match_pos: 2, loser_next_match_slot: 2 };
  matches[6] = { ...matches[6], next_match_round: 3, next_match_pos: 1, next_match_slot: 1 };
  matches[7] = { ...matches[7], next_match_round: 3, next_match_pos: 2, next_match_slot: 1 };
  matches[8] = { ...matches[8], next_match_round: 6, next_match_pos: 0, next_match_slot: 1, loser_next_match_round: 5, loser_next_match_pos: 0, loser_next_match_slot: 2 };
  matches[9] = { ...matches[9], next_match_round: 4, next_match_pos: 0, next_match_slot: 1 };
  matches[10] = { ...matches[10], next_match_round: 4, next_match_pos: 0, next_match_slot: 2 };
  matches[11] = { ...matches[11], next_match_round: 5, next_match_pos: 0, next_match_slot: 1 };
  matches[12] = { ...matches[12], next_match_round: 6, next_match_pos: 0, next_match_slot: 2 };
  return matches;
}

/**
 * Generates Cross Knockout Bracket from top 2 teams of each group (Group + Knockout):
 * - 2 Groups: A1 vs B2, B1 vs A2 -> Final (+ optional 3rd place)
 * - 4 Groups: A1 vs B2, C1 vs D2, B1 vs A2, D1 vs C2 -> QF -> SF -> Final (+ optional 3rd place)
 */
export function generateGroupKnockoutCrossBracket(
  groupWinners: { groupName: string; firstTeamId: string; secondTeamId: string }[],
  hasThirdPlaceMatch = true
): GeneratedMatch[] {
  if (groupWinners.length < 2) return [];

  const matches: GeneratedMatch[] = [];

  if (groupWinners.length === 2) {
    const [gA, gB] = groupWinners;

    // Round 1: Semifinals (2 matches)
    matches.push({
      round: 1,
      bracket_pos: 0,
      team_a_id: gA.firstTeamId,   // A1
      team_b_id: gB.secondTeamId,  // B2
      status: "scheduled",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 2,
      next_match_pos: 0,
      next_match_slot: 1,
      loser_next_match_round: hasThirdPlaceMatch ? 2 : undefined,
      loser_next_match_pos: hasThirdPlaceMatch ? 1 : undefined,
      loser_next_match_slot: hasThirdPlaceMatch ? 1 : undefined,
      notes: "รอบรองชนะเลิศ 1 (A1 vs B2)",
    });

    matches.push({
      round: 1,
      bracket_pos: 1,
      team_a_id: gB.firstTeamId,   // B1
      team_b_id: gA.secondTeamId,  // A2
      status: "scheduled",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 2,
      next_match_pos: 0,
      next_match_slot: 2,
      loser_next_match_round: hasThirdPlaceMatch ? 2 : undefined,
      loser_next_match_pos: hasThirdPlaceMatch ? 1 : undefined,
      loser_next_match_slot: hasThirdPlaceMatch ? 2 : undefined,
      notes: "รอบรองชนะเลิศ 2 (B1 vs A2)",
    });

    // Round 2: Final
    matches.push({
      round: 2,
      bracket_pos: 0,
      team_a_id: null,
      team_b_id: null,
      status: "pending",
      stage: "knockout",
      match_type: "knockout",
      notes: "รอบชิงชนะเลิศ (Final)",
    });

    // Round 2: 3rd Place Match
    if (hasThirdPlaceMatch) {
      matches.push({
        round: 2,
        bracket_pos: 1,
        team_a_id: null,
        team_b_id: null,
        status: "pending",
        stage: "knockout",
        match_type: "third_place",
        notes: "ชิงอันดับ 3 (ผู้แพ้รอบตัดเชือก)",
      });
    }
  } else if (groupWinners.length >= 4) {
    const [gA, gB, gC, gD] = groupWinners;

    // Round 1: Quarterfinals (4 matches)
    matches.push({
      round: 1,
      bracket_pos: 0,
      team_a_id: gA.firstTeamId,
      team_b_id: gB.secondTeamId,
      status: "scheduled",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 2,
      next_match_pos: 0,
      next_match_slot: 1,
      notes: "รอบ 8 ทีม (A1 vs B2)",
    });

    matches.push({
      round: 1,
      bracket_pos: 1,
      team_a_id: gC.firstTeamId,
      team_b_id: gD.secondTeamId,
      status: "scheduled",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 2,
      next_match_pos: 0,
      next_match_slot: 2,
      notes: "รอบ 8 ทีม (C1 vs D2)",
    });

    matches.push({
      round: 1,
      bracket_pos: 2,
      team_a_id: gB.firstTeamId,
      team_b_id: gA.secondTeamId,
      status: "scheduled",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 2,
      next_match_pos: 1,
      next_match_slot: 1,
      notes: "รอบ 8 ทีม (B1 vs A2)",
    });

    matches.push({
      round: 1,
      bracket_pos: 3,
      team_a_id: gD.firstTeamId,
      team_b_id: gC.secondTeamId,
      status: "scheduled",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 2,
      next_match_pos: 1,
      next_match_slot: 2,
      notes: "รอบ 8 ทีม (D1 vs C2)",
    });

    // Round 2: Semifinals (2 matches)
    matches.push({
      round: 2,
      bracket_pos: 0,
      team_a_id: null,
      team_b_id: null,
      status: "pending",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 3,
      next_match_pos: 0,
      next_match_slot: 1,
      loser_next_match_round: hasThirdPlaceMatch ? 3 : undefined,
      loser_next_match_pos: hasThirdPlaceMatch ? 1 : undefined,
      loser_next_match_slot: hasThirdPlaceMatch ? 1 : undefined,
      notes: "รอบรองชนะเลิศ 1",
    });

    matches.push({
      round: 2,
      bracket_pos: 1,
      team_a_id: null,
      team_b_id: null,
      status: "pending",
      stage: "knockout",
      match_type: "knockout",
      next_match_round: 3,
      next_match_pos: 0,
      next_match_slot: 2,
      loser_next_match_round: hasThirdPlaceMatch ? 3 : undefined,
      loser_next_match_pos: hasThirdPlaceMatch ? 1 : undefined,
      loser_next_match_slot: hasThirdPlaceMatch ? 2 : undefined,
      notes: "รอบรองชนะเลิศ 2",
    });

    // Round 3: Final
    matches.push({
      round: 3,
      bracket_pos: 0,
      team_a_id: null,
      team_b_id: null,
      status: "pending",
      stage: "knockout",
      match_type: "knockout",
      notes: "รอบชิงชนะเลิศ (Final)",
    });

    // Round 3: 3rd Place Match
    if (hasThirdPlaceMatch) {
      matches.push({
        round: 3,
        bracket_pos: 1,
        team_a_id: null,
        team_b_id: null,
        status: "pending",
        stage: "knockout",
        match_type: "third_place",
        notes: "ชิงอันดับ 3 (ผู้แพ้รอบตัดเชือก)",
      });
    }
  }

  return matches;
}

/**
 * Calculates Round Robin Standings according to BWF rules:
 * 1. Matches Won (points)
 * 2. Games Difference (Games Won - Games Lost)
 * 3. Points Difference (Points Won - Points Lost)
 * 4. Head-to-Head
 */
export function calculateRoundRobinStandings(
  teams: TeamEntry[],
  completedMatches: {
    team_a_id: string;
    team_b_id: string;
    winner_id: string;
    score_a_games?: number;
    score_b_games?: number;
    score_a_points?: number;
    score_b_points?: number;
  }[]
): StandingRow[] {
  const standingsMap = new Map<string, StandingRow>();

  for (const t of teams) {
    standingsMap.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDiff: 0,
      pointsWon: 0,
      pointsLost: 0,
      pointsDiff: 0,
    });
  }

  for (const m of completedMatches) {
    const sA = standingsMap.get(m.team_a_id);
    const sB = standingsMap.get(m.team_b_id);
    if (!sA || !sB) continue;

    sA.played++;
    sB.played++;

    const gA = m.score_a_games ?? 0;
    const gB = m.score_b_games ?? 0;
    const pA = m.score_a_points ?? 0;
    const pB = m.score_b_points ?? 0;

    sA.gamesWon += gA;
    sA.gamesLost += gB;
    sA.pointsWon += pA;
    sA.pointsLost += pB;

    sB.gamesWon += gB;
    sB.gamesLost += gA;
    sB.pointsWon += pB;
    sB.pointsLost += pA;

    if (m.winner_id === m.team_a_id) {
      sA.won++;
      sA.points++;
      sB.lost++;
    } else if (m.winner_id === m.team_b_id) {
      sB.won++;
      sB.points++;
      sA.lost++;
    }
  }

  // Calculate diffs
  for (const s of standingsMap.values()) {
    s.gamesDiff = s.gamesWon - s.gamesLost;
    s.pointsDiff = s.pointsWon - s.pointsLost;
  }

  // Sort by BWF tiebreaker
  return Array.from(standingsMap.values()).sort((a, b) => {
    // 1. Matches won
    if (b.points !== a.points) return b.points - a.points;
    // 2. Games diff
    if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
    // 3. Points diff
    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
    // 4. Head-to-head lookup if 2 teams tied
    const h2h = completedMatches.find(
      (m) =>
        (m.team_a_id === a.teamId && m.team_b_id === b.teamId) ||
        (m.team_a_id === b.teamId && m.team_b_id === a.teamId)
    );
    if (h2h) {
      if (h2h.winner_id === a.teamId) return -1;
      if (h2h.winner_id === b.teamId) return 1;
    }
    // 5. Alphabetical fallback
    return a.teamName.localeCompare(b.teamName);
  });
}
