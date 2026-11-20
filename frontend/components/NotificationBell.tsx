"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NotificationItem } from "@/lib/types";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Poll unread count every 15s
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/proxy/notifications/me/unread-count`);
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (e) {
        console.error("Failed to fetch unread count", e);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch notifications panel data
  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/proxy/notifications/me?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen, fetchNotifs]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markRead = async (notifId: number) => {
    try {
      await fetch(`/api/proxy/notifications/${notifId}/read`, {
        method: "POST",
        credentials: "include",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark notification read", e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`/api/proxy/notifications/read-all`, {
        method: "POST",
        credentials: "include",
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative h-9 w-9 text-text-muted hover:text-navy", className)}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-border-default rounded-card shadow-elev2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="p-3 border-b border-border-default flex items-center justify-between bg-neutral-gray/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-navy">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="accent" className="text-[10px] py-0 px-1.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border-default">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                No notifications to display.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) markRead(notif.id);
                    if (notif.link_url) {
                      setIsOpen(false);
                      router.push(notif.link_url);
                    }
                  }}
                  className={cn(
                    "p-3 text-left hover:bg-neutral-gray/50 transition-colors cursor-pointer flex gap-3",
                    !notif.is_read && "bg-mint-soft/30"
                  )}
                >
                  <div className="pt-0.5">
                    <span
                      className={cn(
                        "block w-2 h-2 rounded-full",
                        notif.is_read ? "bg-neutral-300" : "bg-accent"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-navy leading-tight truncate">
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-text-muted pt-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
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