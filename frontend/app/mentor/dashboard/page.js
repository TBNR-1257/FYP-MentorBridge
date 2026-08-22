"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import Badge from "@/components/Badge";
import * as api from "@/lib/api";

export default function MentorDashboardPage() {
  const { user, loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [serviceHours, setServiceHours] = useState(null);
  const [badges, setBadges] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    Promise.all([api.listMySessions(token), api.getServiceHours(token), api.getMentorBadges(token)])
      .then(([{ sessions }, hours, { badges }]) => {
        setSessions(sessions);
        setServiceHours(hours);
        setBadges(badges);
      })
      .finally(() => setFetching(false));
  }, [loading, token]);

  if (loading) return null;

  const profile = user.mentorProfile;

  function downloadCertificate() {
    const lines = [
      "MentorBridge — Certificate of Volunteer Service",
      "",
      `Mentor: ${user.name}`,
      `Email: ${user.email}`,
      `Total verified service hours: ${serviceHours.totalHours}`,
      `Sessions completed: ${serviceHours.logs.length}`,
      `Issued: ${new Date().toLocaleDateString()}`,
      "",
      "Session log:",
      ...serviceHours.logs.map(
        (log) =>
          `  ${new Date(log.loggedAt).toLocaleDateString()} — ${log.session.helpRequest.subject.name} — ${log.hours}h`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mentorbridge-certificate-${user.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>

      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm">
        <dl className="flex flex-col gap-2">
          <Row label="Email" value={user.email} />
          <Row label="Verification status" value={profile?.verificationStatus} />
          <Row label="Qualifications" value={profile?.qualifications} />
          <Row label="Languages" value={profile?.languages?.join(", ")} />
          <Row label="Subjects" value={profile?.subjects?.map((s) => s.subject.name).join(", ")} />
        </dl>
        <Link href="/mentor/profile" className="mt-3 inline-block text-sm underline">
          Edit profile
        </Link>
      </div>

      {profile?.verificationStatus === "PENDING" && (
        <p className="rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          Your mentor profile is pending admin verification.
        </p>
      )}

      {profile?.verificationStatus === "VERIFIED" && (
        <>
          <Link
            href="/mentor/queue"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
          >
            View help request queue
          </Link>

          <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-stone-500">Total service hours</p>
                <p className="text-2xl font-semibold">{fetching ? "…" : serviceHours?.totalHours ?? 0}</p>
              </div>
              <button
                onClick={downloadCertificate}
                disabled={fetching || !serviceHours?.logs?.length}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-50"
              >
                Download certificate
              </button>
            </div>
          </div>

          <section className="w-full max-w-md">
            <h2 className="mb-1 text-lg font-medium">Your badges</h2>
            <p className="mb-3 text-xs text-stone-500">Hover a badge to see how it's earned.</p>
            {fetching ? (
              <p className="text-sm text-stone-500">Loading…</p>
            ) : (
              <div className="grid grid-cols-4 gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-4">
                {badges.map((badge) => (
                  <Badge key={badge.id} badge={badge} earned={badge.earned} />
                ))}
              </div>
            )}
          </section>

          <section className="w-full max-w-md">
            <h2 className="mb-3 text-lg font-medium">Your sessions</h2>
            {fetching ? (
              <p className="text-sm text-stone-500">Loading…</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-stone-500">No sessions yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="block rounded-lg border border-stone-200 bg-white p-3 text-sm hover:bg-stone-50"
                    >
                      <span className="font-medium">{s.helpRequest.topic}</span> ·{" "}
                      {s.helpRequest.subject.name} · <span className="text-stone-500">{s.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="text-stone-600">TODO: leaderboard.</p>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
