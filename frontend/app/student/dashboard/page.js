"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

const QUICK_LINKS = [
  { href: "/browse", label: "Browse Subjects/Courses", description: "Find a mentor or course by subject" },
  { href: "/student/help-requests", label: "My Help Requests", description: "Track requests you've posted" },
  { href: "/student/sessions", label: "My Sessions", description: "View past and upcoming sessions" },
  { href: "/student/help-requests/new", label: "New Help Request", description: "Ask for help with a topic" },
];

const COURSES_PER_INTEREST = 3;

export default function StudentDashboardPage() {
  const { user, loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [progress, setProgress] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [fetching, setFetching] = useState(true);

  const interests = user?.studentProfile?.interests?.map((i) => i.subject) || [];

  useEffect(() => {
    if (loading || !token) return;
    api
      .getProgress(token)
      .then((progress) => setProgress(progress))
      .finally(() => setFetching(false));
  }, [loading, token]);

  useEffect(() => {
    if (loading || !token || interests.length === 0) return;
    Promise.all(
      interests.map((subject) =>
        api
          .listCoursesForSubject(token, subject.id)
          .then(({ courses }) => ({ subject, courses: courses.slice(0, COURSES_PER_INTEREST) }))
      )
    ).then(setRecommended);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, user?.studentProfile?.interests]);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl rounded-lg border border-[#39C5BB]/20 bg-[#39C5BB]/10 p-6">
        <h1 className="text-2xl font-semibold text-[#e7f0ed]">Welcome back, {user.name}</h1>
        <p className="mt-1 text-sm text-[#9fb8ae]">Here's your MentorBridge overview.</p>
      </div>

      {!fetching && progress?.streakWeeks > 0 && (
        <div className="w-full max-w-2xl rounded-lg border border-[#234339] bg-[#102420] p-4 text-sm">
          <p className="text-[#9fb8ae]">Learning streak</p>
          <p className="text-2xl font-semibold">
            {progress.streakWeeks} {progress.streakWeeks === 1 ? "week" : "weeks"}
          </p>
        </div>
      )}

      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-[#234339] bg-[#102420] p-4 transition-colors hover:border-[#39C5BB]"
          >
            <p className="font-medium text-[#e7f0ed]">{link.label}</p>
            <p className="mt-1 text-xs text-[#9fb8ae]">{link.description}</p>
          </Link>
        ))}
      </div>

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-lg font-medium">Recommended courses</h2>
        {interests.length === 0 ? (
          <p className="text-sm text-[#9fb8ae]">
            Set your subjects of interest on your{" "}
            <Link href="/student/profile" className="text-[#39C5BB] hover:underline">
              profile page
            </Link>{" "}
            to see recommended courses here.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {recommended.map(({ subject, courses }) => (
              <div key={subject.id} className="rounded-xl border border-[#234339] bg-[#0c1917] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-[#39C5BB] to-[#ff6fb4]" />
                  <h3 className="text-sm font-semibold text-[#e7f0ed]">{subject.name}</h3>
                </div>
                {courses.length === 0 ? (
                  <p className="text-xs text-[#6f8981]">No courses in this subject yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {courses.map((course) => (
                      <Link
                        key={course.id}
                        href={`/courses/${course.id}`}
                        className="rounded-lg border border-[#2c4a40] bg-[#102420] p-3 text-sm transition-colors hover:border-[#39C5BB]"
                      >
                        <p className="font-medium text-[#e7f0ed]">{course.title}</p>
                        <p className="text-xs text-[#9fb8ae]">
                          {course.mentorProfile.user.name} · {course.difficultyLevel}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
