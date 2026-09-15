"use client";
import { useState, Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Database, Plus, UploadCloud, FileSpreadsheet, Save, Edit, Trash2, GraduationCap, X, Check, Copy, BookOpen, BookText, Settings, RefreshCw, Mail, Eye, EyeOff, Sparkles, ClipboardList, Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, TrendingUp, Network, Activity, MessageCircleWarning, Bug, Lightbulb, CheckCircle, Clock, ClipboardPaste, ListChecks, Loader2, AlertCircle, AlertTriangle, CheckCircle2, ChevronUp, ChevronDown, Radio, Zap, Flame, ArrowUpRight, ShieldCheck, Laptop, Smartphone, Tablet, Award, Coins, Filter, Calendar, ChevronRight, Info, Search } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useNotification } from "@/app/context/NotificationContext";
import { Stat } from "@/app/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

import AnalyticsTab from "./AnalyticsTab";
import UserBehaviorTab from "./UserBehaviorTab";

// Shared helper functions
function formatTimeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return "Chưa có";
  try {
    const now = new Date();
    const clean = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
    const past = new Date(clean);
    const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (isNaN(diffSec) || diffSec < 5) return "Vừa xong";
    if (diffSec < 60) return `${diffSec}s trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}d trước`;
    return past.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function getFeatureBadge(feature: string) {
  const f = (feature || "").toLowerCase();
  if (f.includes("grammar") || f.includes("ngữ pháp")) {
    return { bg: "bg-purple-50 text-purple-700 border border-purple-200/60", label: feature || "Ngữ pháp" };
  }
  if (f.includes("dict") || f.includes("từ vựng") || f.includes("vocab") || f.includes("lookup")) {
    return { bg: "bg-blue-50 text-blue-700 border border-blue-200/60", label: feature || "Tra từ" };
  }
  if (f.includes("exam") || f.includes("test") || f.includes("quiz") || f.includes("đề thi")) {
    return { bg: "bg-amber-50 text-amber-800 border border-amber-200/60", label: feature || "Luyện thi" };
  }
  if (f.includes("chat") || f.includes("tutor") || f.includes("conversation") || f.includes("hội thoại")) {
    return { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60", label: feature || "AI Chat" };
  }
  if (f.includes("roadmap") || f.includes("lộ trình") || f.includes("learning")) {
    return { bg: "bg-teal-50 text-teal-700 border border-teal-200/60", label: feature || "Lộ trình" };
  }
  return { bg: "bg-indigo-50 text-indigo-700 border border-indigo-200/60", label: feature || "AI Task" };
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const router = useRouter();
  const { token, user, isInitialized, authFetch } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    // Require login + admin role for this page
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.role || "").toString().toLowerCase();
    if (role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isInitialized, token, user, router]);

  if (!isInitialized) {
    return <div className="text-[var(--brand)] font-medium">Đang khởi tạo phiên đăng nhập...</div>;
  }
  if (!token || !user) {
    return <div className="text-[var(--brand)] font-medium">Đang chuyển hướng...</div>;
  }

  const getAdminTitle = (tab: string) => {
    const m: Record<string, string> = {
      overview: "Tổng quan hệ thống", analytics: "Phân tích Kinh doanh & BI",
      behavior: "Hành vi người dùng",
      users: "Quản lý Người dùng & GV",
      vocab: "Kho Từ Vựng Graph", classes: "Quản lý Lớp Học",
      lessons: "Quản lý Bài Học", assignments: "Quản lý Bài tập & Đề thi",
      grammar: "Kho Ngữ Pháp (AI)", ai_monitoring: "Giám sát hiệu năng AI",
      feedback: "Quản lý Góp ý & Lỗi", settings: "Cài đặt hệ thống",
    };
    return m[tab] ?? "Admin";
  };

  return (
    <div className="space-y-6">
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'analytics' && <AnalyticsTab API_URL={API_URL} />}
      {activeTab === 'behavior' && <UserBehaviorTab API_URL={API_URL} />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'vocab' && <VocabTab />}
      {activeTab === 'classes' && <ClassesTab />}
      {activeTab === 'lessons' && <LessonsTab />}
      {activeTab === 'assignments' && <AssignmentsTab />}
      {activeTab === 'grammar' && <GrammarTab />}
      {activeTab === 'ai_monitoring' && <AILogsTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="text-[var(--brand)] font-medium">Đang tải bảng điều khiển...</div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}

function OverviewTab() {
  const { token, isInitialized, authFetch } = useAuth();
  const [stats, setStats] = useState<any>({
    users: 0, vocab: 0, classes: 0, lessons: 0,
    users_online_now: 0, active_24h: 0, active_7d: 0,
    ai_calls_today: 0, avg_latency_24h: 0, error_rate_24h: 0,
    words_studied_today: 0, exams_today: 0, vocab_items_db: 0, neo4j_nodes: 0, new_signups_7d: 0,
    trend_labels: [], signups_7d: [], ai_calls_7d: []
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [expandedActId, setExpandedActId] = useState<number | null>(null);


  const fetchOverviewData = async (isBackground = false) => {
    if (!token) return;
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    try {
      const [statsRes, actRes] = await Promise.all([
        authFetch(`${API_URL}/admin/stats`),
        authFetch(`${API_URL}/admin/activity-feed?limit=20`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (actRes.ok) {
        const actData = await actRes.json();
        const list = Array.isArray(actData) ? actData : (actData?.events || []);
        setActivities(list.slice(0, 20));
      }
    } catch (err) {
      console.error("Error fetching overview stats:", err);
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setCountdown(15);
    fetchOverviewData(true);
  };

  useEffect(() => {
    if (!isInitialized || !token) return;
    fetchOverviewData();

    // 1-second countdown timer for auto-refresh
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchOverviewData(true);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setCountdown(15);
        fetchOverviewData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isInitialized, token]);

  const maxAiCalls = Math.max(1, ...(stats.ai_calls_7d || [1]));
  const maxSignups = Math.max(1, ...(stats.signups_7d || [1]));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Command Center Status Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/40">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="text-indigo-400" size={22} />
              iEdu System Command Center
            </h2>
            <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Operational
            </span>
          </div>
          <p className="text-xs text-indigo-200/70">
            Giám sát thời gian thực toàn bộ vi dịch vụ, lưu lượng AI và hoạt động học tập trên hệ thống
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-800/50 text-indigo-200 text-xs font-mono">
            <Clock size={13} className="text-indigo-400" />
            <span>Tự động đồng bộ: <strong className="text-white font-bold">{countdown}s</strong></span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition backdrop-blur-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-indigo-300" : ""} />
            <span>{refreshing ? "Đang đồng bộ..." : "Làm mới"}</span>
          </button>
        </div>
      </div>

      {/* Row 1: Live Pulse (real-time, 30s refresh) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" /> Row 1 — Live Pulse (Thời gian thực)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Users Online Now */}
          <div className="app-card p-5 border-l-4 border-l-emerald-500 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Users Online Now</p>
                <h3 className="text-2xl font-black text-gray-900 mt-2 flex items-center gap-2">
                  {loading ? "..." : (stats.users_online_now || 0).toLocaleString()}
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">Phiên đang kết nối (15m)</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Radio size={20} />
              </div>
            </div>
          </div>

          {/* Card 2: AI Calls Today */}
          <div className="app-card p-5 border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Calls Today</p>
                <h3 className="text-2xl font-black text-gray-900 mt-2">
                  {loading ? "..." : (stats.ai_calls_today || 0).toLocaleString()}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">
                  Tổng yêu cầu AI hôm nay
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Sparkles size={20} />
              </div>
            </div>
          </div>

          {/* Card 3: Error Rate 24h */}
          <div className={`app-card p-5 border-l-4 ${stats.error_rate_24h > 10 ? 'border-l-rose-500' : 'border-l-amber-500'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Error Rate 24h</p>
                <h3 className="text-2xl font-black text-gray-900 mt-2">
                  {loading ? "..." : `${stats.error_rate_24h || 0}%`}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">
                  Trạng thái: <span className={stats.error_rate_24h > 10 ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>
                    {stats.error_rate_24h > 10 ? "Cảnh báo lỗi" : "Rất ổn định"}
                  </span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>

          {/* Card 4: Avg Latency 24h */}
          <div className="app-card p-5 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Latency 24h</p>
                <h3 className="text-2xl font-black text-gray-900 mt-2">
                  {loading ? "..." : `${stats.avg_latency_24h || 0} ms`}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">
                  Độ trễ trung bình mô hình AI
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Clock size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Platform Health (7 ngày) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} className="text-indigo-500" /> Row 2 — Platform Health (Quy mô & Tương tác 7 ngày)
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Tổng Users"
            value={loading ? "—" : (stats.users || 0).toLocaleString()}
            icon={<Users size={18} />}
            tone="brand"
          />
          <Stat
            label="Active 24h (DAU)"
            value={loading ? "—" : (stats.active_24h || 0).toLocaleString()}
            icon={<Flame size={18} />}
            tone="warn"
          />
          <Stat
            label="Active 7d (WAU)"
            value={loading ? "—" : (stats.active_7d || 0).toLocaleString()}
            icon={<TrendingUp size={18} />}
            tone="neutral"
          />
          <Stat
            label="New Signups 7d"
            value={loading ? "—" : `+${(stats.new_signups_7d || 0).toLocaleString()}`}
            icon={<ArrowUpRight size={18} />}
            tone="brand"
          />
        </div>
      </div>

      {/* Row 3: Learning Activity (sparkline mini chart & metrics) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={14} className="text-purple-500" /> Row 3 — Learning Activity (Hoạt động học tập & Tri thức)
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat
            label="Từ đã học hôm nay"
            value={loading ? "—" : (stats.words_studied_today || 0).toLocaleString()}
            icon={<BookOpen size={18} />}
            tone="brand"
          />
          <Stat
            label="Exams done today"
            value={loading ? "—" : (stats.exams_today || 0).toLocaleString()}
            icon={<ClipboardList size={18} />}
            tone="warn"
          />
          <Stat
            label="Vocab items DB"
            value={loading ? "—" : (stats.vocab_items_db || stats.vocab || 0).toLocaleString()}
            icon={<BookText size={18} />}
            tone="neutral"
          />
          <Stat
            label="Neo4j nodes"
            value={loading ? "—" : (stats.neo4j_nodes || stats.vocab || 0).toLocaleString()}
            icon={<Database size={18} />}
            tone="brand"
          />
        </div>

        {/* 7-day Visual Sparkline Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Calls 7-Day Chart */}
          <div className="app-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="text-indigo-600" size={18} />
                  Lượng Gọi AI 7 Ngày Gần Nhất
                </h3>
                <p className="text-xs text-gray-400">Xu hướng gọi LLM theo ngày</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {stats.ai_calls_7d ? stats.ai_calls_7d.reduce((a: number, b: number) => a + b, 0).toLocaleString() : 0} calls
              </span>
            </div>

            <div className="h-40 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-gray-100">
              {(stats.trend_labels || []).map((label: string, idx: number) => {
                const val = (stats.ai_calls_7d && stats.ai_calls_7d[idx]) || 0;
                const heightPct = Math.max(8, Math.round((val / maxAiCalls) * 100));
                const shortLabel = label && label.length >= 10 ? `${label.slice(8, 10)}/${label.slice(5, 7)}` : (label || "");
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute -top-8 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-20 whitespace-nowrap pointer-events-none">
                      <span>{label}</span>
                      <span className="text-indigo-300">{val} lượt</span>
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-md transition-all duration-300 group-hover:from-indigo-700 group-hover:to-indigo-500 cursor-pointer"
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-400 font-medium truncate w-full text-center">
                      {shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 pt-3">
              <span>7 ngày trước</span>
              <span>Hôm nay</span>
            </div>
          </div>

          {/* New Signups 7-Day Chart */}
          <div className="app-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Users className="text-emerald-600" size={18} />
                  Đăng Ký Thành Viên Mới (7 Ngày)
                </h3>
                <p className="text-xs text-gray-400">Tốc độ mở rộng người dùng mới</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                +{stats.new_signups_7d || 0} mới
              </span>
            </div>

            <div className="h-40 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-gray-100">
              {(stats.trend_labels || []).map((label: string, idx: number) => {
                const val = (stats.signups_7d && stats.signups_7d[idx]) || 0;
                const heightPct = Math.max(8, Math.round((val / maxSignups) * 100));
                const shortLabel = label && label.length >= 10 ? `${label.slice(8, 10)}/${label.slice(5, 7)}` : (label || "");
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute -top-8 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-20 whitespace-nowrap pointer-events-none">
                      <span>{label}</span>
                      <span className="text-emerald-300">+{val} học viên</span>
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-300 group-hover:from-emerald-700 group-hover:to-emerald-500 cursor-pointer"
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className="text-[10px] text-gray-400 font-medium truncate w-full text-center">
                      {shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-400 pt-3">
              <span>7 ngày trước</span>
              <span>Hôm nay</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Live Activity Feed (20 gần nhất, 15s auto-refresh) */}
      <div className="app-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-[var(--brand)]" size={18} />
              Dòng Hoạt Động Thời Gian Thực (Live Activity Feed)
            </h3>
            <p className="text-xs text-gray-400">20 hoạt động AI & tương tác học tập gần nhất trong hệ thống (nhấn dòng để xem chi tiết)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-mono font-semibold">
              <RefreshCw size={12} className={refreshing ? "animate-spin text-indigo-600" : "text-indigo-400"} />
              Tự động cập nhật: <strong>{countdown}s</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">Thời gian</th>
                <th className="pb-3">Người dùng</th>
                <th className="pb-3">Tính năng</th>
                <th className="pb-3">AI Model</th>
                <th className="pb-3">Độ trễ (ms)</th>
                <th className="pb-3 text-center">Trạng thái</th>
                <th className="pb-3 text-right pr-2">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                      <span>Đang tải dòng hoạt động thời gian thực...</span>
                    </div>
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Chưa có hoạt động AI nào được ghi nhận hôm nay.
                  </td>
                </tr>
              ) : (
                activities.map((act) => {
                  const isSuccess = ["success", "evaluated"].includes((act.status || "").toLowerCase());
                  const displayName = act.user_name || (act.user_id ? `User #${act.user_id}` : "Hệ thống / Khách");
                  const displayRole = act.user_role || (act.user_id ? "STUDENT" : "SYSTEM");
                  const avatarLetter = act.user_name ? act.user_name.charAt(0).toUpperCase() : (act.user_id ? "U" : "S");
                  const avatarBg = act.user_name ? "bg-indigo-100 text-indigo-700" : (act.user_id ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700");
                  const featureBadge = getFeatureBadge(act.feature);
                  const isExpanded = expandedActId === act.id;

                  return (
                    <tr key={act.id} className="group">
                      <td colSpan={7} className="p-0">
                        <div
                          onClick={() => setExpandedActId(isExpanded ? null : act.id)}
                          className={`grid grid-cols-12 items-center py-3 px-2 cursor-pointer transition select-none ${
                            isExpanded ? 'bg-indigo-50/40' : 'hover:bg-gray-50/80'
                          }`}
                        >
                          {/* Thời gian */}
                          <div className="col-span-2 flex flex-col font-mono text-gray-500 pr-2">
                            <span className="font-semibold text-gray-800 text-[11px]">{formatTimeAgo(act.created_at)}</span>
                            <span className="text-[10px] text-gray-400 truncate" title={act.created_at}>
                              {act.created_at ? act.created_at.replace("T", " ").substring(11, 19) : ""}
                            </span>
                          </div>

                          {/* Người dùng */}
                          <div className="col-span-3 flex items-center gap-2 pr-2">
                            <div className={`w-6 h-6 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 ${avatarBg}`}>
                              {avatarLetter}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-gray-800 block truncate">{displayName}</span>
                              <span className="text-[10px] text-gray-400">
                                {act.user_id ? `ID #${act.user_id} · ` : ""}{displayRole}
                              </span>
                            </div>
                          </div>

                          {/* Tính năng */}
                          <div className="col-span-2 pr-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] inline-block ${featureBadge.bg}`}>
                              {featureBadge.label}
                            </span>
                          </div>

                          {/* AI Model */}
                          <div className="col-span-2 font-mono text-[11px] text-gray-600 truncate pr-2" title={act.model || "Default"}>
                            {act.model || "Default"}
                          </div>

                          {/* Độ trễ */}
                          <div className="col-span-1 font-mono font-semibold">
                            {act.latency_ms !== null && act.latency_ms !== undefined ? (
                              <span className={act.latency_ms > 5000 ? "text-red-500 font-bold" : act.latency_ms > 2000 ? "text-amber-600 font-bold" : "text-emerald-600"}>
                                {act.latency_ms} ms
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>

                          {/* Trạng thái */}
                          <div className="col-span-1 text-center">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <CheckCircle2 size={11} className="text-emerald-600 shrink-0" /> Thành công
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md" title={act.error_message || "Lỗi xử lý"}>
                                <AlertCircle size={11} className="text-red-500 shrink-0" /> Thất bại
                              </span>
                            )}
                          </div>

                          {/* Toggle icon */}
                          <div className="col-span-1 text-right text-gray-400 group-hover:text-gray-600">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {/* Collapsible Detail Panel */}
                        {isExpanded && (
                          <div className="px-5 py-4 bg-slate-50 border-t border-b border-indigo-100/60 text-xs space-y-3 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Mã log & Phiên</span>
                                <p className="font-mono font-semibold text-gray-800">Log #{act.id}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Thời gian: {act.created_at ? act.created_at.replace("T", " ") : "N/A"}</p>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Model & Tốc độ</span>
                                <p className="font-mono font-semibold text-indigo-700">{act.model || "N/A"}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Độ trễ: <strong>{act.latency_ms || 0} ms</strong></p>
                              </div>
                              <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Đánh giá AI Referee</span>
                                <p className="font-semibold text-gray-800">
                                  {act.eval_score !== undefined && act.eval_score !== null ? (
                                    <span className="text-emerald-600 font-bold">{act.eval_score} / 10 điểm</span>
                                  ) : (
                                    <span className="text-gray-400 font-normal">Chưa có điểm đánh giá</span>
                                  )}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Trạng thái: <strong className="uppercase">{act.status}</strong></p>
                              </div>
                            </div>

                            {/* Error Details Box if Failed */}
                            {act.error_message && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900">
                                <div className="flex items-center gap-1.5 font-bold text-red-700 mb-1">
                                  <AlertTriangle size={14} />
                                  <span>Chi tiết lỗi ghi nhận từ AI Provider:</span>
                                </div>
                                <pre className="text-[11px] font-mono whitespace-pre-wrap bg-white/70 p-2.5 rounded-lg border border-red-100 overflow-x-auto text-red-800">
                                  {act.error_message}
                                </pre>
                              </div>
                            )}

                            {/* Referee Feedback if Available */}
                            {act.eval_feedback && (
                              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-950">
                                <div className="flex items-center gap-1.5 font-bold text-indigo-800 mb-1">
                                  <Sparkles size={14} className="text-indigo-600" />
                                  <span>Nhận xét chi tiết từ hệ thống:</span>
                                </div>
                                <p className="text-[11px] text-indigo-900/90 whitespace-pre-wrap leading-relaxed">
                                  {act.eval_feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const { token, isInitialized, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formUser, setFormUser] = useState({ name: "", email: "", role: "STUDENT", password: "", credits_ai: 50, points: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [cefrFilter, setCefrFilter] = useState("ALL");
  const [subFilter, setSubFilter] = useState("ALL");

  // Drawer state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [drawerUser, setDrawerUser] = useState<any | null>(null);
  const [drawerData, setDrawerData] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const handleOpenDrawer = async (u: any) => {
    setSelectedUserId(u.id);
    setDrawerUser(u);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const res = await authFetch(`${API_URL}/admin/users/${u.id}/detail`);
      if (res.ok) {
        const data = await res.json();
        setDrawerData(data);
      }
    } catch (err) {
      console.error("Error fetching user detail:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedUserId(null);
    setDrawerUser(null);
    setDrawerData(null);
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await authFetch(`${API_URL}/admin/users`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [bulkCredits, setBulkCredits] = useState(50);
  const [bulkRole, setBulkRole] = useState("STUDENT");
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkUpdate = async () => {
    if (!token) return;
    if (!(await showConfirm(`Cập nhật ${bulkCredits} AI Credits cho TẤT CẢ ${bulkRole}?`))) return;
    setBulkLoading(true);
    try {
      const res = await authFetch(`${API_URL}/admin/bulk-update-credits`, {
        method: "POST",
        body: JSON.stringify({ credits: bulkCredits, role: bulkRole })
      });
      if (res.ok) {
        showAlert("Cập nhật hàng loạt thành công!", 'success');
        fetchUsers();
      } else {
        showAlert("Lỗi khi cập nhật hàng loạt", 'error');
      }
    } catch (err) {
      showAlert("Lỗi kết nối", 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!users || users.length === 0) {
      return showAlert("Không có dữ liệu người dùng để xuất", "warning");
    }
    const headers = [
      "ID", "Họ Tên", "Email", "Vai Trò", "Trình Độ CEFR", 
      "Chuỗi Học Tập (Ngày)", "AI Credits", "Điểm Thưởng",
      "Hoạt Động Gần Nhất", "Thiết Bị", "Gói Dịch Vụ", "Số Phiên Đăng Nhập", "AI Calls Hôm Nay"
    ];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      u.role || "STUDENT",
      u.cefr_level || "A1",
      u.streak || 0,
      u.credits_ai || 0,
      u.points || 0,
      `"${u.last_active || "Chưa có"}"`,
      `"${u.device_type || "Desktop"}"`,
      `"${u.subscription_tier || "Free"}"`,
      u.session_count || 0,
      u.ai_calls_today || 0
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `danh_sach_nguoi_dung_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert("Đã xuất file CSV thành công!", "success");
  };

  useEffect(() => {
    if (!isInitialized || !token) return;
    fetchUsers();

    const interval = setInterval(() => {
      fetchUsers();
    }, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUsers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isInitialized, token]);

  const handleSaveUser = async () => {
    if (!token) return showAlert("Chưa đăng nhập", 'warning');
    if (!formUser.name || !formUser.email) return showAlert("Vui lòng điền đủ thông tin!", 'warning');
    try {
      if (isEditing !== null) {
        const res = await authFetch(
          `${API_URL}/admin/users/${isEditing}`,
          { method: "PUT", body: JSON.stringify(formUser) }
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return showAlert(payload.detail || "Lỗi cập nhật người dùng", 'error');
        showAlert("Cập nhật người dùng thành công!", 'success');
      } else {
        const res = await authFetch(
          `${API_URL}/admin/users`,
          { method: "POST", body: JSON.stringify(formUser) }
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) return showAlert(payload.detail || "Lỗi tạo người dùng", 'error');
        showAlert("Tạo người dùng mới thành công!", 'success');
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      showAlert("Có lỗi kết nối tới máy chủ.", 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!token) return;
    if (await showConfirm("Bạn có chắc chắn xoá người dùng này?")) {
      try {
        const res = await authFetch(`${API_URL}/admin/users/${id}`, { method: "DELETE" });
        if (res.ok) {
          showAlert("Xoá người dùng thành công!", "success");
          fetchUsers();
        } else {
          const payload = await res.json().catch(() => ({}));
          showAlert(payload.detail || "Lỗi khi xoá người dùng", "error");
        }
      } catch (err) {
        showAlert("Lỗi kết nối", 'error');
      }
    }
  };

  const handleEditClick = (u: any) => {
    setIsEditing(u.id);
    setFormUser({ name: u.name, email: u.email, role: u.role, password: '', credits_ai: u.credits_ai || 0, points: u.points || 0 });
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormUser({ name: '', email: '', role: 'STUDENT', password: '', credits_ai: 50, points: 0 });
  };

  const getDeviceIcon = (device?: string) => {
    const d = (device || "").toLowerCase();
    if (d.includes("mobile") || d.includes("phone")) return <Smartphone size={13} className="text-purple-600" />;
    if (d.includes("tablet") || d.includes("ipad")) return <Tablet size={13} className="text-amber-600" />;
    return <Laptop size={13} className="text-blue-600" />;
  };

  const getSubBadge = (tier?: string) => {
    const t = (tier || "free").toLowerCase();
    if (t === "premium") {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Premium ⭐</span>;
    }
    if (t === "pro") {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Pro 🚀</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-600">Free</span>;
  };

  const getCefrBadge = (level?: string) => {
    const l = (level || "A1").toUpperCase();
    const colors: Record<string, string> = {
      A1: "bg-emerald-50 text-emerald-700 border-emerald-200",
      A2: "bg-teal-50 text-teal-700 border-teal-200",
      B1: "bg-blue-50 text-blue-700 border-blue-200",
      B2: "bg-indigo-50 text-indigo-700 border-indigo-200",
      C1: "bg-purple-50 text-purple-700 border-purple-200",
      C2: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[l] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
        {l}
      </span>
    );
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (cefrFilter !== "ALL" && (u.cefr_level || "A1").toUpperCase() !== cefrFilter.toUpperCase()) return false;
    if (subFilter !== "ALL") {
      const tier = (u.subscription_tier || "free").toLowerCase();
      if (subFilter.toLowerCase() !== tier) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-2 app-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Danh sách Người dùng ({filteredUsers.length})</h2>
            <p className="text-xs text-gray-400">Quản lý tài khoản, phân quyền, cấp credits AI, xem chi tiết hồ sơ & lịch sử học tập</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
          >
            <FileSpreadsheet size={15} />
            <span>Xuất file CSV</span>
          </button>
        </div>

        {/* Toolbar: Search + Role Filter + CEFR Filter + Sub Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-4">
          <div className="sm:col-span-5 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand)] bg-gray-50/50"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          </div>

          <div className="sm:col-span-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white text-gray-700 font-medium focus:outline-none"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="STUDENT">Học sinh</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="ADMIN">Quản trị</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={cefrFilter}
              onChange={(e) => setCefrFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white text-gray-700 font-medium focus:outline-none"
            >
              <option value="ALL">Tất cả CEFR</option>
              <option value="A1">A1 - Sơ cấp</option>
              <option value="A2">A2 - Cơ bản</option>
              <option value="B1">B1 - Trung cấp</option>
              <option value="B2">B2 - Trung cao</option>
              <option value="C1">C1 - Cao cấp</option>
              <option value="C2">C2 - Thành thạo</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 text-xs bg-white text-gray-700 font-medium focus:outline-none"
            >
              <option value="ALL">Tất cả gói học</option>
              <option value="free">Gói Miễn phí (Free)</option>
              <option value="pro">Gói Pro (Trả phí)</option>
              <option value="premium">Gói Premium (Cao cấp)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-gray-400 text-xs">
            <RefreshCw size={18} className="animate-spin mr-2 text-[var(--brand)]" /> Đang tải danh sách...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 font-medium">Họ Tên</th>
                  <th className="pb-3 font-medium">Vai trò</th>
                  <th className="pb-3 font-medium">CEFR</th>
                  <th className="pb-3 font-medium">Chuỗi</th>
                  <th className="pb-3 font-medium">Gói</th>
                  <th className="pb-3 font-medium">Thiết bị</th>
                  <th className="pb-3 font-medium">Hoạt động</th>
                  <th className="pb-3 font-medium">AI Credits</th>
                  <th className="pb-3 font-medium text-right pr-2">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-indigo-50/20 transition group">
                    <td className="py-3 font-semibold text-gray-900">
                      <div
                        onClick={() => handleOpenDrawer(u)}
                        className="flex items-center gap-2 cursor-pointer group-hover:text-indigo-600 transition"
                        title="Xem hồ sơ chi tiết người dùng"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="truncate max-w-[150px]">
                          <span className="block truncate">{u.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono block truncate">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                        u.role === 'TEACHER' ? 'bg-purple-100 text-purple-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {u.role === 'TEACHER' ? 'Giáo viên' : u.role === 'ADMIN' ? 'Quản trị' : 'Học sinh'}
                      </span>
                    </td>
                    <td className="py-3">
                      {getCefrBadge(u.cefr_level)}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <Flame size={12} className="text-amber-500" />
                        {u.streak || 0}d
                      </span>
                    </td>
                    <td className="py-3">
                      {getSubBadge(u.subscription_tier)}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 font-medium">
                        {getDeviceIcon(u.device_type)}
                        <span>{u.device_type || "Desktop"}</span>
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-[11px] whitespace-nowrap font-mono" title={u.last_active || "Chưa có"}>
                      {formatTimeAgo(u.last_active)}
                    </td>
                    <td className="py-3 text-gray-700 font-bold">
                      <span>{u.credits_ai || 0}</span>
                      <span className="text-[10px] text-gray-400 font-normal ml-1">/ {(u.points || 0).toLocaleString()}p</span>
                    </td>
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDrawer(u)}
                          title="Xem hồ sơ chi tiết"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleEditClick(u)}
                          title="Sửa thông tin"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          title="Xoá người dùng"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      Không tìm thấy người dùng phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="app-card p-6 h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Users className="mr-2 text-[var(--brand)]" />
              {isEditing ? 'Sửa Người Dùng' : 'Thêm Người Dùng'}
            </h2>
            {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
          </div>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên hiển thị</label>
              <input type="text" value={formUser.name} onChange={e => setFormUser({ ...formUser, name: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="VD: Nguyễn Văn A" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={formUser.email} onChange={e => setFormUser({ ...formUser, email: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="email@domain.com" />
            </div>
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium mb-1">Mật khẩu (Mặc định: 123456)</label>
                <input type="text" value={formUser.password || ''} onChange={e => setFormUser({ ...formUser, password: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="123456" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Vai trò</label>
              <select value={formUser.role} onChange={e => setFormUser({ ...formUser, role: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none">
                <option value="STUDENT">Học sinh</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">AI Credits</label>
                <input type="number" value={formUser.credits_ai} onChange={e => setFormUser({ ...formUser, credits_ai: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Points</label>
                <input type="number" value={formUser.points} onChange={e => setFormUser({ ...formUser, points: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
              </div>
            </div>
            <button type="button" onClick={handleSaveUser} className="w-full py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-dark)] transition flex justify-center items-center">
              {isEditing ? <><Check size={18} className="mr-2" /> Lưu thay đổi</> : 'Tạo tài khoản'}
            </button>
          </form>
        </div>

        <div className="app-card p-6 h-fit h-auto">
          <h2 className="text-lg font-bold text-gray-900 flex items-center mb-4"><RefreshCw className="mr-2 text-blue-600" /> Cập nhật hàng loạt</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">AI Credits mới</label>
                <input type="number" value={bulkCredits} onChange={e => setBulkCredits(parseInt(e.target.value) || 0)} className="w-full border rounded-lg p-2 outline-none" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Vai trò áp dụng</label>
                <select value={bulkRole} onChange={e => setBulkRole(e.target.value)} className="w-full border rounded-lg p-2 bg-white outline-none">
                  <option value="STUDENT">Tất cả Học sinh</option>
                  <option value="TEACHER">Tất cả Giáo viên</option>
                </select>
              </div>
            </div>
            <button onClick={handleBulkUpdate} disabled={bulkLoading} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex justify-center items-center">
              {bulkLoading ? 'Đang cập nhật...' : <><RefreshCw size={18} className="mr-2" /> Áp dụng ngay</>}
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in User Detail Drawer */}
      {selectedUserId !== null && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity"
            onClick={handleCloseDrawer}
          />
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-lg shadow-md border border-white/20">
                    {drawerUser?.name ? drawerUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {drawerUser?.name || "Người dùng"}
                      {drawerUser?.role === 'ADMIN' && <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] px-2 py-0.5 rounded-full font-bold">Admin</span>}
                      {drawerUser?.role === 'TEACHER' && <span className="bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-bold">Giáo viên</span>}
                      {drawerUser?.role === 'STUDENT' && <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">Học sinh</span>}
                    </h3>
                    <p className="text-xs text-indigo-200/80 font-mono mt-0.5">{drawerUser?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
                {drawerLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                    <Loader2 size={32} className="animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold text-gray-600">Đang tải chi tiết hồ sơ người dùng...</span>
                  </div>
                ) : (
                  <>
                    {/* Stat Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                        <div className="flex items-center justify-between text-gray-400 mb-1">
                          <span className="text-[10px] font-bold uppercase">AI Credits</span>
                          <Sparkles size={13} className="text-indigo-500" />
                        </div>
                        <p className="text-lg font-black text-gray-900">{drawerUser?.credits_ai ?? 0}</p>
                        <span className="text-[10px] text-gray-400">Khả dụng</span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                        <div className="flex items-center justify-between text-gray-400 mb-1">
                          <span className="text-[10px] font-bold uppercase">Điểm thưởng</span>
                          <Coins size={13} className="text-amber-500" />
                        </div>
                        <p className="text-lg font-black text-gray-900">{(drawerUser?.points ?? 0).toLocaleString()}</p>
                        <span className="text-[10px] text-gray-400">Tích luỹ</span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                        <div className="flex items-center justify-between text-gray-400 mb-1">
                          <span className="text-[10px] font-bold uppercase">Chuỗi học</span>
                          <Flame size={13} className="text-orange-500" />
                        </div>
                        <p className="text-lg font-black text-orange-600">{drawerUser?.streak ?? 0} ngày</p>
                        <span className="text-[10px] text-gray-400">Liên tục</span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs">
                        <div className="flex items-center justify-between text-gray-400 mb-1">
                          <span className="text-[10px] font-bold uppercase">CEFR</span>
                          <Award size={13} className="text-blue-500" />
                        </div>
                        <p className="text-lg font-black text-blue-700">{drawerUser?.cefr_level || "A1"}</p>
                        <span className="text-[10px] text-gray-400">Trình độ</span>
                      </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200/70 shadow-2xs space-y-2 text-xs">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 pb-2 border-b border-gray-100">
                        <Info size={14} className="text-indigo-600" /> Thông tin phiên & tài khoản
                      </h4>
                      <div className="grid grid-cols-2 gap-y-2 pt-1 text-gray-600">
                        <div>
                          <span className="text-gray-400 block text-[11px]">Gói dịch vụ:</span>
                          <div className="mt-0.5">{getSubBadge(drawerUser?.subscription_tier)}</div>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Thiết bị chính:</span>
                          <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                            {getDeviceIcon(drawerUser?.device_type)} {drawerUser?.device_type || "Desktop"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Hoạt động gần nhất:</span>
                          <span className="font-semibold text-gray-800 font-mono text-[11px]">
                            {drawerUser?.last_active ? drawerUser.last_active.replace("T", " ").substring(0, 19) : "Chưa có"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[11px]">Tổng phiên / AI calls hôm nay:</span>
                          <span className="font-semibold text-gray-800">
                            {drawerUser?.session_count ?? 0} sessions · {drawerUser?.ai_calls_today ?? 0} calls
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Placement Test Result */}
                    {drawerData?.placement_result && (
                      <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 text-blue-700">
                            <GraduationCap size={15} /> Kết Quả Đánh Giá Đầu Vào (Placement Test)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800">
                            Xếp loại: {drawerData.placement_result.cefr_level || drawerData.placement_result.overall_level || "A1"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-blue-50/50 rounded-lg">
                            <span className="text-[10px] text-gray-500 block">Từ vựng</span>
                            <span className="font-bold text-gray-900 text-sm">{drawerData.placement_result.vocab_score ?? "—"}</span>
                          </div>
                          <div className="p-2 bg-blue-50/50 rounded-lg">
                            <span className="text-[10px] text-gray-500 block">Ngữ pháp</span>
                            <span className="font-bold text-gray-900 text-sm">{drawerData.placement_result.grammar_score ?? "—"}</span>
                          </div>
                          <div className="p-2 bg-blue-50/50 rounded-lg">
                            <span className="text-[10px] text-gray-500 block">Đọc hiểu</span>
                            <span className="font-bold text-gray-900 text-sm">{drawerData.placement_result.reading_score ?? "—"}</span>
                          </div>
                        </div>
                        {drawerData.placement_result.completed_at && (
                          <p className="text-[10px] text-gray-400 text-right">
                            Hoàn thành: {drawerData.placement_result.completed_at.replace("T", " ")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 5 Hoạt động AI gần nhất */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200/70 shadow-2xs space-y-3">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" /> 5 Yêu cầu AI gần nhất
                      </h4>
                      {drawerData?.recent_ai_calls && drawerData.recent_ai_calls.length > 0 ? (
                        <div className="space-y-2">
                          {drawerData.recent_ai_calls.slice(0, 5).map((c: any) => {
                            const isOk = ["success", "evaluated"].includes((c.status || "").toLowerCase());
                            return (
                              <div key={c.id} className="p-2.5 rounded-lg bg-gray-50 flex items-center justify-between text-xs">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-indigo-700">{c.feature || "AI Task"}</span>
                                    <span className="text-[10px] font-mono text-gray-400">{c.model || "Default"}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                                    {c.created_at ? c.created_at.replace("T", " ").substring(0, 19) : ""} · {c.latency_ms || 0}ms
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {isOk ? "OK" : "Lỗi"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 py-3 text-center">Chưa có lịch sử gọi AI nào.</p>
                      )}
                    </div>

                    {/* Lịch sử điểm thưởng */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200/70 shadow-2xs space-y-3">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                        <Coins size={14} className="text-amber-500" /> Lịch sử tích lũy điểm
                      </h4>
                      {drawerData?.points_history && drawerData.points_history.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {drawerData.points_history.slice(0, 8).map((p: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-lg bg-amber-50/40 border border-amber-100 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-gray-800">{p.reason || p.action || "Hoạt động học tập"}</span>
                                <span className="text-[10px] text-gray-400 block">{p.created_at ? p.created_at.replace("T", " ").substring(0, 19) : ""}</span>
                              </div>
                              <span className="font-bold font-mono text-emerald-600 text-xs">
                                +{p.points_earned || p.points || 0} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 py-3 text-center">Chưa có bản ghi điểm thưởng nào.</p>
                      )}
                    </div>

                    {/* Huy hiệu đã đạt */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200/70 shadow-2xs space-y-3">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                        <Award size={14} className="text-purple-600" /> Huy hiệu đã đạt ({drawerData?.badges_earned?.length || 0})
                      </h4>
                      {drawerData?.badges_earned && drawerData.badges_earned.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {drawerData.badges_earned.map((b: any, idx: number) => (
                            <div key={idx} className="p-2 rounded-xl bg-purple-50/40 border border-purple-100 flex items-center gap-2 text-xs">
                              <span className="text-base">{b.icon || "🏅"}</span>
                              <div className="truncate">
                                <span className="font-bold text-purple-900 block truncate">{b.badge_name || b.name || "Huy hiệu"}</span>
                                <span className="text-[10px] text-purple-600/70 block truncate">{b.earned_at ? b.earned_at.substring(0, 10) : ""}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 py-3 text-center">Chưa có huy hiệu nào.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
                <button
                  onClick={() => {
                    handleEditClick(drawerUser);
                    handleCloseDrawer();
                  }}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Edit size={14} /> Chỉnh sửa tài khoản
                </button>
                <button
                  onClick={handleCloseDrawer}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassesTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [classes, setClasses] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formClass, setFormClass] = useState({ name: '', teacher_name: '', students_count: 0 });

  const fetchClasses = async () => {
    if (!token) return;
    try { 
      const res = await authFetch(`${API_URL}/admin/classes`); 
      if (!res.ok) {
        console.error('Fetch classes error:', res.status, await res.text());
        return;
      }
      const data = await res.json(); 
      setClasses(Array.isArray(data) ? data : []); 
    } catch (e) { 
      console.error('Fetch classes exception:', e); 
    }
  };

  useEffect(() => {
    fetchClasses();

    const interval = setInterval(() => {
      fetchClasses();
    }, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchClasses();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [token]);

  const handleSave = async () => {
    if (!formClass.name || !formClass.teacher_name) return showAlert("Điền đủ thông tin!", 'warning');
    if (!token) return showAlert("Vui lòng đăng nhập lại!", 'warning');
    const url = isEditing ? `${API_URL}/admin/classes/${isEditing}` : `${API_URL}/admin/classes`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const res = await authFetch(url, { 
        method, 
        body: JSON.stringify(formClass) 
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Lỗi không xác định' }));
        showAlert(err.detail || 'Lỗi khi lưu', 'error');
        return;
      }
      showAlert('Lưu thành công!', 'success');
    } catch (e) {
      showAlert('Lỗi kết nối: ' + (e as Error).message, 'error');
    }
    resetForm();
    fetchClasses();
  };

  const handleEdit = (c: any) => {
    setIsEditing(c.id);
    setFormClass({ name: c.name, teacher_name: c.teacher_name, students_count: c.students_count || 0 });
  };

  const handleDelete = async (id: number) => {
    if (!token) return showAlert("Vui lòng đăng nhập lại!", 'warning');
    if (!(await showConfirm("Xoá lớp này?"))) return;
    try {
      const res = await authFetch(`${API_URL}/admin/classes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        showAlert('Lỗi khi xóa', 'error');
        return;
      }
      fetchClasses();
    } catch (e) {
      showAlert('Lỗi kết nối', 'error');
    }
  };

  const resetForm = () => { setIsEditing(null); setFormClass({ name: '', teacher_name: '', students_count: 0 }); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <div className="app-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'Sửa Lớp Học' : 'Tạo Lớp Học Mới'}</h2>
          {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>
        <div className="space-y-3">
          <input type="text" value={formClass.name} onChange={e => setFormClass({ ...formClass, name: e.target.value })} placeholder="Tên Lớp (VD: IELTS Căn bản)" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <input type="text" value={formClass.teacher_name} onChange={e => setFormClass({ ...formClass, teacher_name: e.target.value })} placeholder="Tên Giáo viên phụ trách" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <input type="number" value={formClass.students_count} onChange={e => setFormClass({ ...formClass, students_count: parseInt(e.target.value) || 0 })} placeholder="Sĩ số" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <button onClick={handleSave} className="w-full py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-dark)] transition">
            {isEditing ? <><Check size={18} className="inline mr-1" /> Lưu thay đổi</> : '+ Thêm Lớp Này'}
          </button>
        </div>
      </div>

      <div className="app-card p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Lớp</h2>
        <ul className="space-y-3 max-h-[500px] overflow-y-auto">
          {classes.length === 0 && <p className="text-gray-400 text-sm">Chưa có lớp nào.</p>}
          {classes.map((c: any) => (
            <li key={c.id} className="p-3 border rounded-xl flex justify-between items-center bg-gray-50">
              <div>
                <p className="font-bold text-purple-700">{c.name}</p>
                <p className="text-xs text-gray-500">GV: {c.teacher_name} | Sĩ số: {c.students_count || 0}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(c)} className="text-blue-500 bg-blue-50 p-1.5 rounded hover:bg-blue-100"><Edit size={16} /></button>
                <button onClick={() => handleDelete(c.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LessonsTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [lessons, setLessons] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formLesson, setFormLesson] = useState({ class_id: '', title: '', content: '' });
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  const [exerciseType, setExerciseType] = useState('mixed');
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGenerateExercise = async () => {
    if (!file) return showAlert("Vui lòng đính kèm file trước tiên!", 'warning');
    setGeneratingAI(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("exercise_type", exerciseType);
      fd.append("num_questions", "5");

      const res = await authFetch(`${API_URL}/teacher/file/generate-assignment`, {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.result || json;
        let newContent = formLesson.content + (formLesson.content ? "\n\n" : "") + "--- BÀI TẬP AI TẠO ---\n";
        if (data.vocabulary && data.vocabulary.length > 0) {
          newContent += "* Từ vựng trọng tâm:\n";
          data.vocabulary.forEach((v: any) => { newContent += `- ${v.word} (${v.pos}): ${v.meaning_vn}\n`; });
        }
        if (data.quiz && data.quiz.length > 0) {
          newContent += "\n* Trắc nghiệm:\n";
          data.quiz.forEach((q: any, i: number) => {
            newContent += `Câu ${i + 1}: ${q.question || q.q}\n`;
            (q.options || []).forEach((opt: string, j: number) => {
              newContent += `  ${String.fromCharCode(65 + j)}. ${opt}\n`;
            });
            const correctIdx = q.correct_answer ?? q.ans;
            if (correctIdx !== undefined) newContent += `=> Đáp án: ${String.fromCharCode(65 + correctIdx)}\n\n`;
          });
        }
        setFormLesson({ ...formLesson, content: newContent });
        showAlert("Tạo bài tập thành công! Kéo xuống để xem nội dung đã được tự động thêm vào.", 'success');
      } else showAlert("Lỗi tạo bài tập AI", 'error');
    } catch (e) { showAlert("Lỗi kết nối", 'error'); }
    finally { setGeneratingAI(false); }
  };

  const fetchLessons = async () => {
    try { const res = await authFetch(`${API_URL}/admin/lessons`); if (!res.ok) throw new Error(`API error ${res.status}`); const data = await res.json(); setLessons(Array.isArray(data) ? data : []); } catch { }
  };
  const fetchClasses = async () => {
    try { const res = await authFetch(`${API_URL}/admin/classes`); if (!res.ok) throw new Error(`API error ${res.status}`); const data = await res.json(); setClasses(Array.isArray(data) ? data : []); } catch { }
  };

  useEffect(() => {
    fetchLessons();
    fetchClasses();

    const interval = setInterval(() => {
      fetchLessons();
      fetchClasses();
    }, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchLessons();
        fetchClasses();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleSave = async () => {
    if (!formLesson.class_id || !formLesson.title) return showAlert("Hãy chọn lớp và nhập tên bài học", 'warning');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("class_id", formLesson.class_id);
      fd.append("title", formLesson.title);
      fd.append("content", formLesson.content);
      if (file) fd.append("file", file);
      const url = isEditing ? `${API_URL}/admin/lessons/${isEditing}` : `${API_URL}/admin/lessons`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
      resetForm();
      fetchLessons();
    } catch (err: any) { showAlert(err.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleEdit = (l: any) => {
    setIsEditing(l.id);
    setFormLesson({ class_id: String(l.class_id), title: l.title, content: l.content || '' });
    setFile(null);
  };

  const handleDelete = async (id: number) => {
    if (await showConfirm("Xóa bài học này?")) {
      await authFetch(`${API_URL}/admin/lessons/${id}`, { method: 'DELETE' });
      fetchLessons();
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormLesson({ class_id: '', title: '', content: '' });
    setFile(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <div className="app-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><BookOpen className="mr-2 text-orange-600" size={20} /> {isEditing ? 'Sửa Bài Học' : 'Thêm Bài Học Mới'}</h2>
          {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>
        <div className="space-y-3">
          <select value={formLesson.class_id} onChange={e => setFormLesson({ ...formLesson, class_id: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
            <option value="">-- Chọn Lớp --</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={formLesson.title} onChange={e => setFormLesson({ ...formLesson, title: e.target.value })} placeholder="Tiêu đề bài học" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <textarea value={formLesson.content} onChange={e => setFormLesson({ ...formLesson, content: e.target.value })} placeholder="Nội dung tóm tắt..." className="w-full border rounded-lg p-2 outline-none focus:ring-2 h-24" />
          <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-orange-400 hover:bg-orange-50 transition">
            <input type="file" className="hidden" id="lesson-file" onChange={e => { if (e.target.files) setFile(e.target.files[0]); }} />
            <label htmlFor="lesson-file" className="cursor-pointer text-gray-500 flex flex-col items-center text-sm">
              <UploadCloud size={28} className={file ? "text-orange-600" : ""} />
              <span className="mt-1 font-medium">{file ? file.name : "Đính kèm file (tuỳ chọn)"}</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select value={exerciseType} onChange={e => setExerciseType(e.target.value)} className="border rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 flex-grow">
              <option value="mixed">Bài tập hỗn hợp cơ bản</option>
              <option value="toeic reading part 5, part 6 format">Bài tập định dạng TOEIC</option>
              <option value="ielts reading short answer format">Bài tập định dạng IELTS</option>
            </select>
            <button onClick={handleGenerateExercise} disabled={generatingAI || !file} className="bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center whitespace-nowrap">
              <Sparkles size={16} className="mr-1" /> {generatingAI ? "Đang tạo..." : "AI Tạo Bài Tập"}
            </button>
          </div>

          <button onClick={handleSave} disabled={uploading} className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition mt-2">
            {uploading ? "Đang lưu..." : isEditing ? <><Check size={18} className="inline mr-1" /> Lưu thay đổi</> : "+ Thêm Bài Học"}
          </button>
        </div>
      </div>

      <div className="app-card p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Bài học</h2>
        <ul className="space-y-3 max-h-[500px] overflow-y-auto">
          {lessons.length === 0 && <p className="text-gray-400 text-sm">Chưa có bài học nào.</p>}
          {lessons.map((l: any) => (
            <li key={l.id} className="p-3 border rounded-xl bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-orange-700">{l.title}</p>
                  <p className="text-xs text-gray-500">Lớp: {l.class_name || classes.find((c: any) => c.id === l.class_id)?.name || 'N/A'}</p>
                  {l.content && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{l.content}</p>}
                  {l.file_name && (
                    <a href={`${API_URL}/admin/lessons/${l.id}/file`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-xs text-[var(--brand)] hover:underline">
                      <FileSpreadsheet size={14} className="mr-1" /> {l.file_name}
                    </a>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => handleEdit(l)} className="text-blue-500 bg-blue-50 p-1.5 rounded hover:bg-blue-100"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(l.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function VocabTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [words, setWords] = useState<any[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [loadingWords, setLoadingWords] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Edit / Create single word
  const [editingWord, setEditingWord] = useState<string | null>(null); // null = not editing, '' = creating new
  const [formWord, setFormWord] = useState({ word: '', pronunciation: '', meaning: '', level: 'A1', type: 'noun', example: '' });
  const [savingWord, setSavingWord] = useState(false);

  const fetchWords = async (level = filterLevel, skip = page * PAGE_SIZE, searchQ = search) => {
    setLoadingWords(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
      if (level) params.set('level', level);
      if (searchQ) params.set('search', searchQ);
      const res = await authFetch(`${API_URL}/admin/vocab/list?${params}`);
      const data = await res.json();
      setWords(data.words || []);
      setTotalWords(data.total || 0);
    } catch { setWords([]); setTotalWords(0); }
    finally { setLoadingWords(false); }
  };

  useEffect(() => { fetchWords(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await authFetch(`${API_URL}/admin/vocab/import`, { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Upload failed");
      showAlert(result.message, 'success');
      setFile(null);
      fetchWords();
    } catch (err: any) { showAlert("Lỗi: " + err.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleDeleteWord = async (word: string) => {
    if (!(await showConfirm(`Xoá từ "${word}"?`))) return;
    console.log("[DEBUG] Starting delete word operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/admin/vocab/${encodeURIComponent(word)}`, { method: 'DELETE' });
      if (res.ok) {
        console.log(`[DEBUG] Delete word successful in ${Date.now() - startTime}ms`);
        fetchWords();
      } else {
        console.error(`[DEBUG] Delete word failed with status ${res.status}: ${await res.text()}`);
        showAlert('Lỗi xoá từ', 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Delete word error in ${Date.now() - startTime}ms:`, e);
      showAlert('Lỗi kết nối', 'error');
    }
  };

  const handleFilterChange = (level: string) => {
    setFilterLevel(level);
    setPage(0);
    fetchWords(level, 0, search);
  };

  const handleSearch = () => {
    setPage(0);
    fetchWords(filterLevel, 0, search);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchWords(filterLevel, newPage * PAGE_SIZE, search);
  };

  const handleEditWord = (w: any) => {
    setEditingWord(w.word);
    setFormWord({ word: w.word, pronunciation: w.pronunciation || '', meaning: w.meaning || '', level: w.level || 'A1', type: w.type || 'noun', example: w.example || '' });
  };

  const handleNewWord = () => {
    setEditingWord('');
    setFormWord({ word: '', pronunciation: '', meaning: '', level: 'A1', type: 'noun', example: '' });
  };

  const handleSaveWord = async () => {
    console.log("[DEBUG] Starting save word operation");
    const startTime = Date.now();
    if (!formWord.word) return showAlert("Nhập từ vựng!", 'warning');
    setSavingWord(true);
    try {
      const isNew = editingWord === '';
      const url = isNew ? `${API_URL}/admin/vocab` : `${API_URL}/admin/vocab/${encodeURIComponent(editingWord!)}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await authFetch(url, { method, body: JSON.stringify(formWord) });
      if (!res.ok) {
        const e = await res.json();
        console.error(`[DEBUG] Save word failed with status ${res.status}: ${JSON.stringify(e)}`);
        throw new Error(e.detail || 'Error');
      }
      console.log(`[DEBUG] Save word successful in ${Date.now() - startTime}ms`);
      setEditingWord(null);
      setFormWord({ word: '', pronunciation: '', meaning: '', level: 'A1', type: 'noun', example: '' });
      fetchWords();
    } catch (err: any) {
      console.error(`[DEBUG] Save word error in ${Date.now() - startTime}ms:`, err);
      showAlert(err.message, 'error');
    }
    finally { setSavingWord(false); }
  };

  const totalPages = Math.ceil(totalWords / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Upload + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="app-card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><FileSpreadsheet className="mr-2 text-[var(--brand)]" /> Nhập Nhanh (CSV)</h2>
          <p className="text-sm text-gray-500 mb-4">Upload file thêm hàng loạt từ vựng vào Neo4j Graph Database.</p>
          <div className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition">
            <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
            <label htmlFor="file-upload" className="cursor-pointer text-gray-500 flex flex-col items-center">
              {file ? <FileSpreadsheet size={40} className="text-[var(--brand)] mb-2" /> : <UploadCloud size={40} className="mb-2" />}
              <span className="font-medium text-gray-700">{file ? file.name : "Click chọn file .csv"}</span>
            </label>
          </div>
          <button onClick={handleUpload} disabled={!file || uploading} className="w-full mt-4 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-dark)] disabled:opacity-50 transition">{uploading ? "Đang import..." : "Bắt đầu Import"}</button>
        </div>

        <div className="app-card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Database className="mr-2 text-[var(--brand)]" /> Thống kê & Tạo từ</h2>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-[var(--brand)]">{totalWords}</p>
            <p className="text-gray-500 mt-1">từ vựng trong Neo4j</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
              <button key={level} onClick={() => handleFilterChange(level)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${filterLevel === level ? 'bg-[var(--brand)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {level || 'Tất cả'}
              </button>
            ))}
          </div>
          <button onClick={handleNewWord} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center">
            <Plus size={18} className="mr-1" /> Thêm từ vựng mới
          </button>
        </div>
      </div>

      {/* Edit / Create Form */}
      {editingWord !== null && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">{editingWord === '' ? 'Thêm Từ Vựng Mới' : `Sửa: ${editingWord}`}</h2>
            <button onClick={() => setEditingWord(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={formWord.word} onChange={e => setFormWord({ ...formWord, word: e.target.value })} placeholder="Từ vựng *" className="border rounded-lg p-2 focus:ring-2 outline-none" />
            <input value={formWord.pronunciation} onChange={e => setFormWord({ ...formWord, pronunciation: e.target.value })} placeholder="Phát âm" className="border rounded-lg p-2 focus:ring-2 outline-none" />
            <input value={formWord.meaning} onChange={e => setFormWord({ ...formWord, meaning: e.target.value })} placeholder="Nghĩa tiếng Việt" className="border rounded-lg p-2 focus:ring-2 outline-none" />
            <select value={formWord.level} onChange={e => setFormWord({ ...formWord, level: e.target.value })} className="border rounded-lg p-2 bg-white outline-none">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={formWord.type} onChange={e => setFormWord({ ...formWord, type: e.target.value })} className="border rounded-lg p-2 bg-white outline-none">
              {['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={formWord.example} onChange={e => setFormWord({ ...formWord, example: e.target.value })} placeholder="Ví dụ" className="border rounded-lg p-2 focus:ring-2 outline-none" />
          </div>
          <button onClick={handleSaveWord} disabled={savingWord} className="mt-4 px-6 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-dark)] disabled:opacity-50 transition">
            {savingWord ? 'Đang lưu...' : <><Check size={18} className="inline mr-1" /> Lưu</>}
          </button>
        </div>
      )}

      {/* Word List with search + pagination */}
      <div className="app-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><Database className="mr-2 text-[var(--brand)]" size={20} /> Danh sách Từ Vựng</h2>
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Tìm từ..." className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 w-48" />
            <button onClick={handleSearch} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200">Tìm</button>
            <button onClick={() => fetchWords()} className="text-[var(--brand)] hover:text-indigo-800 text-sm flex items-center"><RefreshCw size={14} className="mr-1" /> Làm mới</button>
          </div>
        </div>
        {loadingWords ? <p className="text-gray-400 text-sm py-4">Đang tải từ Neo4j...</p> : words.length === 0 ? <p className="text-gray-400 text-sm py-4">Không có từ vựng nào.</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-3 font-medium">Từ</th>
                    <th className="pb-3 font-medium">Phát âm</th>
                    <th className="pb-3 font-medium">Nghĩa</th>
                    <th className="pb-3 font-medium">Level</th>
                    <th className="pb-3 font-medium">Loại từ</th>
                    <th className="pb-3 font-medium">Ví dụ</th>
                    <th className="pb-3 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((w: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-semibold text-indigo-700">{w.word}</td>
                      <td className="py-3 text-gray-500">{w.pronunciation || '-'}</td>
                      <td className="py-3 text-gray-700">{w.meaning || '-'}</td>
                      <td className="py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{w.level || '-'}</span></td>
                      <td className="py-3 text-gray-500">{w.type || '-'}</td>
                      <td className="py-3 text-gray-500 max-w-[200px] truncate">{w.example || '-'}</td>
                      <td className="py-3 flex gap-1">
                        <button onClick={() => handleEditWord(w)} className="text-blue-400 hover:text-blue-600"><Edit size={15} /></button>
                        <button onClick={() => handleDeleteWord(w.word)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Trang {page + 1} / {totalPages || 1} ({totalWords} từ)</p>
              <div className="flex gap-2">
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 0} className="px-3 py-1 rounded-lg text-sm border disabled:opacity-30 hover:bg-gray-100">Trước</button>
                <button onClick={() => handlePageChange(page + 1)} disabled={page + 1 >= totalPages} className="px-3 py-1 rounded-lg text-sm border disabled:opacity-30 hover:bg-gray-100">Sau</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GrammarTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('B1');
  const [parentId, setParentId] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [expandedAdminNodes, setExpandedAdminNodes] = useState<Set<number>>(new Set());

  // Parse modal state
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseTab, setParseTab] = useState<"ai" | "local">("local");
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [localParsedQuestions, setLocalParsedQuestions] = useState<any[]>([]);
  const [localParseError, setLocalParseError] = useState<string | null>(null);
  const [localParsing, setLocalParsing] = useState(false);
  const [selectedSaveRuleId, setSelectedSaveRuleId] = useState<string>("");
  const [savingQuizzes, setSavingQuizzes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Formatting Helper
  const handleEditorCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const parseMarkdown = (text: string) => {
    if (!text) return "";
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    return text
      .replace(/###\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h3>$1</h3>')
      .replace(/##\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h2>$1</h2>')
      .replace(/#\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\|/g, '<span class="mx-2 opacity-30">|</span>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  const fetchRules = async () => {
    setLoading(true);
    try { 
      const res = await authFetch(`${API_URL}/admin/grammar`); 
      if (!res.ok) throw new Error(`API error ${res.status}`); 
      const data = await res.json(); 
      setRules(Array.isArray(data) ? data : []); 
    } catch { }
    finally { setLoading(false); }
  };

  const handleAIGenerate = async () => {
    if (!name) return showAlert("Nhập tên cấu trúc ngữ pháp trước!", 'warning');
    setGeneratingAI(true);
    try {
      const res = await authFetch(`${API_URL}/admin/grammar/ai-generate`, {
        method: "POST",
        body: JSON.stringify({ topic: name })
      });
      if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "AI failed to respond");
      }
      const data = await res.json();
      
      let description = "";
      if (typeof data === 'string') {
          description = data;
      } else if (data && typeof data === 'object') {
          description = data.description || data.content || (data.name && JSON.stringify(data)) || "AI không trả về nội dung mô tả.";
      }

      if (description && description !== "{}") {
          if (editorRef.current) {
              editorRef.current.innerHTML = parseMarkdown(description);
              if (data.name && (!name || name === "")) setName(data.name);
          }
      } else {
          throw new Error("AI trả về dữ liệu rỗng. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("[AI GENERATE ERROR]", err);
      showAlert(`Lỗi AI: ${err.message || "Không thể tạo nội dung"}`, 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSave = async () => {
    if (!name) return showAlert("Nhập tên cấu trúc ngữ pháp", 'warning');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", editorRef.current?.innerHTML || "");
      fd.append("level", level);
      fd.append("parent_id", parentId || "null");
      if (file) fd.append("file", file);
      const url = isEditing ? `${API_URL}/admin/grammar/${isEditing}` : `${API_URL}/admin/grammar`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || 'Error');
      resetForm();
      fetchRules();
      showAlert("Đã lưu thành công!", "success");
    } catch (err: any) { showAlert(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = (r: any) => {
    setIsEditing(r.id);
    setName(r.name);
    setLevel(r.level || 'B1');
    setParentId(r.parent_id ? String(r.parent_id) : '');
    setFile(null);
    setTimeout(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = r.description || '';
        }
    }, 50);
  };

  const handleDelete = async (id: number) => {
    if (!(await showConfirm("Xoá cấu trúc ngữ pháp này?"))) return;
    await authFetch(`${API_URL}/admin/grammar/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    setLevel('B1');
    setParentId('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setFile(null);
  };

  const closeParseModal = () => {
    if (parsing || localParsing) return;
    setShowParseModal(false);
    setParseError(null);
    setLocalParseError(null);
    setLocalParsedQuestions([]);
    setSavedSuccess(false);
    setParseText("");
  };

  const handleAIParse = async () => {
    if (!parseText.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await authFetch(`${API_URL}/student/grammar/parse-text`, {
        method: "POST",
        body: JSON.stringify({ text: parseText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Lỗi ${res.status}`);
      }
      const data = await res.json();
      const rawQ = Array.isArray(data) ? data : (data.questions || []);
      const validQ = (Array.isArray(rawQ) ? rawQ : []).filter((q: any) => q && (q.question || q.q));
      if (validQ.length === 0) throw new Error("Không tìm thấy câu hỏi nào trong văn bản.");
      setLocalParsedQuestions(validQ);
      setParseTab("local");
      setParseText("");
    } catch (e: any) {
      setParseError(e.message || "Lỗi khi phân tích văn bản");
    } finally {
      setParsing(false);
    }
  };

  const handleLocalParse = async () => {
    if (!parseText.trim()) return;
    setLocalParsing(true);
    setLocalParseError(null);
    setLocalParsedQuestions([]);
    setSavedSuccess(false);
    try {
      const res = await authFetch(`${API_URL}/student/grammar/parse-text-local`, {
        method: "POST",
        body: JSON.stringify({ text: parseText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Lỗi ${res.status}`);
      }
      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error("Không tìm thấy câu hỏi nào. Kiểm tra định dạng văn bản.");
      }
      setLocalParsedQuestions(data.questions);
    } catch (e: any) {
      setLocalParseError(e.message || "Lỗi phân tích");
    } finally {
      setLocalParsing(false);
    }
  };

  const saveLocalQuizzes = async () => {
    if (!selectedSaveRuleId || localParsedQuestions.length === 0) return;
    setSavingQuizzes(true);
    try {
      const res = await authFetch(`${API_URL}/student/grammar/quizzes/save`, {
        method: "POST",
        body: JSON.stringify({ rule_id: parseInt(selectedSaveRuleId), questions: localParsedQuestions }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Lỗi lưu bài tập");
      }
      const data = await res.json();
      setSavedSuccess(true);
      showAlert(`Đã lưu ${data.saved} câu hỏi vào chủ đề!`, "success");
      fetchRules();
    } catch (e: any) {
      showAlert(e.message || "Lỗi khi lưu bài tập", "error");
    } finally {
      setSavingQuizzes(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="app-card p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[var(--brand-soft)] p-3 rounded-2xl">
              <BookText className="text-[var(--brand)]" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 leading-none">Kho Ngữ Pháp (AI)</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium italic">Quản lý cấu trúc ngữ pháp hệ thống.</p>
            </div>
          </div>
          <button
            onClick={() => { setShowParseModal(true); setParseTab("local"); setLocalParsedQuestions([]); setSavedSuccess(false); }}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-sm transition-all active:scale-95 self-start sm:self-auto whitespace-nowrap"
          >
            <ClipboardPaste size={18} />
            Nhập bài tập từ đề thi
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Plus className="text-[var(--brand)]" size={24} /> 
                {isEditing ? 'Cập nhật Cấu trúc' : 'Soạn thảo Ngữ pháp mới'}
              </h3>
              {isEditing && <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-xl transition"><X size={20} /></button>}
            </div>
            
            <div className="space-y-4">
               <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Tên cấu trúc ngữ pháp</label>
                <div className="flex gap-2">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-gray-50 border-2 border-gray-200 focus:border-teal-500 rounded-xl p-3 outline-none transition-all font-bold text-base" placeholder="VD: Hiện tại tiếp diễn..." />
                  <button onClick={handleAIGenerate} disabled={generatingAI} className="px-4 py-3 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-dark)] disabled:opacity-50 transition-all font-semibold flex items-center gap-1.5 shadow-sm text-sm whitespace-nowrap">
                     {generatingAI ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
                     AI Mô tả
                  </button>
                </div>
              </div>

              {/* Level + Parent topic */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Cấp độ CEFR</label>
                  <select value={level} onChange={e => setLevel(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-500 rounded-xl p-2.5 outline-none font-bold text-sm text-gray-700">
                    {['Pre-A1','A1','A2','B1','B2','C1'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Chủ đề cha (tuỳ chọn)</label>
                  <select value={parentId} onChange={e => setParentId(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-500 rounded-xl p-2.5 outline-none font-bold text-sm text-gray-700">
                    <option value="">— Chủ đề gốc —</option>
                    {rules.filter(r => r.id !== isEditing && !r.parent_id).map((r: any) => (
                      <option key={r.id} value={String(r.id)}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">Nội dung chi tiết & Cấu trúc</label>
                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-teal-500 transition-all bg-white shadow-sm">
                    {/* Toolbar */}
                    <div className="bg-white border-b-4 border-teal-500 p-4 flex flex-wrap gap-2.5 items-center sticky top-0 z-20 shadow-md">
                        <EditorToolbarButton onClick={() => handleEditorCommand('bold')} icon={<Bold size={20}/>} tooltip="In đậm" label="Bold" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('italic')} icon={<Italic size={20}/>} tooltip="In nghiêng" label="Italic" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('underline')} icon={<Underline size={20}/>} tooltip="Gạch chân" label="Under" />
                        <div className="w-[3px] h-8 bg-gray-200 mx-2"></div>
                        <EditorToolbarButton onClick={() => handleEditorCommand('formatBlock', 'h1')} icon={<Heading1 size={20}/>} tooltip="Tiêu đề 1" label="H1" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('formatBlock', 'h2')} icon={<Heading2 size={20}/>} tooltip="Tiêu đề 2" label="H2" />
                        <div className="w-[3px] h-8 bg-gray-200 mx-2"></div>
                        <EditorToolbarButton onClick={() => handleEditorCommand('insertUnorderedList')} icon={<List size={20}/>} tooltip="Danh sách chấm" label="Bul" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('insertOrderedList')} icon={<ListOrdered size={20}/>} tooltip="Danh sách số" label="Num" />
                        <div className="w-[3px] h-8 bg-gray-200 mx-2"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase text-gray-400">Font:</span>
                            <select onChange={(e) => handleEditorCommand('fontName', e.target.value)} className="bg-white border-2 border-gray-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-teal-400 transition">
                                <option value="Inter, sans-serif">Sans</option>
                                <option value="'Roboto Slab', serif">Serif</option>
                                <option value="'Fira Code', monospace">Mono</option>
                            </select>
                        </div>
                    </div>
                    {/* Content area */}
                    <div 
                        ref={editorRef}
                        contentEditable 
                        className="min-h-[400px] p-8 outline-none rich-text max-w-none bg-white font-medium text-lg leading-relaxed"
                        spellCheck={false}
                    />
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-teal-400 hover:bg-[var(--brand-soft)]/30 transition-all group">
                <input type="file" className="hidden" id="admin-grammar-file" onChange={e => { if (e.target.files) setFile(e.target.files[0]); }} />
                <label htmlFor="admin-grammar-file" className="cursor-pointer text-gray-500 flex items-center justify-center gap-3">
                  <UploadCloud size={24} className={`transition flex-shrink-0 ${file ? "text-[var(--brand)]" : "group-hover:-translate-y-0.5"}`} />
                  <span className="font-bold text-sm">{file ? file.name : "Đính kèm tài liệu (.pdf, .docx, .png) — tối đa 10MB"}</span>
                </label>
              </div>

              <button onClick={handleSave} disabled={saving} className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-teal-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="animate-spin" size={18} /> : isEditing ? <><Save size={18} /> Lưu thay đổi</> : <Plus size={18} />}
                {saving ? "Đang xử lý..." : isEditing ? "Cập nhật" : "Tạo mới"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-fit">
          <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
            Danh sách chủ đề
            <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full">{rules.length}</span>
          </h3>
          {loading ? (
            <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : rules.length === 0 ? (
            <div className="py-12 text-center">
              <BookText size={48} className="mx-auto text-gray-100 mb-3" />
              <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Trống</p>
            </div>
          ) : (() => {
            // Build tree for admin list
            const adminMap: Record<number, any> = {};
            rules.forEach((r: any) => { adminMap[r.id] = { ...r, children: [] }; });
            const adminRoots: any[] = [];
            rules.forEach((r: any) => {
              if (r.parent_id && adminMap[r.parent_id]) adminMap[r.parent_id].children.push(adminMap[r.id]);
              else adminRoots.push(adminMap[r.id]);
            });

            const AdminRuleRow = ({ rule, depth }: { rule: any; depth: number }) => {
              const hasKids = rule.children && rule.children.length > 0;
              const isExp = expandedAdminNodes.has(rule.id);
              const CEFR_CHIP: Record<string, string> = {
                'Pre-A1': 'bg-purple-100 text-purple-700', A1: 'bg-blue-100 text-blue-700',
                A2: 'bg-cyan-100 text-cyan-700', B1: 'bg-green-100 text-green-700',
                B2: 'bg-yellow-100 text-yellow-700', C1: 'bg-orange-100 text-orange-700',
              };
              return (
                <div className={depth > 0 ? "ml-4 border-l-2 border-gray-100 pl-2 mt-1" : ""}>
                  <li className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-teal-200 transition-all group list-none">
                    <div className="flex items-start gap-2">
                      {hasKids ? (
                        <button onClick={() => setExpandedAdminNodes(prev => { const s = new Set(prev); s.has(rule.id) ? s.delete(rule.id) : s.add(rule.id); return s; })}
                          className="mt-0.5 text-gray-400 hover:text-[var(--brand)] flex-shrink-0 transition">
                          {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : <div className="w-3.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CEFR_CHIP[rule.level] || 'bg-gray-100 text-gray-500'}`}>{rule.level || 'B1'}</span>
                          {hasKids && <span className="text-[9px] text-gray-400 font-bold">{rule.children.length} con</span>}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-[var(--brand)] transition-colors">{rule.name}</p>
                        {rule.file_name && (
                          <a href={`${API_URL}/admin/grammar/${rule.id}/file`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center mt-0.5 text-[10px] text-indigo-500 font-semibold hover:underline gap-0.5">
                            <FileSpreadsheet size={10} /> {rule.file_name}
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => handleEdit(rule)} className="text-blue-500 bg-white p-1.5 rounded-lg shadow-sm hover:shadow-md transition"><Edit size={13} /></button>
                        <button onClick={() => handleDelete(rule.id)} className="text-red-500 bg-white p-1.5 rounded-lg shadow-sm hover:shadow-md transition"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </li>
                  {hasKids && isExp && rule.children.map((ch: any) => <AdminRuleRow key={ch.id} rule={ch} depth={depth + 1} />)}
                </div>
              );
            };

            return (
              <ul className="space-y-1.5 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
                {adminRoots.map((r: any) => <AdminRuleRow key={r.id} rule={r} depth={0} />)}
              </ul>
            );
          })()}
        </div>
      </div>

      {/* ── Parse Modal ── */}
      {showParseModal && (
        <div className="fixed inset-0 !mt-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeParseModal} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl rounded-t-[var(--r-2xl)] sm:rounded-[var(--r-2xl)] shadow-[var(--sh-lg)] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-2xl"><ClipboardPaste size={22} className="text-orange-600" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Nhập bài tập từ đề thi</h3>
                  <p className="text-xs text-gray-400 font-bold">Trích xuất câu hỏi & đáp án từ văn bản, lưu vào kho ngữ pháp</p>
                </div>
              </div>
              <button onClick={closeParseModal} disabled={parsing || localParsing}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition disabled:opacity-40">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
              <button onClick={() => { setParseTab("ai"); setLocalParsedQuestions([]); }}
                className={`pb-3 pt-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${parseTab === "ai" ? "border-teal-500 text-teal-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                <Sparkles size={15} /> AI Phân tích <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">3 credits</span>
              </button>
              <button onClick={() => { setParseTab("local"); setLocalParsedQuestions([]); setSavedSuccess(false); }}
                className={`pb-3 pt-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${parseTab === "local" ? "border-orange-500 text-orange-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                <ListChecks size={15} /> Phân tích thông minh <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Miễn phí</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {parseTab === "ai" ? (
                <>
                  <div className="bg-[var(--brand-soft)] border border-teal-100 rounded-2xl p-4 text-sm text-teal-700 font-medium">
                    <p className="font-semibold mb-1">Cách sử dụng:</p>
                    <ul className="space-y-1 text-xs opacity-80">
                      <li>• Copy đoạn văn bản từ file PDF/Word chứa câu hỏi trắc nghiệm</li>
                      <li>• Dán vào ô bên dưới và nhấn <strong>Phân tích</strong></li>
                      <li>• AI sẽ tự động nhận biết câu hỏi, đáp án A/B/C/D và đáp án đúng</li>
                      <li>• Tốn <strong>3 AI credits</strong> mỗi lần phân tích · Admin có thể lưu kết quả vào kho ngữ pháp</li>
                    </ul>
                  </div>
                  <textarea
                    value={parseText}
                    onChange={e => setParseText(e.target.value)}
                    placeholder={"Dán văn bản đề thi vào đây...\n\nVí dụ:\n1. She _____ (go) to school every day.\nA. goes   B. go   C. went   D. going\n\nAnswer key: 1-A"}
                    disabled={parsing}
                    rows={10}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-400 rounded-2xl p-4 outline-none text-sm font-mono text-gray-700 resize-y transition-all disabled:opacity-60"
                  />
                  {parseError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <p className="font-medium">{parseError}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{parseText.length} / 12,000 ký tự</span>
                    <span className="font-bold text-[var(--brand)]">3 credits</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-orange-700 font-medium">
                    <p className="font-semibold mb-1">Phân tích thông minh — không cần AI:</p>
                    <ul className="space-y-1 text-xs opacity-80">
                      <li>• Hệ thống tự nhận diện câu hỏi theo số thứ tự (1. 2. 3. ...)</li>
                      <li>• Tự phát hiện đáp án A. B. C. D. và đáp án đúng</li>
                      <li>• Hỗ trợ bảng đáp án ở cuối (ví dụ: 1-A, 2-C, 3-B)</li>
                      <li>• <strong>Miễn phí</strong> · Admin có thể <strong>lưu bài tập vào chủ đề</strong> để học sinh luyện tập</li>
                    </ul>
                  </div>

                  {localParsedQuestions.length === 0 ? (
                    <>
                      <textarea
                        value={parseText}
                        onChange={e => setParseText(e.target.value)}
                        placeholder={"Dán văn bản đề thi vào đây...\n\nVí dụ:\n1. She _____ to school every day.\nA. goes\nB. go\nC. went\nD. going\n\n2. Which is correct?\nA. He don't like coffee.\nB. He doesn't likes coffee.\nC. He doesn't like coffee.\nD. He not like coffee.\n\nAnswer key: 1-A, 2-C"}
                        disabled={localParsing}
                        rows={10}
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-400 rounded-2xl p-4 outline-none text-sm font-mono text-gray-700 resize-y transition-all disabled:opacity-60"
                      />
                      {localParseError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">
                          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                          <p className="font-medium">{localParseError}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{parseText.length} / 20,000 ký tự</span>
                        <span className="font-bold text-green-600">Miễn phí</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5"><Eye size={14} className="text-[var(--brand)]" /> {localParsedQuestions.length} câu hỏi</p>
                        <button onClick={() => { setLocalParsedQuestions([]); setSavedSuccess(false); }}
                          className="text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1"><X size={11} /> Nhập lại</button>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {localParsedQuestions.map((q: any, i: number) => (
                          <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="font-semibold text-gray-900 text-xs mb-1.5">{i + 1}. {q.question}</p>
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-2 gap-1 mb-1">
                                {q.options.map((opt: string, j: number) => (
                                  <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded-lg font-bold ${opt === q.answer ? "bg-green-100 text-green-700 border border-green-200" : "bg-white text-gray-500 border border-gray-100"}`}>
                                    {opt === q.answer && "✓ "}{opt}
                                  </span>
                                ))}
                              </div>
                            )}
                            {q.answer && <p className="text-[10px] font-semibold text-[var(--brand)]">Đáp án: {q.answer}</p>}
                          </div>
                        ))}
                      </div>

                      {!savedSuccess ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <p className="font-semibold text-blue-900 text-xs mb-2 flex items-center gap-1.5"><Save size={13} /> Lưu vào chủ đề ngữ pháp</p>
                          <div className="flex gap-2">
                            <select value={selectedSaveRuleId} onChange={e => setSelectedSaveRuleId(e.target.value)}
                              className="flex-1 bg-white border-2 border-blue-200 rounded-lg px-2 py-1.5 outline-none font-bold text-gray-700 text-xs focus:border-blue-400">
                              <option value="">-- Chọn chủ đề --</option>
                              {rules.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.level || 'B1'})</option>)}
                            </select>
                            <button onClick={saveLocalQuizzes} disabled={!selectedSaveRuleId || savingQuizzes}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold text-xs hover:bg-blue-700 transition disabled:opacity-40 flex items-center gap-1 flex-shrink-0">
                              {savingQuizzes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 font-semibold text-xs">
                          <CheckCircle2 size={14} /> Đã lưu thành công!
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 flex gap-2">
              {parseTab === "ai" && localParsedQuestions.length === 0 ? (
                <>
                  <button onClick={closeParseModal} disabled={parsing}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40">Hủy</button>
                  <button onClick={handleAIParse} disabled={parsing || !parseText.trim()}
                    className="flex-1 sm:flex-none sm:px-8 py-2.5 rounded-xl font-semibold text-sm text-white bg-teal-600 hover:bg-teal-700 transition flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40">
                    {parsing ? <><Loader2 size={15} className="animate-spin" /> Đang phân tích...</> : <><Sparkles size={15} /> Phân tích ngay</>}
                  </button>
                </>
              ) : parseTab === "local" && localParsedQuestions.length === 0 ? (
                <>
                  <button onClick={closeParseModal} disabled={localParsing}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40">Hủy</button>
                  <button onClick={handleLocalParse} disabled={localParsing || !parseText.trim()}
                    className="flex-1 sm:flex-none sm:px-8 py-2.5 rounded-xl font-semibold text-sm text-white bg-orange-500 hover:bg-orange-600 transition flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40">
                    {localParsing ? <><Loader2 size={15} className="animate-spin" /> Đang phân tích...</> : <><ListChecks size={15} /> Phân tích ngay</>}
                  </button>
                </>
              ) : (
                <button onClick={closeParseModal}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition">Đóng</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-component for Toolbar Buttons
function EditorToolbarButton({ onClick, icon, tooltip, label }: { onClick: () => void, icon: React.ReactNode, tooltip: string, label?: string }) {
    return (
        <button 
            type="button"
            onMouseDown={(e) => { 
                e.preventDefault(); 
                onClick(); 
            }}
            className="px-3 py-2 bg-white hover:bg-[var(--brand-soft)] text-gray-900 border-2 border-gray-100 hover:border-teal-400 rounded-xl transition shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 min-w-[50px] justify-center"
            title={tooltip}
        >
            {icon}
            {label && <span className="text-[10px] font-semibold uppercase tracking-widest hidden lg:inline">{label}</span>}
        </button>
    );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingNeo4j, setTestingNeo4j] = useState(false);
  const [testingGeminiModels, setTestingGeminiModels] = useState(false);
  const [geminiModelsOutput, setGeminiModelsOutput] = useState("");
  const [showGeminiModelsModal, setShowGeminiModelsModal] = useState(false);
  const [copiedGeminiModels, setCopiedGeminiModels] = useState(false);
  const [testingCohereModels, setTestingCohereModels] = useState(false);
  const [cohereModelsOutput, setCohereModelsOutput] = useState("");
  const [showCohereModelsModal, setShowCohereModelsModal] = useState(false);
  const [copiedCohereModels, setCopiedCohereModels] = useState(false);
  const { token, authFetch } = useAuth();
  const { showAlert } = useNotification();

  const fetchSettings = async () => {
    try {
      // FIXED: include Bearer token — admin routes require authentication
      const res = await authFetch(`${API_URL}/admin/settings`);
      if (res.ok) {
        setSettings(await res.json());
      } else if (res.status === 401 || res.status === 403) {
        console.error('Settings fetch: unauthorized. Check admin token.');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // FIXED: include Bearer token
      const res = await authFetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(`Đã lưu ${data.updated_keys?.length || 0} cài đặt. Neo4j: ${data.neo4j_status}`, 'success');
        fetchSettings();
      } else {
        showAlert(data.detail || 'Lỗi khi lưu cài đặt', 'error');
      }
    } catch (err) { showAlert('Lỗi kết nối tới server', 'error'); }
    finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      // FIXED: include Bearer token
      const res = await authFetch(`${API_URL}/admin/settings/test-email`, { method: 'POST' });
      const data = await res.json();
      const steps = data.steps ? '\n' + data.steps.join('\n') : '';
      if (data.success) {
        showAlert(`✅ ${data.message}${steps}`, 'success');
      } else {
        showAlert(`❌ ${data.error || 'Email test failed'}${steps}`, 'error');
      }
    } catch { showAlert('Lỗi kết nối', 'error'); }
    finally { setTestingEmail(false); }
  };

  const handleTestNeo4j = async () => {
    setTestingNeo4j(true);
    try {
      // FIXED: include Bearer token
      const res = await authFetch(`${API_URL}/admin/settings/test-neo4j`, { method: 'POST' });
      const data = await res.json();
      showAlert(res.ok ? data.message : (data.detail || 'Neo4j connection failed'), res.ok ? 'success' : 'error');
    } catch { showAlert('Lỗi kết nối', 'error'); }
    finally { setTestingNeo4j(false); }
  };

  const handleListGeminiModels = async () => {
    setTestingGeminiModels(true);
    setCopiedGeminiModels(false);
    try {
      const res = await authFetch(`${API_URL}/admin/settings/gemini-models`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.detail || 'Khong the lay danh sach Gemini models', 'error');
        return;
      }
      setGeminiModelsOutput(data.formatted_output || '');
      setShowGeminiModelsModal(true);
    } catch {
      showAlert('Loi ket noi toi server', 'error');
    } finally {
      setTestingGeminiModels(false);
    }
  };

  const handleCopyGeminiModels = async () => {
    try {
      await navigator.clipboard.writeText(geminiModelsOutput);
      setCopiedGeminiModels(true);
      setTimeout(() => setCopiedGeminiModels(false), 2000);
    } catch {
      showAlert('Khong the copy ket qua', 'error');
    }
  };

  const handleListCohereModels = async () => {
    setTestingCohereModels(true);
    setCopiedCohereModels(false);
    try {
      const res = await authFetch(`${API_URL}/admin/settings/cohere-models`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.detail || 'Khong the lay danh sach Cohere models', 'error');
        return;
      }
      setCohereModelsOutput(data.formatted_output || '');
      setShowCohereModelsModal(true);
    } catch {
      showAlert('Loi ket noi toi server', 'error');
    } finally {
      setTestingCohereModels(false);
    }
  };

  const handleCopyCohereModels = async () => {
    try {
      await navigator.clipboard.writeText(cohereModelsOutput);
      setCopiedCohereModels(true);
      setTimeout(() => setCopiedCohereModels(false), 2000);
    } catch {
      showAlert('Khong the copy ket qua', 'error');
    }
  };

  const toggleShow = (key: string) => setShowPasswords(p => ({ ...p, [key]: !p[key] }));

  const sensitiveKeys = ['GOOGLE_API_KEY', 'OPENAI_API_KEY', 'COHERE_API_KEY', 'NEO4J_PASSWORD', 'SMTP_PASSWORD', 'RESEND_API_KEY', 'BREVO_API_KEY'];

  const renderField = (key: string, label: string, placeholder: string) => {
    const isSensitive = sensitiveKeys.includes(key);
    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          <input
            type={isSensitive && !showPasswords[key] ? "password" : "text"}
            value={settings[key] || ''}
            onChange={e => setSettings({ ...settings, [key]: e.target.value })}
            className="w-full border border-gray-200 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            placeholder={placeholder}
          />
          {isSensitive && (
            <button type="button" onClick={() => toggleShow(key)} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
              {showPasswords[key] ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <p className="text-gray-500">Loading settings...</p>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* AI API Keys */}
      <div className="app-card p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Settings className="mr-2 text-[var(--brand)]" size={20} /> API Keys (AI)
          </h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleListGeminiModels} disabled={testingGeminiModels} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 flex items-center">
              <Sparkles size={14} className={`mr-1.5 ${testingGeminiModels ? 'animate-pulse' : ''}`} /> {testingGeminiModels ? 'Dang lay Gemini...' : 'List Gemini models'}
            </button>
            <button onClick={handleListCohereModels} disabled={testingCohereModels} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 disabled:opacity-50 flex items-center">
              <Sparkles size={14} className={`mr-1.5 ${testingCohereModels ? 'animate-pulse' : ''}`} /> {testingCohereModels ? 'Dang lay Cohere...' : 'List Cohere models'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('GOOGLE_API_KEY', 'Google Gemini API Key', 'AIzaSy...')}
          {renderField('OPENAI_API_KEY', 'OpenAI API Key (optional)', 'sk-...')}
          {renderField('COHERE_API_KEY', 'Cohere API Key (optional)', 'c4-...')}
        </div>
      </div>

      {/* Neo4j */}
      <div className="app-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Database className="mr-2 text-[var(--brand)]" size={20} /> Neo4j Graph Database
          </h2>
          <button onClick={handleTestNeo4j} disabled={testingNeo4j} className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 flex items-center">
            <RefreshCw size={14} className={`mr-1.5 ${testingNeo4j ? 'animate-spin' : ''}`} /> {testingNeo4j ? 'Testing...' : 'Test connection'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('NEO4J_URI', 'Neo4j URI', 'neo4j+s://xxx.databases.neo4j.io')}
          {renderField('NEO4J_USERNAME', 'Username', 'neo4j')}
          {renderField('NEO4J_PASSWORD', 'Password', '***')}
          {renderField('NEO4J_DATABASE', 'Database Name (empty = username)', '')}
        </div>
      </div>

      {/* Email Configuration */}
      <div className="app-card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Mail className="mr-2 text-[var(--brand)]" size={20} /> Email Configuration
          </h2>
          <button onClick={handleTestEmail} disabled={testingEmail} className="px-4 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 flex items-center">
            <Mail size={14} className="mr-1.5" /> {testingEmail ? 'Sending...' : 'Send test email'}
          </button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          <strong>Lưu ý:</strong> Render free tier chặn SMTP (port 587/465). Dùng <strong>Brevo</strong> (300 email/ngày miễn phí, gửi được đến bất kỳ ai).
          Đăng ký tại <a href="https://app.brevo.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">brevo.com</a> → SMTP & API → API Keys.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Provider</label>
            <select
              value={settings['EMAIL_PROVIDER'] || 'auto'}
              onChange={e => setSettings({ ...settings, EMAIL_PROVIDER: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
            >
              <option value="auto">Auto (Brevo → Resend → SMTP)</option>
              <option value="brevo">Brevo (recommended - gửi đến bất kỳ ai)</option>
              <option value="resend">Resend (chỉ gửi đến chủ tài khoản nếu free)</option>
              <option value="smtp">SMTP only (chỉ hoạt động local)</option>
            </select>
          </div>
          {renderField('BREVO_API_KEY', 'Brevo API Key', 'xkeysib-xxxxxxxx')}
          {renderField('RESEND_API_KEY', 'Resend API Key (backup)', 're_xxxxxxxx')}
          {renderField('SENDER_EMAIL', 'Sender Email', 'your@gmail.com')}
          <div className="md:col-span-2"><hr className="border-gray-200" /></div>
          {renderField('SMTP_SERVER', 'SMTP Server', 'smtp.gmail.com')}
          {renderField('SMTP_PORT', 'SMTP Port', '587')}
          {renderField('SMTP_USERNAME', 'SMTP Username', 'your@gmail.com')}
          {renderField('SMTP_PASSWORD', 'SMTP App Password', '***')}
        </div>
      </div>

      {/* Frontend URL */}
      <div className="app-card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Settings className="mr-2 text-[var(--brand)]" size={20} /> Frontend URL
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {renderField('FRONTEND_URL', 'Frontend URL (for password reset links)', 'https://your-app.vercel.app')}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-[var(--brand)] text-white rounded-xl font-medium hover:bg-[var(--brand-dark)] disabled:opacity-50 transition shadow-lg flex items-center">
          <Save size={18} className="mr-2" /> {saving ? 'Saving...' : 'Save all settings'}
        </button>
      </div>

      {showGeminiModelsModal && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowGeminiModelsModal(false)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-[var(--sh-lg)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Sparkles size={18} className="mr-2 text-[var(--brand)]" /> Gemini Models
              </h3>
              <button onClick={() => setShowGeminiModelsModal(false)} className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto bg-slate-950 px-6 py-5">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-cyan-100">
                {geminiModelsOutput || 'Khong co du lieu'}
              </pre>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={handleCopyGeminiModels} className={`min-w-[140px] rounded-lg px-4 py-2.5 text-sm font-bold transition ${copiedGeminiModels ? 'bg-green-100 text-green-700' : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]'}`}>
                {copiedGeminiModels ? <><Check size={16} className="mr-2 inline" />Da copy</> : <><Copy size={16} className="mr-2 inline" />Copy ket qua</>}
              </button>
              <button onClick={() => setShowGeminiModelsModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Dong
              </button>
            </div>
          </div>
        </div>
      )}

      {showCohereModelsModal && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowCohereModelsModal(false)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-[var(--sh-lg)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Sparkles size={18} className="mr-2 text-emerald-600" /> Cohere Models
              </h3>
              <button onClick={() => setShowCohereModelsModal(false)} className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto bg-slate-950 px-6 py-5">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-emerald-100">
                {cohereModelsOutput || 'Khong co du lieu'}
              </pre>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={handleCopyCohereModels} className={`min-w-[140px] rounded-lg px-4 py-2.5 text-sm font-bold transition ${copiedCohereModels ? 'bg-green-100 text-green-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                {copiedCohereModels ? <><Check size={16} className="mr-2 inline" />Da copy</> : <><Copy size={16} className="mr-2 inline" />Copy ket qua</>}
              </button>
              <button onClick={() => setShowCohereModelsModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Dong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// FEEDBACK MANAGEMENT TAB
// ==========================================
function FeedbackTab() {
  const { token, isInitialized, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  
  // Detail modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchFeedback = async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterType) params.append("feedback_type", filterType);
      
      const res = await authFetch(`${API_URL}/admin/feedback?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items || []);
      setStats(data.stats || null);
    } catch (e) {
      console.error(e);
      if (!isSilent) showAlert("Lỗi khi tải danh sách góp ý", "error");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized && token) {
      fetchFeedback();

      const interval = setInterval(() => {
        fetchFeedback(true);
      }, 5000);

      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          fetchFeedback(true);
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }
  }, [isInitialized, token, filterStatus, filterType]);

  const updateStatus = async (id: number, newStatus: string) => {
    if (!token) return;
    try {
      const res = await authFetch(`${API_URL}/admin/feedback/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showAlert("Đã cập nhật trạng thái", "success");
        fetchFeedback();
        if (selectedItem?.id === id) {
          setSelectedItem({ ...selectedItem, status: newStatus });
        }
      }
    } catch (e) {
      showAlert("Lỗi khi cập nhật trạng thái", "error");
    }
  };

  const saveAdminNote = async () => {
    if (!selectedItem || !token) return;
    setSavingNote(true);
    try {
      const res = await authFetch(`${API_URL}/admin/feedback/${selectedItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ admin_note: adminNote })
      });
      if (res.ok) {
        showAlert("Đã lưu ghi chú", "success");
        setSelectedItem({ ...selectedItem, admin_note: adminNote });
        fetchFeedback();
      }
    } catch (e) {
      showAlert("Lỗi khi lưu ghi chú", "error");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!(await showConfirm("Bạn có chắc muốn xoá phản hồi này không?"))) return;
    try {
      const res = await authFetch(`${API_URL}/admin/feedback/${id}`, { method: "DELETE" });
      if (res.ok) {
        showAlert("Đã xoá phản hồi", "success");
        if (selectedItem?.id === id) setSelectedItem(null);
        fetchFeedback();
      }
    } catch (e) {
      showAlert("Lỗi khi xoá", "error");
    }
  };

  const featureLabels: Record<string, string> = {
    dictionary: "Tra từ điển",
    grammar: "Ngữ pháp",
    ipa: "Phát âm IPA",
    practice: "Luyện thi",
    "ai-tools": "Công cụ AI",
    vocabulary: "Từ vựng"
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    reviewed: "bg-blue-100 text-blue-700 border-blue-200",
    resolved: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-gray-100 text-gray-700 border-gray-200"
  };

  const statusLabels: Record<string, string> = {
    pending: "Chờ xử lý",
    reviewed: "Đang xem xét",
    resolved: "Đã xử lý xong",
    rejected: "Từ chối"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className="p-3 bg-amber-50 rounded-xl mr-4"><MessageCircleWarning className="text-amber-500" size={24} /></div>
            <div><p className="text-sm font-medium text-gray-500">Tổng phản hồi</p><h3 className="text-2xl font-bold">{stats.total}</h3></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className="p-3 bg-red-50 rounded-xl mr-4"><Bug className="text-red-500" size={24} /></div>
            <div><p className="text-sm font-medium text-gray-500">Báo lỗi</p><h3 className="text-2xl font-bold">{stats.bugs}</h3></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className="p-3 bg-green-50 rounded-xl mr-4"><CheckCircle className="text-green-500" size={24} /></div>
            <div><p className="text-sm font-medium text-gray-500">Đã xử lý</p><h3 className="text-2xl font-bold">{stats.resolved}</h3></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className="p-3 bg-orange-50 rounded-xl mr-4"><Lightbulb className="text-orange-500" size={24} /></div>
            <div><p className="text-sm font-medium text-gray-500">Góp ý</p><h3 className="text-2xl font-bold">{stats.suggestions}</h3></div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="app-card overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* List Section */}
        <div className="w-full md:w-1/2 lg:w-2/3 border-r border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageCircleWarning size={18} className="text-amber-500" /> Danh sách phản hồi
            </h2>
            <div className="flex gap-2">
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-amber-400"
                value={filterType} onChange={e => setFilterType(e.target.value)}
              >
                <option value="">Tất cả loại</option>
                <option value="bug_report">Báo lỗi</option>
                <option value="suggestion">Góp ý</option>
              </select>
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-amber-400"
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">Tất cả TT</option>
                <option value="pending">Chờ xử lý</option>
                <option value="reviewed">Đang xem xét</option>
                <option value="resolved">Đã giải quyết</option>
              </select>
              <button onClick={() => fetchFeedback()} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition"><RefreshCw size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
            {loading ? (
              <div className="text-center p-10 text-gray-400">Đang tải dữ liệu...</div>
            ) : items.length === 0 ? (
              <div className="text-center p-10 text-gray-400">Không có phản hồi nào phù hợp.</div>
            ) : (
              items.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => { setSelectedItem(item); setAdminNote(item.admin_note || ""); }}
                  className={`bg-white p-4 rounded-xl border cursor-pointer transition shadow-sm ${selectedItem?.id === item.id ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-gray-200 hover:border-amber-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {item.feedback_type === 'bug_report' ? (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-red-200"><Bug size={10} /> Lỗi</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 border border-emerald-200"><Lightbulb size={10} /> Góp ý</span>
                      )}
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{featureLabels[item.feature] || item.feature}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${statusColors[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                  </div>
                  <p className="text-gray-900 text-sm font-medium line-clamp-2 mb-2 leading-relaxed">{item.content}</p>
                  <div className="flex justify-between items-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                    <span className="flex items-center gap-1.5"><Users size={12} /> {item.user_name || `User #${item.user_id}`}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(item.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Section */}
        <div className="w-full md:w-1/2 lg:w-1/3 bg-white flex flex-col h-full">
          {selectedItem ? (
            <>
              <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-amber-50 to-orange-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    {selectedItem.feedback_type === 'bug_report' ? <Bug className="text-red-500" size={20} /> : <Lightbulb className="text-amber-500" size={20} />}
                    Chi tiết phản hồi #{selectedItem.id}
                  </h3>
                  <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                
                <div className="flex flex-col gap-2 text-sm mt-4">
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-white">
                    <span className="text-gray-500 font-medium">Trạng thái:</span>
                    <select 
                      value={selectedItem.status}
                      onChange={(e) => updateStatus(selectedItem.id, e.target.value)}
                      className={`text-xs font-bold rounded-md px-2 py-1 outline-none border ${statusColors[selectedItem.status]}`}
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="reviewed">Đang xem xét</option>
                      <option value="resolved">Đã giải quyết</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-white">
                    <span className="text-gray-500 font-medium">Người gửi:</span>
                    <span className="font-semibold text-gray-900">{selectedItem.user_name} (ID: {selectedItem.user_id})</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-white">
                    <span className="text-gray-500 font-medium">Chức năng:</span>
                    <span className="font-semibold text-gray-900">{featureLabels[selectedItem.feature] || selectedItem.feature}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-white">
                    <span className="text-gray-500 font-medium">Thời gian:</span>
                    <span className="font-semibold text-gray-900">{new Date(selectedItem.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Nội dung người dùng gửi</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 text-sm whitespace-pre-wrap leading-relaxed shadow-inner">
                    {selectedItem.content}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide flex items-center justify-between">
                    <span>Ghi chú nội bộ (Admin)</span>
                    <button 
                      onClick={saveAdminNote}
                      disabled={savingNote || adminNote === (selectedItem.admin_note || "")}
                      className="text-xs bg-indigo-50 text-[var(--brand)] px-3 py-1 rounded-md font-semibold hover:bg-indigo-100 transition disabled:opacity-50"
                    >
                      {savingNote ? "Đang lưu..." : "Lưu ghi chú"}
                    </button>
                  </h4>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Ghi chú quá trình xử lý, nguyên nhân lỗi... (Chỉ admin xem được)"
                    className="w-full h-32 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition resize-none bg-indigo-50/20"
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={() => handleDelete(selectedItem.id)}
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} /> Xoá phản hồi này
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-400 bg-gray-50/50">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                <MessageCircleWarning size={32} className="text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-600 mb-1 text-lg">Chưa chọn phản hồi</h3>
              <p className="text-sm text-gray-400 max-w-[200px]">Chọn một phản hồi từ danh sách bên trái để xem chi tiết và xử lý.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignmentsTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({ class_id: '', title: '', description: '', type: 'quiz', due_date: '', skill_type: '', bloom_level: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [assRes, clsRes] = await Promise.all([
        authFetch(`${API_URL}/admin/assignments`),
        authFetch(`${API_URL}/admin/classes`)
      ]);
      if (assRes.ok) setAssignments(await assRes.json());
      if (clsRes.ok) setClasses(await clsRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleSave = async () => {
    if (!form.class_id || !form.title) return showAlert("Vui lòng nhập tên bài tập và chọn lớp.", 'warning');
    try {
      const res = await authFetch(`${API_URL}/admin/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(form.class_id),
          title: form.title,
          description: form.description,
          type: form.type,
          due_date: form.due_date || "2099-12-31",
          skill_type: form.skill_type || null,
          bloom_level: parseInt(form.bloom_level) || null
        })
      });
      if (res.ok) {
        showAlert("Tạo thành công!", 'success');
        setForm({ class_id: '', title: '', description: '', type: 'quiz', due_date: '', skill_type: '', bloom_level: '' });
        fetchData();
      } else {
        showAlert("Lỗi khi tạo.", 'error');
      }
    } catch (e) { showAlert("Lỗi kết nối", 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!(await showConfirm("Bạn có chắc chắn xoá?"))) return;
    try {
      await authFetch(`${API_URL}/admin/assignments/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { showAlert("Lỗi xoá", 'error'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <div className="app-card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><ClipboardList className="mr-2 text-[var(--brand)]" size={20} /> Tạo Bài tập / Đề thi</h2>
        <div className="space-y-3">
          <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
            <option value="">-- Chọn Lớp --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tên bài tập/đề thi (VD: IELTS Mock Test 1)" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kỹ năng</label>
              <select value={form.skill_type} onChange={e => setForm({ ...form, skill_type: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
                <option value="">Không phân loại</option>
                <option value="Reading">Reading</option>
                <option value="Listening">Listening</option>
                <option value="Writing">Writing</option>
                <option value="Speaking">Speaking</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mức độ Bloom</label>
              <select value={form.bloom_level} onChange={e => setForm({ ...form, bloom_level: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
                <option value="">Không xác định</option>
                <option value="1">1. Nhớ (Remember)</option>
                <option value="2">2. Hiểu (Understand)</option>
                <option value="3">3. Áp dụng (Apply)</option>
                <option value="4">4. Phân tích (Analyze)</option>
                <option value="5">5. Đánh giá (Evaluate)</option>
                <option value="6">6. Sáng tạo (Create)</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} className="w-full py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brand-dark)] transition mt-2">+ Thêm Bài Tập</button>
        </div>
      </div>
      <div className="app-card p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Tổng quát</h2>
        {loading ? <p>Đang tải...</p> : (
          <ul className="space-y-3 max-h-[500px] overflow-y-auto">
            {assignments.map(a => (
              <li key={a.id} className="p-3 border rounded-xl bg-gray-50 flex justify-between items-start">
                <div>
                  <p className="font-bold text-indigo-700">{a.title}</p>
                  <p className="text-xs text-gray-500">Lớp: {a.class_name}</p>
                  <div className="flex gap-2 mt-1">
                    {a.skill_type && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{a.skill_type}</span>}
                    {a.bloom_level && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Bloom Lvl: {a.bloom_level}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AILogsTab() {
  const { token, authFetch } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const PAGE_SIZE = 50;

  const handleCopyFeedback = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [logsRes, statsRes, healthRes] = await Promise.all([
        authFetch(`${API_URL}/admin/ai-logs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`),
        authFetch(`${API_URL}/admin/ai-stats`),
        authFetch(`${API_URL}/admin/ai-health`)
      ]);
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        setTotal(logsData.total || 0);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
    } catch (err) {
      console.error("Error fetching AI logs/stats/health:", err);
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh interval (10 seconds)
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [token, page]);

  const hasCircuitOpen = health?.providers?.some((p: any) => p.circuit_open);
  const successRate = health?.today_summary?.success_rate ?? 100;
  const isDegraded = hasCircuitOpen || successRate < 90;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Alert Banner if Degraded */}
      {isDegraded && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <div>
              <h4 className="text-sm font-bold text-red-900">Cảnh Báo: Hiệu Năng AI Bị Suy Giảm</h4>
              <p className="text-xs text-red-700 mt-0.5">
                {hasCircuitOpen 
                  ? "Có nhà cung cấp AI đã kích hoạt ngắt mạch (Circuit Breaker) do liên tiếp xảy ra sự cố." 
                  : `Tỷ lệ yêu cầu thành công trong ngày đang giảm xuống còn ${successRate}%. Vui lòng kiểm tra lỗi bên dưới.`}
              </p>
            </div>
          </div>
          <button onClick={() => fetchData(false)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition">
            Kiểm tra lại
          </button>
        </div>
      )}

      {/* Provider Health & Circuit Breaker Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gemini Provider */}
        <div className="app-card p-4 flex items-center justify-between border-t-2 border-t-blue-500">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Google Gemini API</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${
                health?.providers?.find((p: any) => p.provider === 'gemini')?.circuit_open 
                  ? 'bg-red-500 animate-ping' 
                  : 'bg-emerald-500'
              }`}></span>
              <span className="text-sm font-bold text-gray-900">
                {health?.providers?.find((p: any) => p.provider === 'gemini')?.circuit_open ? 'CIRCUIT OPEN' : 'Operational (Healthy)'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Thất bại liên tiếp: {health?.providers?.find((p: any) => p.provider === 'gemini')?.consecutive_failures || 0} lần
            </p>
          </div>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl font-mono text-xs font-bold">
            Primary
          </div>
        </div>

        {/* Cohere Provider */}
        <div className="app-card p-4 flex items-center justify-between border-t-2 border-t-purple-500">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cohere LLM API</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${
                health?.providers?.find((p: any) => p.provider === 'cohere')?.circuit_open 
                  ? 'bg-red-500 animate-ping' 
                  : 'bg-emerald-500'
              }`}></span>
              <span className="text-sm font-bold text-gray-900">
                {health?.providers?.find((p: any) => p.provider === 'cohere')?.circuit_open ? 'CIRCUIT OPEN' : 'Operational (Healthy)'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Thất bại liên tiếp: {health?.providers?.find((p: any) => p.provider === 'cohere')?.consecutive_failures || 0} lần
            </p>
          </div>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-xl font-mono text-xs font-bold">
            Fallback
          </div>
        </div>

        {/* Neo4j Graph */}
        <div className="app-card p-4 flex items-center justify-between border-t-2 border-t-emerald-500">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Neo4j Graph Database</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-gray-900">Connected & Synced</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Latency: {stats?.model_performance?.find((s: any) => s.model === 'KnowledgeGraph')?.avg_latency ? Math.round(stats.model_performance.find((s: any) => s.model === 'KnowledgeGraph').avg_latency) : 0} ms
            </p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl font-mono text-xs font-bold">
            Graph DB
          </div>
        </div>
      </div>

      {/* Model Comparison: Google Gemini vs Cohere */}
      <div className="app-card p-6 border-t-2 border-t-indigo-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="text-indigo-600" size={18} />
              So Sánh Hiệu Năng Mô Hình: Gemini vs Cohere (Model Comparison)
            </h3>
            <p className="text-xs text-gray-500">
              Đánh giá song song giữa mô hình chính (Primary Engine) và mô hình dự phòng (Fallback Engine)
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            Cập nhật theo dữ liệu hôm nay
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gemini Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 border border-blue-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Primary Engine
                </span>
                <h4 className="text-lg font-bold text-gray-900">Google Gemini 1.5 Flash</h4>
                <p className="text-[11px] text-gray-500">Mô hình xử lý chính cho từ vựng, ngữ pháp và bài thi</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-700">
                  {health?.model_comparison?.gemini?.requests ?? 0}
                </span>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Yêu cầu</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-blue-100 text-center">
              <div className="p-2.5 bg-white rounded-xl border border-blue-100/80">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Latency TB</span>
                <span className="text-base font-black text-gray-800">
                  {Math.round(health?.model_comparison?.gemini?.avg_latency ?? 0)} <span className="text-xs font-normal">ms</span>
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-blue-100/80">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">P95 Tail</span>
                <span className="text-base font-black text-indigo-700">
                  {Math.round(health?.model_comparison?.gemini?.p95 ?? 0)} <span className="text-xs font-normal">ms</span>
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-blue-100/80">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Thành công</span>
                <span className="text-base font-black text-emerald-600">
                  {health?.model_comparison?.gemini?.success_rate ?? 100}%
                </span>
              </div>
            </div>
          </div>

          {/* Cohere Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 border border-purple-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Fallback Engine
                </span>
                <h4 className="text-lg font-bold text-gray-900">Cohere Command-R</h4>
                <p className="text-[11px] text-gray-500">Mô hình dự phòng tự động kích hoạt khi Gemini gặp lỗi</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-purple-700">
                  {health?.model_comparison?.cohere?.requests ?? 0}
                </span>
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Yêu cầu</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-purple-100 text-center">
              <div className="p-2.5 bg-white rounded-xl border border-purple-100/80">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Latency TB</span>
                <span className="text-base font-black text-gray-800">
                  {Math.round(health?.model_comparison?.cohere?.avg_latency ?? 0)} <span className="text-xs font-normal">ms</span>
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-purple-100/80">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">P95 Tail</span>
                <span className="text-base font-black text-purple-700">
                  {Math.round(health?.model_comparison?.cohere?.p95 ?? 0)} <span className="text-xs font-normal">ms</span>
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-purple-100/80">
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Thành công</span>
                <span className="text-base font-black text-emerald-600">
                  {health?.model_comparison?.cohere?.success_rate ?? 100}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Percentiles Card & Error Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latency Percentiles */}
        <div className="lg:col-span-7 app-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="text-orange-500" size={18} />
                Phân Vị Độ Trễ AI (Latency Percentiles - Hôm Nay)
              </h3>
              <span className="text-xs text-gray-400">P50 / P95 / P99 Metrics</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Theo dõi phân vị để phát hiện các truy vấn bị treo hoặc quá tải ở biên (tail latency):
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 my-2">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">Min</p>
              <p className="text-lg font-black text-gray-800 mt-1">
                {health?.latency_percentiles?.min ? Math.round(health.latency_percentiles.min) : 0} <span className="text-xs font-normal">ms</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
              <p className="text-[10px] uppercase font-bold text-emerald-600">P50 (Median)</p>
              <p className="text-lg font-black text-emerald-700 mt-1">
                {health?.latency_percentiles?.p50 ? Math.round(health.latency_percentiles.p50) : 0} <span className="text-xs font-normal">ms</span>
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
              <p className="text-[10px] uppercase font-bold text-indigo-600">P95 (Tail)</p>
              <p className="text-lg font-black text-indigo-700 mt-1">
                {health?.latency_percentiles?.p95 ? Math.round(health.latency_percentiles.p95) : 0} <span className="text-xs font-normal">ms</span>
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
              <p className="text-[10px] uppercase font-bold text-purple-600">P99 (Extreme)</p>
              <p className="text-lg font-black text-purple-700 mt-1">
                {health?.latency_percentiles?.p99 ? Math.round(health.latency_percentiles.p99) : 0} <span className="text-xs font-normal">ms</span>
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 text-center">
              <p className="text-[10px] uppercase font-bold text-orange-600">Max</p>
              <p className="text-lg font-black text-orange-700 mt-1">
                {health?.latency_percentiles?.max ? Math.round(health.latency_percentiles.max) : 0} <span className="text-xs font-normal">ms</span>
              </p>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-3">
            * 95% các yêu cầu AI hoàn tất dưới {health?.latency_percentiles?.p95 ? Math.round(health.latency_percentiles.p95) : 0}ms.
          </p>
        </div>

        {/* Error Breakdown (Top 5 errors 24h) */}
        <div className="lg:col-span-5 app-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} />
                Phân Loại Lỗi AI (24h Gần Nhất)
              </h3>
              <span className="text-xs font-semibold text-gray-400">
                {health?.error_breakdown?.length || 0} loại lỗi
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Các nguyên nhân chính gây thất bại khi gọi LLM:
            </p>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-48 custom-scrollbar">
            {(health?.error_breakdown || []).map((err: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl bg-red-50/50 border border-red-100 flex items-center justify-between text-xs">
                <span className="font-mono text-red-800 truncate max-w-[280px]" title={err.error_sample}>
                  {err.error_sample}
                </span>
                <span className="bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded-md shrink-0 ml-2">
                  {err.count} lần
                </span>
              </div>
            ))}
            {(!health?.error_breakdown || health?.error_breakdown.length === 0) && (
              <div className="flex flex-col items-center justify-center h-28 text-gray-400 text-xs">
                <CheckCircle2 className="text-emerald-500 mb-1" size={24} />
                <span>Không có lỗi nào được ghi nhận trong 24h qua!</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex justify-between items-center">
            <span>Tỷ lệ thành công:</span>
            <span className="font-bold text-emerald-600">{successRate}%</span>
          </div>
        </div>
      </div>

      {/* 24h Latency Timeline Chart */}
      <div className="app-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-indigo-600" size={18} />
              Biểu Đồ Độ Trễ 24 Giờ (24h Latency Timeline)
            </h3>
            <p className="text-xs text-gray-400">
              Độ trễ trung bình và biến động lưu lượng AI theo từng giờ trong ngày hôm nay
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> &lt;2000ms (Nhanh)
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> &lt;5000ms (Bình thường)
            </span>
            <span className="flex items-center gap-1.5 text-red-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span> &gt;5000ms / Lỗi
            </span>
          </div>
        </div>

        {(() => {
          const hourly = health?.hourly_performance || [];
          const maxLat = Math.max(1000, ...hourly.map((h: any) => (h.avg_lat ?? h.avg_latency ?? 0)));

          return (
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end justify-between gap-1.5 border-b border-gray-100 pb-2">
                {hourly.map((h: any, idx: number) => {
                  const val = h.avg_lat ?? h.avg_latency ?? 0;
                  const count = h.calls ?? h.count ?? 0;
                  const errors = h.error_count ?? h.errors ?? 0;
                  const heightPct = val > 0 ? Math.max(10, Math.round((val / maxLat) * 100)) : 4;
                  const isRed = val >= 5000 || errors > 0;
                  const isAmber = val >= 2000 && val < 5000;
                  const barColor = count === 0
                    ? "bg-gray-100"
                    : isRed
                    ? "bg-gradient-to-t from-red-600 to-rose-400 group-hover:from-red-700 group-hover:to-rose-500"
                    : isAmber
                    ? "bg-gradient-to-t from-amber-500 to-amber-300 group-hover:from-amber-600 group-hover:to-amber-400"
                    : "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-emerald-700 group-hover:to-emerald-500";

                  const rawHour = String(h.hr ?? h.hour ?? `${idx}`);
                  const hourFormatted = rawHour.length >= 2 ? rawHour.substring(0, 2) : rawHour.padStart(2, '0');

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl z-30 whitespace-nowrap pointer-events-none">
                        <span>Giờ: {rawHour}:00</span>
                        <span className="text-indigo-300">Độ trễ: {val > 0 ? `${Math.round(val)}ms` : "Không có truy vấn"}</span>
                        <span className="text-gray-300">Tổng: {count} calls {errors > 0 ? `(${errors} lỗi)` : ""}</span>
                      </div>
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 cursor-pointer ${barColor}`}
                        style={{ height: `${heightPct}%` }}
                      ></div>
                      <span className="text-[9px] text-gray-400 font-mono truncate w-full text-center">
                        {idx % 3 === 0 ? hourFormatted + "h" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 pt-3">
                <span>00:00 Đêm</span>
                <span>12:00 Trưa</span>
                <span>23:00 Đêm</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tổng yêu cầu</p>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Sparkles size={20} /></div>
          </div>
          <h3 className="text-3xl font-semibold text-gray-900">{total.toLocaleString()}</h3>
          <p className="text-xs text-gray-500 mt-2">Dữ liệu từ lúc triển khai monitoring</p>
        </div>

        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tốc độ TB (Latency)</p>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
          </div>
          <h3 className="text-3xl font-semibold text-gray-900">
            {stats?.model_performance?.length > 0
              ? Math.round(stats.model_performance.filter((s: any) => s.model !== 'KnowledgeGraph').reduce((acc: number, s: any) => acc + s.avg_latency, 0) / Math.max(1, stats.model_performance.filter((s: any) => s.model !== 'KnowledgeGraph').length))
              : 0} ms
          </h3>
          <p className="text-xs text-gray-500 mt-2">Trung bình cộng của tất cả LLM</p>
        </div>
        
        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Truy vấn Graph</p>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Network size={20} /></div>
          </div>
          <h3 className="text-3xl font-semibold text-gray-900">
            {stats?.model_performance?.find((s: any) => s.model === 'KnowledgeGraph')?.avg_latency 
                ? Math.round(stats.model_performance.find((s: any) => s.model === 'KnowledgeGraph').avg_latency) 
                : 0} ms
          </h3>
          <p className="text-xs text-gray-500 mt-2">Tốc độ tìm kiếm tri thức (Neo4j)</p>
        </div>

        <div className="app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chất lượng AI</p>
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><GraduationCap size={20} /></div>
          </div>
          <h3 className="text-3xl font-semibold text-gray-900">
            {stats?.feature_performance?.length > 0
              ? (stats.feature_performance.reduce((acc: number, f: any) => acc + (f.avg_score || 0), 0) / stats.feature_performance.filter((f: any) => f.avg_score).length || 0).toFixed(1)
              : 0} / 10
          </h3>
          <p className="text-xs text-gray-500 mt-2">Điểm trung bình từ Giám khảo AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance Table */}
        <div className="app-card p-6 h-full max-h-[350px] flex flex-col flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center shrink-0"><Database className="mr-2 text-[var(--brand)]" /> Hiệu năng theo Model</h2>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-semibold tracking-widest">
                  <th className="pb-3 pt-2">Model</th>
                  <th className="pb-3 pt-2">Độ khó</th>
                  <th className="pb-3 pt-2">Latency TB</th>
                  <th className="pb-3 pt-2">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {stats?.model_performance?.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition min-h-[40px]">
                    <td className="py-3 font-semibold text-gray-700">
                      {s.model === 'KnowledgeGraph' ? (
                        <span className="flex items-center text-purple-600"><Network size={14} className="mr-1" /> Knowledge Graph</span>
                      ) : s.model}
                    </td>
                    <td className="py-3 capitalize text-gray-500 font-bold">{s.difficulty || "N/A"}</td>
                    <td className="py-3">
                      <span className={`font-semibold ${s.avg_latency > 5000 ? 'text-red-500' : s.avg_latency > 2000 ? 'text-orange-500' : 'text-green-500'}`}>
                        {Math.round(s.avg_latency).toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 font-bold text-gray-400">{s.total_requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Performance Table */}
        <div className="app-card p-6 h-full max-h-[350px] flex flex-col flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center shrink-0"><Activity className="mr-2 text-[var(--brand)]" /> Hiệu năng theo Tính năng</h2>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-semibold tracking-widest">
                  <th className="pb-3 pt-2">Tính năng</th>
                  <th className="pb-3 pt-2">Latency TB</th>
                  <th className="pb-3 pt-2">Tỷ lệ OK</th>
                  <th className="pb-3 pt-2">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {stats?.feature_performance?.map((f, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition min-h-[40px]">
                    <td className="py-3 font-semibold text-gray-700">{f.feature}</td>
                    <td className="py-3">
                      <span className={`font-semibold ${f.avg_latency > 10000 ? 'text-red-500' : f.avg_latency > 3000 ? 'text-orange-500' : 'text-green-500'}`}>
                        {Math.round(f.avg_latency).toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 font-bold">
                       <span className={f.success_count / (f.total_requests || 1) < 0.8 ? 'text-red-500' : 'text-gray-600'}>
                        {Math.round((f.success_count / (f.total_requests || 1)) * 100)}%
                       </span>
                    </td>
                    <td className="py-3 font-bold text-gray-400">{f.total_requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Credit Consumption Today Table */}
      <div className="app-card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Coins className="text-amber-500" size={18} />
              Tiêu Thụ AI Hôm Nay Theo Người Dùng (Credit Consumption Today)
            </h3>
            <p className="text-xs text-gray-400">
              Danh sách tài khoản sử dụng tài nguyên mô hình AI nhiều nhất trong ngày hôm nay
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {health?.credit_consumption_today?.length || 0} người dùng hôm nay
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="pb-3 pl-2">Người dùng</th>
                <th className="pb-3">Email</th>
                <th className="pb-3 text-center">AI Calls hôm nay</th>
                <th className="pb-3 text-center">Tokens ước tính</th>
                <th className="pb-3 text-right pr-2">Credits tiêu thụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(health?.credit_consumption_today || []).map((u: any, idx: number) => (
                <tr key={u.user_id || idx} className="hover:bg-amber-50/20 transition">
                  <td className="py-3 pl-2 font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-[10px]">
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span>{u.name || `User #${u.user_id}`}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-500 font-mono text-[11px]">{u.email || "—"}</td>
                  <td className="py-3 text-center font-bold text-gray-800">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono">
                      {u.ai_calls_today || 0}
                    </span>
                  </td>
                  <td className="py-3 text-center font-mono text-gray-600">
                    {(u.estimated_tokens || 0).toLocaleString()}
                  </td>
                  <td className="py-3 text-right pr-2 font-mono font-bold text-amber-600">
                    -{u.estimated_cost_credits || 0} cr
                  </td>
                </tr>
              ))}
              {(!health?.credit_consumption_today || health.credit_consumption_today.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Chưa có lượt tiêu thụ tài nguyên AI nào hôm nay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Log Table */}
      <div className="app-card p-6 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-2 text-[var(--brand)]" /> Log chi tiết gần đây 
            {refreshing && <span className="ml-3 text-[10px] bg-green-100 text-green-700 font-bold px-2 flex items-center rounded-full animate-pulse transition"><RefreshCw size={10} className="mr-1 animate-spin" /> Live Data</span>}
          </h2>
          <button onClick={() => fetchData(false)} disabled={loading || refreshing} className="text-[var(--brand)] hover:text-indigo-800 text-sm font-bold flex items-center gap-1 border border-indigo-100 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
             <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} /> Làm mới ngay
          </button>
        </div>
        
        <div className="overflow-y-auto overflow-x-auto max-h-[500px] flex-1 custom-scrollbar bg-gray-50/30 rounded-xl border border-gray-50">
          {loading && logs.length === 0 ? (
             <div className="flex items-center justify-center h-48 text-indigo-400">Đang tải dữ liệu...</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse relative min-w-[800px]">
              <thead className="sticky top-0 bg-white shadow-sm z-20 outline outline-1 outline-gray-100">
                <tr className="border-b border-gray-200 text-gray-400 font-semibold uppercase text-[10px] tracking-widest">
                  <th className="py-3 px-4 w-32">Thời gian</th>
                  <th className="py-3 px-4 w-40">Tính năng</th>
                  <th className="py-3 px-4 w-36">Model</th>
                  <th className="py-3 px-4 w-20 text-center">Referee</th>
                  <th className="py-3 px-4 w-1/3">Feedback</th>
                  <th className="py-3 px-4 w-28">Latency</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 text-[11px] whitespace-nowrap">{l.created_at}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="bg-indigo-50 px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-700 tracking-tight">
                        {l.feature || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-700 text-[11px] truncate max-w-[150px]">{l.model}</td>
                    <td className="py-3 px-4 text-center">
                      {l.eval_score ? (
                        <span className={`px-2.5 py-1 rounded-md font-semibold text-[10px] ${
                          l.eval_score >= 8 ? 'bg-green-100 text-green-800' : 
                          l.eval_score >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {l.eval_score}/10
                        </span>
                      ) : <span className="text-gray-300 font-bold">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div 
                        className="text-[11px] text-gray-600 line-clamp-2 leading-tight cursor-pointer hover:text-[var(--brand)] transition-colors" 
                        title="Click to view full feedback"
                        onClick={() => setSelectedFeedback(l.eval_feedback || l.error_message)}
                      >
                        {l.eval_feedback || (l.error_message ? <span className="text-red-500 font-medium cursor-pointer">Error: {l.error_message}</span> : "-")}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-bold text-[11px] ${l.latency_ms > 8000 ? 'text-red-500' : l.latency_ms > 3000 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {l.latency_ms.toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                        l.status === 'success' ? 'bg-green-100 text-green-700' : 
                        l.status === 'evaluated' ? 'bg-blue-100 text-blue-700' : 
                        l.status === 'fallback' ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 shrink-0 border-t border-gray-100 pt-4">
          <button 
            disabled={page === 0} 
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Trang trước
          </button>
          <span className="text-sm font-medium text-gray-500 bg-gray-50 px-4 py-1.5 rounded-lg border border-gray-100">
            {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <button 
            disabled={(page + 1) * PAGE_SIZE >= total} 
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Trang sau
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {selectedFeedback && (
        <div className="!m-0 fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" style={{ margin: 0, top: 0, left: 0 }} onClick={() => setSelectedFeedback(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ClipboardList className="mr-2 text-[var(--brand)]" size={20} />
                Chi tiết Feedback
              </h3>
              <button 
                onClick={() => setSelectedFeedback(null)} 
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-sm text-gray-700 whitespace-pre-wrap font-mono custom-scrollbar">
              {selectedFeedback}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => handleCopyFeedback(selectedFeedback)}
                className={`px-5 py-2.5 rounded-lg font-semibold text-[13px] uppercase tracking-wider flex items-center justify-center min-w-[140px] transition-all duration-300 ${copied ? 'bg-green-100 text-green-700 scale-95' : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] shadow-md hover:shadow-lg'}`}
              >
                {copied ? <><Check size={16} className="mr-2" /> Đã Copy</> : <><Copy size={16} className="mr-2" /> Copy Text</>}
              </button>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 font-bold text-[13px] uppercase tracking-wider rounded-lg hover:bg-white hover:border-gray-300 transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
