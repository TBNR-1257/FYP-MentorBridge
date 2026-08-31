"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import Pagination from "@/components/Pagination";
import * as api from "@/lib/api";

const ROLES = ["", "STUDENT", "MENTOR", "ADMIN"];
const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { loading } = useRequireRole("ADMIN");
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);
  const [reasonDraft, setReasonDraft] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function load() {
    setFetching(true);
    try {
      const { users, total } = await api.listUsers(token, {
        role: role || undefined,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setUsers(users);
      setTotal(total);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  // Any filter change invalidates the current page's contents, so jump back
  // to page 1 rather than risk landing past the end of a shorter result set.
  useEffect(() => {
    setPage(1);
  }, [role, search]);

  useEffect(() => {
    if (loading || !token) return;
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, role, search, page]);

  async function handleSuspend(id) {
    if (!reasonDraft.trim()) return;
    setActioningId(id);
    setError(null);
    try {
      await api.suspendUser(token, id, reasonDraft.trim());
      setSuspendingId(null);
      setReasonDraft("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  async function handleReactivate(id) {
    setActioningId(id);
    setError(null);
    try {
      await api.reactivateUser(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">All Users</h1>

        <div className="mt-4 flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r || "All roles"}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {!fetching && total > 0 && (
          <p className="mt-3 text-xs text-stone-500">
            {total} user{total === 1 ? "" : "s"} found
          </p>
        )}

        {fetching ? (
          <p className="mt-6 text-sm text-stone-500">Loading…</p>
        ) : users.length === 0 ? (
          <p className="mt-6 text-sm text-stone-500">No users found.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {users.map((u) => (
              <li key={u.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {u.name} <span className="text-xs font-normal text-stone-500">({u.role})</span>
                    </p>
                    <p className="text-stone-500">{u.email}</p>
                    {!u.isActive && (
                      <p className="mt-1 text-xs text-red-600">
                        Suspended{u.suspendedReason ? `: ${u.suspendedReason}` : ""}
                      </p>
                    )}
                  </div>
                  {u.role !== "ADMIN" && (
                    <div className="shrink-0">
                      {u.isActive ? (
                        <button
                          onClick={() => setSuspendingId(suspendingId === u.id ? null : u.id)}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs hover:bg-stone-50"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(u.id)}
                          disabled={actioningId === u.id}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {suspendingId === u.id && (
                  <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
                    <input
                      value={reasonDraft}
                      onChange={(e) => setReasonDraft(e.target.value)}
                      placeholder="Reason for suspension…"
                      className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => handleSuspend(u.id)}
                      disabled={actioningId === u.id || !reasonDraft.trim()}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm suspend
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </main>
  );
}
