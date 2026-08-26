"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

const COLUMNS = [
  { label: "Open", statuses: ["SCHEDULED"] },
  { label: "Completed", statuses: ["COMPLETED", "NO_SHOW", "CANCELLED"] },
];

export default function StudentSessionsPage() {
  const { loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    Promise.all([api.listMySessions(token), api.listMyCourseSessions(token)])
      .then(([{ sessions }, { sessions: courseSessions }]) => {
        const oneOnOne = sessions.map((s) => ({
          id: s.id,
          href: `/sessions/${s.id}`,
          title: s.helpRequest.topic,
          subtitle: s.helpRequest.subject.name,
          status: s.status,
        }));
        const course = courseSessions.map((cs) => ({
          id: cs.id,
          href: `/courses/${cs.courseId}`,
          title: cs.course.title,
          subtitle: `${cs.course.subject.name} · course`,
          status: cs.status,
        }));
        setItems([...oneOnOne, ...course]);
      })
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">My Sessions</h1>

      {fetching ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">No sessions yet.</p>
      ) : (
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {COLUMNS.map((column) => {
            const columnItems = items.filter((i) => column.statuses.includes(i.status));
            return (
              <div key={column.label} className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-stone-500">
                  {column.label} ({columnItems.length})
                </h2>
                {columnItems.length === 0 ? (
                  <p className="text-xs text-stone-400">Nothing here.</p>
                ) : (
                  columnItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50"
                    >
                      <span className="font-medium">{item.title}</span>
                      <p className="text-stone-500">{item.subtitle}</p>
                      <p className="text-xs text-stone-500">{item.status}</p>
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
