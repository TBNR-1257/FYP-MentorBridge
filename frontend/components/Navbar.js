"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-context";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { toggle: toggleSidebar } = useSidebar();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-[#234339] bg-[#102420] px-6 py-4">
      <div className="flex items-center gap-3">
        {!loading && user && (
          <button
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9fb8ae] hover:bg-[#1d3a32]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link
          href={user ? dashboardPathForRole(user.role) : "/"}
          className="bg-gradient-to-r from-[#39C5BB] to-[#ff6fb4] bg-clip-text font-semibold text-transparent"
        >
          MentorBridge
        </Link>
      </div>

      {!loading && (
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-[#2c4a40] bg-[#102420] py-1 pl-1 pr-3 hover:bg-[#17322b]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#12796f] to-[#6FE9DC] text-xs font-medium text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[#cfe0da]">{user.name}</span>
                </button>

                {menuOpen && (
                  <ul className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border border-[#234339] bg-[#102420] text-[#e7f0ed] shadow-md">
                    <li className="border-b border-[#1a2e28] px-4 py-2 text-xs text-[#9fb8ae]">{user.role}</li>
                    <li>
                      <Link
                        href={dashboardPathForRole(user.role)}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-[#17322b]"
                      >
                        Dashboard
                      </Link>
                    </li>
                    {user.role === "MENTOR" && (
                      <li>
                        <Link
                          href="/mentor/profile"
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 hover:bg-[#17322b]"
                        >
                          Edit profile
                        </Link>
                      </li>
                    )}
                    <li>
                      <button onClick={handleLogout} className="block w-full px-4 py-2 text-left hover:bg-[#17322b]">
                        Log out
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-[#cfe0da] hover:underline">
                Log in
              </Link>
              <Link href="/register" className="text-[#cfe0da] hover:underline">
                Sign up
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
