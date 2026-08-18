"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import * as api from "@/lib/api";

export default function AdminDashboardPage() {
  const { user, loading } = useRequireRole("ADMIN");
  const { token } = useAuth();

  const [mentors, setMentors] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);

  async function loadPendingMentors() {
    setFetching(true);
    try {
      const { mentors } = await api.listMentors(token, "PENDING");
      setMentors(mentors);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!loading && token) loadPendingMentors();
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

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-lg font-medium">Pending mentor verifications</h2>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {fetching ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : mentors.length === 0 ? (
          <p className="text-sm text-gray-500">No mentors awaiting verification.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mentors.map((mentor) => (
              <li key={mentor.id} className="rounded-md border border-gray-200 p-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{mentor.user.name}</p>
                    <p className="text-gray-500">{mentor.user.email}</p>
                    <p className="mt-2">{mentor.qualifications}</p>
                    <p className="mt-1 text-gray-500">
                      Subjects: {mentor.subjects.map((s) => s.subject.name).join(", ") || "—"}
                    </p>
                    <p className="text-gray-500">Languages: {mentor.languages.join(", ") || "—"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleDecision(mentor.id, "verify")}
                      disabled={actioningId === mentor.id}
                      className="rounded-md bg-black px-3 py-1.5 text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleDecision(mentor.id, "reject")}
                      disabled={actioningId === mentor.id}
                      className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
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

      <p className="text-gray-600">TODO: session monitoring, platform analytics, account suspension.</p>
    </main>
  );
}
