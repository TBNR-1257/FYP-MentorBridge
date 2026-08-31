"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

// The grid uses items-end (every card's bottom edge lines up), so rank 1
// needs to be the tallest box and the others shorter — done here via
// margin-top pushing the shorter ones down from that shared top edge, not
// padding (padding would instead grow a box's own height, backwards from
// what we want).
const PODIUM_STYLE = {
  1: {
    order: "sm:order-2",
    ring: "border-amber-400/50",
    badge: "from-amber-300 to-amber-500 text-amber-950",
    offset: "",
    padding: "p-5",
    avatar: "h-16 w-16 text-xl",
    name: "text-base",
  },
  2: {
    order: "sm:order-1",
    ring: "border-slate-300/40",
    badge: "from-slate-200 to-slate-400 text-slate-900",
    offset: "sm:mt-7",
    padding: "p-4",
    avatar: "h-14 w-14 text-lg",
    name: "text-sm",
  },
  3: {
    order: "sm:order-3",
    ring: "border-orange-400/40",
    badge: "from-orange-300 to-orange-500 text-orange-950",
    offset: "sm:mt-12",
    padding: "p-3.5",
    avatar: "h-12 w-12 text-base",
    name: "text-sm",
  },
};

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

  const top3 = mentors.slice(0, 3);
  const rest = mentors.slice(3);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Mentor Leaderboard</h1>
        <p className="mt-1 text-sm text-[#9fb8ae]">Top mentors by verified service hours.</p>
      </div>

      {fetching ? (
        <p className="text-sm text-[#9fb8ae]">Loading…</p>
      ) : mentors.length === 0 ? (
        <p className="text-sm text-[#9fb8ae]">No mentors to rank yet.</p>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid w-full max-w-2xl grid-cols-1 items-end gap-3 sm:grid-cols-3">
              {top3.map((m, i) => (
                <PodiumCard key={m.mentorProfileId} mentor={m} rank={i + 1} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <section className="w-full max-w-2xl">
              <ol className="flex flex-col gap-2">
                {rest.map((m, i) => (
                  <li
                    key={m.mentorProfileId}
                    className="flex items-center justify-between rounded-lg border border-[#234339] bg-[#102420] p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 shrink-0 text-center font-semibold text-[#6f8981]">{i + 4}</span>
                      <div>
                        <Link href={`/mentors/${m.mentorProfileId}`} className="font-medium hover:underline">
                          {m.name}
                        </Link>
                        <p className="text-xs text-[#9fb8ae]">
                          {m.avgRating !== null ? `★ ${m.avgRating.toFixed(1)} (${m.ratingCount})` : "No ratings yet"} ·{" "}
                          {m.badgeCount} badges
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-medium text-[#cfe0da]">{m.totalHours}h</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function PodiumCard({ mentor, rank }) {
  const style = PODIUM_STYLE[rank];
  return (
    <Link
      href={`/mentors/${mentor.mentorProfileId}`}
      className={`flex flex-col items-center gap-2 rounded-xl border ${style.ring} bg-[#102420] text-center transition-colors hover:border-[#39C5BB] ${style.order} ${style.offset} ${style.padding}`}
    >
      <span
        className={`flex ${style.avatar} shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold ${style.badge}`}
      >
        <MedalIcon className="h-1/2 w-1/2" />
      </span>
      <p className={`font-medium text-[#e7f0ed] ${style.name}`}>{mentor.name}</p>
      <p className="text-xs text-[#9fb8ae]">
        {mentor.avgRating !== null ? `★ ${mentor.avgRating.toFixed(1)} (${mentor.ratingCount})` : "No ratings yet"}
      </p>
      <p className="text-lg font-semibold text-[#cfe0da]">{mentor.totalHours}h</p>
    </Link>
  );
}

function MedalIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l2.4 5.3 5.8.6-4.4 3.9 1.3 5.7L12 14.7 6.9 17.5l1.3-5.7-4.4-3.9 5.8-.6L12 2z" />
    </svg>
  );
}
