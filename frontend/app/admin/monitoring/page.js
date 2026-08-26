"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

const SESSION_STATUSES = ["", "SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"];
const COURSE_STATUSES = ["", "ACTIVE", "ARCHIVED"];

export default function AdminMonitoringPage() {
  const { loading } = useRequireRole("ADMIN");
  const { token } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessionStatus, setSessionStatus] = useState("");
  const [courseStatus, setCourseStatus] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    Promise.all([api.listAdminSessions(token), api.listAdminCourses(token)])
      .then(([{ sessions }, { courses }]) => {
        setSessions(sessions);
        setCourses(courses);
      })
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading) return null;

  const filteredSessions = sessions.filter((s) => !sessionStatus || s.status === sessionStatus);
  const filteredCourses = courses.filter((c) => !courseStatus || c.status === courseStatus);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <h1 className="w-full max-w-3xl text-2xl font-semibold">Monitoring</h1>

      <section className="w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Sessions ({filteredSessions.length})</h2>
          <select
            value={sessionStatus}
            onChange={(e) => setSessionStatus(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
          >
            {SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>

        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : filteredSessions.length === 0 ? (
          <p className="text-sm text-stone-500">No sessions match.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredSessions.map((s) => (
              <li key={s.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <span className="font-medium">{s.helpRequest.topic}</span> · {s.helpRequest.subject.name} ·{" "}
                {s.mentorProfile.user.name} &rarr; {s.helpRequest.studentProfile.user.name} ·{" "}
                <span className="text-stone-500">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Courses ({filteredCourses.length})</h2>
          <select
            value={courseStatus}
            onChange={(e) => setCourseStatus(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
          >
            {COURSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>

        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : filteredCourses.length === 0 ? (
          <p className="text-sm text-stone-500">No courses match.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredCourses.map((c) => (
              <li key={c.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <span className="font-medium">{c.title}</span> · {c.subject.name} · {c.mentorProfile.user.name} ·{" "}
                {c._count.enrollments} enrolled · <span className="text-stone-500">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
