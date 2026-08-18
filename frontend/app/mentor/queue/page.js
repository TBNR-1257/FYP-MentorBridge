"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function MentorQueuePage() {
  const { loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [queue, setQueue] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  async function load() {
    setFetching(true);
    try {
      const { queue } = await api.listMentorQueue(token);
      setQueue(queue);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!loading && token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token]);

  async function handleAccept(helpRequestId) {
    setAcceptingId(helpRequestId);
    setError(null);
    try {
      await api.acceptHelpRequest(token, helpRequestId);
      setQueue((prev) => prev.filter((q) => q.helpRequest.id !== helpRequestId));
    } catch (err) {
      setError(err.message);
      // Someone else may have claimed it first — refresh to reflect reality.
      await load();
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/mentor/dashboard" className="text-sm text-gray-500 hover:underline">
          &larr; Back to dashboard
        </Link>

        <h1 className="mt-2 text-2xl font-semibold">Help request queue</h1>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {fetching ? (
          <p className="mt-6 text-sm text-gray-500">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">No open requests match your profile right now.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {queue.map((match) => (
              <li
                key={match.id}
                className="flex items-center justify-between rounded-md border border-gray-200 p-4 text-sm"
              >
                <div>
                  <p className="font-medium">{match.helpRequest.topic}</p>
                  <p className="text-gray-500">
                    {match.helpRequest.subject.name} · {match.helpRequest.urgencyLevel} urgency ·{" "}
                    {match.helpRequest.sessionFormat}
                  </p>
                  <p className="text-gray-500">Student: {match.helpRequest.studentProfile.user.name}</p>
                  <p className="text-gray-500">Match score: {match.score}</p>
                </div>
                <button
                  onClick={() => handleAccept(match.helpRequest.id)}
                  disabled={acceptingId === match.helpRequest.id}
                  className="rounded-md bg-black px-3 py-1.5 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {acceptingId === match.helpRequest.id ? "Accepting…" : "Accept"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
