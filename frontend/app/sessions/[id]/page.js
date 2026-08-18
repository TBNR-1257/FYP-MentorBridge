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
  const [completing, setCompleting] = useState(false);

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

  if (loading || !session) return null;

  const isMentor = user.role === "MENTOR";
  const isStudent = user.role === "STUDENT";
  const isOpen = session.status === "SCHEDULED";

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div>
          <Link
            href={isMentor ? "/mentor/dashboard" : "/student/dashboard"}
            className="text-sm text-gray-500 hover:underline"
          >
            &larr; Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{session.helpRequest.topic}</h1>
          <p className="text-gray-600">
            {session.helpRequest.subject.name} · {session.format} · Status:{" "}
            <span className="font-medium">{session.status}</span>
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {session.format === "VIDEO_CALL" && (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-500">
            Video call — coming soon. Use text chat below for now.
          </div>
        )}

        <div className="flex h-80 flex-col rounded-md border border-gray-200">
          <div className="flex-1 overflow-y-auto p-3">
            {messages.map((m) => (
              <div key={m.id} className={`mb-2 flex ${m.senderId === user.id ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-md px-3 py-1.5 text-sm ${
                    m.senderId === user.id ? "bg-black text-white" : "bg-gray-100"
                  }`}
                >
                  <p className="text-xs opacity-70">{m.sender.name}</p>
                  <p>{m.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-200 p-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800">
              Send
            </button>
          </form>
        </div>

        {isStudent && (
          <section className="rounded-md border border-gray-200 p-4 text-sm">
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
          <section className="rounded-md border border-gray-200 p-4 text-sm">
            <h2 className="mb-2 font-medium">Session notes</h2>
            <textarea
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-2 rounded-md bg-black px-3 py-1.5 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {savingNotes ? "Saving…" : "Save notes"}
            </button>

            {isOpen && (
              <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
                <button
                  onClick={() => handleComplete("COMPLETED")}
                  disabled={completing}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Mark completed
                </button>
                <button
                  onClick={() => handleComplete("NO_SHOW")}
                  disabled={completing}
                  className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                >
                  Mark no-show
                </button>
              </div>
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
      <p className="mb-1 text-gray-500">{label}</p>
      <div className="flex gap-1">
        {CONFIDENCE_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`h-7 w-7 rounded-md border text-xs ${
              value === level ? "bg-black text-white" : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
