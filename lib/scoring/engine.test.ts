import { describe, it, expect } from "vitest";
import {
  initMatchState,
  addPoint,
  undoPoint,
  startNextGame,
  setWalkover,
} from "./engine";
import type { Team } from "./types";

const teamA: Team = {
  id: "t1",
  name: "ทีม A",
  player1: { id: "p1", name: "ผู้เล่น A1" },
  player2: { id: "p2", name: "ผู้เล่น A2" },
};

const teamB: Team = {
  id: "t2",
  name: "ทีม B",
  player1: { id: "p3", name: "ผู้เล่น B1" },
  player2: { id: "p4", name: "ผู้เล่น B2" },
};

describe("BWF Scoring Engine", () => {
  it("เริ่มต้นแมตช์ที่ 0-0 ทีม 1 เสิร์ฟคอร์ทขวา", () => {
    const match = initMatchState({
      eventType: "MD",
      team1: teamA,
      team2: teamB,
    });

    expect(match.team1_score).toBe(0);
    expect(match.team2_score).toBe(0);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p1");
    expect(match.positions.team1_right?.id).toBe("p1");
    expect(match.positions.team1_left?.id).toBe("p2");
    expect(match.positions.team2_right?.id).toBe("p3");
    expect(match.positions.team2_left?.id).toBe("p4");
  });

  it("ประเภทคู่: ฝั่งเสิร์ฟได้แต้ม คนเดิมเสิร์ฟต่อและสลับช่องซ้าย-ขวา", () => {
    let match = initMatchState({
      eventType: "MD",
      team1: teamA,
      team2: teamB,
    });

    // Team 1 scores -> 1-0
    match = addPoint(match, 1);

    expect(match.team1_score).toBe(1);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p1"); // Same server
    // Swapped! Now p1 is on left box (1 is odd)
    expect(match.positions.team1_left?.id).toBe("p1");
    expect(match.positions.team1_right?.id).toBe("p2");
  });

  it("ประเภทคู่: ฝั่งรับได้แต้ม สิทธิ์เสิร์ฟเปลี่ยนฝั่ง ผู้เล่นไม่สลับตำแหน่ง", () => {
    let match = initMatchState({
      eventType: "MD",
      team1: teamA,
      team2: teamB,
    });

    // Team 1 scores -> 1-0 (p1 left, p2 right)
    match = addPoint(match, 1);

    // Team 2 scores -> 1-1 (Turnover)
    match = addPoint(match, 2);

    expect(match.team1_score).toBe(1);
    expect(match.team2_score).toBe(1);
    expect(match.serving_team).toBe(2);

    // Team 2 score is 1 (odd) -> player in LEFT box serves (p4)
    expect(match.positions.team2_left?.id).toBe("p4");
    expect(match.positions.team2_right?.id).toBe("p3");
    expect(match.server_player_id).toBe("p4");
  });

  it("แจ้งเตือน Interval เมื่อฝั่งใดฝั่งหนึ่งถึง 11 แต้ม", () => {
    let match = initMatchState({
      eventType: "MS",
      team1: teamA,
      team2: teamB,
    });

    for (let i = 0; i < 11; i++) {
      match = addPoint(match, 1);
    }

    expect(match.team1_score).toBe(11);
    expect(match.isInterval).toBe(true);
  });

  it("กติกาดิวส์ 20-20 ต้องชนะห่าง 2 แต้ม", () => {
    let match = initMatchState({
      eventType: "MS",
      team1: teamA,
      team2: teamB,
    });

    // Bring score to 20-20
    for (let i = 0; i < 20; i++) {
      match = addPoint(match, 1);
      match = addPoint(match, 2);
    }

    expect(match.team1_score).toBe(20);
    expect(match.team2_score).toBe(20);
    expect(match.isDeuce).toBe(true);
    expect(match.status).toBe("in_progress");

    // 21-20 -> Game point but not finished
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(21);
    expect(match.isGamePoint).toBe(true);
    expect(match.status).toBe("in_progress");

    // 22-20 -> Team 1 wins game 1
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(22);
    expect(match.gameWinner).toBe(1);
    expect(match.status).toBe("game_finished");
  });

  it("กติกาตันที่ 30 แต้ม (Golden Point 29-29 -> 30-29 ชนะทันที)", () => {
    let match = initMatchState({
      eventType: "MS",
      team1: teamA,
      team2: teamB,
    });

    // Bring score to 29-29
    for (let i = 0; i < 29; i++) {
      match = addPoint(match, 1);
      match = addPoint(match, 2);
    }

    expect(match.team1_score).toBe(29);
    expect(match.team2_score).toBe(29);
    expect(match.isGamePoint).toBe(true);

    // 30-29 -> Team 1 reaches 30 and wins!
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(30);
    expect(match.gameWinner).toBe(1);
    expect(match.status).toBe("game_finished");
  });

  it("Undo สามารถย้อนแต้มและคืนตำแหน่งผู้เล่นได้อย่างแม่นยำ 100%", () => {
    let match = initMatchState({
      eventType: "MD",
      team1: teamA,
      team2: teamB,
    });

    match = addPoint(match, 1); // 1-0
    match = addPoint(match, 2); // 1-1
    match = addPoint(match, 1); // 2-1

    expect(match.team1_score).toBe(2);
    expect(match.team2_score).toBe(1);

    // Undo 1 point -> back to 1-1
    match = undoPoint(match);
    expect(match.team1_score).toBe(1);
    expect(match.team2_score).toBe(1);
    expect(match.serving_team).toBe(2);

    // Undo another point -> back to 1-0
    match = undoPoint(match);
    expect(match.team1_score).toBe(1);
    expect(match.team2_score).toBe(0);
    expect(match.serving_team).toBe(1);
  });

  it("การแข่งขันจบแมตช์เมื่อชนะ 2 ใน 3 เกม", () => {
    let match = initMatchState({
      eventType: "MS",
      team1: teamA,
      team2: teamB,
      bestOf: 3,
    });

    // Game 1: Team 1 wins 21-0
    for (let i = 0; i < 21; i++) {
      match = addPoint(match, 1);
    }
    expect(match.team1_games_won).toBe(1);
    expect(match.status).toBe("game_finished");

    // Start Game 2
    match = startNextGame(match);
    expect(match.currentGameNo).toBe(2);
    expect(match.team1_score).toBe(0);

    // Game 2: Team 1 wins 21-0 -> Match finished!
    for (let i = 0; i < 21; i++) {
      match = addPoint(match, 1);
    }
    expect(match.team1_games_won).toBe(2);
    expect(match.matchWinner).toBe(1);
    expect(match.status).toBe("match_finished");
  });

  it("รองรับกรณี Walkover ชนะทันที", () => {
    let match = initMatchState({
      eventType: "MS",
      team1: teamA,
      team2: teamB,
    });

    match = setWalkover(match, 1);
    expect(match.matchWinner).toBe(1);
    expect(match.status).toBe("walkover");
    expect(match.team1_games_won).toBe(2);
  });

  it("ทดสอบลำดับการเสิร์ฟประเภทคู่ 8 Rally ตามกติกา BWF ตัวอย่างข้อ 7", () => {
    // Team A: p1 (A1), p2 (A2)
    // Team B: p3 (B1), p4 (B2)
    let match = initMatchState({
      eventType: "MD",
      team1: teamA,
      team2: teamB,
    });

    // เริ่มต้น: A = 0, B = 0, ผู้เสิร์ฟ = A1, ฝั่ง = ขวา
    expect(match.team1_score).toBe(0);
    expect(match.team2_score).toBe(0);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p1"); // A1
    expect(match.positions.team1_right?.id).toBe("p1"); // Right box

    // Rally 1: ผู้ชนะ A -> คะแนน 1-0, ฝ่ายเสิร์ฟ A, ฝั่ง ซ้าย
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(1);
    expect(match.team2_score).toBe(0);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p1"); // A1 ยังเสิร์ฟต่อ
    expect(match.positions.team1_left?.id).toBe("p1"); // สลับมาซ้าย (1 แต้ม = คี่)

    // Rally 2: ผู้ชนะ B -> คะแนน 1-1, ฝ่ายเสิร์ฟ B, ฝั่ง ซ้าย
    match = addPoint(match, 2);
    expect(match.team1_score).toBe(1);
    expect(match.team2_score).toBe(1);
    expect(match.serving_team).toBe(2);
    expect(match.server_player_id).toBe("p4"); // B2 อยู่ฝั่งซ้าย (1 แต้ม = คี่)
    expect(match.positions.team2_left?.id).toBe("p4");

    // Rally 3: ผู้ชนะ B -> คะแนน 1-2, ฝ่ายเสิร์ฟ B, ฝั่ง ขวา
    match = addPoint(match, 2);
    expect(match.team1_score).toBe(1);
    expect(match.team2_score).toBe(2);
    expect(match.serving_team).toBe(2);
    expect(match.server_player_id).toBe("p4"); // B2 ยังเสิร์ฟต่อ สลับมาขวา (2 แต้ม = คู่)
    expect(match.positions.team2_right?.id).toBe("p4");

    // Rally 4: ผู้ชนะ A -> คะแนน 2-2, ฝ่ายเสิร์ฟ A, ฝั่ง ขวา
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(2);
    expect(match.team2_score).toBe(2);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p2"); // A2 อยู่ฝั่งขวา (2 แต้ม = คู่)
    expect(match.positions.team1_right?.id).toBe("p2");

    // Rally 5: ผู้ชนะ A -> คะแนน 3-2, ฝ่ายเสิร์ฟ A, ฝั่ง ซ้าย
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(3);
    expect(match.team2_score).toBe(2);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p2"); // A2 ยังเสิร์ฟต่อ สลับมาซ้าย (3 แต้ม = คี่)
    expect(match.positions.team1_left?.id).toBe("p2");

    // Rally 6: ผู้ชนะ B -> คะแนน 3-3, ฝ่ายเสิร์ฟ B, ฝั่ง ซ้าย
    match = addPoint(match, 2);
    expect(match.team1_score).toBe(3);
    expect(match.team2_score).toBe(3);
    expect(match.serving_team).toBe(2);
    expect(match.server_player_id).toBe("p3"); // B1 อยู่ฝั่งซ้าย (3 แต้ม = คี่)
    expect(match.positions.team2_left?.id).toBe("p3");

    // Rally 7: ผู้ชนะ A -> คะแนน 4-3, ฝ่ายเสิร์ฟ A, ฝั่ง ขวา
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(4);
    expect(match.team2_score).toBe(3);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p1"); // A1 อยู่ฝั่งขวา (4 แต้ม = คู่)
    expect(match.positions.team1_right?.id).toBe("p1");

    // Rally 8: ผู้ชนะ A -> คะแนน 5-3, ฝ่ายเสิร์ฟ A, ฝั่ง ซ้าย
    match = addPoint(match, 1);
    expect(match.team1_score).toBe(5);
    expect(match.team2_score).toBe(3);
    expect(match.serving_team).toBe(1);
    expect(match.server_player_id).toBe("p1"); // A1 ยังเสิร์ฟต่อ สลับมาซ้าย (5 แต้ม = คี่)
    expect(match.positions.team1_left?.id).toBe("p1");
  });
});
