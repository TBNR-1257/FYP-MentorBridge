"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import FilterChips from "@/components/FilterChips";
import Pagination from "@/components/Pagination";
import * as api from "@/lib/api";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "REQUESTED", label: "Requested" },
  { value: "COMPLETED", label: "Completed" },
];

function bucketFor(status) {
  if (status === "OPEN") return "OPEN";
  if (status === "COMPLETED" || status === "CANCELLED") return "COMPLETED";
  return "REQUESTED";
}

const BUCKET_PILL = {
  OPEN: "bg-[#39C5BB]/15 text-[#a8f0e6]",
  REQUESTED: "bg-amber-500/15 text-amber-300",
  COMPLETED: "bg-[#1d3a32] text-[#9fb8ae]",
};

export default function StudentHelpRequestsPage() {
  const { loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [helpRequests, setHelpRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (loading || !token) return;
    api
      .listMyHelpRequests(token)
      .then(({ helpRequests }) => setHelpRequests(helpRequests))
      .finally(() => setFetching(false));
  }, [loading, token]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return helpRequests.filter((hr) => {
      if (statusFilter !== "ALL" && bucketFor(hr.status) !== statusFilter) return false;
      if (q && !hr.topic.toLowerCase().includes(q) && !hr.subject.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [helpRequests, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const pagedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Help Requests</h1>
          <Link
            href="/student/help-requests/new"
            className="rounded-lg bg-gradient-to-r from-[#12796f] to-[#6FE9DC] px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            + New request
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic or subject…"
            className="flex-1 rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2 text-sm"
          />
          <FilterChips value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {fetching ? (
            <p className="text-sm text-[#9fb8ae]">Loading…</p>
          ) : helpRequests.length === 0 ? (
            <p className="text-sm text-[#9fb8ae]">You haven&apos;t posted any help requests yet.</p>
          ) : filteredRequests.length === 0 ? (
            <p className="text-sm text-[#9fb8ae]">No requests match your search/filters.</p>
          ) : (
            pagedRequests.map((hr) => <HelpRequestRow key={hr.id} hr={hr} />)
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </main>
  );
}

function HelpRequestRow({ hr }) {
  const bucket = bucketFor(hr.status);
  return (
    <Link
      href={hr.sessions[0] ? `/sessions/${hr.sessions[0].id}` : `/student/help-requests/${hr.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-[#234339] bg-[#102420] p-3 text-sm hover:bg-[#17322b]"
    >
      <div className="min-w-0">
        <span className="font-medium">{hr.topic}</span>
        <p className="truncate text-[#9fb8ae]">
          {hr.subject.name} · {hr.difficultyLevel}
        </p>
      </div>
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${BUCKET_PILL[bucket]}`}>{hr.status}</span>
    </Link>
  );
}
