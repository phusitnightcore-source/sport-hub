export function expectedScore(rating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function calculateEloChange(
  rating: number,
  opponentRating: number,
  result: "win" | "loss",
  kFactor = 32,
) {
  const actual = result === "win" ? 1 : 0;
  return Math.round(kFactor * (actual - expectedScore(rating, opponentRating)));
}
