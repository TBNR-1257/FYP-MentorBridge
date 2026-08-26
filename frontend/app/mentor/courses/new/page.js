"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import SubjectCombobox from "@/components/SubjectCombobox";
import AvailabilityEditor, { emptySlot } from "@/components/AvailabilityEditor";
import * as api from "@/lib/api";

const DIFFICULTY_LEVELS = ["BEGINNER", "INTERMEDIATE", "EXPERT"];

export default function NewCoursePage() {
  const { loading } = useRequireRole("MENTOR");
  const { token } = useAuth();
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState(DIFFICULTY_LEVELS[1]);
  const [timeSlots, setTimeSlots] = useState([emptySlot()]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { course } = await api.createCourse(token, {
        subject,
        title,
        description,
        difficultyLevel,
        timeSlots,
      });
      router.push(`/courses/${course.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Create a course</h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
        <Field label="Subject">
          <SubjectCombobox
            id="course-subject"
            required
            placeholder="Search or add a subject…"
            value={subject}
            onChange={setSubject}
          />
        </Field>

        <Field label="Course title">
          <input
            required
            placeholder="Data Structures"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </Field>

        <Field label="Description">
          <textarea
            required
            rows={3}
            placeholder="What this course covers…"
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

        <div>
          <p className="mb-1 text-sm font-medium">Weekly time slots</p>
          <AvailabilityEditor value={timeSlots} onChange={setTimeSlots} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create course"}
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
