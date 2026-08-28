"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Badge from "@/components/Badge";
import * as api from "@/lib/api";

export default function MentorProfilePage({ params }) {
  const { id } = use(params);
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [mentor, setMentor] = useState(null);
  const [eligibleSubjects, setEligibleSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [endorseMessage, setEndorseMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function load() {
    try {
      const { mentor, eligibleSubjects } = await api.getMentorPublicProfile(token, id);
      setMentor(mentor);
      setEligibleSubjects(eligibleSubjects);
      if (eligibleSubjects.length > 0) setSelectedSubjectId(eligibleSubjects[0].id);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (loading || !token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, id]);

  async function handleEndorse(e) {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.addEndorsement(token, id, { subjectId: selectedSubjectId, message: endorseMessage.trim() || undefined });
      setEndorseMessage("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(courseId) {
    setJoiningId(courseId);
    setError(null);
    try {
      await api.joinCourse(token, courseId);
      router.push(`/courses/${courseId}`);
    } catch (err) {
      setError(err.message);
      setJoiningId(null);
    }
  }

  if (loading || !mentor) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">{mentor.name}</h1>
        <p className="text-stone-600">
          {mentor.subjects.map((s) => s.name).join(", ")}
          {mentor.avgRating !== null && (
            <>
              {" "}
              · ★ {mentor.avgRating.toFixed(1)} ({mentor.ratingCount})
            </>
          )}
        </p>
        <p className="text-sm text-stone-500">{mentor.totalServiceHours} hours volunteered</p>

        {!mentor.isActive && (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">
            This mentor&apos;s account has been suspended.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {mentor.bio && <p className="w-full max-w-2xl text-sm text-stone-700">{mentor.bio}</p>}

      <div className="w-full max-w-2xl rounded-lg border border-stone-200 bg-white p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Qualifications" value={mentor.qualifications} />
          <Row label="Languages" value={mentor.languages.join(", ")} />
        </dl>
      </div>

      {mentor.badges.length > 0 && (
        <section className="w-full max-w-2xl">
          <h2 className="mb-3 text-lg font-medium">Badges</h2>
          <div className="grid grid-cols-4 gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-4">
            {mentor.badges.map((badge) => (
              <Badge key={badge.id} badge={badge} earned />
            ))}
          </div>
        </section>
      )}

      {mentor.courses.length > 0 && (
        <section className="w-full max-w-2xl">
          <h2 className="mb-3 text-lg font-medium">Active courses</h2>
          <ul className="flex flex-col gap-2">
            {mentor.courses.map((course) => (
              <li key={course.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Link href={`/courses/${course.id}`} className="font-medium hover:underline">
                      {course.title}
                    </Link>
                    <p className="text-stone-500">
                      {course.subject.name} · {course.difficultyLevel} · {course._count.enrollments} enrolled
                    </p>
                  </div>
                  {user.role === "STUDENT" && (
                    <button
                      onClick={() => handleJoin(course.id)}
                      disabled={joiningId === course.id}
                      className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {joiningId === course.id ? "Joining…" : "Join"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="w-full max-w-2xl">
        <h2 className="mb-3 text-lg font-medium">Endorsements</h2>
        {mentor.endorsements.length === 0 ? (
          <p className="text-sm text-stone-500">No endorsements yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {mentor.endorsements.map((group) => (
              <div key={group.subject} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <p className="font-medium">
                  {group.subject} <span className="font-normal text-stone-500">({group.count})</span>
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {group.items.map((item, i) => (
                    <li key={i} className="text-stone-600">
                      <span className="font-medium text-stone-800">{item.endorserName}</span>
                      {item.message && <>: &quot;{item.message}&quot;</>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {user.role === "STUDENT" && eligibleSubjects.length > 0 && (
          <form onSubmit={handleEndorse} className="mt-4 flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
            <p className="text-sm font-medium">Endorse this mentor</p>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
            >
              {eligibleSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea
              rows={2}
              placeholder="Optional message…"
              value={endorseMessage}
              onChange={(e) => setEndorseMessage(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="self-start rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit endorsement"}
            </button>
          </form>
        )}
      </section>
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
