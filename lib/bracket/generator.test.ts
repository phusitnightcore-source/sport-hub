import { describe, it, expect } from "vitest";
import {
  generateSingleElimination,
  generateRoundRobin,
  calculateRoundRobinStandings,
  generateGroupKnockoutCrossBracket,
  type TeamEntry,
} from "./generator";

const teams8: TeamEntry[] = [
  { id: "1", name: "Team 1", seed: 1 },
  { id: "2", name: "Team 2", seed: 2 },
  { id: "3", name: "Team 3" },
  { id: "4", name: "Team 4" },
  { id: "5", name: "Team 5" },
  { id: "6", name: "Team 6" },
  { id: "7", name: "Team 7" },
  { id: "8", name: "Team 8" },
];

describe("Bracket Generator", () => {
  it("สร้างสาย Single Elimination 8 ทีม ครบ 3 รอบ 7 แมตช์", () => {
    const matches = generateSingleElimination(teams8);

    // 8 teams = 4 QF + 2 SF + 1 Final = 7 matches
    expect(matches.length).toBe(7);

    const r1 = matches.filter((m) => m.round === 1);
    const r2 = matches.filter((m) => m.round === 2);
    const r3 = matches.filter((m) => m.round === 3);

    expect(r1.length).toBe(4);
    expect(r2.length).toBe(2);
    expect(r3.length).toBe(1);

    // Seed 1 should be at top slot
    expect(r1[0].team_a_id).toBe("1");
    // Seed 2 should be at bottom slot
    expect(r1[3].team_b_id).toBe("2");
  });

  it("สร้างสาย Single Elimination พร้อมรอบชิงอันดับ 3 (7 + 1 = 8 แมตช์)", () => {
    const matches = generateSingleElimination(teams8, { hasThirdPlaceMatch: true });
    expect(matches.length).toBe(8);

    const thirdPlaceMatch = matches.find((m) => m.match_type === "third_place");
    expect(thirdPlaceMatch).toBeDefined();
    expect(thirdPlaceMatch?.round).toBe(3);
    expect(thirdPlaceMatch?.bracket_pos).toBe(1);
  });

  it("สร้างสาย Single Elimination 7 ทีม มี Bye 1 ทีมและเลื่อนเข้ารอบ 2 อัตโนมัติ", () => {
    const teams7 = teams8.slice(0, 7);
    const matches = generateSingleElimination(teams7);

    expect(matches.length).toBe(7); // 8-bracket size

    // At least one round 1 match has completed status due to Bye
    const byeMatches = matches.filter((m) => m.round === 1 && m.status === "completed");
    expect(byeMatches.length).toBe(1);

    // And round 2 should have that team pre-placed
    const r2 = matches.filter((m) => m.round === 2);
    const hasPrePlaced = r2.some((m) => m.team_a_id !== null || m.team_b_id !== null);
    expect(hasPrePlaced).toBe(true);
  });

  it("สร้างแมตช์ Round Robin 4 ทีม พบกันหมด 6 แมตช์", () => {
    const teams4 = teams8.slice(0, 4);
    const matches = generateRoundRobin(teams4);

    // 4 teams = 4 * 3 / 2 = 6 matches
    expect(matches.length).toBe(6);
  });

  it("คำนวณตารางคะแนน Round Robin และจัดอันดับตามแต้มและเกมได้เสีย", () => {
    const teams4 = teams8.slice(0, 4);
    const matches = [
      {
        team_a_id: "1",
        team_b_id: "2",
        winner_id: "1",
        score_a_games: 2,
        score_b_games: 0,
        score_a_points: 42,
        score_b_points: 20,
      },
      {
        team_a_id: "1",
        team_b_id: "3",
        winner_id: "1",
        score_a_games: 2,
        score_b_games: 1,
        score_a_points: 55,
        score_b_points: 40,
      },
    ];

    const standings = calculateRoundRobinStandings(teams4, matches);
    expect(standings[0].teamId).toBe("1");
    expect(standings[0].points).toBe(2);
    expect(standings[0].won).toBe(2);
    expect(standings[0].gamesDiff).toBe(3); // (2-0) + (2-1) = 3
  });

  it("สร้างสาย Group+Knockout ไขว้สาย A1 vs B2 และ B1 vs A2 พร้อมชิงอันดับ 3", () => {
    const groupWinners = [
      { groupName: "Group A", firstTeamId: "teamA1", secondTeamId: "teamA2" },
      { groupName: "Group B", firstTeamId: "teamB1", secondTeamId: "teamB2" },
    ];

    const matches = generateGroupKnockoutCrossBracket(groupWinners, true);
    // 2 SF + 1 Final + 1 Third place = 4 matches
    expect(matches.length).toBe(4);

    // Semifinal 1: A1 vs B2
    const sf1 = matches.find((m) => m.round === 1 && m.bracket_pos === 0);
    expect(sf1?.team_a_id).toBe("teamA1");
    expect(sf1?.team_b_id).toBe("teamB2");

    // Semifinal 2: B1 vs A2
    const sf2 = matches.find((m) => m.round === 1 && m.bracket_pos === 1);
    expect(sf2?.team_a_id).toBe("teamB1");
    expect(sf2?.team_b_id).toBe("teamA2");

    // 3rd place match
    const third = matches.find((m) => m.match_type === "third_place");
    expect(third).toBeDefined();
  });
});
