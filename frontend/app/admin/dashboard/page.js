"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import BarChart from "@/components/BarChart";
import LineChart from "@/components/LineChart";
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

      {error && <p className="w-full max-w-4xl text-sm text-red-400">{error}</p>}

      <section className="w-full max-w-4xl">
        <h2 className="mb-3 text-lg font-medium">Platform analytics</h2>

        {fetching || !analytics ? (
          <p className="text-sm text-[#9fb8ae]">Loading…</p>
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
              <div className="rounded-lg border border-[#234339] bg-[#102420] p-4">
                <h3 className="mb-1 text-sm font-medium text-[#cfe0da]">Where mentors are needed most</h3>
                <p className="mb-3 text-xs text-[#6f8981]">Subjects with more student demand than verified mentors.</p>
                {analytics.subjectGaps.length === 0 ? (
                  <p className="text-xs text-[#6f8981]">No subject is currently under-covered.</p>
                ) : (
                  <BarChart
                    data={analytics.subjectGaps.map((s) => ({
                      label: `${s.subject} (${s.mentorCount} mentor${s.mentorCount === 1 ? "" : "s"})`,
                      value: s.gap,
                    }))}
                  />
                )}
              </div>
              <div className="rounded-lg border border-[#234339] bg-[#102420] p-4">
                <h3 className="mb-1 text-sm font-medium text-[#cfe0da]">Growth</h3>
                <p className="mb-3 text-xs text-[#6f8981]">New student and mentor signups per week, last 8 weeks.</p>
                {analytics.growthTrend.every((w) => w.students === 0 && w.mentors === 0) ? (
                  <p className="text-xs text-[#6f8981]">No signups in this window yet.</p>
                ) : (
                  <LineChart
                    data={analytics.growthTrend}
                    series={[
                      { key: "students", label: "Students", color: "#39C5BB" },
                      { key: "mentors", label: "Mentors", color: "#ff6fb4" },
                    ]}
                  />
                )}
              </div>
              <div className="rounded-lg border border-[#234339] bg-[#102420] p-4">
                <h3 className="mb-3 text-sm font-medium text-[#cfe0da]">Top subjects by demand</h3>
                {analytics.topSubjects.length === 0 ? (
                  <p className="text-xs text-[#6f8981]">No help requests yet.</p>
                ) : (
                  <BarChart data={analytics.topSubjects.map((s) => ({ label: s.subject, value: s.count }))} />
                )}
              </div>
              <div className="rounded-lg border border-[#234339] bg-[#102420] p-4">
                <h3 className="mb-3 text-sm font-medium text-[#cfe0da]">Sessions by status</h3>
                {Object.keys(analytics.sessionsByStatus).length === 0 ? (
                  <p className="text-xs text-[#6f8981]">No sessions yet.</p>
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
    <div className="rounded-lg border border-[#234339] bg-[#102420] p-3">
      <p className="text-xs text-[#9fb8ae]">{label}</p>
      <p className="text-xl font-semibold text-[#e7f0ed]">{value}</p>
    </div>
  );
}
