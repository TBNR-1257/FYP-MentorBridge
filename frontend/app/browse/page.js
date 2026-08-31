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
        <h1 className="text-2xl font-semibold">Browse Subjects/Courses</h1>
        <p className="mt-1 text-sm text-[#9fb8ae]">Pick a subject to see top mentors and courses.</p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
        {subjects.length === 0 ? (
          <p className="col-span-full text-sm text-[#9fb8ae]">Loading subjects…</p>
        ) : (
          subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/browse/${subject.id}`}
              className="rounded-lg border border-[#234339] bg-[#102420] p-4 text-center transition-colors hover:border-[#39C5BB]"
            >
              <p className="font-medium text-[#e7f0ed]">{subject.name}</p>
              <p className="mt-1 text-xs text-[#9fb8ae]">
                {subject.mentorCount} {subject.mentorCount === 1 ? "mentor" : "mentors"}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
