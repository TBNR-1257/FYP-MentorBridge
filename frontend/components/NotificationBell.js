"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/lib/notification-context";

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleClick(notification) {
    markRead(notification.id);
    setOpen(false);
    if (notification.link) router.push(notification.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-72 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
            <span className="text-xs font-medium text-stone-500">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-teal-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-stone-500">No notifications yet.</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${
                      n.isRead ? "text-stone-500" : "bg-teal-50/50 text-stone-900"
                    }`}
                  >
                    <p>{n.message}</p>
                    <p className="mt-0.5 text-xs text-stone-400">{new Date(n.createdAt).toLocaleString()}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
