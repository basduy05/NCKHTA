import React from "react";
import {
  BookOpen, Users, LayoutDashboard, Component, Database, GraduationCap,
  BookText, ClipboardList, Sparkles, Search, BookMarked,
  Mic, Award, Trophy, TrendingUp, MessageCircleWarning, Settings,
  Newspaper, MessageSquare,
} from "lucide-react";

export type NavItem = {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  domain?: string;
  subIds?: string[];
};

export type BottomItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  ids: string[];
};

export interface RoleNavigationConfig {
  sidebar: NavItem[];
  bottomNav: (basePath: string) => BottomItem[];
}

export const NAVIGATION_CONFIG: Record<string, RoleNavigationConfig> = {
  admin: {
    sidebar: [
      { id: "overview",       name: "Tổng quan",          href: "/dashboard/admin?tab=overview",      icon: LayoutDashboard },
      { id: "users",          name: "Người dùng & GV",    href: "/dashboard/admin?tab=users",         icon: Users },
      { id: "classes",        name: "Quản lý Lớp học",    href: "/dashboard/admin?tab=classes",       icon: GraduationCap },
      { id: "lessons",        name: "Quản lý Bài học",    href: "/dashboard/admin?tab=lessons",       icon: BookOpen },
      { id: "assignments",    name: "Bài tập & Đề thi",   href: "/dashboard/admin?tab=assignments",   icon: ClipboardList },
      { id: "vocab",          name: "Sổ tay Từ Vựng",     href: "/dashboard/admin?tab=vocab",         icon: Database },
      { id: "grammar",        name: "Kho Ngữ Pháp",       href: "/dashboard/admin?tab=grammar",       icon: BookText },
      { id: "ai_monitoring",  name: "Giám sát AI",        href: "/dashboard/admin?tab=ai_monitoring", icon: TrendingUp },
      { id: "feedback",       name: "Góp ý & Lỗi",       href: "/dashboard/admin?tab=feedback",      icon: MessageCircleWarning },
      { id: "settings",       name: "Cài đặt",            href: "/dashboard/admin?tab=settings",      icon: Settings },
    ],
    bottomNav: (base: string) => [
      { name: "Tổng quan", href: `${base}?tab=overview`,  icon: LayoutDashboard,      ids: ["overview"] },
      { name: "Users",     href: `${base}?tab=users`,     icon: Users,                ids: ["users", "classes", "lessons", "assignments"] },
      { name: "Vocab",     href: `${base}?tab=vocab`,     icon: Database,             ids: ["vocab", "grammar"] },
      { name: "Góp ý",    href: `${base}?tab=feedback`,  icon: MessageCircleWarning, ids: ["feedback", "ai_monitoring"] },
      { name: "Cài đặt",   href: `${base}?tab=settings`,  icon: Settings,             ids: ["settings"] },
    ],
  },
  teacher: {
    sidebar: [
      { id: "overview",    name: "Tổng quan",          href: "/dashboard/teacher?tab=overview",    icon: LayoutDashboard },
      { id: "classes",     name: "Lớp học của tôi",    href: "/dashboard/teacher?tab=classes",     icon: GraduationCap },
      { id: "students",    name: "Quản lý Học sinh",   href: "/dashboard/teacher?tab=students",    icon: Users },
      { id: "lessons",     name: "Quản lý Bài học",    href: "/dashboard/teacher?tab=lessons",     icon: BookOpen },
      { id: "assignments", name: "Bài tập & Kiểm tra", href: "/dashboard/teacher?tab=assignments", icon: ClipboardList },
      { id: "grammar",     name: "Kho Ngữ Pháp",       href: "/dashboard/teacher?tab=grammar",     icon: BookText },
      { id: "chat",        name: "Chat Trực Tuyến",    href: "/dashboard/teacher?tab=chat",        icon: MessageSquare },
      { id: "ai-tools",    name: "Công cụ AI",         href: "/dashboard/teacher?tab=ai-tools",    icon: Sparkles },
    ],
    bottomNav: (base: string) => [
      { name: "Tổng quan",     href: `${base}?tab=overview`,    icon: LayoutDashboard, ids: ["overview"] },
      { name: "Lớp",           href: `${base}?tab=classes`,     icon: GraduationCap,   ids: ["classes", "students"] },
      { name: "Bài học",       href: `${base}?tab=lessons`,     icon: BookOpen,        ids: ["lessons"] },
      { name: "Bài tập",       href: `${base}?tab=assignments`, icon: ClipboardList,   ids: ["assignments"] },
      { name: "AI & Ngữ pháp", href: `${base}?tab=ai-tools`,    icon: Sparkles,        ids: ["ai-tools", "grammar", "practice", "ipa"] },
    ],
  },
  student: {
    sidebar: [
      {
        id: "overview",
        name: "Tổng quan",
        href: "/dashboard/student?tab=overview",
        icon: LayoutDashboard,
        subIds: ["overview"],
      },
      {
        id: "learning",
        name: "Lớp học",
        href: "/dashboard/student?tab=learning",
        icon: GraduationCap,
        subIds: ["learning", "classes", "assignments"],
      },
      {
        id: "community",
        name: "Cộng đồng",
        href: "/dashboard/student?tab=community",
        icon: Users,
        subIds: ["community", "groups", "chat"],
      },
      {
        id: "language",
        name: "Ngôn ngữ",
        href: "/dashboard/student?tab=language",
        icon: BookOpen,
        subIds: ["language", "dictionary", "vocabulary", "grammar", "news"],
      },
      {
        id: "practice",
        name: "Luyện tập",
        href: "/dashboard/student?tab=practice",
        icon: Award,
        subIds: ["practice", "ipa"],
      },
      {
        id: "ai-tools",
        name: "AI Coach",
        href: "/dashboard/student?tab=ai-tools",
        icon: Sparkles,
        subIds: ["ai-tools"],
      },
      {
        id: "progress",
        name: "Tiến độ",
        href: "/dashboard/student?tab=progress",
        icon: TrendingUp,
        subIds: ["progress", "scores", "ranking", "roadmap"],
      },
    ],
    bottomNav: (base: string) => [
      { name: "Tổng quan", href: `${base}?tab=overview`,   icon: LayoutDashboard, ids: ["overview"] },
      { name: "Lớp học",   href: `${base}?tab=learning`,   icon: GraduationCap,   ids: ["learning", "classes", "assignments"] },
      { name: "Cộng đồng", href: `${base}?tab=community`,  icon: MessageSquare,   ids: ["community", "groups", "chat"] },
      { name: "Ngôn ngữ",  href: `${base}?tab=language`,   icon: BookOpen,        ids: ["language", "dictionary", "vocabulary", "grammar", "news"] },
      { name: "Luyện tập", href: `${base}?tab=practice`,   icon: Award,           ids: ["practice", "ipa"] },
    ],
  },
};

export function getSidebarLinks(role: string): NavItem[] {
  const normRole = (role || "").toLowerCase();
  const config = NAVIGATION_CONFIG[normRole] || NAVIGATION_CONFIG.student;
  return config.sidebar;
}

export function getBottomNavItems(role: string, basePath: string): BottomItem[] {
  const normRole = (role || "").toLowerCase();
  const config = NAVIGATION_CONFIG[normRole] || NAVIGATION_CONFIG.student;
  return config.bottomNav(basePath);
}
