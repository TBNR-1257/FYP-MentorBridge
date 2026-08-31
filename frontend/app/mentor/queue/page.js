"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import FilterChips from "@/components/FilterChips";
import Pagination from "@/components/Pagination";
import * as api from "@/lib/api";

const PAGE_SIZE = 10;

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "DIRECT", label: "Direct requests" },
  { value: "SUGGESTED", label: "Suggested matches" },
];

export default function MentorQueuePage() {
  const { loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [queue, setQueue] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

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

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    return queue.filter((match) => {
      const isDirectRequest = match.helpRequest.status === "REQUESTED";
      if (typeFilter === "DIRECT" && !isDirectRequest) return false;
      if (typeFilter === "SUGGESTED" && isDirectRequest) return false;
      if (
        q &&
        !match.helpRequest.topic.toLowerCase().includes(q) &&
        !match.helpRequest.subject.name.toLowerCase().includes(q) &&
        !match.helpRequest.studentProfile.user.name.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [queue, search, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / PAGE_SIZE));
  const pagedQueue = filteredQueue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <Link href="/mentor/dashboard" className="text-sm text-[#9fb8ae] hover:underline">
          &larr; Back to dashboard
        </Link>

        <h1 className="mt-2 text-2xl font-semibold">Help request queue</h1>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic, subject, or student…"
            className="flex-1 rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2 text-sm"
          />
          <FilterChips value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTERS} />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {fetching ? (
          <p className="mt-6 text-sm text-[#9fb8ae]">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="mt-6 text-sm text-[#9fb8ae]">No open requests match your profile right now.</p>
        ) : filteredQueue.length === 0 ? (
          <p className="mt-6 text-sm text-[#9fb8ae]">No requests match your search/filters.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {pagedQueue.map((match) => {
              const isDirectRequest = match.helpRequest.status === "REQUESTED";
              return (
                <li key={match.id} className="rounded-lg border border-[#234339] bg-[#102420] p-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {isDirectRequest && (
                        <span className="mb-1 inline-block rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                          Direct request
                        </span>
                      )}
                      <p className="font-medium">{match.helpRequest.topic}</p>
                      <p className="text-[#9fb8ae]">
                        {match.helpRequest.subject.name} · {match.helpRequest.difficultyLevel} ·{" "}
                        {match.helpRequest.urgencyLevel} urgency
                      </p>
                      {match.helpRequest.description && (
                        <p className="text-[#9fb8ae]">{match.helpRequest.description}</p>
                      )}
                      <p className="text-[#9fb8ae]">
                        Language: {match.helpRequest.languagePreferences.join(", ")}
                      </p>
                      <p className="text-[#9fb8ae]">
                        Student: {match.helpRequest.studentProfile.user.name}
                        {!match.helpRequest.studentProfile.user.isActive && (
                          <span className="ml-1 text-red-400">(account suspended)</span>
                        )}
                      </p>
                      <p className="text-[#9fb8ae]">Match score: {match.score}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleAccept(match.helpRequest.id)}
                        disabled={actioningId === match.helpRequest.id}
                        className="rounded-lg bg-gradient-to-r from-[#12796f] to-[#6FE9DC] px-3 py-1.5 text-white hover:opacity-90 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      {isDirectRequest && (
                        <button
                          onClick={() => handleDecline(match.helpRequest.id)}
                          disabled={actioningId === match.helpRequest.id}
                          className="rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-1.5 hover:bg-[#17322b] disabled:opacity-50"
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

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </main>
  );
}
