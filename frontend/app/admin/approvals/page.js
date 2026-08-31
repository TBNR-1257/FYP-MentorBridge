"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import FilterChips from "@/components/FilterChips";
import * as api from "@/lib/api";

const MENTOR_STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

const SUBJECT_STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const STATUS_PILL = {
  PENDING: "bg-amber-100 text-amber-800",
  VERIFIED: "bg-teal-100 text-teal-800",
  APPROVED: "bg-teal-100 text-teal-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function AdminApprovalsPage() {
  const { loading } = useRequireRole("ADMIN");
  const { token } = useAuth();

  const [tab, setTab] = useState("mentors");

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">Approvals</h1>

        <div className="mt-4 flex rounded-lg border border-stone-300 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("mentors")}
            className={`rounded px-4 py-1.5 ${tab === "mentors" ? "bg-teal-600 text-white" : ""}`}
          >
            Mentor Verification
          </button>
          <button
            type="button"
            onClick={() => setTab("subjects")}
            className={`rounded px-4 py-1.5 ${tab === "subjects" ? "bg-teal-600 text-white" : ""}`}
          >
            Subject Requests
          </button>
        </div>
      </div>

      {loading ? null : tab === "mentors" ? <MentorVerificationTab token={token} /> : <SubjectRequestsTab token={token} />}
    </main>
  );
}

function MentorVerificationTab({ token }) {
  const [mentors, setMentors] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [actioningId, setActioningId] = useState(null);

  async function load() {
    setFetching(true);
    try {
      const { mentors } = await api.listMentors(token);
      setMentors(mentors);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mentors.filter((m) => {
      if (statusFilter !== "ALL" && m.verificationStatus !== statusFilter) return false;
      if (q && !m.user.name.toLowerCase().includes(q) && !m.user.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [mentors, search, statusFilter]);

  async function handleDecision(mentorProfileId, decision) {
    setActioningId(mentorProfileId);
    setError(null);
    try {
      if (decision === "verify") await api.verifyMentor(token, mentorProfileId);
      else await api.rejectMentor(token, mentorProfileId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <FilterChips value={statusFilter} onChange={setStatusFilter} options={MENTOR_STATUS_FILTERS} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 flex flex-col gap-3">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-stone-500">No mentors match.</p>
        ) : (
          filtered.map((mentor) => (
            <li key={mentor.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {mentor.user.name}{" "}
                    <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${STATUS_PILL[mentor.verificationStatus]}`}>
                      {mentor.verificationStatus}
                    </span>
                  </p>
                  <p className="text-stone-500">{mentor.user.email}</p>
                  <p className="mt-2">{mentor.qualifications}</p>
                  <p className="mt-1 text-stone-500">
                    Subjects: {mentor.subjects.map((s) => s.subject.name).join(", ") || "—"}
                  </p>
                  <p className="text-stone-500">Languages: {mentor.languages.join(", ") || "—"}</p>
                </div>
                {mentor.verificationStatus === "PENDING" && (
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
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function SubjectRequestsTab({ token }) {
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [actioningId, setActioningId] = useState(null);

  async function load() {
    setFetching(true);
    try {
      const { requests } = await api.listSubjectRequests(token);
      setRequests(requests);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.requestedBy.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [requests, search, statusFilter]);

  async function handleDecision(requestId, decision) {
    setActioningId(requestId);
    setError(null);
    try {
      if (decision === "approve") await api.approveSubjectRequest(token, requestId);
      else await api.rejectSubjectRequest(token, requestId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by subject or requester…"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <FilterChips value={statusFilter} onChange={setStatusFilter} options={SUBJECT_STATUS_FILTERS} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 flex flex-col gap-3">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-stone-500">No requests match.</p>
        ) : (
          filtered.map((request) => (
            <li key={request.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {request.name}{" "}
                    <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${STATUS_PILL[request.status]}`}>
                      {request.status}
                    </span>
                  </p>
                  <p className="text-stone-500">
                    Requested by {request.requestedBy.name} ({request.requestedBy.email})
                  </p>
                </div>
                {request.status === "PENDING" && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleDecision(request.id, "approve")}
                      disabled={actioningId === request.id}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(request.id, "reject")}
                      disabled={actioningId === request.id}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
