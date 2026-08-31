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
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#9fb8ae] hover:bg-[#1d3a32]"
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
        <div className="absolute right-0 z-10 mt-1 w-72 overflow-hidden rounded-lg border border-[#234339] bg-[#102420] shadow-md">
          <div className="flex items-center justify-between border-b border-[#1a2e28] px-3 py-2">
            <span className="text-xs font-medium text-[#9fb8ae]">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#39C5BB] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-[#9fb8ae]">No notifications yet.</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#17322b] ${
                      n.isRead ? "text-[#9fb8ae]" : "bg-[#39C5BB]/10/50 text-[#e7f0ed]"
                    }`}
                  >
                    <p>{n.message}</p>
                    <p className="mt-0.5 text-xs text-[#6f8981]">{new Date(n.createdAt).toLocaleString()}</p>
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
