"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function StudentDashboardPage() {
  const { user, loading } = useRequireRole("STUDENT");
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

  const profile = user.studentProfile;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <div className="w-full max-w-md rounded-md border border-gray-200 p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Email" value={user.email} />
          <Row label="Education level" value={profile?.educationLevel} />
          <Row label="Language preferences" value={profile?.languagePreferences?.join(", ")} />
        </dl>
      </div>

      <section className="w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Your help requests</h2>
          <Link
            href="/student/help-requests/new"
            className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
          >
            + New request
          </Link>
        </div>

        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : helpRequests.length === 0 ? (
          <p className="text-sm text-gray-500">You haven&apos;t posted any help requests yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {helpRequests.map((hr) => (
              <li key={hr.id}>
                <Link
                  href={`/student/help-requests/${hr.id}`}
                  className="block rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{hr.topic}</span> · {hr.subject.name} ·{" "}
                  <span className="text-gray-500">{hr.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-gray-600">TODO: session history, progress tracking.</p>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
