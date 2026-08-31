"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";

const STEPS = [
  {
    title: "Sign up",
    description: "Students and volunteer mentors both create a free account in minutes.",
  },
  {
    title: "Post or match",
    description:
      "Students post a help request with subject, level, and preferred time. Mentors get matched automatically.",
  },
  {
    title: "Learn together",
    description: "Once a mentor accepts, connect through built-in chat and track progress session by session.",
  },
];

const FEATURES = [
  {
    title: "Free & accessible",
    description: "No fees, no barriers — just students and volunteers connecting to learn.",
  },
  {
    title: "Verified mentors",
    description: "Every mentor is reviewed and approved by an admin before they can accept sessions.",
  },
  {
    title: "Built-in messaging",
    description: "Chat live with your mentor or student directly inside the platform.",
  },
  {
    title: "Track your growth",
    description: "Students log confidence before and after each session to see real progress.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(dashboardPathForRole(user.role));
  }, [user, router]);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <section className="relative flex flex-col items-center gap-6 px-6 py-24 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[36rem] w-[56rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-r from-[#39C5BB]/20 to-[#ff6fb4]/20 blur-3xl"
        />
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-[#e7f0ed] sm:text-5xl">
          Free academic support, one volunteer mentor at a time
        </h1>
        <p className="max-w-xl text-lg text-[#9fb8ae]">
          MentorBridge connects students who need help with volunteer mentors who want to give back —
          matched by subject, availability, and language.
        </p>
        <div className="flex gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-gradient-to-r from-[#12796f] to-[#6FE9DC] px-5 py-2.5 font-medium text-white hover:opacity-90"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[#2c4a40] bg-[#102420] px-5 py-2.5 font-medium text-[#e7f0ed] hover:bg-[#17322b]"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="bg-[#0c1917] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-[#e7f0ed]">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#12796f] to-[#6FE9DC] font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="font-medium text-[#e7f0ed]">{step.title}</h3>
                <p className="text-sm text-[#9fb8ae]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold text-[#e7f0ed]">Why MentorBridge</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[#234339] bg-[#102420] p-5 transition-colors hover:border-[#39C5BB]/40"
              >
                <h3 className="font-medium text-[#e7f0ed]">{feature.title}</h3>
                <p className="mt-1 text-sm text-[#9fb8ae]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-[#12796f] via-[#39C5BB] to-[#ff6fb4] px-6 py-14 text-center">
        <h2 className="text-2xl font-semibold text-white">Ready to join?</h2>
        <p className="mt-2 text-white/90">Whether you need help or want to give it, it starts with signing up.</p>
        <Link
          href="/register"
          className="mt-6 inline-block rounded-lg bg-white px-5 py-2.5 font-medium text-[#0d5c54] hover:bg-teal-50"
        >
          Create your account
        </Link>
      </section>
    </main>
  );
}
