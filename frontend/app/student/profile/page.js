"use client";

import { useRequireRole } from "@/lib/auth-context";

export default function StudentProfilePage() {
  const { user, loading } = useRequireRole("STUDENT");

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
        </dl>
      </div>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
