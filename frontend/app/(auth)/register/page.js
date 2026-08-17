"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";

const EDUCATION_LEVELS = ["PRIMARY", "SECONDARY", "UNDERGRADUATE", "POSTGRADUATE", "OTHER"];
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

function emptySlot() {
  return { dayOfWeek: 1, startTime: "14:00", endTime: "16:00" };
}

export default function RegisterPage() {
  const { user, register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(dashboardPathForRole(user.role));
  }, [user, router]);

  const [role, setRole] = useState("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subjects, setSubjects] = useState("");
  const [languages, setLanguages] = useState("");
  const [educationLevel, setEducationLevel] = useState(EDUCATION_LEVELS[0]);
  const [qualifications, setQualifications] = useState("");
  const [availability, setAvailability] = useState([emptySlot()]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function updateSlot(index, field, value) {
    setAvailability((slots) =>
      slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  }

  function addSlot() {
    setAvailability((slots) => [...slots, emptySlot()]);
  }

  function removeSlot(index) {
    setAvailability((slots) => slots.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const basePayload = { email, password, name, role, subjects: csvToList(subjects) };

    const payload =
      role === "STUDENT"
        ? {
            ...basePayload,
            educationLevel,
            languagePreferences: csvToList(languages),
          }
        : {
            ...basePayload,
            qualifications,
            languages: csvToList(languages),
            availability: availability.map((slot) => ({
              ...slot,
              dayOfWeek: Number(slot.dayOfWeek),
            })),
          };

    try {
      const user = await register(payload);
      router.push(dashboardPathForRole(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Sign up</h1>

      <div className="flex rounded-md border border-gray-300 p-1 text-sm">
        <button
          type="button"
          onClick={() => setRole("STUDENT")}
          className={`rounded px-4 py-1.5 ${role === "STUDENT" ? "bg-black text-white" : ""}`}
        >
          I&apos;m a Student
        </button>
        <button
          type="button"
          onClick={() => setRole("MENTOR")}
          className={`rounded px-4 py-1.5 ${role === "MENTOR" ? "bg-black text-white" : ""}`}
        >
          I&apos;m a Mentor
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </Field>

        <Field label="Subjects (comma-separated)">
          <input
            required
            placeholder="Mathematics, Physics"
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </Field>

        <Field label={role === "STUDENT" ? "Language preferences (comma-separated)" : "Languages spoken (comma-separated)"}>
          <input
            required
            placeholder="English, Malay"
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </Field>

        {role === "STUDENT" ? (
          <Field label="Education level">
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
        ) : (
          <>
            <Field label="Qualifications">
              <textarea
                required
                rows={3}
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2"
              />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Availability</legend>
              {availability.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateSlot(index, "dayOfWeek", e.target.value)}
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
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                  {availability.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      className="text-sm text-gray-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSlot}
                className="self-start text-sm text-gray-700 underline"
              >
                + Add another slot
              </button>
            </fieldset>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
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
