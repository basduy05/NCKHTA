"use client";
import React, { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  BookOpen, Users, LayoutDashboard, Component, Database, GraduationCap,
  BookText, LogOut, Settings, ClipboardList, Sparkles, Search, BookMarked,
  Mic, Award, Trophy, TrendingUp, MessageCircleWarning, User, ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";
import AIChatbot, { ChatTriggerButton } from "../components/AIChatbot";
import FeedbackButton from "../components/FeedbackButton";

// ─── Navigation config ──────────────────────────────────────────────────────

type NavItem = { name: string; href: string; icon: React.ElementType; id: string };

function buildLinks(role: string): NavItem[] {
  if (role === "admin") return [
    { name: "Tổng quan",       href: "/dashboard/admin?tab=overview",      icon: LayoutDashboard,      id: "overview" },
    { name: "Người dùng & GV", href: "/dashboard/admin?tab=users",         icon: Users,                id: "users" },
    { name: "Quản lý Lớp học", href: "/dashboard/admin?tab=classes",       icon: GraduationCap,        id: "classes" },
    { name: "Quản lý Bài học", href: "/dashboard/admin?tab=lessons",       icon: BookOpen,             id: "lessons" },
    { name: "Bài tập & Đề thi",href: "/dashboard/admin?tab=assignments",   icon: ClipboardList,        id: "assignments" },
    { name: "Sổ tay Từ Vựng",  href: "/dashboard/admin?tab=vocab",         icon: Database,             id: "vocab" },
    { name: "Kho Ngữ Pháp",    href: "/dashboard/admin?tab=grammar",       icon: BookText,             id: "grammar" },
    { name: "Giám sát AI",     href: "/dashboard/admin?tab=ai_monitoring", icon: TrendingUp,           id: "ai_monitoring" },
    { name: "Góp ý & Lỗi",    href: "/dashboard/admin?tab=feedback",      icon: MessageCircleWarning, id: "feedback" },
    { name: "Cài đặt",         href: "/dashboard/admin?tab=settings",      icon: Settings,             id: "settings" },
  ];
  if (role === "teacher") return [
    { name: "Tổng quan",          href: "/dashboard/teacher?tab=overview",    icon: LayoutDashboard, id: "overview" },
    { name: "Lớp học của tôi",    href: "/dashboard/teacher?tab=classes",     icon: GraduationCap,   id: "classes" },
    { name: "Quản lý Học sinh",   href: "/dashboard/teacher?tab=students",    icon: Users,           id: "students" },
    { name: "Quản lý Bài học",    href: "/dashboard/teacher?tab=lessons",     icon: BookOpen,        id: "lessons" },
    { name: "Bài tập & Kiểm tra", href: "/dashboard/teacher?tab=assignments", icon: ClipboardList,   id: "assignments" },
    { name: "Kho Ngữ Pháp",       href: "/dashboard/teacher?tab=grammar",     icon: BookText,        id: "grammar" },
    { name: "Công cụ AI",         href: "/dashboard/teacher?tab=ai-tools",    icon: Sparkles,        id: "ai-tools" },
  ];
  // student (default)
  return [
    { name: "Tổng quan",          href: "/dashboard/student?tab=overview",    icon: LayoutDashboard, id: "overview" },
    { name: "Lớp học của tôi",    href: "/dashboard/student?tab=classes",     icon: GraduationCap,   id: "classes" },
    { name: "Bài tập & Kiểm tra", href: "/dashboard/student?tab=assignments", icon: ClipboardList,   id: "assignments" },
    { name: "Tra từ điển",        href: "/dashboard/student?tab=dictionary",  icon: Search,          id: "dictionary" },
    { name: "Từ vựng đã lưu",     href: "/dashboard/student?tab=vocabulary",  icon: BookMarked,      id: "vocabulary" },
    { name: "Luyện phát âm IPA",  href: "/dashboard/student?tab=ipa",         icon: Mic,             id: "ipa" },
    { name: "Luyện thi",          href: "/dashboard/student?tab=practice",    icon: Award,           id: "practice" },
    { name: "Học với AI",         href: "/dashboard/student?tab=ai-tools",    icon: Sparkles,        id: "ai-tools" },
    { name: "Kho Ngữ Pháp",       href: "/dashboard/student?tab=grammar",     icon: BookText,        id: "grammar" },
    { name: "Kết quả học tập",    href: "/dashboard/student?tab=scores",      icon: Component,       id: "scores" },
    { name: "Bảng xếp hạng",      href: "/dashboard/student?tab=ranking",     icon: Trophy,          id: "ranking" },
    { name: "Lộ trình học tập",   href: "/dashboard/student?tab=roadmap",     icon: TrendingUp,      id: "roadmap" },
  ];
}

// Bottom nav items per role (5 items)
type BottomItem = { name: string; href: string; icon: React.ElementType; ids: string[] };

function buildBottomNav(role: string, base: string): BottomItem[] {
  if (role === "admin") return [
    { name: "Tổng quan", href: `${base}?tab=overview`,  icon: LayoutDashboard,      ids: ["overview"] },
    { name: "Users",     href: `${base}?tab=users`,     icon: Users,                ids: ["users", "classes", "lessons", "assignments"] },
    { name: "Vocab",     href: `${base}?tab=vocab`,     icon: Database,             ids: ["vocab", "grammar"] },
    { name: "Góp ý",    href: `${base}?tab=feedback`,  icon: MessageCircleWarning, ids: ["feedback", "ai_monitoring"] },
    { name: "Cài đặt",   href: `${base}?tab=settings`,  icon: Settings,             ids: ["settings"] },
  ];
  if (role === "teacher") return [
    { name: "Tổng quan", href: `${base}?tab=overview`,    icon: LayoutDashboard, ids: ["overview"] },
    { name: "Lớp",       href: `${base}?tab=classes`,     icon: GraduationCap,   ids: ["classes", "students"] },
    { name: "Bài học",   href: `${base}?tab=lessons`,     icon: BookOpen,        ids: ["lessons"] },
    { name: "Bài tập",   href: `${base}?tab=assignments`, icon: ClipboardList,   ids: ["assignments"] },
    { name: "AI & Ngữ pháp", href: `${base}?tab=ai-tools`, icon: Sparkles,      ids: ["ai-tools", "grammar", "practice", "ipa"] },
  ];
  // student
  return [
    { name: "Tổng quan", href: `${base}?tab=overview`,   icon: LayoutDashboard, ids: ["overview", "classes", "assignments"] },
    { name: "Học",       href: `${base}?tab=vocabulary`, icon: BookOpen,        ids: ["vocabulary", "dictionary", "grammar", "ai-tools"] },
    { name: "Luyện",     href: `${base}?tab=practice`,   icon: Award,           ids: ["practice", "ipa"] },
    { name: "Tiến độ",   href: `${base}?tab=scores`,     icon: TrendingUp,      ids: ["scores", "ranking", "roadmap"] },
    { name: "Cá nhân",   href: "/profile",               icon: User,            ids: [] },
  ];
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function DashboardSidebar({ role, currentTab }: { role: string; currentTab: string }) {
  const links = buildLinks(role);
  const roleLabel = role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student";

  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 bg-[var(--surface-1)] border-r border-[var(--line)] h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[var(--line)] flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Image src="/logo.png" alt="iEdu" width={80} height={29} style={{ height: "auto" }} />
          <span className="text-[10px] font-semibold text-[var(--ink-3)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded-full shrink-0">
            {roleLabel}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const isActive = link.id === currentTab;
          const Icon = link.icon;
          return (
            <Link
              key={link.id}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                isActive
                  ? "bg-blue-50 text-[var(--brand)] font-semibold"
                  : "text-[var(--ink-2)] hover:bg-[var(--surface-3)] hover:text-[var(--ink-1)] font-medium"
              }`}
            >
              <Icon size={16} className={isActive ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
              <span className="truncate">{link.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
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
              <User size={15} /> Hồ sơ cá nhân
            </Link>

            <button
              onClick={() => { setOpen(false); setShowFeedback(true); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition"
            >
              <MessageCircleWarning size={15} /> Góp ý & Báo lỗi
            </button>

            <div className="my-1 border-t border-[var(--line)]" />

            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={15} /> Đăng xuất
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
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

function AppHeader({ user, logout, currentTab }: { user: any; logout: () => void; currentTab: string }) {
  return (
    <header className="h-14 shrink-0 bg-[var(--surface-1)] border-b border-[var(--line)] flex items-center px-4 sm:px-5 gap-3 sticky top-0 z-30">
      {/* Logo (always visible) */}
      <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
        <Image src="/logo.png" alt="iEdu" width={72} height={26} style={{ height: "auto" }} />
      </Link>

      {/* Flex spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Search placeholder */}
        <button
          className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--line)] text-xs text-[var(--ink-3)] hover:border-slate-300 hover:text-[var(--ink-2)] transition"
          onClick={() => {/* Phiên B placeholder */}}
        >
          <Search size={13} />
          <span>Tìm kiếm...</span>
          <span className="hidden md:inline ml-1 text-[10px] bg-[var(--surface-3)] px-1 py-0.5 rounded">⌘K</span>
        </button>

        <UserDropdown user={user} logout={logout} currentFeature={currentTab} />
      </div>
    </header>
  );
}

// ─── Bottom nav (mobile) ─────────────────────────────────────────────────────

function BottomNav({ role, currentTab, basePath }: { role: string; currentTab: string; basePath: string }) {
  const items = buildBottomNav(role, basePath);
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
  const { user, logout, isInitialized } = useAuth();
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
      <AppHeader user={user} logout={logout} currentTab={currentTab} />

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
  );
}
