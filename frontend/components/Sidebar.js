"use client";

import Link from "next/link";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-context";

const LINKS_BY_ROLE = {
  STUDENT: (role) => [
    { href: dashboardPathForRole(role), label: "Dashboard" },
    { href: "/student/profile", label: "My Profile" },
    { href: "/browse", label: "Browse Subjects/Courses" },
    { href: "/student/help-requests", label: "My Help Requests" },
    { href: "/student/sessions", label: "My Sessions" },
    { href: "/leaderboard", label: "Leaderboard" },
  ],
  MENTOR: (role) => [
    { href: dashboardPathForRole(role), label: "Dashboard" },
    { href: "/mentor/profile", label: "My Profile" },
    { href: "/mentor/queue", label: "Student Requests" },
    { href: "/mentor/sessions", label: "My Sessions" },
    { href: "/mentor/courses", label: "My Courses" },
    { href: "/leaderboard", label: "Leaderboard" },
  ],
  ADMIN: (role) => [
    { href: dashboardPathForRole(role), label: "Dashboard" },
    { href: "/admin/approvals", label: "Approvals" },
    { href: "/admin/users", label: "All Users" },
    { href: "/admin/monitoring", label: "Monitoring" },
  ],
};

export default function Sidebar() {
  const { user } = useAuth();
  const { open, close } = useSidebar();

  if (!user) return null;

  const links = (LINKS_BY_ROLE[user.role] || LINKS_BY_ROLE.ADMIN)(user.role);

  return (
    <>
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-stone-900/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-1 border-r border-stone-200 bg-white p-4 shadow-lg transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-900">Menu</span>
          <button
            onClick={close}
            aria-label="Close navigation menu"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
          >
            &times;
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
