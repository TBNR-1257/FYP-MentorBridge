"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function MentorSessionsPage() {
  const { loading } = useRequireRole("MENTOR");
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

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">My Sessions</h1>

      <section className="w-full max-w-md">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-stone-500">No sessions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="block rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50"
                >
                  <span className="font-medium">{s.helpRequest.topic}</span> · {s.helpRequest.subject.name} ·{" "}
                  <span className="text-stone-500">{s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
