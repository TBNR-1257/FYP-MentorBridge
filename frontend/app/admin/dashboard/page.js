"use client";

import { useRequireRole } from "@/lib/auth-context";

export default function AdminDashboardPage() {
  const { user, loading } = useRequireRole("ADMIN");

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="text-gray-600">
        TODO: user verification, session monitoring, platform analytics.
      </p>
    </main>
  );
}
