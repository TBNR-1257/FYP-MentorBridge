"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

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
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-2xl font-semibold">My Help Requests</h1>
        <Link
          href="/student/help-requests/new"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
        >
          + New request
        </Link>
      </div>

      <section className="w-full max-w-md">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : helpRequests.length === 0 ? (
          <p className="text-sm text-stone-500">You haven&apos;t posted any help requests yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {helpRequests.map((hr) => (
              <li key={hr.id}>
                <Link
                  href={hr.sessions[0] ? `/sessions/${hr.sessions[0].id}` : `/student/help-requests/${hr.id}`}
                  className="block rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50"
                >
                  <span className="font-medium">{hr.topic}</span> · {hr.subject.name} · {hr.educationLevel} ·{" "}
                  <span className="text-stone-500">{hr.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
