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
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

const MODE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "STRUCTURED", label: "Structured" },
  { value: "OPEN", label: "Open" },
];

export default function MentorCoursesPage() {
  const { loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [courses, setCourses] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (loading || !token) return;
    api
      .listMyCourses(token)
      .then(({ courses }) => setCourses(courses))
      .finally(() => setFetching(false));
  }, [loading, token]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (statusFilter !== "ALL" && course.status !== statusFilter) return false;
      if (modeFilter !== "ALL" && course.mode !== modeFilter) return false;
      if (q && !course.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [courses, search, statusFilter, modeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, modeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const pagedCourses = filteredCourses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-2xl font-semibold">My Courses</h1>
        <Link
          href="/mentor/courses/new"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
        >
          + Create course
        </Link>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title…"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <FilterChips value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        <FilterChips value={modeFilter} onChange={setModeFilter} options={MODE_FILTERS} />
      </div>

      <section className="w-full max-w-2xl">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-stone-500">You haven&apos;t created any courses yet.</p>
        ) : filteredCourses.length === 0 ? (
          <p className="text-sm text-stone-500">No courses match your search/filters.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pagedCourses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className="block rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50"
                >
                  <span className="font-medium">{course.title}</span> · {course.subject.name} ·{" "}
                  <span className="text-stone-500">{course._count.enrollments} enrolled</span>{" "}
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${
                      course.status === "ARCHIVED" ? "bg-stone-200 text-stone-600" : "bg-teal-100 text-teal-800"
                    }`}
                  >
                    {course.status}
                  </span>{" "}
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">{course.mode}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </section>
    </main>
  );
}
