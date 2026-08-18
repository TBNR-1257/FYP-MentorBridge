"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function HelpRequestDetailPage({ params }) {
  const { id } = use(params);
  const { loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [helpRequest, setHelpRequest] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [selectingId, setSelectingId] = useState(null);

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

  async function handleSelect(mentorProfileId) {
    setSelectingId(mentorProfileId);
    setError(null);
    try {
      await api.selectMentor(token, id, mentorProfileId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSelectingId(null);
    }
  }

  if (loading || fetching) return null;
  if (!helpRequest) return <main className="flex flex-1 items-center justify-center">{error}</main>;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/student/dashboard" className="text-sm text-gray-500 hover:underline">
          &larr; Back to dashboard
        </Link>

        <h1 className="mt-2 text-2xl font-semibold">{helpRequest.topic}</h1>
        <p className="text-gray-600">
          {helpRequest.subject.name} · {helpRequest.educationLevel} · {helpRequest.urgencyLevel} urgency ·{" "}
          {helpRequest.sessionFormat}
        </p>
        <p className="text-gray-600">Language: {helpRequest.languagePreferences.join(", ")}</p>
        <p className="mt-1 text-sm">
          Status: <span className="font-medium">{helpRequest.status}</span>
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {helpRequest.status !== "OPEN" ? (
          <p className="mt-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
            This request has been matched.
          </p>
        ) : (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-medium">Suggested mentors</h2>
            {helpRequest.matchSuggestions.length === 0 ? (
              <p className="text-sm text-gray-500">No mentors currently match this request.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {helpRequest.matchSuggestions.map((match) => (
                  <li
                    key={match.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-4 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        #{match.rank} · {match.mentorProfile.user.name}
                      </p>
                      <p className="text-gray-500">Match score: {match.score}</p>
                    </div>
                    <button
                      onClick={() => handleSelect(match.mentorProfileId)}
                      disabled={selectingId === match.mentorProfileId}
                      className="rounded-md bg-black px-3 py-1.5 text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {selectingId === match.mentorProfileId ? "Selecting…" : "Select"}
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
