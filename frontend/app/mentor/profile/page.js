"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import SubjectTagSelect from "@/components/SubjectTagSelect";
import AvailabilityEditor, { emptySlot } from "@/components/AvailabilityEditor";
import * as api from "@/lib/api";

function csvToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MentorProfilePage() {
  const { user, loading } = useRequireRole("MENTOR");
  const { token, refreshUser } = useAuth();

  const [qualifications, setQualifications] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [availability, setAvailability] = useState([emptySlot()]);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.mentorProfile) return;
    setQualifications(user.mentorProfile.qualifications);
    setBio(user.mentorProfile.bio || "");
    setLanguages(user.mentorProfile.languages.join(", "));
    setSubjects(user.mentorProfile.subjects?.map((s) => s.subject.name) || []);
    if (user.mentorProfile.availability?.length) {
      setAvailability(
        user.mentorProfile.availability.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        }))
      );
    }
  }, [user]);

  if (loading) return null;

  const isVerified = user.mentorProfile?.verificationStatus === "VERIFIED";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await api.updateMentorProfile(token, {
        qualifications,
        bio,
        languages: csvToList(languages),
        subjects,
        availability,
      });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-md">
        <Link href="/mentor/dashboard" className="text-sm text-stone-500 hover:underline">
          &larr; Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
        <Field label="Qualifications">
          <textarea
            required
            rows={3}
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
          {isVerified && (
            <p className="text-xs text-amber-700">
              Changing this will require admin re-verification.
            </p>
          )}
        </Field>

        <Field label="Bio (shown on your public profile)">
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </Field>

        <Field label="Languages spoken (comma-separated)">
          <input
            required
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </Field>

        <Field label="Subjects">
          <SubjectTagSelect value={subjects} onChange={setSubjects} placeholder="Search or add a subject…" />
          {isVerified && (
            <p className="text-xs text-amber-700">
              Changing this will require admin re-verification.
            </p>
          )}
        </Field>

        <AvailabilityEditor value={availability} onChange={setAvailability} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">Profile updated.</p>}

        <button
          type="submit"
          disabled={submitting || subjects.length === 0}
          className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
