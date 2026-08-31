"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

const SESSION_STATUSES = ["", "SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"];
const COURSE_STATUSES = ["", "ACTIVE", "ARCHIVED"];

export default function AdminMonitoringPage() {
  const { loading } = useRequireRole("ADMIN");
  const { token } = useAuth();

  const [tab, setTab] = useState("flagged");

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">Monitoring</h1>

        <div className="mt-4 flex rounded-lg border border-[#2c4a40] bg-[#102420] p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("flagged")}
            className={`rounded px-4 py-1.5 ${tab === "flagged" ? "bg-gradient-to-r from-[#12796f] to-[#6FE9DC] text-white" : ""}`}
          >
            Flagged Activity
          </button>
          <button
            type="button"
            onClick={() => setTab("browse")}
            className={`rounded px-4 py-1.5 ${tab === "browse" ? "bg-gradient-to-r from-[#12796f] to-[#6FE9DC] text-white" : ""}`}
          >
            All Sessions &amp; Courses
          </button>
        </div>
      </div>

      {loading ? null : tab === "flagged" ? <FlaggedActivityTab token={token} /> : <BrowseTab token={token} />}
    </main>
  );
}

const FLAG_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "MISCONDUCT", label: "Misconduct" },
];

function FlaggedActivityTab({ token }) {
  const [ratings, setRatings] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [flagFilter, setFlagFilter] = useState("ALL");

  useEffect(() => {
    if (!token) return;
    api
      .listFlaggedRatings(token)
      .then(({ ratings }) => setRatings(ratings))
      .finally(() => setFetching(false));
  }, [token]);

  const filtered = ratings.filter((r) => {
    if (flagFilter === "NO_SHOW") return r.isNoShow;
    if (flagFilter === "MISCONDUCT") return r.isMisconduct;
    return true;
  });

  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9fb8ae]">
          Students a mentor flagged as a no-show or for misconduct after a 1:1 session.
        </p>
        <div className="flex rounded-lg border border-[#2c4a40] bg-[#102420] p-1 text-sm">
          {FLAG_FILTERS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFlagFilter(opt.value)}
              className={`rounded px-3 py-1 ${
                flagFilter === opt.value ? "bg-gradient-to-r from-[#12796f] to-[#6FE9DC] text-white" : "text-[#9fb8ae] hover:bg-[#17322b]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {fetching ? (
          <p className="text-sm text-[#9fb8ae]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#9fb8ae]">No flagged activity.</p>
        ) : (
          filtered.map((r) => (
            <li key={r.id} className="rounded-lg border border-[#234339] bg-[#102420] p-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {r.ratee.name}
                    {!r.ratee.isActive && <span className="ml-1 text-xs text-red-400">(suspended)</span>}
                  </p>
                  <p className="text-[#9fb8ae]">
                    Flagged by {r.rater.name} · {r.session?.helpRequest?.subject?.name || "Unknown subject"} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  {r.comment && <p className="mt-1 text-[#9fb8ae]">&quot;{r.comment}&quot;</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {r.isNoShow && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">No-show</span>
                  )}
                  {r.isMisconduct && (
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-300">Misconduct</span>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function BrowseTab({ token }) {
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessionStatus, setSessionStatus] = useState("");
  const [courseStatus, setCourseStatus] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([api.listAdminSessions(token), api.listAdminCourses(token)])
      .then(([{ sessions }, { courses }]) => {
        setSessions(sessions);
        setCourses(courses);
      })
      .finally(() => setFetching(false));
  }, [token]);

  const filteredSessions = sessions.filter((s) => !sessionStatus || s.status === sessionStatus);
  const filteredCourses = courses.filter((c) => !courseStatus || c.status === courseStatus);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Sessions ({filteredSessions.length})</h2>
          <select
            value={sessionStatus}
            onChange={(e) => setSessionStatus(e.target.value)}
            className="rounded-lg border border-[#2c4a40] bg-[#102420] px-2 py-1 text-sm"
          >
            {SESSION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>

        {fetching ? (
          <p className="text-sm text-[#9fb8ae]">Loading…</p>
        ) : filteredSessions.length === 0 ? (
          <p className="text-sm text-[#9fb8ae]">No sessions match.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredSessions.map((s) => (
              <li key={s.id} className="rounded-lg border border-[#234339] bg-[#102420] p-3 text-sm">
                <span className="font-medium">{s.helpRequest.topic}</span> · {s.helpRequest.subject.name} ·{" "}
                {s.mentorProfile.user.name} &rarr; {s.helpRequest.studentProfile.user.name} ·{" "}
                <span className="text-[#9fb8ae]">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Courses ({filteredCourses.length})</h2>
          <select
            value={courseStatus}
            onChange={(e) => setCourseStatus(e.target.value)}
            className="rounded-lg border border-[#2c4a40] bg-[#102420] px-2 py-1 text-sm"
          >
            {COURSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>
        </div>

        {fetching ? (
          <p className="text-sm text-[#9fb8ae]">Loading…</p>
        ) : filteredCourses.length === 0 ? (
          <p className="text-sm text-[#9fb8ae]">No courses match.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredCourses.map((c) => (
              <li key={c.id} className="rounded-lg border border-[#234339] bg-[#102420] p-3 text-sm">
                <span className="font-medium">{c.title}</span> · {c.subject.name} · {c.mentorProfile.user.name} ·{" "}
                {c._count.enrollments} enrolled · <span className="text-[#9fb8ae]">{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
