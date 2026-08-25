"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import Badge from "@/components/Badge";
import * as api from "@/lib/api";

const QUICK_LINKS = [
  { href: "/mentor/queue", label: "Student Requests", description: "Review and accept help requests" },
  { href: "/mentor/sessions", label: "My Sessions", description: "View past and upcoming sessions" },
  { href: "/mentor/profile", label: "Edit Profile", description: "Update your subjects and availability" },
];

export default function MentorDashboardPage() {
  const { user, loading } = useRequireRole("MENTOR");
  const { token } = useAuth();

  const [serviceHours, setServiceHours] = useState(null);
  const [badges, setBadges] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    Promise.all([api.getServiceHours(token), api.getMentorBadges(token)])
      .then(([hours, { badges }]) => {
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
      <div className="w-full max-w-2xl rounded-lg border border-teal-100 bg-teal-50 p-6">
        <h1 className="text-2xl font-semibold text-stone-900">Welcome back, {user.name}</h1>
        <p className="mt-1 text-sm text-stone-600">Here's your MentorBridge overview.</p>
      </div>

      {profile?.verificationStatus === "PENDING" && (
        <p className="w-full max-w-2xl rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          Your mentor profile is pending admin verification.
        </p>
      )}

      {profile?.verificationStatus === "VERIFIED" && (
        <>
          <div className="w-full max-w-2xl rounded-lg border border-stone-200 bg-white p-4 text-sm">
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

          <section className="w-full max-w-2xl">
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

          <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-teal-600"
              >
                <p className="font-medium text-stone-900">{link.label}</p>
                <p className="mt-1 text-xs text-stone-500">{link.description}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
