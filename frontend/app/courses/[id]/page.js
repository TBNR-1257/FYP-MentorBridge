"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { connectSocket } from "@/lib/socket";
import ResourceList from "@/components/ResourceList";
import * as api from "@/lib/api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RATING_LEVELS = [1, 2, 3, 4, 5];

// Upcoming (SCHEDULED) sessions first, soonest at the top; closed-out sessions
// (completed/cancelled/no-show) pushed below those, oldest to newest.
function sortCourseSessions(list) {
  return [...list].sort((a, b) => {
    const aOpen = a.status === "SCHEDULED";
    const bOpen = b.status === "SCHEDULED";
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    return new Date(a.scheduledAt) - new Date(b.scheduledAt);
  });
}

export default function CourseRoomPage({ params }) {
  const { id } = use(params);
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [meetingLinkDraft, setMeetingLinkDraft] = useState("");
  const [editingMeetingLink, setEditingMeetingLink] = useState(false);
  const [savingMeetingLink, setSavingMeetingLink] = useState(false);
  const [actioningSessionId, setActioningSessionId] = useState(null);
  const [resources, setResources] = useState([]);
  const [endingConfirm, setEndingConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [ratingScore, setRatingScore] = useState(null);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const canAccessRoom = course && (course.isMentor || course.isEnrolled);

  async function load() {
    try {
      const { course } = await api.getCourse(token, id);
      setCourse(course);
      setMeetingLinkDraft(course.meetingLink || "");

      if (course.isMentor || course.isEnrolled) {
        const [{ messages }, { sessions: allSessions }, { resources }] = await Promise.all([
          api.listCourseMessages(token, id),
          api.listMyCourseSessions(token),
          api.listCourseResources(token, id),
        ]);
        setMessages(messages);
        setSessions(sortCourseSessions(allSessions.filter((s) => s.courseId === id)));
        setResources(resources);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (loading || !token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, id]);

  useEffect(() => {
    if (!canAccessRoom || !token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;
    socket.emit("join_course", { courseId: id });
    socket.on("new_course_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => socket.close();
  }, [canAccessRoom, token, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      await api.joinCourse(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    socketRef.current?.emit("send_course_message", { courseId: id, content: draft }, (ack) => {
      if (ack?.error) setError(ack.error);
    });
    setDraft("");
  }

  function openGoogleCalendarSetup() {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `MentorBridge course: ${course.title}`,
      details:
        "Set a recurring time for this class, add Google Meet video conferencing, then paste the generated link back into the MentorBridge course page.",
    });
    window.open(`https://calendar.google.com/calendar/u/0/r/eventedit?${params.toString()}`, "_blank");
  }

  async function saveMeetingLink() {
    setSavingMeetingLink(true);
    try {
      const { course: updated } = await api.setCourseMeetingLink(token, id, meetingLinkDraft.trim() || null);
      setCourse(updated);
      setEditingMeetingLink(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMeetingLink(false);
    }
  }

  async function handleAddResource(payload) {
    const { resource } = await api.addCourseResource(token, id, payload);
    setResources((prev) => [resource, ...prev]);
  }

  async function handleEndCourse() {
    setEnding(true);
    setError(null);
    try {
      const { course: updated } = await api.endCourse(token, id);
      setCourse(updated);
      setEndingConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnding(false);
    }
  }

  async function handleClone() {
    setCloning(true);
    setError(null);
    try {
      const { course: cloned } = await api.cloneCourse(token, id);
      router.push(`/courses/${cloned.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCloning(false);
    }
  }

  async function submitRating(e) {
    e.preventDefault();
    setSubmittingRating(true);
    setError(null);
    try {
      const { rating } = await api.rateCourse(token, id, { score: ratingScore, comment: ratingComment.trim() || undefined });
      setCourse((prev) => ({ ...prev, ratings: [...prev.ratings, rating] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleSessionAction(sessionId, action, extra) {
    setActioningSessionId(sessionId);
    setError(null);
    try {
      if (action === "start") await api.startCourseSession(token, sessionId);
      if (action === "complete") await api.completeCourseSession(token, sessionId, extra);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningSessionId(null);
    }
  }

  if (loading || !course) return null;

  const isMentor = course.isMentor;
  const isArchived = course.status === "ARCHIVED";
  const myCourseRating = course.ratings.find((r) => r.raterId === user.id);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div>
          <Link
            href={isMentor ? "/mentor/courses" : "/student/dashboard"}
            className="text-sm text-stone-500 hover:underline"
          >
            &larr; Back
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {course.title}{" "}
            <span className="align-middle text-xs font-normal text-stone-500">
              {course.mode} · {course.status}
            </span>
          </h1>
          <p className="text-stone-600">
            {course.subject.name} · {course.difficultyLevel} · Taught by {course.mentorProfile.user.name} ·{" "}
            {course._count.enrollments} enrolled
          </p>
          <p className="mt-2 text-sm text-stone-700">{course.description}</p>
          {course.timeSlots.length > 0 && (
            <p className="mt-1 text-xs text-stone-500">
              {course.timeSlots
                .map((slot) => `${DAY_LABELS[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}`)
                .join(", ")}
            </p>
          )}
        </div>

        {isMentor && (
          <div className="flex items-center gap-2">
            {!isArchived &&
              (endingConfirm ? (
                <>
                  <span className="text-xs text-stone-600">
                    End this course? Upcoming sessions will be cancelled and students notified.
                  </span>
                  <button
                    onClick={handleEndCourse}
                    disabled={ending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {ending ? "Ending…" : "Confirm end course"}
                  </button>
                  <button
                    onClick={() => setEndingConfirm(false)}
                    type="button"
                    className="text-xs text-stone-500 hover:underline"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEndingConfirm(true)}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs hover:bg-stone-50"
                >
                  End course
                </button>
              ))}
            <button
              onClick={handleClone}
              disabled={cloning}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs hover:bg-stone-50 disabled:opacity-50"
            >
              {cloning ? "Cloning…" : "Clone this course"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isMentor && canAccessRoom && !course.mentorProfile.user.isActive && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">
            {course.mentorProfile.user.name}&apos;s account has been suspended — they may not respond.
          </p>
        )}

        {!canAccessRoom ? (
          course.isLocked ? (
            <p className="self-start rounded-lg bg-stone-100 px-4 py-2 text-sm text-stone-700">
              Enrollment is closed — this course has already started.
            </p>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="self-start rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join this course"}
            </button>
          )
        ) : (
          <>
            <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <h2 className="mb-2 font-medium">Video call</h2>

              {isMentor && (
                <div className="flex flex-col gap-3">
                  {!isArchived && (
                    <button
                      onClick={openGoogleCalendarSetup}
                      type="button"
                      className="self-start rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
                    >
                      Set up a Google Meet
                    </button>
                  )}

                  {course.meetingLink && !editingMeetingLink ? (
                    <div className="flex items-center gap-3">
                      <a
                        href={course.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
                      >
                        Open Google Meet
                      </a>
                      {!isArchived && (
                        <button
                          onClick={() => setEditingMeetingLink(true)}
                          type="button"
                          className="text-xs text-stone-500 hover:underline"
                        >
                          Update link
                        </button>
                      )}
                    </div>
                  ) : isArchived ? (
                    <p className="text-stone-500">This course has ended.</p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={meetingLinkDraft}
                        onChange={(e) => setMeetingLinkDraft(e.target.value)}
                        placeholder="Paste the Google Meet link here"
                        className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
                      />
                      <button
                        onClick={saveMeetingLink}
                        disabled={savingMeetingLink}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        {savingMeetingLink ? "Saving…" : "Save link"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!isMentor &&
                (course.meetingLink ? (
                  <a
                    href={course.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
                  >
                    Join Google Meet
                  </a>
                ) : (
                  <p className="text-stone-500">Your mentor hasn&apos;t set up the video call yet.</p>
                ))}
            </section>

            <div className="flex h-80 flex-col rounded-lg border border-stone-200 bg-white">
              <div className="flex-1 overflow-y-auto p-3">
                {messages.map((m) => (
                  <div key={m.id} className={`mb-2 flex ${m.senderId === user.id ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-1.5 text-sm ${
                        m.senderId === user.id ? "bg-teal-600 text-white" : "bg-stone-100 text-stone-900"
                      }`}
                    >
                      <p className="text-xs opacity-70">{m.sender.name}</p>
                      <p>{m.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {isArchived ? (
                <p className="border-t border-stone-200 bg-white p-3 text-xs text-stone-500">
                  This course has ended — the chat is now read-only.
                </p>
              ) : (
                <form onSubmit={sendMessage} className="flex gap-2 border-t border-stone-200 bg-white p-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Message the class…"
                    className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
                  />
                  <button type="submit" className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700">
                    Send
                  </button>
                </form>
              )}
            </div>

            <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
              <h2 className="mb-2 font-medium">Class sessions</h2>
              {sessions.length === 0 ? (
                <p className="text-stone-500">No sessions yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sessions.map((s) => (
                    <li key={s.id} className="rounded-lg border border-stone-100 p-2">
                      <div className="flex items-center justify-between">
                        <span>
                          {new Date(s.scheduledAt).toLocaleString()} · <span className="text-stone-500">{s.status}</span>
                        </span>
                        {isMentor && !isArchived && s.status === "SCHEDULED" && (
                          <div className="flex gap-2">
                            {!s.startedAt && (
                              <button
                                onClick={() => handleSessionAction(s.id, "start")}
                                disabled={actioningSessionId === s.id}
                                className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
                              >
                                Start
                              </button>
                            )}
                            <button
                              onClick={() => handleSessionAction(s.id, "complete", "COMPLETED")}
                              disabled={actioningSessionId === s.id}
                              className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleSessionAction(s.id, "complete", "NO_SHOW")}
                              disabled={actioningSessionId === s.id}
                              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
                            >
                              No-show
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ResourceList resources={resources} canAdd={isMentor && !isArchived} onAdd={handleAddResource} />

            {!isMentor && isArchived && (
              <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
                <h2 className="mb-2 font-medium">Rate this course</h2>

                {myCourseRating ? (
                  <div>
                    <p>Your rating: {myCourseRating.score} / 5</p>
                    {myCourseRating.comment && <p className="text-stone-600">&quot;{myCourseRating.comment}&quot;</p>}
                  </div>
                ) : (
                  <form onSubmit={submitRating} className="flex flex-col gap-3">
                    <div className="flex gap-1">
                      {RATING_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setRatingScore(level)}
                          className={`h-8 w-8 rounded-lg border text-sm ${
                            ratingScore === level ? "bg-teal-600 text-white" : "border-stone-300 bg-white hover:bg-stone-50"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Optional comment"
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2"
                    />
                    <button
                      type="submit"
                      disabled={submittingRating || !ratingScore}
                      className="self-start rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {submittingRating ? "Submitting…" : "Submit rating"}
                    </button>
                  </form>
                )}
              </section>
            )}

            {course.members.length > 0 && (
              <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
                <h2 className="mb-2 font-medium">Students ({course.members.length})</h2>
                <p className="text-stone-600">
                  {course.members.map((m, i) => (
                    <span key={m.name + i}>
                      {i > 0 && ", "}
                      {m.name}
                      {!m.isActive && <span className="text-red-600"> (suspended)</span>}
                    </span>
                  ))}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
