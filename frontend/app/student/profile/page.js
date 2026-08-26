"use client";

import { useEffect, useState } from "react";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import SubjectTagSelect from "@/components/SubjectTagSelect";
import * as api from "@/lib/api";

export default function StudentProfilePage() {
  const { user, loading } = useRequireRole("STUDENT");
  const { token, refreshUser } = useAuth();

  const [interests, setInterests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.studentProfile?.interests) {
      setInterests(user.studentProfile.interests.map((i) => i.subject.name));
    }
  }, [user]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateStudentProfile(token, { interests });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestNew(name) {
    await api.requestSubject(token, name);
  }

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

      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm">
        <label className="mb-1 block font-medium">Subjects/topics you&apos;re interested in (up to 3)</label>
        <p className="mb-3 text-xs text-stone-500">Drives the recommended courses on your dashboard.</p>
        <SubjectTagSelect
          value={interests}
          onChange={setInterests}
          placeholder="Search subjects…"
          allowCreate={false}
          onRequestNew={handleRequestNew}
          max={3}
        />

        {error && <p className="mt-2 text-red-600">{error}</p>}
        {saved && !error && <p className="mt-2 text-teal-700">Saved.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save interests"}
        </button>
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
