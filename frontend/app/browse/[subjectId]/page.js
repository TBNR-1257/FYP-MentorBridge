"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import { useSubjects } from "@/lib/useSubjects";
import BadgeIcon from "@/components/Badge";
import * as api from "@/lib/api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BrowseSubjectPage({ params }) {
  const { subjectId } = use(params);
  const { loading } = useRequireRole("STUDENT");
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const helpRequestIdFromLink = searchParams.get("helpRequestId");
  const subjects = useSubjects();

  const [tab, setTab] = useState("mentors");
  const [search, setSearch] = useState("");
  const [mentors, setMentors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [openRequestsForSubject, setOpenRequestsForSubject] = useState([]);

  const subject = subjects.find((s) => s.id === subjectId);

  useEffect(() => {
    if (loading || !token) return;
    setFetching(true);
    const timeout = setTimeout(() => {
      const call =
        tab === "mentors"
          ? api.listMentorsForSubject(token, subjectId, search).then(({ mentors }) => setMentors(mentors))
          : api.listCoursesForSubject(token, subjectId, search).then(({ courses }) => setCourses(courses));
      call.finally(() => setFetching(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [loading, token, subjectId, search, tab]);

  // Only needed as a fallback when the student arrived without a specific help
  // request in mind (e.g. from the sidebar) — used to figure out which of their
  // open requests in this subject a "Request" click should attach to.
  useEffect(() => {
    if (loading || !token || helpRequestIdFromLink) return;
    api.listMyHelpRequests(token).then(({ helpRequests }) => {
      setOpenRequestsForSubject(helpRequests.filter((hr) => hr.subject.id === subjectId && hr.status === "OPEN"));
    });
  }, [loading, token, subjectId, helpRequestIdFromLink]);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/browse" className="text-sm text-stone-500 hover:underline">
          &larr; Back to browse
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{subject?.name || "Subject"}</h1>

        <div className="mt-4 flex rounded-lg border border-stone-300 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("mentors")}
            className={`rounded px-4 py-1.5 ${tab === "mentors" ? "bg-teal-600 text-white" : ""}`}
          >
            Mentors
          </button>
          <button
            type="button"
            onClick={() => setTab("courses")}
            className={`rounded px-4 py-1.5 ${tab === "courses" ? "bg-teal-600 text-white" : ""}`}
          >
            Courses
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === "mentors" ? "Search by mentor name…" : "Search by course title…"}
          className="mt-4 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      <section className="flex w-full max-w-2xl flex-col gap-3">
        {fetching ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : tab === "mentors" ? (
          mentors.length === 0 ? (
            <p className="text-sm text-stone-500">No mentors found.</p>
          ) : (
            mentors.map((mentor) => (
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                token={token}
                subjectId={subjectId}
                helpRequestIdFromLink={helpRequestIdFromLink}
                openRequestsForSubject={openRequestsForSubject}
                router={router}
              />
            ))
          )
        ) : courses.length === 0 ? (
          <p className="text-sm text-stone-500">No courses found.</p>
        ) : (
          courses.map((course) => <CourseCard key={course.id} course={course} token={token} router={router} />)
        )}
      </section>
    </main>
  );
}

function CourseCard({ course, token, router }) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      await api.joinCourse(token, course.id);
      router.push(`/courses/${course.id}`);
    } catch (err) {
      setError(err.message);
      setJoining(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-stone-900">{course.title}</p>
          <p className="text-stone-500">
            {course.mentorProfile.user.name} · {course.difficultyLevel}
          </p>
        </div>
        <span className="shrink-0 text-xs text-stone-500">{course._count.enrollments} enrolled</span>
      </div>
      <p className="mt-2 text-stone-600">{course.description}</p>
      {course.timeSlots.length > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          {course.timeSlots
            .map((slot) => `${DAY_LABELS[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}`)
            .join(", ")}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={joining}
        className="mt-3 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {joining ? "Joining…" : "Join"}
      </button>
    </div>
  );
}

function MentorCard({ mentor, token, subjectId, helpRequestIdFromLink, openRequestsForSubject, router }) {
  const [selectedHelpRequestId, setSelectedHelpRequestId] = useState(openRequestsForSubject[0]?.id || "");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedHelpRequestId && openRequestsForSubject[0]) {
      setSelectedHelpRequestId(openRequestsForSubject[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequestsForSubject]);

  async function handleRequest(helpRequestId) {
    setRequesting(true);
    setError(null);
    try {
      await api.requestMentor(token, helpRequestId, mentor.id);
      router.push(`/student/help-requests/${helpRequestId}`);
    } catch (err) {
      setError(err.message);
      setRequesting(false);
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-stone-900">{mentor.name}</p>
          <p className="text-stone-500">
            {mentor.avgRating !== null ? `★ ${mentor.avgRating.toFixed(1)} (${mentor.ratingCount})` : "No ratings yet"}
          </p>
        </div>
        {mentor.badges.length > 0 && (
          <div className="flex gap-2">
            {mentor.badges.slice(0, 3).map((badge) => (
              <BadgeIcon key={badge.id} badge={badge} earned size="sm" />
            ))}
          </div>
        )}
      </div>
      {mentor.bio && <p className="mt-2 text-stone-600">{mentor.bio}</p>}
      <p className="mt-2 text-xs text-stone-500">{mentor.qualifications}</p>
      {mentor.languages.length > 0 && (
        <p className="mt-1 text-xs text-stone-500">Languages: {mentor.languages.join(", ")}</p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 border-t border-stone-100 pt-3">
        {helpRequestIdFromLink ? (
          <button
            onClick={() => handleRequest(helpRequestIdFromLink)}
            disabled={requesting}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {requesting ? "Requesting…" : "Request this mentor"}
          </button>
        ) : openRequestsForSubject.length === 0 ? (
          <Link
            href={`/student/help-requests/new?subject=${subjectId}&mentorProfileId=${mentor.id}`}
            className="text-xs text-teal-700 hover:underline"
          >
            No open request for this subject yet — create one to request {mentor.name}
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            {openRequestsForSubject.length > 1 && (
              <select
                value={selectedHelpRequestId}
                onChange={(e) => setSelectedHelpRequestId(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs"
              >
                {openRequestsForSubject.map((hr) => (
                  <option key={hr.id} value={hr.id}>
                    {hr.topic}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => handleRequest(selectedHelpRequestId)}
              disabled={requesting}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {requesting ? "Requesting…" : "Request this mentor"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
