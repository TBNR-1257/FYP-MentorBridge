"use client";

import { useRequireRole } from "@/lib/auth-context";

export default function MentorDashboardPage() {
  const { user, loading } = useRequireRole("MENTOR");

  if (loading) return null;

  const profile = user.mentorProfile;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <div className="w-full max-w-md rounded-md border border-gray-200 p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Email" value={user.email} />
          <Row label="Verification status" value={profile?.verificationStatus} />
          <Row label="Qualifications" value={profile?.qualifications} />
          <Row label="Languages" value={profile?.languages?.join(", ")} />
        </dl>
      </div>

      {profile?.verificationStatus === "PENDING" && (
        <p className="rounded-md bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          Your mentor profile is pending admin verification.
        </p>
      )}

      <p className="text-gray-600">
        TODO: help request queue, service hours, badges, leaderboard.
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
