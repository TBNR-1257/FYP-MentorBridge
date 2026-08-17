"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, dashboardPathForRole } from "@/lib/auth-context";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <Link href="/" className="font-semibold">
        MentorBridge
      </Link>

      {!loading && (
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href={dashboardPathForRole(user.role)} className="text-gray-700 hover:underline">
                {user.name} · {user.role}
              </Link>
              <button onClick={handleLogout} className="text-gray-500 hover:underline">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:underline">
                Log in
              </Link>
              <Link href="/register" className="text-gray-700 hover:underline">
                Sign up
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
