"use client";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  BookOpen, Users, LayoutDashboard, Component, Database, GraduationCap,
  BookText, LogOut, Settings, ClipboardList, Sparkles, Search, BookMarked,
  Mic, Award, Trophy, TrendingUp, MessageCircleWarning, Menu, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ChatProvider } from "../context/ChatContext";
import AIChatbot, { ChatTriggerButton } from "../components/AIChatbot";

function DashboardSidebar({
  user,
  logout,
  onClose,
}: {
  user: any;
  logout: any;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const isAdmin = pathname.includes("/admin");
  const isTeacher = pathname.includes("/teacher");
  const isStudent = pathname.includes("/student");

  let links: { name: string; href: string; icon: any; id: string }[] = [];

  if (isAdmin) {
    links = [
      { name: "Tổng quan",          href: "/dashboard/admin?tab=overview",      icon: LayoutDashboard,       id: "overview" },
      { name: "Người dùng & GV",    href: "/dashboard/admin?tab=users",         icon: Users,                 id: "users" },
      { name: "Quản lý Lớp học",    href: "/dashboard/admin?tab=classes",       icon: GraduationCap,         id: "classes" },
      { name: "Quản lý Bài học",    href: "/dashboard/admin?tab=lessons",       icon: BookOpen,              id: "lessons" },
      { name: "Bài tập & Đề thi",   href: "/dashboard/admin?tab=assignments",   icon: ClipboardList,         id: "assignments" },
      { name: "Sổ tay Từ Vựng",     href: "/dashboard/admin?tab=vocab",         icon: Database,              id: "vocab" },
      { name: "Kho Ngữ Pháp",       href: "/dashboard/admin?tab=grammar",       icon: BookText,              id: "grammar" },
      { name: "Giám sát AI",        href: "/dashboard/admin?tab=ai_monitoring", icon: TrendingUp,            id: "ai_monitoring" },
      { name: "Góp ý & Lỗi",        href: "/dashboard/admin?tab=feedback",      icon: MessageCircleWarning,  id: "feedback" },
      { name: "Cài đặt",            href: "/dashboard/admin?tab=settings",      icon: Settings,              id: "settings" },
    ];
  } else if (isTeacher) {
    links = [
      { name: "Tổng quan",          href: "/dashboard/teacher?tab=overview",    icon: LayoutDashboard, id: "overview" },
      { name: "Lớp học của tôi",    href: "/dashboard/teacher?tab=classes",     icon: GraduationCap,   id: "classes" },
      { name: "Quản lý Học sinh",   href: "/dashboard/teacher?tab=students",    icon: Users,           id: "students" },
      { name: "Quản lý Bài học",    href: "/dashboard/teacher?tab=lessons",     icon: BookOpen,        id: "lessons" },
      { name: "Bài tập & Kiểm tra", href: "/dashboard/teacher?tab=assignments", icon: ClipboardList,   id: "assignments" },
      { name: "Kho Ngữ Pháp",       href: "/dashboard/teacher?tab=grammar",     icon: BookText,        id: "grammar" },
      { name: "Công cụ AI",         href: "/dashboard/teacher?tab=ai-tools",    icon: Sparkles,        id: "ai-tools" },
    ];
  } else if (isStudent) {
    links = [
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

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="iEdu" width={88} height={32} style={{ height: "auto" }} />
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {isAdmin ? "Admin" : isTeacher ? "Teacher" : isStudent ? "Student" : ""}
          </span>
        </Link>
        {/* Close button - only on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map((link, i) => {
          const isActive = link.id === currentTab;
          return (
            <Link
              key={i}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
              }`}
            >
              <link.icon size={17} className={isActive ? "text-indigo-600" : "text-gray-400"} />
              <span className="truncate">{link.name}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100 flex items-center gap-3">
        <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
            {user ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? "User"}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role ?? "Guest"}</p>
          </div>
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); logout(); }}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
          title="Đăng xuất"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (isInitialized && !user) {
      router.push("/");
    } else if (isInitialized && user) {
      const role = user.role.toLowerCase();
      const segment = pathname.split("/")[2];
      if (segment && segment !== role) {
        router.push(`/dashboard/${role}`);
      }
    }
  }, [isInitialized, user, router, pathname]);

  if (!isInitialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <ChatProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - fixed on mobile (slide-in), static on desktop */}
        <div
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
            lg:static lg:translate-x-0 lg:z-auto
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <Suspense fallback={<div className="w-60 h-full bg-white border-r border-gray-100" />}>
            <DashboardSidebar
              user={user}
              logout={logout}
              onClose={() => setIsSidebarOpen(false)}
            />
          </Suspense>
        </div>

        {/* Main content column */}
        <div className="flex flex-col flex-1 min-w-0 h-full">

          {/* Mobile top bar */}
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20 flex-shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              aria-label="Mở menu"
            >
              <Menu size={22} />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="iEdu" width={72} height={26} style={{ height: "auto" }} />
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                {user ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
              {children}
            </div>
          </main>
        </div>

      </div>
      <AIChatbot />
      <ChatTriggerButton />
    </ChatProvider>
  );
}
