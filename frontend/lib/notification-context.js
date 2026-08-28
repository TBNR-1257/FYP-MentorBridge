"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import { connectSocket } from "./socket";
import * as api from "./api";

const NotificationContext = createContext(null);

// One socket connection for the whole app lifetime (not per-page, unlike the
// session/course room sockets) so a notification reaches the user no matter
// what page they're on.
export function NotificationProvider({ children }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      return;
    }

    api
      .listNotifications(token)
      .then(({ notifications }) => setNotifications(notifications))
      .catch(() => {});

    const socket = connectSocket(token);
    socketRef.current = socket;
    socket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => socket.close();
  }, [token]);

  async function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await api.markNotificationRead(token, id);
    } catch {
      // Best-effort — a failed mark-as-read isn't worth surfacing an error for.
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.markAllNotificationsRead(token);
    } catch {
      // Best-effort, same as above.
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
