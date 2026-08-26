"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

const COLUMNS = [
  { label: "Open", statuses: ["OPEN"] },
  { label: "Requested", statuses: ["REQUESTED", "MATCHED", "IN_PROGRESS"] },
  { label: "Completed", statuses: ["COMPLETED", "CANCELLED"] },
];

export default function StudentHelpRequestsPage() {
  const { loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [helpRequests, setHelpRequests] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    api
      .listMyHelpRequests(token)
      .then(({ helpRequests }) => setHelpRequests(helpRequests))
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-2xl font-semibold">My Help Requests</h1>
        <Link
          href="/student/help-requests/new"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
        >
          + New request
        </Link>
      </div>

      {fetching ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : helpRequests.length === 0 ? (
        <p className="text-sm text-stone-500">You haven&apos;t posted any help requests yet.</p>
      ) : (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {COLUMNS.map((column) => {
            const items = helpRequests.filter((hr) => column.statuses.includes(hr.status));
            return (
              <div key={column.label} className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-stone-500">
                  {column.label} ({items.length})
                </h2>
                {items.length === 0 ? (
                  <p className="text-xs text-stone-400">Nothing here.</p>
                ) : (
                  items.map((hr) => (
                    <Link
                      key={hr.id}
                      href={hr.sessions[0] ? `/sessions/${hr.sessions[0].id}` : `/student/help-requests/${hr.id}`}
                      className="block rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50"
                    >
                      <span className="font-medium">{hr.topic}</span>
                      <p className="text-stone-500">
                        {hr.subject.name} · {hr.difficultyLevel}
                      </p>
                      <p className="text-xs text-stone-500">{hr.status}</p>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
