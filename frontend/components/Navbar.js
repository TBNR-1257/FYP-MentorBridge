"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
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
    <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
      <Link href="/" className="font-semibold">
        MentorBridge
      </Link>

      {!loading && (
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-stone-300 bg-white py-1 pl-1 pr-3 hover:bg-stone-50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-medium text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-stone-700">{user.name}</span>
              </button>

              {menuOpen && (
                <ul className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border border-stone-200 bg-white text-stone-900 shadow-md">
                  <li className="border-b border-stone-100 px-4 py-2 text-xs text-stone-500">{user.role}</li>
                  <li>
                    <Link
                      href={dashboardPathForRole(user.role)}
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-stone-50"
                    >
                      Dashboard
                    </Link>
                  </li>
                  {user.role === "MENTOR" && (
                    <li>
                      <Link
                        href="/mentor/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 hover:bg-stone-50"
                      >
                        Edit profile
                      </Link>
                    </li>
                  )}
                  <li>
                    <button onClick={handleLogout} className="block w-full px-4 py-2 text-left hover:bg-stone-50">
                      Log out
                    </button>
                  </li>
                </ul>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="text-stone-700 hover:underline">
                Log in
              </Link>
              <Link href="/register" className="text-stone-700 hover:underline">
                Sign up
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
