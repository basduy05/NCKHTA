"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { BookOpen, Users, LayoutDashboard, Component, Database, GraduationCap, BookText, FileSearch, LogOut, Settings, ClipboardList, Sparkles, Search, BookMarked, Mic, Award } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function DashboardSidebar({ user, logout }: { user: any, logout: any }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const isAdmin = pathname.includes("/admin");
  const isTeacher = pathname.includes("/teacher");
  const isStudent = pathname.includes("/student");

  let links = [];

  if (isAdmin) {
    links = [
      { name: "Tổng quan", href: "/dashboard/admin?tab=overview", icon: LayoutDashboard, id: "overview" },
      { name: "Người dùng & GV", href: "/dashboard/admin?tab=users", icon: Users, id: "users" },
      { name: "Quản lý Lớp học", href: "/dashboard/admin?tab=classes", icon: GraduationCap, id: "classes" },
      { name: "Quản lý Bài học", href: "/dashboard/admin?tab=lessons", icon: BookOpen, id: "lessons" },
      { name: "Kho Từ Vựng (Graph)", href: "/dashboard/admin?tab=vocab", icon: Database, id: "vocab" },
      { name: "Kho Ngữ Pháp (AI)", href: "/dashboard/admin?tab=grammar", icon: BookText, id: "grammar" },
      { name: "Cài đặt hệ thống", href: "/dashboard/admin?tab=settings", icon: Settings, id: "settings" },
    ];
  } else if (isTeacher) {
    links = [
      { name: "Tổng quan", href: "/dashboard/teacher?tab=overview", icon: LayoutDashboard, id: "overview" },
      { name: "Lớp học của tôi", href: "/dashboard/teacher?tab=classes", icon: GraduationCap, id: "classes" },
      { name: "Quản lý Học sinh", href: "/dashboard/teacher?tab=students", icon: Users, id: "students" },
      { name: "Quản lý Bài học", href: "/dashboard/teacher?tab=lessons", icon: BookOpen, id: "lessons" },
      { name: "Bài tập & Kiểm tra", href: "/dashboard/teacher?tab=assignments", icon: ClipboardList, id: "assignments" },
      { name: "Công cụ AI", href: "/dashboard/teacher?tab=ai-tools", icon: Sparkles, id: "ai-tools" },
    ];
  } else if (isStudent) {
    links = [
      { name: "Tổng quan", href: "/dashboard/student?tab=overview", icon: LayoutDashboard, id: "overview" },
      { name: "Lớp học của tôi", href: "/dashboard/student?tab=classes", icon: GraduationCap, id: "classes" },
      { name: "Bài tập & Kiểm tra", href: "/dashboard/student?tab=assignments", icon: ClipboardList, id: "assignments" },
      { name: "Tra từ điển", href: "/dashboard/student?tab=dictionary", icon: Search, id: "dictionary" },
      { name: "Từ vựng đã lưu", href: "/dashboard/student?tab=vocabulary", icon: BookMarked, id: "vocabulary" },
      { name: "Luyện phát âm IPA", href: "/dashboard/student?tab=ipa", icon: Mic, id: "ipa" },
      { name: "Luyện thi & Kỹ năng", href: "/dashboard/student?tab=practice", icon: Award, id: "practice" },
      { name: "Học với AI", href: "/dashboard/student?tab=ai-tools", icon: Sparkles, id: "ai-tools" },
      { name: "Kết quả học tập", href: "/dashboard/student?tab=scores", icon: Component, id: "scores" },
    ];
  } else {
    links = [];
  }

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
      <Link href="/" className="flex items-center mb-10">
        <Image src="/logo.png" alt="iEdu" width={100} height={40} />
        <span className="ml-2 text-sm font-medium text-gray-500">{isAdmin ? "Admin" : isTeacher ? "Teacher" : isStudent ? "Student" : ""}</span>
      </Link>
      <nav className="space-y-2 flex-grow">
        {links.map((link, i) => {
          const isActive = (isAdmin || isTeacher || isStudent) ? link.id === currentTab : pathname === link.href;
          return (
            <Link key={i} href={link.href} className={`flex items-center p-3 rounded-xl transition ${isActive ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
              <link.icon className="mr-3" size={20} /> {link.name}
            </Link>
          )
        })}
      </nav>
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <Link href="/profile" className="flex items-center hover:opacity-80 transition">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold mr-3">
            {user ? user.name.charAt(0).toUpperCase() : (isAdmin ? "A" : isTeacher ? "T" : "S")}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user ? user.name : (isAdmin ? "Admin" : isTeacher ? "Teacher" : "Student")}</p>
            <p className="text-xs text-gray-500 capitalize">{user ? user.role : "Guest"}</p>
          </div>
        </Link>

        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Đăng xuất" type="button">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isInitialized && !user) {
      router.push('/');
    } else if (isInitialized && user) {
      const role = user.role.toLowerCase();
      const segment = pathname.split('/')[2];
      if (segment && segment !== role) {
        router.push(`/dashboard/${role}`);
      }
    }
  }, [isInitialized, user, router, pathname]);

  if (!isInitialized || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Suspense fallback={<div className="w-64 bg-white border-r border-gray-200 p-6">Loading sidebar...</div>}>
        <DashboardSidebar user={user} logout={logout} />
      </Suspense>
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
