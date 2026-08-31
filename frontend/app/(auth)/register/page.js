"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";
import AvailabilityEditor, { emptySlot } from "@/components/AvailabilityEditor";
import SubjectTagSelect from "@/components/SubjectTagSelect";

function csvToList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [subjects, setSubjects] = useState([]);
  const [interests, setInterests] = useState([]);
  const [languages, setLanguages] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [availability, setAvailability] = useState([emptySlot()]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload =
      role === "STUDENT"
        ? { email, password, name, role, interests }
        : {
            email,
            password,
            name,
            role,
            qualifications,
            languages: csvToList(languages),
            subjects,
            availability,
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

      <div className="flex rounded-lg border border-[#2c4a40] bg-[#102420] p-1 text-sm">
        <button
          type="button"
          onClick={() => setRole("STUDENT")}
          className={`rounded px-4 py-1.5 ${role === "STUDENT" ? "bg-gradient-to-r from-[#12796f] to-[#6FE9DC] text-white" : ""}`}
        >
          I&apos;m a Student
        </button>
        <button
          type="button"
          onClick={() => setRole("MENTOR")}
          className={`rounded px-4 py-1.5 ${role === "MENTOR" ? "bg-gradient-to-r from-[#12796f] to-[#6FE9DC] text-white" : ""}`}
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
            className="rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2"
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2"
          />
        </Field>

        {role === "STUDENT" ? (
          <>
            <Field label="Subjects/topics you're interested in (optional, up to 3)">
              <SubjectTagSelect
                value={interests}
                onChange={setInterests}
                placeholder="Search subjects…"
                allowCreate={false}
                max={3}
              />
            </Field>
            <p className="text-sm text-[#9fb8ae]">
              You&apos;ll specify subject, level, and language separately when you post a help request. Your
              interests just power course recommendations on your dashboard — you can change them later.
            </p>
          </>
        ) : (
          <>
            <Field label="Qualifications">
              <textarea
                required
                rows={3}
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                className="rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2"
              />
            </Field>

            <Field label="Languages spoken (comma-separated)">
              <input
                required
                placeholder="English, Malay"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                className="rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-2"
              />
            </Field>

            <Field label="Subjects">
              <SubjectTagSelect value={subjects} onChange={setSubjects} placeholder="Search or add a subject…" />
            </Field>

            <AvailabilityEditor value={availability} onChange={setAvailability} />
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || (role === "MENTOR" && subjects.length === 0)}
          className="rounded-lg bg-gradient-to-r from-[#12796f] to-[#6FE9DC] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-[#9fb8ae]">
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
