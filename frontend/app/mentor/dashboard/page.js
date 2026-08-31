"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import { useRequireRole, useAuth } from "@/lib/auth-context";
import Badge from "@/components/Badge";
import * as api from "@/lib/api";

const TEAL = [13, 148, 136]; // matches the app's [#12796f] accent
const STONE = [68, 64, 60];
const MAX_LOG_ROWS = 18;

const QUICK_LINKS = [
  { href: "/mentor/queue", label: "Student Requests", description: "Review and accept help requests" },
  { href: "/mentor/sessions", label: "My Sessions", description: "View past and upcoming sessions" },
  { href: "/mentor/courses", label: "My Courses", description: "Run and create group courses" },
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
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Letterhead border
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(2);
    doc.rect(24, 24, pageWidth - 48, doc.internal.pageSize.getHeight() - 48);

    doc.setTextColor(...TEAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("MentorBridge", centerX, 80, { align: "center" });

    doc.setTextColor(...STONE);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Certificate of Volunteer Service", centerX, 105, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(user.name, centerX, 150, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(
      `has volunteered ${serviceHours.totalHours} hours as a mentor across ${serviceHours.logs.length} completed session${
        serviceHours.logs.length === 1 ? "" : "s"
      }.`,
      centerX,
      175,
      { align: "center", maxWidth: pageWidth - 160 }
    );

    doc.setFontSize(10);
    doc.setTextColor(120, 113, 108);
    doc.text(`Issued ${new Date().toLocaleDateString()} by MentorBridge`, centerX, 200, { align: "center" });

    let y = 240;
    doc.setDrawColor(230, 230, 228);
    doc.line(60, y, pageWidth - 60, y);
    y += 24;

    doc.setTextColor(...STONE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Session log", 60, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const rows = serviceHours.logs.slice(0, MAX_LOG_ROWS);
    for (const log of rows) {
      doc.text(new Date(log.loggedAt).toLocaleDateString(), 60, y);
      doc.text(log.subjectName, 180, y);
      doc.text(`${log.hours}h`, pageWidth - 90, y, { align: "right" });
      y += 16;
    }
    if (serviceHours.logs.length > MAX_LOG_ROWS) {
      doc.setTextColor(150, 145, 140);
      doc.text(`+ ${serviceHours.logs.length - MAX_LOG_ROWS} more session(s) not shown`, 60, y);
    }

    doc.save(`mentorbridge-certificate-${user.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="w-full max-w-2xl rounded-lg border border-[#39C5BB]/20 bg-[#39C5BB]/10 p-6">
        <h1 className="text-2xl font-semibold text-[#e7f0ed]">Welcome back, {user.name}</h1>
        <p className="mt-1 text-sm text-[#9fb8ae]">Here's your MentorBridge overview.</p>
      </div>

      {profile?.verificationStatus === "PENDING" && (
        <p className="w-full max-w-2xl rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          Your mentor profile is pending admin verification.
        </p>
      )}

      {profile?.verificationStatus === "VERIFIED" && (
        <>
          <div className="w-full max-w-2xl rounded-lg border border-[#234339] bg-[#102420] p-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#9fb8ae]">Total service hours</p>
                <p className="text-2xl font-semibold">{fetching ? "…" : serviceHours?.totalHours ?? 0}</p>
              </div>
              <button
                onClick={downloadCertificate}
                disabled={fetching || !serviceHours?.logs?.length}
                className="rounded-lg border border-[#2c4a40] bg-[#102420] px-3 py-1.5 text-sm hover:bg-[#17322b] disabled:opacity-50"
              >
                Download certificate
              </button>
            </div>
          </div>

          <section className="w-full max-w-2xl">
            <h2 className="mb-1 text-lg font-medium">Your badges</h2>
            <p className="mb-3 text-xs text-[#9fb8ae]">Hover a badge to see how it's earned.</p>
            {fetching ? (
              <p className="text-sm text-[#9fb8ae]">Loading…</p>
            ) : (
              <div className="grid grid-cols-4 gap-4 rounded-lg border border-[#234339] bg-[#102420] p-4 sm:grid-cols-4">
                {badges.map((badge) => (
                  <Badge key={badge.id} badge={badge} earned={badge.earned} />
                ))}
              </div>
            )}
          </section>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-[#234339] bg-[#102420] p-4 transition-colors hover:border-[#39C5BB]"
              >
                <p className="font-medium text-[#e7f0ed]">{link.label}</p>
                <p className="mt-1 text-xs text-[#9fb8ae]">{link.description}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
