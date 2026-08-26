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
  const [actioningId, setActioningId] = useState(null);

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
    setActioningId(helpRequestId);
    setError(null);
    try {
      await api.acceptHelpRequest(token, helpRequestId);
      setQueue((prev) => prev.filter((q) => q.helpRequest.id !== helpRequestId));
    } catch (err) {
      setError(err.message);
      // Someone else may have claimed it first — refresh to reflect reality.
      await load();
    } finally {
      setActioningId(null);
    }
  }

  async function handleDecline(helpRequestId) {
    setActioningId(helpRequestId);
    setError(null);
    try {
      await api.declineHelpRequest(token, helpRequestId);
      setQueue((prev) => prev.filter((q) => q.helpRequest.id !== helpRequestId));
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/mentor/dashboard" className="text-sm text-stone-500 hover:underline">
          &larr; Back to dashboard
        </Link>

        <h1 className="mt-2 text-2xl font-semibold">Help request queue</h1>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {fetching ? (
          <p className="mt-6 text-sm text-stone-500">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="mt-6 text-sm text-stone-500">No open requests match your profile right now.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {queue.map((match) => {
              const isDirectRequest = match.helpRequest.status === "REQUESTED";
              return (
                <li key={match.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {isDirectRequest && (
                        <span className="mb-1 inline-block rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Direct request
                        </span>
                      )}
                      <p className="font-medium">{match.helpRequest.topic}</p>
                      <p className="text-stone-500">
                        {match.helpRequest.subject.name} · {match.helpRequest.difficultyLevel} ·{" "}
                        {match.helpRequest.urgencyLevel} urgency
                      </p>
                      {match.helpRequest.description && (
                        <p className="text-stone-500">{match.helpRequest.description}</p>
                      )}
                      <p className="text-stone-500">
                        Language: {match.helpRequest.languagePreferences.join(", ")}
                      </p>
                      <p className="text-stone-500">Student: {match.helpRequest.studentProfile.user.name}</p>
                      <p className="text-stone-500">Match score: {match.score}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleAccept(match.helpRequest.id)}
                        disabled={actioningId === match.helpRequest.id}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      {isDirectRequest && (
                        <button
                          onClick={() => handleDecline(match.helpRequest.id)}
                          disabled={actioningId === match.helpRequest.id}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
