"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

export function usePresence() {
  const { token, user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch online users list
  const fetchOnlineUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/chat/users/online`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineUserIds(new Set(data.online_user_ids || []));
      }
    } catch {
      // Ignore network errors in polling
    }
  }, [token]);

  // Fetch total unread messages count
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const rooms = await res.json();
        if (Array.isArray(rooms)) {
          const total = rooms.reduce((acc: number, r: any) => acc + (r.unread_count || 0), 0);
          setUnreadChatCount(total);
        }
      }
    } catch {
      // Ignore
    }
  }, [token]);

  // Send heartbeat ping
  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/chat/presence/heartbeat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // Ignore network errors in polling
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;

    // Initial fetch & heartbeat
    sendHeartbeat();
    fetchOnlineUsers();
    fetchUnreadCount();

    // Poll every 25 seconds
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
      fetchOnlineUsers();
      fetchUnreadCount();
    }, 25000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, user, sendHeartbeat, fetchOnlineUsers, fetchUnreadCount]);

  const isUserOnline = useCallback((userId: number): boolean => {
    return onlineUserIds.has(userId);
  }, [onlineUserIds]);

  return {
    onlineUserIds,
    isUserOnline,
    unreadChatCount,
    refreshPresence: fetchOnlineUsers,
    refreshUnread: fetchUnreadCount
  };
}
