"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import SubjectCombobox from "@/components/SubjectCombobox";
import { useSubjects } from "@/lib/useSubjects";
import * as api from "@/lib/api";

const DIFFICULTY_LEVELS = ["BEGINNER", "INTERMEDIATE", "EXPERT"];
const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH"];
const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function csvToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function NewHelpRequestPage() {
  const { loading } = useRequireRole("STUDENT");
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillSubjectId = searchParams.get("subject");
  const prefillMentorProfileId = searchParams.get("mentorProfileId");
  const subjects = useSubjects();

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState(DIFFICULTY_LEVELS[1]);
  const [languagePreferences, setLanguagePreferences] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("MEDIUM");
  const [preferredDayOfWeek, setPreferredDayOfWeek] = useState(1);
  const [preferredStartTime, setPreferredStartTime] = useState("14:00");
  const [preferredEndTime, setPreferredEndTime] = useState("16:00");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!prefillSubjectId || subject) return;
    const match = subjects.find((s) => s.id === prefillSubjectId);
    if (match) setSubject(match.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillSubjectId, subjects]);

  if (loading) return null;

  async function handleRequestNewSubject(name) {
    await api.requestSubject(token, name);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { helpRequest } = await api.createHelpRequest(token, {
        subject,
        topic,
        description: description.trim() || undefined,
        difficultyLevel,
        languagePreferences: csvToList(languagePreferences),
        urgencyLevel,
        preferredDayOfWeek: Number(preferredDayOfWeek),
        preferredStartTime,
        preferredEndTime,
      });

      if (prefillMentorProfileId) {
        try {
          await api.requestMentor(token, helpRequest.id, prefillMentorProfileId);
        } catch {
          // Request failed (e.g. mentor no longer eligible) — the help request
          // itself was still created successfully, so just land on it normally.
        }
      }

      router.push(`/student/help-requests/${helpRequest.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Post a help request</h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
        <Field label="Subject">
          <SubjectCombobox
            id="help-request-subject"
            required
            placeholder="Search subjects…"
            value={subject}
            onChange={setSubject}
            allowCreate={false}
            onRequestNew={handleRequestNewSubject}
          />
        </Field>

        <Field label="Topic">
          <input
            required
            placeholder="Quadratic equations"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </Field>

        <Field label="Additional details (optional)">
          <textarea
            rows={3}
            placeholder="Anything else that would help a mentor understand what you need…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </Field>

        <Field label="Difficulty level">
          <select
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Language preferences (comma-separated)">
          <input
            required
            placeholder="English, Malay"
            value={languagePreferences}
            onChange={(e) => setLanguagePreferences(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </Field>

        <Field label="Urgency">
          <select
            value={urgencyLevel}
            onChange={(e) => setUrgencyLevel(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          >
            {URGENCY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Preferred time</legend>
          <div className="flex items-center gap-2">
            <select
              value={preferredDayOfWeek}
              onChange={(e) => setPreferredDayOfWeek(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
            >
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={preferredStartTime}
              onChange={(e) => setPreferredStartTime(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
            />
            <span className="text-stone-500">to</span>
            <input
              type="time"
              value={preferredEndTime}
              onChange={(e) => setPreferredEndTime(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
            />
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post request"}
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
