import type {
  MatchState,
  Team,
  EventType,
  CourtPositions,
  ScoreEvent,
  GameStatus,
} from "./types";

export interface MatchConfig {
  eventType: EventType;
  team1: Team;
  team2: Team;
  bestOf?: number;          // Default 3
  pointsPerGame?: number;   // Default 21
  maxPoints?: number;       // Default 30
}

/**
 * Initializes a new match according to BWF rules.
 */
export function initMatchState(config: MatchConfig): MatchState {
  const isDoubles = config.eventType === "MD" || config.eventType === "WD" || config.eventType === "XD";

  const positions: CourtPositions = {
    team1_right: config.team1.player1,
    team1_left: isDoubles ? (config.team1.player2 ?? null) : null,
    team2_right: config.team2.player1,
    team2_left: isDoubles ? (config.team2.player2 ?? null) : null,
  };

  return {
    eventType: config.eventType,
    team1: config.team1,
    team2: config.team2,
    bestOf: config.bestOf ?? 3,
    pointsPerGame: config.pointsPerGame ?? 21,
    maxPoints: config.maxPoints ?? 30,

    currentGameNo: 1,
    team1_games_won: 0,
    team2_games_won: 0,
    completedGames: [],

    team1_score: 0,
    team2_score: 0,
    serving_team: 1,
    server_player_id: config.team1.player1.id,
    receiver_player_id: config.team2.player1.id,
    positions,

    status: "in_progress",
    isInterval: false,
    hasHadInterval: false,
    isDeuce: false,
    isGamePoint: false,
    isMatchPoint: false,
    gameWinner: null,
    matchWinner: null,

    events: [],
  };
}

/**
 * Applies a point to scoringTeam (1 or 2).
 * Follows BWF rally point & rotation rules.
 */
export function addPoint(state: MatchState, scoringTeam: 1 | 2): MatchState {
  if (state.status === "match_finished" || state.status === "game_finished") {
    return state;
  }

  const isDoubles = state.eventType === "MD" || state.eventType === "WD" || state.eventType === "XD";
  const newTeam1Score = scoringTeam === 1 ? state.team1_score + 1 : state.team1_score;
  const newTeam2Score = scoringTeam === 2 ? state.team2_score + 1 : state.team2_score;
  const scoringScore = scoringTeam === 1 ? newTeam1Score : newTeam2Score;

  let newPositions: CourtPositions = { ...state.positions };
  const newServingTeam: 1 | 2 = scoringTeam;
  let newServerId = state.server_player_id;
  let newReceiverId = state.receiver_player_id;

  if (isDoubles) {
    if (scoringTeam === state.serving_team) {
      // 1. Serving side won rally:
      // Same server continues, SWAPS boxes with partner!
      if (scoringTeam === 1) {
        newPositions = {
          ...newPositions,
          team1_right: state.positions.team1_left,
          team1_left: state.positions.team1_right,
        };
      } else {
        newPositions = {
          ...newPositions,
          team2_right: state.positions.team2_left,
          team2_left: state.positions.team2_right,
        };
      }
      newServerId = state.server_player_id;
    } else {
      // 2. Receiving side won rally (Turnover):
      // Service turns over, PLAYERS DO NOT SWAP BOXES!
      // New server is chosen by new score parity:
      // Even -> player standing in RIGHT box; Odd -> player in LEFT box
      const isEven = scoringScore % 2 === 0;
      if (scoringTeam === 1) {
        newServerId = isEven
          ? newPositions.team1_right!.id
          : newPositions.team1_left!.id;
      } else {
        newServerId = isEven
          ? newPositions.team2_right!.id
          : newPositions.team2_left!.id;
      }
    }

    // Set receiver diagonally opposite server
    const serverScore = scoringTeam === 1 ? newTeam1Score : newTeam2Score;
    const serverIsRight = serverScore % 2 === 0;
    if (scoringTeam === 1) {
      newReceiverId = serverIsRight
        ? newPositions.team2_right!.id
        : newPositions.team2_left!.id;
    } else {
      newReceiverId = serverIsRight
        ? newPositions.team1_right!.id
        : newPositions.team1_left!.id;
    }
  } else {
    // Singles: Server stands right on even, left on odd
    const serverScore = scoringTeam === 1 ? newTeam1Score : newTeam2Score;
    const isEven = serverScore % 2 === 0;

    if (scoringTeam === 1) {
      newPositions = {
        team1_right: isEven ? state.team1.player1 : null,
        team1_left: isEven ? null : state.team1.player1,
        team2_right: isEven ? state.team2.player1 : null,
        team2_left: isEven ? null : state.team2.player1,
      };
      newServerId = state.team1.player1.id;
      newReceiverId = state.team2.player1.id;
    } else {
      newPositions = {
        team1_right: isEven ? state.team1.player1 : null,
        team1_left: isEven ? null : state.team1.player1,
        team2_right: isEven ? state.team2.player1 : null,
        team2_left: isEven ? null : state.team2.player1,
      };
      newServerId = state.team2.player1.id;
      newReceiverId = state.team1.player1.id;
    }
  }

  // Interval check (11 points)
  let isInterval = false;
  let hasHadInterval = state.hasHadInterval;
  if (!hasHadInterval && (newTeam1Score === 11 || newTeam2Score === 11)) {
    isInterval = true;
    hasHadInterval = true;
  }

  // Check Game Win Condition
  // Win if >= pointsPerGame AND ahead by >= 2 OR reach maxPoints (30)
  const targetPoints = state.pointsPerGame;
  const maxCap = state.maxPoints;

  const team1WonGame =
    (newTeam1Score >= targetPoints && newTeam1Score - newTeam2Score >= 2) ||
    newTeam1Score === maxCap;

  const team2WonGame =
    (newTeam2Score >= targetPoints && newTeam2Score - newTeam1Score >= 2) ||
    newTeam2Score === maxCap;

  let gameWinner: 1 | 2 | null = null;
  let matchWinner: 1 | 2 | null = null;
  let newStatus: GameStatus = isInterval ? "interval" : "in_progress";
  let team1GamesWon = state.team1_games_won;
  let team2GamesWon = state.team2_games_won;
  const completedGames = [...state.completedGames];

  if (team1WonGame || team2WonGame) {
    gameWinner = team1WonGame ? 1 : 2;
    if (gameWinner === 1) team1GamesWon++;
    else team2GamesWon++;

    completedGames.push({
      gameNo: state.currentGameNo,
      team1_score: newTeam1Score,
      team2_score: newTeam2Score,
      winner: gameWinner,
    });

    const gamesToWin = Math.ceil(state.bestOf / 2);
    if (team1GamesWon >= gamesToWin || team2GamesWon >= gamesToWin) {
      matchWinner = team1GamesWon >= gamesToWin ? 1 : 2;
      newStatus = "match_finished";
    } else {
      newStatus = "game_finished";
    }
  }

  // Deuce Check (>= 20-20)
  const isDeuce =
    !gameWinner &&
    newTeam1Score >= targetPoints - 1 &&
    newTeam2Score >= targetPoints - 1 &&
    newTeam1Score === newTeam2Score;

  // Game Point / Match Point Check
  let isGamePoint = false;
  let isMatchPoint = false;

  if (!gameWinner) {
    const gamesToWin = Math.ceil(state.bestOf / 2);
    const team1CanWinNow =
      newTeam1Score >= targetPoints - 1 &&
      (newTeam1Score > newTeam2Score || newTeam1Score === maxCap - 1);
    const team2CanWinNow =
      newTeam2Score >= targetPoints - 1 &&
      (newTeam2Score > newTeam1Score || newTeam2Score === maxCap - 1);

    if (team1CanWinNow) {
      isGamePoint = true;
      if (team1GamesWon === gamesToWin - 1) isMatchPoint = true;
    } else if (team2CanWinNow) {
      isGamePoint = true;
      if (team2GamesWon === gamesToWin - 1) isMatchPoint = true;
    }
  }

  // Log event
  const event: ScoreEvent = {
    seq: state.events.length + 1,
    scoring_team: scoringTeam,
    team1_score: newTeam1Score,
    team2_score: newTeam2Score,
    serving_team: newServingTeam,
    server_player_id: newServerId,
    positions: newPositions,
  };

  return {
    ...state,
    team1_score: newTeam1Score,
    team2_score: newTeam2Score,
    serving_team: newServingTeam,
    server_player_id: newServerId,
    receiver_player_id: newReceiverId,
    positions: newPositions,
    status: newStatus,
    isInterval,
    hasHadInterval,
    isDeuce,
    isGamePoint,
    isMatchPoint,
    gameWinner,
    matchWinner,
    team1_games_won: team1GamesWon,
    team2_games_won: team2GamesWon,
    completedGames,
    events: [...state.events, event],
  };
}

/**
 * Replays all events up to the previous one for 100% reliable Undo.
 */
export function undoPoint(state: MatchState): MatchState {
  if (state.events.length === 0) return state;

  const eventsToReplay = state.events.slice(0, -1);

  // Reset to game start state
  let replayedState = initMatchState({
    eventType: state.eventType,
    team1: state.team1,
    team2: state.team2,
    bestOf: state.bestOf,
    pointsPerGame: state.pointsPerGame,
    maxPoints: state.maxPoints,
  });

  replayedState.currentGameNo = state.currentGameNo;
  replayedState.team1_games_won = state.completedGames.filter((g) => g.winner === 1).length;
  replayedState.team2_games_won = state.completedGames.filter((g) => g.winner === 2).length;
  replayedState.completedGames = state.completedGames.filter((g) => g.gameNo < state.currentGameNo);

  // If game 2 or 3, serving side of previous game winner serves
  const lastGame = replayedState.completedGames[replayedState.completedGames.length - 1];
  if (lastGame) {
    replayedState.serving_team = lastGame.winner;
  }

  for (const ev of eventsToReplay) {
    replayedState = addPoint(replayedState, ev.scoring_team);
  }

  return replayedState;
}

/**
 * Advances to the next game when game_finished.
 */
export function startNextGame(state: MatchState): MatchState {
  if (state.status !== "game_finished" || state.matchWinner) return state;

  const nextGameNo = state.currentGameNo + 1;
  const isDoubles = state.eventType === "MD" || state.eventType === "WD" || state.eventType === "XD";
  const lastWinner = state.gameWinner ?? 1;

  const positions: CourtPositions = {
    team1_right: state.team1.player1,
    team1_left: isDoubles ? (state.team1.player2 ?? null) : null,
    team2_right: state.team2.player1,
    team2_left: isDoubles ? (state.team2.player2 ?? null) : null,
  };

  return {
    ...state,
    currentGameNo: nextGameNo,
    team1_score: 0,
    team2_score: 0,
    serving_team: lastWinner,
    server_player_id: lastWinner === 1 ? state.team1.player1.id : state.team2.player1.id,
    receiver_player_id: lastWinner === 1 ? state.team2.player1.id : state.team1.player1.id,
    positions,
    status: "in_progress",
    isInterval: false,
    hasHadInterval: false,
    isDeuce: false,
    isGamePoint: false,
    isMatchPoint: false,
    gameWinner: null,
  };
}

/**
 * Handles Walkover (team didn't show up).
 */
export function setWalkover(state: MatchState, winningTeam: 1 | 2): MatchState {
  const gamesToWin = Math.ceil(state.bestOf / 2);
  return {
    ...state,
    status: "walkover",
    matchWinner: winningTeam,
    team1_games_won: winningTeam === 1 ? gamesToWin : 0,
    team2_games_won: winningTeam === 2 ? gamesToWin : 0,
  };
}

/**
 * Handles Retired (player injured during match).
 */
export function setRetired(state: MatchState, winningTeam: 1 | 2): MatchState {
  const gamesToWin = Math.ceil(state.bestOf / 2);
  return {
    ...state,
    status: "retired",
    matchWinner: winningTeam,
    team1_games_won: winningTeam === 1 ? gamesToWin : state.team1_games_won,
    team2_games_won: winningTeam === 2 ? gamesToWin : state.team2_games_won,
  };
}
