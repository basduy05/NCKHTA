import React from "react";
import {
  BookOpen, Users, LayoutDashboard, Component, Database, GraduationCap,
  BookText, ClipboardList, Sparkles, Search, BookMarked,
  Mic, Award, Trophy, TrendingUp, MessageCircleWarning, Settings,
  Newspaper, MessageSquare, LineChart, BarChart3, Activity, Megaphone
} from "lucide-react";
import { TRANSLATIONS, SupportedLocale } from "./translations";

export type NavItem = {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  domain?: string;
  subIds?: string[];
  labelKey?: string;
  labels?: Record<string, string>;
};

export type BottomItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  ids: string[];
  labelKey?: string;
  labels?: Record<string, string>;
};

export interface RoleNavigationConfig {
  sidebar: NavItem[];
  bottomNav: (basePath: string) => BottomItem[];
}

export const NAVIGATION_CONFIG: Record<string, RoleNavigationConfig> = {
  admin: {
    sidebar: [
      { id: "overview",       name: "Tổng quan",          labelKey: "nav.overview",       href: "/dashboard/admin?tab=overview",      icon: LayoutDashboard },
      { id: "analytics",      name: "Phân tích BI",       labelKey: "nav.analytics",      href: "/dashboard/admin?tab=analytics",     icon: BarChart3 },
      { id: "behavior",       name: "Hành vi người dùng", labelKey: "nav.behavior",      href: "/dashboard/admin?tab=behavior",       icon: Activity },
      { id: "broadcast",      name: "Email & Thông báo",  labelKey: "nav.broadcast",      href: "/dashboard/admin?tab=broadcast",      icon: Megaphone },
      { id: "users",          name: "Người dùng & GV",    labelKey: "nav.users",          href: "/dashboard/admin?tab=users",         icon: Users },
      { id: "classes",        name: "Quản lý Lớp học",    labelKey: "nav.classes",        href: "/dashboard/admin?tab=classes",       icon: GraduationCap },
      { id: "lessons",        name: "Quản lý Bài học",    labelKey: "nav.lessons",        href: "/dashboard/admin?tab=lessons",       icon: BookOpen },
      { id: "assignments",    name: "Bài tập & Đề thi",   labelKey: "nav.assignments",    href: "/dashboard/admin?tab=assignments",   icon: ClipboardList },
      { id: "vocab",          name: "Sổ tay Từ Vựng",     labelKey: "nav.vocab",          href: "/dashboard/admin?tab=vocab",         icon: Database },
      { id: "grammar",        name: "Kho Ngữ Pháp",       labelKey: "nav.grammar",        href: "/dashboard/admin?tab=grammar",       icon: BookText },
      { id: "ai_monitoring",  name: "Giám sát AI",        labelKey: "nav.ai_monitoring",  href: "/dashboard/admin?tab=ai_monitoring", icon: TrendingUp },
      { id: "feedback",       name: "Góp ý & Lỗi",       labelKey: "nav.feedback",       href: "/dashboard/admin?tab=feedback",      icon: MessageCircleWarning },
      { id: "settings",       name: "Cài đặt",            labelKey: "nav.settings",       href: "/dashboard/admin?tab=settings",      icon: Settings },
    ],
    bottomNav: (base: string) => [
      { name: "Tổng quan",  labelKey: "bottom.overview", href: `${base}?tab=overview`,  icon: LayoutDashboard,      ids: ["overview"] },
      { name: "Phân tích", labelKey: "nav.analytics",   href: `${base}?tab=analytics`, icon: BarChart3,            ids: ["analytics"] },
      { name: "Users",     labelKey: "nav.users",       href: `${base}?tab=users`,     icon: Users,                ids: ["users", "classes", "lessons", "assignments"] },
      { name: "Vocab",     labelKey: "nav.vocab",       href: `${base}?tab=vocab`,     icon: Database,             ids: ["vocab", "grammar"] },
      { name: "Cài đặt",   labelKey: "nav.settings",    href: `${base}?tab=settings`,  icon: Settings,             ids: ["settings", "feedback"] },
    ],
  },
  teacher: {
    sidebar: [
      { id: "overview",    name: "Tổng quan",          labelKey: "nav.overview",    href: "/dashboard/teacher?tab=overview",    icon: LayoutDashboard },
      { id: "classes",     name: "Lớp học của tôi",    labelKey: "nav.my_classes",  href: "/dashboard/teacher?tab=classes",     icon: GraduationCap },
      { id: "students",    name: "Quản lý Học sinh",   labelKey: "nav.my_students", href: "/dashboard/teacher?tab=students",    icon: Users },
      { id: "lessons",     name: "Quản lý Bài học",    labelKey: "nav.lessons",     href: "/dashboard/teacher?tab=lessons",     icon: BookOpen },
      { id: "assignments", name: "Bài tập & Kiểm tra", labelKey: "nav.assignments", href: "/dashboard/teacher?tab=assignments", icon: ClipboardList },
      { id: "grammar",     name: "Kho Ngữ Pháp",       labelKey: "nav.grammar",     href: "/dashboard/teacher?tab=grammar",     icon: BookText },
      { id: "chat",        name: "Chat Trực Tuyến",    labelKey: "nav.chat",        href: "/dashboard/teacher?tab=chat",        icon: MessageSquare },
      { id: "ai-tools",    name: "Công cụ AI",         labelKey: "nav.ai_tools",    href: "/dashboard/teacher?tab=ai-tools",    icon: Sparkles },
    ],
    bottomNav: (base: string) => [
      { name: "Tổng quan",     labelKey: "bottom.overview", href: `${base}?tab=overview`,    icon: LayoutDashboard, ids: ["overview"] },
      { name: "Lớp",           labelKey: "bottom.learning", href: `${base}?tab=classes`,     icon: GraduationCap,   ids: ["classes", "students"] },
      { name: "Bài học",       labelKey: "nav.lessons",     href: `${base}?tab=lessons`,     icon: BookOpen,        ids: ["lessons"] },
      { name: "Bài tập",       labelKey: "nav.assignments", href: `${base}?tab=assignments`, icon: ClipboardList,   ids: ["assignments"] },
      { name: "AI & Ngữ pháp", labelKey: "nav.ai_tools",    href: `${base}?tab=ai-tools`,    icon: Sparkles,        ids: ["ai-tools", "grammar", "practice", "ipa"] },
    ],
  },
  student: {
    sidebar: [
      {
        id: "overview",
        name: "Tổng quan",
        labelKey: "domain.overview",
        labels: { vi: "Tổng quan", en: "Overview", km: "ទិដ្ឋភាពទូទៅ" },
        href: "/dashboard/student?tab=overview",
        icon: LayoutDashboard,
        subIds: ["overview"],
      },
      {
        id: "learning",
        name: "Lớp học",
        labelKey: "domain.learning",
        labels: { vi: "Lớp học", en: "Classes", km: "ថ្នាក់រៀន" },
        href: "/dashboard/student?tab=learning",
        icon: GraduationCap,
        subIds: ["learning", "classes", "assignments"],
      },
      {
        id: "community",
        name: "Cộng đồng",
        labelKey: "domain.community",
        labels: { vi: "Cộng đồng", en: "Community", km: "សហគមន៍" },
        href: "/dashboard/student?tab=community",
        icon: Users,
        subIds: ["community", "groups", "chat"],
      },
      {
        id: "language",
        name: "Ngôn ngữ",
        labelKey: "domain.language",
        labels: { vi: "Ngôn ngữ", en: "Language", km: "ភាសា" },
        href: "/dashboard/student?tab=language",
        icon: BookOpen,
        subIds: ["language", "dictionary", "vocabulary", "grammar", "news"],
      },
      {
        id: "practice",
        name: "Luyện tập",
        labelKey: "domain.practice",
        labels: { vi: "Luyện tập", en: "Practice", km: "ការអនុវត្ត" },
        href: "/dashboard/student?tab=practice",
        icon: Award,
        subIds: ["practice", "ipa"],
      },
      {
        id: "ai-tools",
        name: "AI Coach",
        labelKey: "domain.ai-tools",
        labels: { vi: "AI Coach", en: "AI Coach", km: "គ្រូបង្វឹក AI" },
        href: "/dashboard/student?tab=ai-tools",
        icon: Sparkles,
        subIds: ["ai-tools"],
      },
      {
        id: "progress",
        name: "Tiến độ",
        labelKey: "domain.progress",
        labels: { vi: "Tiến độ", en: "Progress", km: "វឌ្ឍនភាព" },
        href: "/dashboard/student?tab=progress",
        icon: TrendingUp,
        subIds: ["progress", "scores", "ranking", "roadmap"],
      },
    ],
    bottomNav: (base: string) => [
      { name: "Tổng quan", labelKey: "bottom.overview",  href: `${base}?tab=overview`,   icon: LayoutDashboard, ids: ["overview"] },
      { name: "Lớp học",   labelKey: "bottom.learning",  href: `${base}?tab=learning`,   icon: GraduationCap,   ids: ["learning", "classes", "assignments"] },
      { name: "Cộng đồng", labelKey: "bottom.community", href: `${base}?tab=community`,  icon: MessageSquare,   ids: ["community", "groups", "chat"] },
      { name: "Ngôn ngữ",  labelKey: "bottom.language",   href: `${base}?tab=language`,   icon: BookOpen,        ids: ["language", "dictionary", "vocabulary", "grammar", "news"] },
      { name: "Luyện tập", labelKey: "bottom.practice",   href: `${base}?tab=practice`,   icon: Award,           ids: ["practice", "ipa"] },
    ],
  },
};

export function resolveLocalizedLabel(
  item: { name: string; labelKey?: string; labels?: Record<string, string> },
  locale?: string
): string {
  if (!locale) return item.name;
  if (item.labels && item.labels[locale]) {
    return item.labels[locale];
  }
  if (item.labelKey) {
    const dict = TRANSLATIONS[locale as SupportedLocale] || TRANSLATIONS.vi;
    if (dict && dict[item.labelKey]) {
      return dict[item.labelKey];
    }
  }
  return item.name;
}

export function getSidebarLinks(role: string, locale?: string): NavItem[] {
  const normRole = (role || "").toLowerCase();
  const config = NAVIGATION_CONFIG[normRole] || NAVIGATION_CONFIG.student;
  if (!locale) return config.sidebar;
  return config.sidebar.map((item) => ({
    ...item,
    name: resolveLocalizedLabel(item, locale),
  }));
}

export function getBottomNavItems(role: string, basePath: string, locale?: string): BottomItem[] {
  const normRole = (role || "").toLowerCase();
  const config = NAVIGATION_CONFIG[normRole] || NAVIGATION_CONFIG.student;
  const items = config.bottomNav(basePath);
  if (!locale) return items;
  return items.map((item) => ({
    ...item,
    name: resolveLocalizedLabel(item, locale),
  }));
}
