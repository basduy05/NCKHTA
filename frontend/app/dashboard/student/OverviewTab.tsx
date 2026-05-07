"use client";
import React, { useState, useEffect } from "react";
import {
  GraduationCap, Clock, BookMarked, Layers, BarChart3, Trophy,
  TrendingUp, Sparkles, ArrowRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";

interface OverviewTabProps {
  API_URL: string;
}

export default function OverviewTab({ API_URL }: OverviewTabProps) {
  const { token, user, authFetch } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const STATS_CACHE_KEY = "student_overview_stats_cache";
  const STATS_CACHE_TTL_MS = 20_000;

  useEffect(() => {
    (async () => {
      const now = Date.now();
      try {
        const raw = typeof window !== "undefined" ? sessionStorage.getItem(STATS_CACHE_KEY) : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.data && parsed?.ts && now - parsed.ts < STATS_CACHE_TTL_MS) {
            setStats(parsed.data);
            setLoading(false);
          }
        }
      } catch {}

      try {
        const res = await authFetch(`${API_URL}/student/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          try {
            if (typeof window !== "undefined")
              sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ ts: now, data }));
          } catch {}
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token, authFetch, API_URL]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Lớp học",     value: stats?.classes_enrolled  ?? 0, icon: GraduationCap, color: "indigo", href: "/dashboard/student?tab=classes" },
    { label: "Cần nộp",     value: stats?.assignments_pending ?? 0, icon: Clock,         color: "orange", href: "/dashboard/student?tab=assignments" },
    { label: "Từ vựng",     value: stats?.vocab_count       ?? 0, icon: BookMarked,     color: "blue",   href: "/dashboard/student?tab=vocabulary" },
    { label: "Cần ôn tập",  value: stats?.review_needed     ?? 0, icon: Layers,         color: "purple", href: "/dashboard/student?tab=vocabulary" },
  ];

  const colorMap: Record<string, { icon: string; text: string; bg: string }> = {
    indigo: { icon: "text-indigo-600", text: "text-indigo-700", bg: "bg-indigo-50" },
    orange: { icon: "text-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
    blue:   { icon: "text-blue-600",   text: "text-blue-700",   bg: "bg-blue-50" },
    purple: { icon: "text-purple-600", text: "text-purple-700", bg: "bg-purple-50" },
  };

  const quickLinks = [
    { label: "Tra từ điển",    href: "/dashboard/student?tab=dictionary",  icon: BookMarked, color: "bg-indigo-600" },
    { label: "Luyện thi",      href: "/dashboard/student?tab=practice",    icon: Trophy,     color: "bg-blue-600" },
    { label: "Kho ngữ pháp",   href: "/dashboard/student?tab=grammar",     icon: Layers,     color: "bg-teal-600" },
    { label: "Học với AI",     href: "/dashboard/student?tab=ai-tools",    icon: Sparkles,   color: "bg-violet-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full -ml-10 -mb-10" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Xin chào trở lại</p>
            <h2 className="text-2xl font-bold mb-1">{user?.name} 👋</h2>
            <p className="text-indigo-100">Tiếp tục hành trình học tiếng Anh của bạn.</p>
          </div>
          {stats && (
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/20 self-start md:self-auto">
              <Trophy size={22} className="text-yellow-300 flex-shrink-0" />
              <div>
                <p className="text-xs text-indigo-200">Điểm trung bình</p>
                <p className="text-2xl font-bold">{stats?.average_percent ?? 0}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => {
          const col = colorMap[c.color];
          return (
            <Link key={i} href={c.href}
              className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
              <div className={`w-10 h-10 ${col.bg} rounded-xl flex items-center justify-center mb-4`}>
                <c.icon size={19} className={col.icon} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{c.label}</p>
              <ArrowRight size={14} className={`mt-3 ${col.icon} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Link>
          );
        })}
      </div>

      {/* Score summary */}
      {stats && stats.assignments_submitted > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Tổng kết học tập
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Tổng điểm",      value: `${stats.total_score}/${stats.total_max_score}`, color: "text-indigo-600" },
              { label: "Điểm trung bình", value: `${stats.average_percent}%`,                     color: "text-green-600" },
              { label: "Bài hoàn thành", value: stats.assignments_submitted,                       color: "text-purple-600" },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick access */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-600" /> Truy cập nhanh
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((ql, i) => (
            <Link key={i} href={ql.href}
              className="flex flex-col items-center gap-3 p-5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 transition-all group text-center">
              <div className={`w-10 h-10 rounded-xl ${ql.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <ql.icon size={19} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{ql.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
