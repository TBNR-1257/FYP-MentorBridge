"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import Badge from "@/components/Badge";
import * as api from "@/lib/api";

export default function HelpRequestDetailPage({ params }) {
  const { id } = use(params);
  const { loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [helpRequest, setHelpRequest] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    setFetching(true);
    try {
      const { helpRequest } = await api.getHelpRequest(token, id);
      setHelpRequest(helpRequest);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!loading && token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, id]);

  async function handleRequest(mentorProfileId) {
    setRequestingId(mentorProfileId);
    setError(null);
    try {
      await api.requestMentor(token, id, mentorProfileId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRequestingId(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      await api.cancelRequest(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading || fetching) return null;
  if (!helpRequest) return <main className="flex flex-1 items-center justify-center">{error}</main>;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/student/dashboard" className="text-sm text-stone-500 hover:underline">
          &larr; Back to dashboard
        </Link>

        <h1 className="mt-2 text-2xl font-semibold">{helpRequest.topic}</h1>
        <p className="text-stone-600">
          {helpRequest.subject.name} · {helpRequest.difficultyLevel} · {helpRequest.urgencyLevel} urgency
        </p>
        <p className="text-stone-600">Language: {helpRequest.languagePreferences.join(", ")}</p>
        {helpRequest.description && <p className="mt-2 text-sm text-stone-700">{helpRequest.description}</p>}
        <p className="mt-1 text-sm">
          Status: <span className="font-medium">{helpRequest.status}</span>
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {helpRequest.status === "REQUESTED" ? (
          <div className="mt-6 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <p>
              Waiting for <span className="font-medium">{helpRequest.requestedMentorProfile.user.name}</span> to
              accept your request.
            </p>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-2 rounded-lg border border-yellow-300 px-3 py-1.5 text-yellow-900 hover:bg-yellow-100 disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel request"}
            </button>
          </div>
        ) : helpRequest.status !== "OPEN" ? (
          <p className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            This request has been matched.
          </p>
        ) : (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">Suggested mentors</h2>
              <Link
                href={`/browse/${helpRequest.subject.id}?helpRequestId=${helpRequest.id}`}
                className="text-sm text-teal-700 hover:underline"
              >
                Browse all {helpRequest.subject.name} mentors
              </Link>
            </div>
            {helpRequest.matchSuggestions.length === 0 ? (
              <p className="text-sm text-stone-500">No mentors currently match this request.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {helpRequest.matchSuggestions.map((match) => (
                  <li
                    key={match.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        #{match.rank} · {match.mentorProfile.user.name}
                      </p>
                      <p className="text-stone-500">Match score: {match.score}</p>
                      {match.mentorProfile.badges.length > 0 && (
                        <div className="mt-2 flex gap-3">
                          {match.mentorProfile.badges.map((mb) => (
                            <Badge key={mb.badgeId} badge={mb.badge} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRequest(match.mentorProfileId)}
                      disabled={requestingId === match.mentorProfileId}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {requestingId === match.mentorProfileId ? "Requesting…" : "Request"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
