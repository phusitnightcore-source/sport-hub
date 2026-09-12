export type EventType = "MS" | "WS" | "MD" | "WD" | "XD";

export interface Player {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface Team {
  id: string;
  name: string;
  player1: Player;
  player2?: Player;
}

export interface CourtPositions {
  // Team 1 is positioned at bottom (serving upwards) or top
  team1_left: Player | null;   // Left service box (odd score)
  team1_right: Player | null;  // Right service box (even score)
  team2_left: Player | null;   // Left service box (odd score)
  team2_right: Player | null;  // Right service box (even score)
}

export interface ScoreEvent {
  seq: number;
  scoring_team: 1 | 2;
  team1_score: number;
  team2_score: number;
  serving_team: 1 | 2;
  server_player_id: string;
  positions: CourtPositions;
}

export type GameStatus =
  | "in_progress"
  | "interval"
  | "game_point"
  | "match_point"
  | "game_finished"
  | "match_finished"
  | "walkover"
  | "retired";

export interface GameScore {
  gameNo: number;
  team1_score: number;
  team2_score: number;
  winner: 1 | 2;
}

export interface MatchState {
  eventType: EventType;
  team1: Team;
  team2: Team;
  bestOf: number;
  pointsPerGame: number;
  maxPoints: number;

  // Games progression
  currentGameNo: number;
  team1_games_won: number;
  team2_games_won: number;
  completedGames: GameScore[];

  // Current Game State
  team1_score: number;
  team2_score: number;
  serving_team: 1 | 2;
  server_player_id: string;
  receiver_player_id: string;
  positions: CourtPositions;

  // Flags according to BWF
  status: GameStatus;
  isInterval: boolean;
  hasHadInterval: boolean;
  isDeuce: boolean;
  isGamePoint: boolean;
  isMatchPoint: boolean;
  gameWinner: 1 | 2 | null;
  matchWinner: 1 | 2 | null;

  // History for Replay / Undo
  events: ScoreEvent[];
}
