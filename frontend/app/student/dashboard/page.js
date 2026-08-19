"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function StudentDashboardPage() {
  const { user, loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [helpRequests, setHelpRequests] = useState([]);
  const [progress, setProgress] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    Promise.all([api.listMyHelpRequests(token), api.getProgress(token)])
      .then(([{ helpRequests }, progress]) => {
        setHelpRequests(helpRequests);
        setProgress(progress);
      })
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Email" value={user.email} />
        </dl>
      </div>

      {!fetching && progress?.streakWeeks > 0 && (
        <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm">
          <p className="text-stone-500">Learning streak</p>
          <p className="text-2xl font-semibold">
            {progress.streakWeeks} {progress.streakWeeks === 1 ? "week" : "weeks"}
          </p>
        </div>
      )}

      <section className="w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Your help requests</h2>
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

      <section className="w-full max-w-md">
        <h2 className="mb-3 text-lg font-medium">Progress</h2>
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : progress.sessions.length === 0 ? (
          <p className="text-sm text-stone-500">No completed sessions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {progress.sessions.map((s) => (
              <li key={s.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <p className="font-medium">{s.helpRequest.subject.name}</p>
                <p className="text-stone-500">
                  Confidence: {s.confidenceBefore ?? "—"} &rarr; {s.confidenceAfter ?? "—"}
                </p>
                <p className="text-stone-500">{new Date(s.endedAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
