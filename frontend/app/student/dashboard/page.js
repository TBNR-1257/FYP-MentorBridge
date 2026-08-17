"use client";

import { useRequireRole } from "@/lib/auth-context";

export default function StudentDashboardPage() {
  const { user, loading } = useRequireRole("STUDENT");

  if (loading) return null;

  const profile = user.studentProfile;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <div className="w-full max-w-md rounded-md border border-gray-200 p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Email" value={user.email} />
          <Row label="Education level" value={profile?.educationLevel} />
          <Row label="Language preferences" value={profile?.languagePreferences?.join(", ")} />
        </dl>
      </div>

      <p className="text-gray-600">
        TODO: post help requests, view mentor matches, session history, progress tracking.
      </p>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
