"use client";
import React, { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  BookOpen, Users, LayoutDashboard, Component, Database, GraduationCap,
  BookText, LogOut, Settings, ClipboardList, Sparkles, Search, BookMarked,
  Mic, Award, Trophy, TrendingUp, MessageCircleWarning, User, ChevronDown,
  Newspaper, MessageSquare, Star,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";
import AIChatbot, { ChatTriggerButton } from "../components/AIChatbot";
import FeedbackButton from "../components/FeedbackButton";
import { getSidebarLinks, getBottomNavItems } from "../config/navigation";
import { usePresence } from "../hooks/usePresence";
import CommandSearchModal from "../components/CommandSearchModal";
import NotificationDropdown from "../components/NotificationDropdown";
import { usePersonalizedNav } from "../hooks/usePersonalizedNav";
import { I18nProvider, useI18n } from "../context/I18nContext";
import LanguageSelector from "../components/LanguageSelector";

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function DashboardSidebar({ role, currentTab }: { role: string; currentTab: string }) {
  const { locale, t } = useI18n();
  const links = getSidebarLinks(role, locale);
  const roleLabel = role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student";
  const { unreadChatCount } = usePresence();
  const { pinnedIds, togglePin, isPinned, trackVisit } = usePersonalizedNav(role);

  // Track tab visits
  useEffect(() => {
    if (currentTab) {
      trackVisit(currentTab);
    }
  }, [currentTab, trackVisit]);

  const pinnedLinks = links.filter((link) => isPinned(link.id));

  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 bg-[var(--surface-1)] border-r border-[var(--line)] h-full">
      {/* Role badge */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wide">
          {roleLabel}
        </span>
        {pinnedLinks.length > 0 && (
          <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
            <Star size={10} className="fill-amber-500" /> {pinnedLinks.length} {t("header.pinned", "đã ghim")}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 pb-3 space-y-0.5 overflow-y-auto">
        {/* Pinned Quick Access */}
        {pinnedLinks.length > 0 && (
          <div className="mb-2 pb-2 border-b border-[var(--line)]">
            <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider flex items-center justify-between">
              <span>{t("header.quick_pin", "Ghim nhanh")}</span>
              <Star size={10} className="text-amber-500 fill-amber-500" />
            </div>
            <div className="space-y-0.5 mt-1">
              {pinnedLinks.map((link) => {
                const isActive = link.id === currentTab || Boolean(link.subIds && link.subIds.includes(currentTab));
                const Icon = link.icon;
                return (
                  <Link
                    key={`pinned-${link.id}`}
                    href={link.href}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      isActive
                        ? "bg-amber-50 text-amber-900 font-semibold border border-amber-200/60"
                        : "text-[var(--ink-2)] hover:bg-[var(--surface-3)] font-medium"
                    }`}
                  >
                    <Icon size={14} className={isActive ? "text-amber-600" : "text-[var(--ink-3)]"} />
                    <span className="truncate">{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* All Domains */}
        {links.map((link) => {
          const isActive = link.id === currentTab || Boolean(link.subIds && link.subIds.includes(currentTab));
          const Icon = link.icon;
          const isChatOrCommunity = link.id === "chat" || link.id === "community";
          const pinned = isPinned(link.id);

          return (
            <Link
              key={link.id}
              href={link.href}
              className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-colors ${
                isActive
                  ? "bg-blue-50 text-[var(--brand)] font-semibold"
                  : "text-[var(--ink-2)] hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)] font-medium"
              }`}
            >
              <div className="relative shrink-0">
                <Icon size={16} className={isActive ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
              </div>
              <span className="truncate">{link.name}</span>

              {/* Pin Star Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  togglePin(link.id);
                }}
                title={pinned ? t("header.unpin", "Bỏ ghim") : t("header.pin_to_top", "Ghim lên đầu")}
                className={`ml-auto p-1 rounded-md transition-all ${
                  pinned
                    ? "text-amber-500 hover:text-amber-600"
                    : "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-amber-500"
                }`}
              >
                <Star
                  size={13}
                  className={pinned ? "fill-amber-400 text-amber-500" : ""}
                />
              </button>

              {isChatOrCommunity && unreadChatCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0 shadow-sm animate-pulse">
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              )}
              {isActive && (!isChatOrCommunity || unreadChatCount === 0) && !pinned && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// ─── User dropdown ────────────────────────────────────────────────────────────

function UserDropdown({ user, logout, currentFeature }: { user: any; logout: () => void; currentFeature: string }) {
  const [open, setOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const { t } = useI18n();
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--surface-3)] transition text-[var(--ink-1)]"
      >
        <span className="w-7 h-7 rounded-full bg-blue-100 text-[var(--brand)] text-xs font-bold flex items-center justify-center shrink-0">
          {initials}
        </span>
        <span className="hidden sm:block text-[13px] font-semibold truncate max-w-[120px]">
          {user?.name ?? "User"}
        </span>
        <ChevronDown size={14} className={`text-[var(--ink-3)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--surface-1)] border border-[var(--line)] rounded-xl shadow-[var(--sh-md)] z-50 overflow-hidden animate-duo-pop">
          {/* User info */}
          <div className="px-4 py-3 border-b border-[var(--line)]">
            <p className="text-[13px] font-semibold text-[var(--ink-1)] truncate">{user?.name}</p>
            <p className="text-xs text-[var(--ink-3)] capitalize">{user?.role}</p>
          </div>

          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition"
            >
              <User size={15} /> {t("header.profile", "Hồ sơ cá nhân")}
            </Link>

            <button
              onClick={() => { setOpen(false); setShowFeedback(true); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition"
            >
              <MessageCircleWarning size={15} /> {t("header.feedback", "Góp ý & Báo lỗi")}
            </button>

            <div className="my-1 border-t border-[var(--line)]" />

            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={15} /> {t("header.logout", "Đăng xuất")}
            </button>
          </div>
        </div>
      )}

      {/* Feedback modal — triggered from dropdown */}
      {showFeedback && (
        <FeedbackModal
          feature={currentFeature}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
}

// Inline feedback modal (no floating button — just modal body)
function FeedbackModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  const { authFetch } = useAuth();
  const [feedbackType, setFeedbackType] = useState<"suggestion" | "bug_report">("suggestion");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

  const featureLabels: Record<string, string> = {
    dictionary: "Tra từ điển", grammar: "Ngữ pháp", ipa: "Phát âm IPA",
    practice: "Luyện thi", "ai-tools": "Công cụ AI", vocabulary: "Từ vựng",
    overview: "Tổng quan", classes: "Lớp học", assignments: "Bài tập",
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await authFetch(`${API_URL}/student/feedback`, {
        method: "POST",
        body: JSON.stringify({ feedback_type: feedbackType, feature, content: content.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => onClose(), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSendError(err.detail || `Gửi thất bại (${res.status}).`);
      }
    } catch {
      setSendError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 !mt-0 !m-0 top-0 left-0 right-0 bottom-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => !sending && onClose()}
      />
      <div className="relative bg-[var(--surface-1)] w-full sm:max-w-md rounded-t-[var(--r-2xl)] sm:rounded-[var(--r-2xl)] overflow-hidden animate-duo-pop shadow-[var(--sh-lg)]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--ink-1)]">Góp ý & Báo lỗi</h3>
            <p className="text-xs text-[var(--ink-3)]">
              Chức năng: <span className="font-semibold text-[var(--ink-2)]">
                {featureLabels[feature] || feature}
              </span>
            </p>
          </div>
          <button
            onClick={() => !sending && onClose()}
            className="p-2 text-[var(--ink-3)] hover:text-[var(--ink-1)] hover:bg-[var(--surface-3)] rounded-xl transition"
          >
            ✕
          </button>
        </div>

        {sent ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <h4 className="font-bold text-[var(--ink-1)] mb-1">Gửi thành công!</h4>
            <p className="text-sm text-[var(--ink-3)]">Cảm ơn phản hồi của bạn.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["suggestion", "bug_report"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFeedbackType(t)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-[13px] font-medium transition-all ${
                    feedbackType === t
                      ? t === "suggestion"
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-red-400 bg-red-50 text-red-700"
                      : "border-[var(--line)] text-[var(--ink-3)] hover:border-slate-300"
                  }`}
                >
                  {t === "suggestion" ? "💡 Góp ý" : "🐛 Báo lỗi"}
                </button>
              ))}
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                feedbackType === "suggestion"
                  ? "Chia sẻ ý kiến để chúng tôi cải thiện..."
                  : "Mô tả lỗi bạn gặp phải..."
              }
              rows={4}
              className="w-full border-2 border-[var(--line)] rounded-xl px-4 py-3 text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:border-[var(--brand)] outline-none resize-none transition"
              maxLength={2000}
            />

            {sendError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {sendError}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={sending || !content.trim()}
              className="w-full py-3 rounded-xl bg-[var(--brand)] text-white text-[13px] font-semibold hover:bg-[var(--brand-dark)] disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              Gửi phản hồi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App header (universal, 56px) ────────────────────────────────────────────

function AppHeader({ user, logout, currentTab, refreshUser }: { user: any; logout: () => void; currentTab: string; refreshUser: () => void }) {
  const isStudent = (user?.role ?? "").toString().toLowerCase() === "student";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-14 shrink-0 bg-[var(--surface-1)] border-b border-[var(--line)] flex items-center px-4 sm:px-5 gap-3 sticky top-0 z-30">
        {/* Logo (always visible) */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
          <Image src="/logo.png" alt="iEdu" width={72} height={26} style={{ height: "auto" }} />
        </Link>

        {/* Flex spacer */}
        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Pts / Credits badges — student only */}
          {isStudent && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => refreshUser()}
                className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-100 font-semibold text-xs hover:bg-amber-100 transition"
                title={t("header.points", "Điểm tích lũy")}
              >
                <Trophy size={12} className="text-amber-500" /> {user?.points || 0} pts
              </button>
              <div
                className="flex items-center gap-1.5 bg-blue-50 text-[var(--brand)] px-2.5 py-1 rounded-lg border border-blue-100 font-semibold text-xs"
                title={t("header.credits", "AI Credits")}
              >
                <Sparkles size={12} /> {user?.credits_ai || 0}
              </div>
            </div>
          )}

          {/* Search trigger */}
          <button
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--line)] text-xs text-[var(--ink-3)] hover:border-slate-300 hover:text-[var(--ink-2)] transition cursor-pointer"
            onClick={() => setIsSearchOpen(true)}
            title="Tìm kiếm tính năng (Ctrl+K / ⌘K)"
          >
            <Search size={13} />
            <span>{t("header.search", "Tìm kiếm...")}</span>
            <span className="hidden md:inline ml-1 text-[10px] bg-[var(--surface-3)] px-1 py-0.5 rounded">⌘K</span>
          </button>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Notification dropdown */}
          <NotificationDropdown />

          <UserDropdown user={user} logout={logout} currentFeature={currentTab} />
        </div>
      </header>

      <CommandSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        userRole={(user?.role ?? "").toString().toLowerCase()}
      />
    </>
  );
}

// ─── Bottom nav (mobile) ─────────────────────────────────────────────────────

function BottomNav({ role, currentTab, basePath }: { role: string; currentTab: string; basePath: string }) {
  const { locale } = useI18n();
  const items = getBottomNavItems(role, basePath, locale);
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface-1)] border-t border-[var(--line)] flex pb-safe">
      {items.map((item) => {
        const isActive = item.ids.includes(currentTab) ||
          (item.name === "Cá nhân" && typeof window !== "undefined" && window.location.pathname === "/profile");
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              isActive ? "text-[var(--brand)]" : "text-[var(--ink-3)]"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Layout root ─────────────────────────────────────────────────────────────

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, logout, isInitialized, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const role = (user?.role ?? "").toString().toLowerCase();
  const basePath = `/dashboard/${role || "student"}`;

  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/");
    } else if (isInitialized && user) {
      const segment = pathname.split("/")[2];
      if (segment && segment !== role) {
        router.push(`/dashboard/${role}`);
      }
    }
  }, [isInitialized, user, router, pathname, role]);

  if (!isInitialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-2)]">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--surface-2)] overflow-hidden">
      <AppHeader user={user} logout={logout} currentTab={currentTab} refreshUser={refreshUser} />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — desktop only */}
        <DashboardSidebar role={role} currentTab={currentTab} />

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav role={role} currentTab={currentTab} basePath={basePath} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ChatProvider>
        <Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-[var(--surface-2)]">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[var(--brand)]" />
            </div>
          }
        >
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </Suspense>
        <AIChatbot />
        <ChatTriggerButton />
      </ChatProvider>
    </I18nProvider>
  );
}
