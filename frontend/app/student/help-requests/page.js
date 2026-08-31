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
  OPEN: "bg-teal-100 text-teal-800",
  REQUESTED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-stone-200 text-stone-600",
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
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
          >
            + New request
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic or subject…"
            className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <FilterChips value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {fetching ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : helpRequests.length === 0 ? (
            <p className="text-sm text-stone-500">You haven&apos;t posted any help requests yet.</p>
          ) : filteredRequests.length === 0 ? (
            <p className="text-sm text-stone-500">No requests match your search/filters.</p>
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
      className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50"
    >
      <div className="min-w-0">
        <span className="font-medium">{hr.topic}</span>
        <p className="truncate text-stone-500">
          {hr.subject.name} · {hr.difficultyLevel}
        </p>
      </div>
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${BUCKET_PILL[bucket]}`}>{hr.status}</span>
    </Link>
  );
}
