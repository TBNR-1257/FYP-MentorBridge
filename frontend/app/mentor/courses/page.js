"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function MentorCoursesPage() {
  const { loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [courses, setCourses] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    api
      .listMyCourses(token)
      .then(({ courses }) => setCourses(courses))
      .finally(() => setFetching(false));
  }, [loading, token]);

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

      <section className="w-full max-w-2xl">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-stone-500">You haven&apos;t created any courses yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {courses.map((course) => (
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
      </section>
    </main>
  );
}
