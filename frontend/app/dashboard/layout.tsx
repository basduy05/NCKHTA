"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Users, LayoutDashboard, Component, Database, GraduationCap, Library, BookText, FileSearch, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const { user, logout } = useAuth();

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
    ];
  } else if (isTeacher) {
    links = [
      { name: "Lớp học của tôi", href: "/dashboard/teacher", icon: Users },
      { name: "Thống kê", href: "/dashboard/teacher", icon: Component },
    ];
  } else {
    links = [
      { name: "Học Trí Tuệ (AI)", href: "/dashboard/student", icon: FileSearch },
    ];
  }

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
        <Link href="/" className="flex items-center text-indigo-600 font-bold text-2xl mb-10">
          <Library className="mr-2" size={28} /> EAM Admin
        </Link>
        <nav className="space-y-2 flex-grow">
          {links.map((link, i) => {
            const isActive = isAdmin ? link.id === currentTab : pathname === link.href;
            return (
              <Link key={i} href={link.href} className={`flex items-center p-3 rounded-xl transition ${isActive ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-100"}`}>
                <link.icon className="mr-3" size={20} /> {link.name}
              </Link>
            )
          })}
        </nav>
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
           <div className="flex items-center">
             <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold mr-3">
               {user ? user.name.charAt(0).toUpperCase() : (isAdmin ? "A" : isTeacher ? "T" : "S")}
             </div>
             <div>
               <p className="text-sm font-semibold text-gray-900">{user ? user.name : (isAdmin ? "Admin" : isTeacher ? "Teacher" : "Student")}</p>
               <p className="text-xs text-gray-500 capitalize">{user ? user.role : "Guest"}</p>
             </div>
           </div>
           
           <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Đăng xuất" type="button">
             <LogOut size={20} />
           </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
