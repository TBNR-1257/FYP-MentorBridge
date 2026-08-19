"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace(dashboardPathForRole(user.role));
  }, [user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(dashboardPathForRole(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-stone-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
