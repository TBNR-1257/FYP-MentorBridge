"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import BarChart from "@/components/BarChart";
import * as api from "@/lib/api";

export default function AdminDashboardPage() {
  const { user, loading } = useRequireRole("ADMIN");
  const { token } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  async function loadAnalytics() {
    setFetching(true);
    try {
      const { analytics } = await api.getAnalytics(token);
      setAnalytics(analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!loading && token) loadAnalytics();
  }, [loading, token]);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      {error && <p className="w-full max-w-2xl text-sm text-red-600">{error}</p>}

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-lg font-medium">Platform analytics</h2>

        {fetching || !analytics ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Students" value={analytics.users.students} />
              <StatTile
                label="Mentors"
                value={Object.values(analytics.users.mentorsByVerification).reduce((a, b) => a + b, 0)}
              />
              <StatTile label="Active accounts" value={analytics.users.active} />
              <StatTile label="Suspended accounts" value={analytics.users.suspended} />
              <StatTile label="Courses" value={Object.values(analytics.coursesByStatus).reduce((a, b) => a + b, 0)} />
              <StatTile label="Course enrollments" value={analytics.totalEnrollments} />
              <StatTile label="Service hours logged" value={analytics.totalServiceHours} />
              <StatTile
                label="Help requests"
                value={Object.values(analytics.helpRequestsByStatus).reduce((a, b) => a + b, 0)}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-medium text-stone-700">Top subjects by demand</h3>
                {analytics.topSubjects.length === 0 ? (
                  <p className="text-xs text-stone-400">No help requests yet.</p>
                ) : (
                  <BarChart data={analytics.topSubjects.map((s) => ({ label: s.subject, value: s.count }))} />
                )}
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-medium text-stone-700">Sessions by status</h3>
                {Object.keys(analytics.sessionsByStatus).length === 0 ? (
                  <p className="text-xs text-stone-400">No sessions yet.</p>
                ) : (
                  <BarChart
                    data={Object.entries(analytics.sessionsByStatus).map(([label, value]) => ({ label, value }))}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}
