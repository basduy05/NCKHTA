"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell, CheckCheck, Trash2, BookOpen, ClipboardList,
  MessageSquare, Sparkles, CheckCircle2, AlertCircle,
  Info, ExternalLink
} from "lucide-react";
import { useNotification, NotificationRecord } from "../context/NotificationContext";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "assignment" | "chat" | "grade" | "system">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useNotification();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "assignment") return n.category === "assignment";
    if (filter === "chat") return n.category === "chat";
    if (filter === "grade") return n.category === "grade";
    if (filter === "system") return n.category === "system";
    return true;
  });

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return "Vừa xong";
      if (diffMin < 60) return `${diffMin} phút trước`;
      if (diffHour < 24) return `${diffHour} giờ trước`;
      if (diffDay < 7) return `${diffDay} ngày trước`;
      return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    } catch {
      return "Gần đây";
    }
  };

  const getCategoryIcon = (category: string, type: string) => {
    if (category === "assignment") return <ClipboardList size={15} className="text-blue-600" />;
    if (category === "chat") return <MessageSquare size={15} className="text-indigo-600" />;
    if (category === "grade") return <Sparkles size={15} className="text-amber-500" />;
    if (type === "success") return <CheckCircle2 size={15} className="text-emerald-600" />;
    if (type === "error") return <AlertCircle size={15} className="text-rose-600" />;
    return <Info size={15} className="text-sky-600" />;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Xem thông báo"
        className="relative p-2 rounded-xl text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[var(--surface-3)] transition cursor-pointer"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--surface-1)] border border-[var(--line)] shadow-xl z-50 overflow-hidden animate-duo-pop">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-[var(--ink-1)] flex items-center gap-1.5">
                <Bell size={15} className="text-[var(--brand)]" />
                Thông báo
              </h3>
              <p className="text-[11px] text-[var(--ink-3)]">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Đã đọc tất cả"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="px-2 py-1 text-[11px] font-medium text-[var(--brand)] hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={13} />
                  <span>Đọc hết</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAllNotifications()}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Xóa toàn bộ lịch sử"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--line)] bg-[var(--surface-2)] text-[11px] overflow-x-auto">
            {[
              { id: "all", label: "Tất cả" },
              { id: "assignment", label: "Bài tập" },
              { id: "chat", label: "Chat" },
              { id: "system", label: "Hệ thống" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                  filter === tab.id
                    ? "bg-white text-[var(--ink-1)] shadow-2xs font-semibold"
                    : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--line)]">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-[var(--ink-3)] px-4">
                <Bell size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-medium text-slate-500">Không có thông báo nào</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Các thông báo bài tập, tin nhắn và lớp học sẽ xuất hiện ở đây.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-[var(--surface-3)] transition cursor-pointer ${
                    !n.isRead ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-[var(--line)] shadow-2xs shrink-0 mt-0.5">
                    {getCategoryIcon(n.category, n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          !n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"
                        }`}
                      >
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--brand)] font-semibold mt-1 hover:underline"
                      >
                        <span>Xem chi tiết</span>
                        <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>

                  {!n.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"
                      title="Chưa đọc"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
