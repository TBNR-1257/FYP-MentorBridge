"use client";

import Link from "next/link";
import { useRequireRole } from "@/lib/auth-context";
import { useSubjects } from "@/lib/useSubjects";

export default function BrowsePage() {
  const { loading } = useRequireRole("STUDENT");
  const subjects = useSubjects();

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">Browse Mentors</h1>
        <p className="mt-1 text-sm text-stone-500">Pick a subject to see top mentors who teach it.</p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
        {subjects.length === 0 ? (
          <p className="col-span-full text-sm text-stone-500">Loading subjects…</p>
        ) : (
          subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/browse/${subject.id}`}
              className="rounded-lg border border-stone-200 bg-white p-4 text-center transition-colors hover:border-teal-600"
            >
              <p className="font-medium text-stone-900">{subject.name}</p>
              <p className="mt-1 text-xs text-stone-500">
                {subject.mentorCount} {subject.mentorCount === 1 ? "mentor" : "mentors"}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
