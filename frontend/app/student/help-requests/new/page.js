"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import SubjectCombobox from "@/components/SubjectCombobox";
import * as api from "@/lib/api";

const EDUCATION_LEVELS = ["PRIMARY", "SECONDARY", "UNDERGRADUATE", "POSTGRADUATE", "OTHER"];
const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH"];
const SESSION_FORMATS = [
  { value: "TEXT_CHAT", label: "Text chat" },
  { value: "VIDEO_CALL", label: "Video call" },
  { value: "IN_PERSON", label: "In person" },
];
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

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [educationLevel, setEducationLevel] = useState(EDUCATION_LEVELS[0]);
  const [languagePreferences, setLanguagePreferences] = useState("");
  const [urgencyLevel, setUrgencyLevel] = useState("MEDIUM");
  const [sessionFormat, setSessionFormat] = useState("VIDEO_CALL");
  const [preferredDayOfWeek, setPreferredDayOfWeek] = useState(1);
  const [preferredStartTime, setPreferredStartTime] = useState("14:00");
  const [preferredEndTime, setPreferredEndTime] = useState("16:00");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { helpRequest } = await api.createHelpRequest(token, {
        subject,
        topic,
        educationLevel,
        languagePreferences: csvToList(languagePreferences),
        urgencyLevel,
        sessionFormat,
        preferredDayOfWeek: Number(preferredDayOfWeek),
        preferredStartTime,
        preferredEndTime,
      });
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
            placeholder="Search or add a subject…"
            value={subject}
            onChange={setSubject}
          />
        </Field>

        <Field label="Topic">
          <input
            required
            placeholder="Quadratic equations"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </Field>

        <Field label="Your education level">
          <select
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            {EDUCATION_LEVELS.map((level) => (
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
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </Field>

        <Field label="Urgency">
          <select
            value={urgencyLevel}
            onChange={(e) => setUrgencyLevel(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            {URGENCY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Session format">
          <select
            value={sessionFormat}
            onChange={(e) => setSessionFormat(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            {SESSION_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
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
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
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
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="time"
              value={preferredEndTime}
              onChange={(e) => setPreferredEndTime(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
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
