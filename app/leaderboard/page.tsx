import { createAdminClient } from "@/lib/supabase/admin";
import { PublicNav } from "@/components/ui/PublicNav";
import {
  Trophy,
  Medal,
  TrendingUp,
  Star,
  Users,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Leaderboard | SportHub",
  description:
    "ดูอันดับนักกีฬา Elo Rating — SportHub Sports Ecosystem",
};

export default async function LeaderboardPage() {
  const admin = createAdminClient();

  // Fetch elo_ratings if table exists, otherwise empty
  let leaders: {
    id: string;
    sport: string;
    rating: number;
    games_played: number;
    wins: number;
    profile_id: string;
  }[] = [];

  try {
    const { data } = await admin
      .from("elo_ratings")
      .select("id, profile_id, sport, rating, games_played, wins")
      .order("rating", { ascending: false })
      .limit(50);
    leaders = data ?? [];
  } catch {
    // Table may not exist yet
  }

  // Get unique sports from leaderboard
  const sports = [...new Set(leaders.map((l) => l.sport))];

  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-warning/20 to-warning/5">
            <Trophy className="h-8 w-8 text-warning" />
          </div>
          <h1 className="font-display text-display-lg font-bold text-ink">
            Leaderboard
          </h1>
          <p className="mt-2 text-body text-ink-soft">
            อันดับนักกีฬาตามคะแนน Elo Rating
          </p>
        </header>

        {leaders.length === 0 ? (
          <div className="card-floating p-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
              <TrendingUp className="h-10 w-10 text-brand" />
            </div>
            <h2 className="font-display text-body-lg font-semibold text-ink">
              เร็วๆ นี้!
            </h2>
            <p className="mx-auto mt-2 max-w-md text-body-sm text-ink-soft">
              ระบบ Elo Rating จะเปิดใช้งานเมื่อมีการแข่งขัน Tournament
              เข้าร่วมการแข่งขันเพื่อสะสมคะแนนและติดอันดับ
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-radius-sm bg-brand px-5 py-2.5 text-body-sm font-semibold text-white transition-all hover:bg-brand-dark"
              >
                <Calendar className="h-4 w-4" />
                ค้นหาสนาม
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Sport filter tabs */}
            {sports.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <span
                    key={sport}
                    className="rounded-full bg-brand-soft px-4 py-1.5 text-body-sm font-medium text-brand"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="card-floating overflow-hidden">
              <div className="divide-y divide-line">
                {leaders.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-brand-soft/30"
                  >
                    {/* Rank */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      {index < 3 ? (
                        <Medal
                          className={`h-7 w-7 ${
                            index === 0
                              ? "text-warning"
                              : index === 1
                                ? "text-ink-soft"
                                : "text-warning/60"
                          }`}
                        />
                      ) : (
                        <span className="font-mono text-body-lg font-bold text-ink-soft">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                      <p className="text-body font-medium text-ink">
                        Player #{player.profile_id.slice(0, 8)}
                      </p>
                      <p className="text-body-sm text-ink-soft">
                        {player.sport} · {player.games_played} เกม ·{" "}
                        {player.wins} ชนะ
                      </p>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-warning" />
                      <span className="font-mono text-body-lg font-bold text-ink">
                        {player.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
