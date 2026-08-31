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
  { value: "COMPLETED", label: "Completed" },
];

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "SESSION", label: "1:1" },
  { value: "COURSE", label: "Courses" },
];

export default function MentorSessionsPage() {
  const { loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (loading || !token) return;
    Promise.all([api.listMySessions(token), api.listMyCourseSessions(token)])
      .then(([{ sessions }, { sessions: courseSessions }]) => {
        const oneOnOne = sessions.map((s) => ({
          id: s.id,
          href: `/sessions/${s.id}`,
          type: "SESSION",
          title: s.helpRequest.topic,
          subtitle: s.helpRequest.subject.name,
          status: s.status,
        }));
        // A course recurs weekly, so it can have many CourseSession rows over
        // its lifetime — collapse them to one row per course rather than one
        // per week. "Open" vs "Completed" tracks the course itself (has the
        // mentor ended it?), not any single week's occurrence.
        const courseGroups = new Map();
        courseSessions.forEach((cs) => {
          if (!courseGroups.has(cs.courseId)) courseGroups.set(cs.courseId, { course: cs.course, occurrences: [] });
          courseGroups.get(cs.courseId).occurrences.push(cs);
        });
        const course = Array.from(courseGroups.values()).map(({ course, occurrences }) => {
          const nextClass = occurrences
            .filter((o) => o.status === "SCHEDULED")
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
          return {
            id: course.id,
            href: `/courses/${course.id}`,
            type: "COURSE",
            title: course.title,
            subtitle:
              `${course.subject.name} · course · ` +
              (nextClass ? `next class ${new Date(nextClass.scheduledAt).toLocaleDateString()}` : "ended"),
            status: course.status === "ARCHIVED" ? "COMPLETED" : "SCHEDULED",
          };
        });
        setItems([...oneOnOne, ...course]);
      })
      .finally(() => setFetching(false));
  }, [loading, token]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      const bucket = item.status === "SCHEDULED" ? "OPEN" : "COMPLETED";
      if (statusFilter !== "ALL" && bucket !== statusFilter) return false;
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">My Sessions</h1>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="flex-1 rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2 text-sm"
          />
          <FilterChips value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
          <FilterChips value={typeFilter} onChange={setTypeFilter} options={TYPE_FILTERS} />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {fetching ? (
            <p className="text-sm text-[#9fb8ae]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#9fb8ae]">No sessions yet.</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-[#9fb8ae]">No sessions match your search/filters.</p>
          ) : (
            pagedItems.map((item) => <SessionRow key={item.type + item.id} item={item} />)
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </main>
  );
}

function SessionRow({ item }) {
  const isOpen = item.status === "SCHEDULED";
  return (
    <Link
      href={item.href}
      className="flex items-center justify-between gap-4 rounded-lg border border-[#234339] bg-[#102420] p-3 text-sm hover:bg-[#17322b]"
    >
      <div className="min-w-0">
        <span className="font-medium">{item.title}</span>
        <p className="truncate text-[#9fb8ae]">{item.subtitle}</p>
      </div>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
          isOpen ? "bg-[#39C5BB]/15 text-[#a8f0e6]" : "bg-[#1d3a32] text-[#9fb8ae]"
        }`}
      >
        {item.status}
      </span>
    </Link>
  );
}
