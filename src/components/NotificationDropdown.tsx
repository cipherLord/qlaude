"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface NotificationItem {
  _id: string;
  type: string;
  fromUserId: { displayName: string };
  data: { roomCode?: string; roomName?: string; requestId?: string };
  read: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleAcceptQuizmate = async (requestId: string) => {
    await fetch(`/api/quizmates/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    fetchNotifications();
  };

  const getNotificationText = (n: NotificationItem) => {
    switch (n.type) {
      case "quizmate_request":
        return `${n.fromUserId?.displayName} wants to be your quizmate`;
      case "quizmate_accepted":
        return `${n.fromUserId?.displayName} accepted your quizmate request`;
      case "room_invite":
        return `${n.fromUserId?.displayName} invited you to ${n.data.roomName || "a quiz"}`;
      default:
        return "New notification";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "quizmate_request":
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "quizmate_accepted":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "room_invite":
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative text-gray-400 hover:text-white transition-colors duration-200 p-1.5 rounded-lg hover:bg-gray-800/50"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 glass-card shadow-2xl z-50 overflow-hidden animate-slide-down">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
            <h3 className="text-sm font-semibold text-white">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-gray-500 text-sm">
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`px-4 py-3 border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors duration-200 ${
                    !n.read ? "bg-indigo-500/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {getNotificationIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">
                        {getNotificationText(n)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>

                      <div className="flex gap-2 mt-2">
                        {n.type === "quizmate_request" && n.data.requestId && (
                          <button
                            onClick={() =>
                              handleAcceptQuizmate(n.data.requestId!)
                            }
                            className="text-xs bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 px-3 py-1 rounded-lg transition-all duration-200 border border-emerald-500/20"
                          >
                            Accept
                          </button>
                        )}
                        {n.type === "room_invite" && n.data.roomCode && (
                          <Link
                            href={`/room/${n.data.roomCode}`}
                            onClick={() => setOpen(false)}
                            className="text-xs bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 px-3 py-1 rounded-lg transition-all duration-200 border border-indigo-500/20"
                          >
                            Join Room
                          </Link>
                        )}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
