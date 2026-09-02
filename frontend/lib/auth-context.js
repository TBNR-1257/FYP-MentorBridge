// Student Name: Bryan Wong Tze Hern
// Student ID: TP086538

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "./api";

const TOKEN_KEY = "mentorbridge_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }

    api
      .fetchMe(storedToken)
      .then(({ user }) => {
        setToken(storedToken);
        setUser(user);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { user, token } = await api.login(email, password);
    window.localStorage.setItem(TOKEN_KEY, token);
    setToken(token);
    setUser(user);
    return user;
  }

  async function register(payload) {
    const { user, token } = await api.register(payload);
    window.localStorage.setItem(TOKEN_KEY, token);
    setToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (!token) return;
    const { user } = await api.fetchMe(token);
    setUser(user);
    return user;
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// Redirects to /login if not authenticated, or to the correct dashboard if the
// logged-in user's role doesn't match. Returns { user, loading } so the page can
// render nothing (or a spinner) until the check settles.
export function useRequireRole(role) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [loading, user, role, router]);

  return { user, loading: loading || !user || user.role !== role };
}

export function dashboardPathForRole(role) {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "MENTOR":
      return "/mentor/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/";
  }
}
