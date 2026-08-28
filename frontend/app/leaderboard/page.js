"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function LeaderboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [mentors, setMentors] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !token) return;
    api
      .getMentorLeaderboard(token)
      .then(({ mentors }) => setMentors(mentors))
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading || !user) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Mentor Leaderboard</h1>
        <p className="mt-1 text-sm text-stone-500">Top mentors by verified service hours.</p>
      </div>

      <section className="w-full max-w-2xl">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : mentors.length === 0 ? (
          <p className="text-sm text-stone-500">No mentors to rank yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {mentors.map((m, i) => (
              <li
                key={m.mentorProfileId}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center font-semibold text-stone-400">{i + 1}</span>
                  <div>
                    <Link href={`/mentors/${m.mentorProfileId}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {m.avgRating !== null ? `★ ${m.avgRating.toFixed(1)} (${m.ratingCount})` : "No ratings yet"} ·{" "}
                      {m.badgeCount} badges
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-medium text-stone-700">{m.totalHours}h</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
