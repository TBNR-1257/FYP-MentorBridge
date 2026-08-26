"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import BarChart from "@/components/BarChart";
import * as api from "@/lib/api";

export default function AdminDashboardPage() {
  const { user, loading } = useRequireRole("ADMIN");
  const { token } = useAuth();

  const [mentors, setMentors] = useState([]);
  const [subjectRequests, setSubjectRequests] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);

  async function loadPending() {
    setFetching(true);
    try {
      const [{ mentors }, { requests }, { analytics }] = await Promise.all([
        api.listMentors(token, "PENDING"),
        api.listSubjectRequests(token, "PENDING"),
        api.getAnalytics(token),
      ]);
      setMentors(mentors);
      setSubjectRequests(requests);
      setAnalytics(analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!loading && token) loadPending();
  }, [loading, token]);

  async function handleDecision(mentorProfileId, decision) {
    setActioningId(mentorProfileId);
    setError(null);
    try {
      if (decision === "verify") {
        await api.verifyMentor(token, mentorProfileId);
      } else {
        await api.rejectMentor(token, mentorProfileId);
      }
      setMentors((prev) => prev.filter((m) => m.id !== mentorProfileId));
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  async function handleSubjectDecision(requestId, decision) {
    setActioningId(requestId);
    setError(null);
    try {
      if (decision === "approve") {
        await api.approveSubjectRequest(token, requestId);
      } else {
        await api.rejectSubjectRequest(token, requestId);
      }
      setSubjectRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-lg font-medium">Pending mentor verifications</h2>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : mentors.length === 0 ? (
          <p className="text-sm text-stone-500">No mentors awaiting verification.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mentors.map((mentor) => (
              <li key={mentor.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{mentor.user.name}</p>
                    <p className="text-stone-500">{mentor.user.email}</p>
                    <p className="mt-2">{mentor.qualifications}</p>
                    <p className="mt-1 text-stone-500">
                      Subjects: {mentor.subjects.map((s) => s.subject.name).join(", ") || "—"}
                    </p>
                    <p className="text-stone-500">Languages: {mentor.languages.join(", ") || "—"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleDecision(mentor.id, "verify")}
                      disabled={actioningId === mentor.id}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleDecision(mentor.id, "reject")}
                      disabled={actioningId === mentor.id}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-lg font-medium">Pending subject requests</h2>

        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : subjectRequests.length === 0 ? (
          <p className="text-sm text-stone-500">No subject requests awaiting review.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {subjectRequests.map((request) => (
              <li key={request.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-stone-500">
                      Requested by {request.requestedBy.name} ({request.requestedBy.email})
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleSubjectDecision(request.id, "approve")}
                      disabled={actioningId === request.id}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleSubjectDecision(request.id, "reject")}
                      disabled={actioningId === request.id}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
