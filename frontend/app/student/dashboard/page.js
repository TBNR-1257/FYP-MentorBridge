"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

const QUICK_LINKS = [
  { href: "/browse", label: "Browse Mentors", description: "Find a mentor by subject" },
  { href: "/student/help-requests", label: "My Help Requests", description: "Track requests you've posted" },
  { href: "/student/sessions", label: "My Sessions", description: "View past and upcoming sessions" },
  { href: "/student/help-requests/new", label: "New Help Request", description: "Ask for help with a topic" },
];

export default function StudentDashboardPage() {
  const { user, loading } = useRequireRole("STUDENT");
  const { token } = useAuth();

  const [progress, setProgress] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    api
      .getProgress(token)
      .then((progress) => setProgress(progress))
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl rounded-lg border border-teal-100 bg-teal-50 p-6">
        <h1 className="text-2xl font-semibold text-stone-900">Welcome back, {user.name}</h1>
        <p className="mt-1 text-sm text-stone-600">Here's your MentorBridge overview.</p>
      </div>

      {!fetching && progress?.streakWeeks > 0 && (
        <div className="w-full max-w-2xl rounded-lg border border-stone-200 bg-white p-4 text-sm">
          <p className="text-stone-500">Learning streak</p>
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
            className="rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-teal-600"
          >
            <p className="font-medium text-stone-900">{link.label}</p>
            <p className="mt-1 text-xs text-stone-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
