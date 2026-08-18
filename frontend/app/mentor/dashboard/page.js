"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function MentorDashboardPage() {
  const { user, loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    api
      .listMySessions(token)
      .then(({ sessions }) => setSessions(sessions))
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading) return null;

  const profile = user.mentorProfile;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <div className="w-full max-w-md rounded-md border border-gray-200 p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Email" value={user.email} />
          <Row label="Verification status" value={profile?.verificationStatus} />
          <Row label="Qualifications" value={profile?.qualifications} />
          <Row label="Languages" value={profile?.languages?.join(", ")} />
          <Row label="Subjects" value={profile?.subjects?.map((s) => s.subject.name).join(", ")} />
        </dl>
        <Link href="/mentor/profile" className="mt-3 inline-block text-sm underline">
          Edit profile
        </Link>
      </div>

      {profile?.verificationStatus === "PENDING" && (
        <p className="rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          Your mentor profile is pending admin verification.
        </p>
      )}

      {profile?.verificationStatus === "VERIFIED" && (
        <>
          <Link
            href="/mentor/queue"
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            View help request queue
          </Link>

          <section className="w-full max-w-md">
            <h2 className="mb-3 text-lg font-medium">Your sessions</h2>
            {fetching ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-500">No sessions yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="block rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{s.helpRequest.topic}</span> ·{" "}
                      {s.helpRequest.subject.name} · <span className="text-gray-500">{s.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="text-gray-600">TODO: service hours, badges, leaderboard.</p>
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
