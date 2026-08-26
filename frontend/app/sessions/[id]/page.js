"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { connectSocket } from "@/lib/socket";
import * as api from "@/lib/api";

const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5];

export default function SessionRoomPage({ params }) {
  const { id } = use(params);
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [meetingLinkDraft, setMeetingLinkDraft] = useState("");
  const [savingMeetingLink, setSavingMeetingLink] = useState(false);
  const [editingMeetingLink, setEditingMeetingLink] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [ratingScore, setRatingScore] = useState(null);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingNoShow, setRatingNoShow] = useState(false);
  const [ratingMisconduct, setRatingMisconduct] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !token) return;

    let cancelled = false;

    async function load() {
      try {
        const [{ session }, { messages }] = await Promise.all([
          api.getSession(token, id),
          api.listSessionMessages(token, id),
        ]);
        if (cancelled) return;
        setSession(session);
        setNotesDraft(session.mentorNotes || "");
        setMeetingLinkDraft(session.meetingLink || "");
        setMessages(messages);

        if (session.status === "SCHEDULED") {
          api
            .startSession(token, id)
            .then(({ session }) => !cancelled && setSession(session))
            .catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();

    const socket = connectSocket(token);
    socketRef.current = socket;
    socket.emit("join_session", { sessionId: id });
    socket.on("new_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      cancelled = true;
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    socketRef.current?.emit("send_message", { sessionId: id, content: draft }, (ack) => {
      if (ack?.error) setError(ack.error);
    });
    setDraft("");
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await api.setSessionNotes(token, id, notesDraft);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  }

  function openGoogleCalendarSetup() {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `MentorBridge session: ${session.helpRequest.topic}`,
      details:
        "Agree on a time here, then add Google Meet video conferencing to this event and paste the generated link back into the MentorBridge session page.",
    });
    window.open(`https://calendar.google.com/calendar/u/0/r/eventedit?${params.toString()}`, "_blank");
  }

  async function saveMeetingLink() {
    setSavingMeetingLink(true);
    try {
      const { session: updated } = await api.setSessionMeetingLink(token, id, meetingLinkDraft.trim() || null);
      setSession(updated);
      setEditingMeetingLink(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMeetingLink(false);
    }
  }

  async function saveConfidence(field, value) {
    try {
      const { session } = await api.setSessionConfidence(token, id, { [field]: value });
      setSession(session);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleComplete(outcome) {
    setCompleting(true);
    try {
      const { session } = await api.completeSession(token, id, outcome);
      setSession(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  }

  async function submitRating(e) {
    e.preventDefault();
    setSubmittingRating(true);
    setError(null);
    try {
      const { rating } = await api.rateSession(token, id, {
        ...(ratingScore ? { score: ratingScore } : {}),
        ...(ratingComment ? { comment: ratingComment } : {}),
        isNoShow: ratingNoShow,
        isMisconduct: ratingMisconduct,
      });
      setSession((prev) => ({ ...prev, ratings: [...prev.ratings, rating] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingRating(false);
    }
  }

  if (loading || !session) return null;

  const isMentor = user.role === "MENTOR";
  const isStudent = user.role === "STUDENT";
  const isOpen = session.status === "SCHEDULED";
  const canRate = !isOpen;
  const myRating = session.ratings.find((r) => r.raterId === user.id);
  const counterpart = isMentor ? session.helpRequest.studentProfile.user : session.mentorProfile.user;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div>
          <Link
            href={isMentor ? "/mentor/dashboard" : "/student/dashboard"}
            className="text-sm text-stone-500 hover:underline"
          >
            &larr; Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{session.helpRequest.topic}</h1>
          <p className="text-stone-600">
            {session.helpRequest.subject.name} · Status: <span className="font-medium">{session.status}</span>
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!counterpart.isActive && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">
            {counterpart.name}&apos;s account has been suspended — they may not respond.
          </p>
        )}

        <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
          <h2 className="mb-2 font-medium">Video call</h2>

            {isMentor && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={openGoogleCalendarSetup}
                  type="button"
                  className="self-start rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
                >
                  Set up a Google Meet
                </button>
                <p className="text-xs text-stone-500">
                  This opens Google Calendar so you can agree on a time and add Meet video conferencing yourself —
                  paste the resulting link below once it&apos;s ready.
                </p>

                {session.meetingLink && !editingMeetingLink ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
                    >
                      Open Google Meet
                    </a>
                    <button
                      onClick={() => setEditingMeetingLink(true)}
                      type="button"
                      className="text-xs text-stone-500 hover:underline"
                    >
                      Update link
                    </button>
                  </div>
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

            {isStudent &&
              (session.meetingLink ? (
                <a
                  href={session.meetingLink}
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
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-stone-200 bg-white p-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700">
              Send
            </button>
          </form>
        </div>

        {isStudent && (
          <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <h2 className="mb-2 font-medium">Confidence tracking</h2>
            <div className="flex gap-6">
              <ConfidencePicker
                label="Before session"
                value={session.confidenceBefore}
                onChange={(v) => saveConfidence("confidenceBefore", v)}
              />
              <ConfidencePicker
                label="After session"
                value={session.confidenceAfter}
                onChange={(v) => saveConfidence("confidenceAfter", v)}
              />
            </div>
          </section>
        )}

        {isMentor && (
          <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <h2 className="mb-2 font-medium">Session notes</h2>
            <textarea
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-2 rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {savingNotes ? "Saving…" : "Save notes"}
            </button>

            {isOpen && (
              <div className="mt-4 flex gap-2 border-t border-stone-200 bg-white pt-4">
                <button
                  onClick={() => handleComplete("COMPLETED")}
                  disabled={completing}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Mark completed
                </button>
                <button
                  onClick={() => handleComplete("NO_SHOW")}
                  disabled={completing}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50 disabled:opacity-50"
                >
                  Mark no-show
                </button>
              </div>
            )}
          </section>
        )}

        {canRate && (
          <section className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <h2 className="mb-2 font-medium">{isMentor ? "Rate the student" : "Rate your mentor"}</h2>

            {myRating ? (
              <div>
                {myRating.score && <p>Your rating: {myRating.score} / 5</p>}
                {myRating.comment && <p className="text-stone-600">&quot;{myRating.comment}&quot;</p>}
                {myRating.isNoShow && <p className="text-amber-700">Flagged: no-show</p>}
                {myRating.isMisconduct && <p className="text-red-700">Flagged: misconduct</p>}
              </div>
            ) : (
              <form onSubmit={submitRating} className="flex flex-col gap-3">
                <div className="flex gap-1">
                  {CONFIDENCE_LEVELS.map((level) => (
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
                {isMentor && (
                  <div className="flex gap-4 text-stone-700">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={ratingNoShow}
                        onChange={(e) => setRatingNoShow(e.target.checked)}
                      />
                      Student no-show
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={ratingMisconduct}
                        onChange={(e) => setRatingMisconduct(e.target.checked)}
                      />
                      Inappropriate behaviour
                    </label>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submittingRating || (!ratingScore && !ratingNoShow && !ratingMisconduct)}
                  className="self-start rounded-lg bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submittingRating ? "Submitting…" : "Submit rating"}
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ConfidencePicker({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-1 text-stone-500">{label}</p>
      <div className="flex gap-1">
        {CONFIDENCE_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`h-7 w-7 rounded-lg border text-xs ${
              value === level ? "bg-teal-600 text-white" : "border-stone-300 bg-white hover:bg-stone-50"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
