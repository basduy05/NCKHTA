"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Activity, Flame, Sparkles, Award, Search, 
  Clock, TrendingUp, RefreshCw, ChevronRight, X,
  AlertTriangle, Laptop, Smartphone, Tablet, BookCheck,
  CreditCard, CheckCircle2, Zap
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

interface UserBehaviorProps {
  API_URL: string;
}

export default function UserBehaviorTab({ API_URL }: UserBehaviorProps) {
  const { authFetch, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await authFetch(`${API_URL}/admin/user-behavior`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setError(`Máy chủ phản hồi mã lỗi (${res.status}). Vui lòng thử lại.`);
      }
    } catch (err: any) {
      console.error("Error fetching user behavior data:", err);
      setError(err?.message || "Không thể kết nối đến máy chủ.");
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <RefreshCw className="animate-spin text-[var(--brand)] mb-3" size={32} />
        <p className="font-semibold text-gray-800">Đang phân tích dữ liệu hành vi người dùng...</p>
        <p className="text-xs text-gray-400 mt-1">Đang tổng hợp từ nhật ký AI, lịch sử tra cứu và bài kiểm tra</p>
      </div>
    );
  }

  // Error state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-2xl border border-rose-100 p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Không thể tải dữ liệu hành vi</h3>
        <p className="text-xs text-gray-500 max-w-md mb-4">{error || "Đã xảy ra sự cố khi kết nối đến máy chủ."}</p>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--brand)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-sm"
        >
          <RefreshCw size={14} />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  // Safe normalized variables
  const topUsers = (data?.top_users || []).filter((u: any) => {
    if (filterRole !== "ALL" && u.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const cefrColors: Record<string, string> = {
    A1: "bg-emerald-50 text-emerald-700 border-emerald-200",
    A2: "bg-teal-50 text-teal-700 border-teal-200",
    B1: "bg-blue-50 text-blue-700 border-blue-200",
    B2: "bg-indigo-50 text-indigo-700 border-indigo-200",
    C1: "bg-purple-50 text-purple-700 border-purple-200",
    C2: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const cefrOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const maxCefrCount = Math.max(1, ...(data?.cefr_distribution || []).map((c: any) => c.count || 0));
  const maxHourCount = Math.max(1, ...(data?.hourly_heatmap || []).map((h: any) => h.count || 0));

  // Feature ranking calculations
  const featureList = data?.feature_ranking || [];
  const totalFeatureCalls = featureList.reduce((acc: number, f: any) => acc + (f.total_calls ?? f.calls ?? 0), 0);
  const maxFeatureCalls = Math.max(1, ...featureList.map((f: any) => f.total_calls ?? f.calls ?? 0));

  // Search terms calculations
  const searchList = data?.top_searches || [];
  const searchCounts = searchList.map((item: any) => item.cnt ?? item.count ?? 1);
  const maxSearchCount = Math.max(1, ...searchCounts);
  const minSearchCount = Math.min(1, ...searchCounts);

  // Subscription calculation
  const subList = data?.subscription_distribution || [];
  const totalSubUsers = subList.reduce((acc: number, s: any) => acc + (s.cnt || 0), 0) || 1;
  const freeUsers = subList.find((s: any) => (s.subscription_tier || "").toLowerCase() === "free")?.cnt || 0;
  const paidUsers = subList.filter((s: any) => (s.subscription_tier || "").toLowerCase() !== "free").reduce((acc: number, s: any) => acc + (s.cnt || 0), 0);
  const paidPct = Math.round((paidUsers / totalSubUsers) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-[var(--brand)]" size={24} />
            Phân Tích Hành Vi Người Dùng & Học Tập
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi xu hướng học tập, phân bổ trình độ CEFR, giờ cao điểm và tần suất sử dụng AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-[var(--brand)]" : ""} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card p-4 flex items-center gap-3.5 bg-gradient-to-br from-indigo-50/70 to-white border-indigo-100/60">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tổng Lượt Gọi AI</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">
              {totalFeatureCalls.toLocaleString()}
            </p>
            <span className="text-[10px] text-indigo-600 font-semibold">{featureList.length} tính năng hoạt động</span>
          </div>
        </div>

        <div className="app-card p-4 flex items-center gap-3.5 bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100/60">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Thành Viên Tích Cực</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">
              {(data?.top_users || []).length}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold">Tương tác AI cao nhất</span>
          </div>
        </div>

        <div className="app-card p-4 flex items-center gap-3.5 bg-gradient-to-br from-purple-50/70 to-white border-purple-100/60">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Gói Cước Đăng Ký</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">
              {paidPct}% Pro
            </p>
            <span className="text-[10px] text-purple-600 font-semibold">{paidUsers} VIP / {totalSubUsers} người dùng</span>
          </div>
        </div>

        <div className="app-card p-4 flex items-center gap-3.5 bg-gradient-to-br from-amber-50/70 to-white border-amber-100/60">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Search size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Từ Khóa Tra Cứu</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">
              {searchList.length}
            </p>
            <span className="text-[10px] text-amber-600 font-semibold">Từ vựng tra nhiều nhất</span>
          </div>
        </div>
      </div>

      {/* Grid: 24h Heatmap + CEFR Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Heatmap (7 cols) */}
        <div className="lg:col-span-7 app-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="text-blue-600" size={18} />
                Bản Đồ Hoạt Động Theo Giờ (24h Heatmap)
              </h3>
              <span className="text-xs text-gray-400">Dựa trên lượt ôn tập từ vựng & bài thi</span>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Khung giờ học viên hoạt động sôi nổi nhất trong ngày để tối ưu thông báo và mở lớp:
            </p>
          </div>

          <div className="grid grid-cols-12 gap-2 my-auto">
            {(data?.hourly_heatmap || []).map((item: any) => {
              const count = item.count || 0;
              const intensity = maxHourCount > 0 ? count / maxHourCount : 0;
              let bg = "bg-gray-100 text-gray-500";
              if (intensity > 0.75) bg = "bg-indigo-600 text-white font-bold shadow-sm";
              else if (intensity > 0.45) bg = "bg-indigo-400 text-white font-semibold";
              else if (intensity > 0.15) bg = "bg-indigo-200 text-indigo-900";
              else if (intensity > 0) bg = "bg-indigo-50 text-indigo-700";

              return (
                <div
                  key={item.hour}
                  className="flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className={`w-full h-12 rounded-lg flex items-center justify-center text-xs transition-transform transform group-hover:scale-110 cursor-pointer ${bg}`}
                  >
                    {count}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {item.hour}h
                  </span>
                  {/* Tooltip */}
                  <div className="absolute bottom-16 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                    <div className="bg-gray-900 text-white text-[11px] py-1 px-2.5 rounded-md shadow-lg whitespace-nowrap">
                      {item.hour}:00 - {count} lượt học
                    </div>
                    <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100 mt-4">
            <span>00:00 Đêm</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Mức độ:</span>
              <span className="w-3 h-3 rounded bg-gray-100"></span>
              <span className="w-3 h-3 rounded bg-indigo-100"></span>
              <span className="w-3 h-3 rounded bg-indigo-300"></span>
              <span className="w-3 h-3 rounded bg-indigo-600"></span>
            </div>
            <span>23:00 Khuya</span>
          </div>
        </div>

        {/* CEFR Level Distribution (5 cols) */}
        <div className="lg:col-span-5 app-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Award className="text-amber-500" size={18} />
                Phân Bố Trình Độ CEFR
              </h3>
              <span className="text-xs text-gray-400">Khảo sát & Học lực</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Cơ cấu học viên theo khung tham chiếu châu Âu (A1 → C2):
            </p>
          </div>

          <div className="space-y-3">
            {cefrOrder.map((lvl) => {
              const item = (data?.cefr_distribution || []).find((c: any) => c.level === lvl) || { level: lvl, count: 0 };
              const count = item.count || 0;
              const percent = maxCefrCount > 0 ? Math.round((count / maxCefrCount) * 100) : 0;

              return (
                <div key={lvl} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border ${cefrColors[lvl] || "bg-gray-100"}`}>
                    {lvl}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-gray-700">Level {lvl}</span>
                      <span className="text-gray-500 font-bold">{count} học viên</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 mt-4 text-center">
            Học viên phân bố chủ yếu ở trình độ cơ bản và trung cấp, thuận tiện định hướng khóa học.
          </p>
        </div>
      </div>

      {/* Grid: Feature Popularity + Search Terms & Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Feature Ranking (6 cols) */}
        <div className="lg:col-span-6 app-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="text-purple-600" size={18} />
              Độ Phổ Biến Của Tính Năng AI
            </h3>
            <span className="text-xs text-gray-400">Tần suất gọi API</span>
          </div>

          <div className="space-y-4">
            {featureList.map((f: any, idx: number) => {
              const calls = f.total_calls ?? f.calls ?? 0;
              const pct = totalFeatureCalls > 0 ? Math.round((calls / totalFeatureCalls) * 100) : 0;
              const barWidth = maxFeatureCalls > 0 ? Math.round((calls / maxFeatureCalls) * 100) : 0;
              const avgLat = f.avg_latency ? `${Math.round(f.avg_latency)}ms` : null;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      {f.feature || "General Prompt"}
                    </span>
                    <div className="flex items-center gap-2">
                      {avgLat && (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                          {avgLat}
                        </span>
                      )}
                      <span className="font-bold text-gray-900">{calls.toLocaleString()} lượt</span>
                      <span className="text-gray-400">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {featureList.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Chưa có đủ nhật ký tính năng.</p>
            )}
          </div>
        </div>

        {/* Top Search Terms & Gamification Badges (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Text-based Word Cloud */}
          <div className="app-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Search className="text-emerald-600" size={18} />
                Đám Mây Từ Khóa Tra Cứu (Word Cloud - Top 20)
              </h3>
              <span className="text-xs text-gray-400">Search History</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Kích thước chữ tỉ lệ thuận với tần suất tra cứu từ vựng trên toàn hệ thống:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 p-4 rounded-xl bg-slate-50/70 border border-slate-100 min-h-[140px]">
              {searchList.map((s: any, idx: number) => {
                const count = s.cnt ?? s.count ?? 0;
                const ratio = maxSearchCount > minSearchCount ? (count - minSearchCount) / (maxSearchCount - minSearchCount) : 0.5;
                
                const colors = [
                  "text-indigo-700 bg-indigo-50/80 border-indigo-100 hover:bg-indigo-100",
                  "text-emerald-700 bg-emerald-50/80 border-emerald-100 hover:bg-emerald-100",
                  "text-purple-700 bg-purple-50/80 border-purple-100 hover:bg-purple-100",
                  "text-blue-700 bg-blue-50/80 border-blue-100 hover:bg-blue-100",
                  "text-amber-700 bg-amber-50/80 border-amber-100 hover:bg-amber-100",
                  "text-rose-700 bg-rose-50/80 border-rose-100 hover:bg-rose-100",
                ];
                const colorClass = colors[idx % colors.length];
                
                const fontSize = ratio > 0.8 ? "text-base font-black px-3 py-1.5"
                  : ratio > 0.5 ? "text-sm font-extrabold px-2.5 py-1"
                  : ratio > 0.25 ? "text-xs font-bold px-2 py-0.5"
                  : "text-[11px] font-medium px-2 py-0.5";

                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 rounded-xl border transition-all duration-200 transform hover:scale-110 cursor-default ${fontSize} ${colorClass}`}
                    title={`Đã tra ${count} lần`}
                  >
                    <span>{s.word || s.term}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </span>
                );
              })}
              {searchList.length === 0 && (
                <p className="text-xs text-gray-400 py-6">Chưa có lịch sử tìm kiếm từ vựng.</p>
              )}
            </div>
          </div>

          {/* Badges Distribution */}
          <div className="app-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Award className="text-orange-500" size={18} />
                Huy Hiệu Đạt Được Nhiều Nhất
              </h3>
              <span className="text-xs text-gray-400">Gamification</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {(data?.badge_distribution || []).map((b: any, idx: number) => {
                const earned = b.earned_by ?? b.count ?? 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-orange-50/50 border border-orange-100"
                  >
                    <span className="text-2xl">{b.icon || "🏆"}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-800 line-clamp-1">{b.name}</p>
                      <p className="text-[11px] text-orange-600 font-semibold">{earned} đã nhận</p>
                    </div>
                  </div>
                );
              })}
              {(!data?.badge_distribution || data?.badge_distribution.length === 0) && (
                <p className="text-xs text-gray-400 py-3 col-span-3">Chưa có huy hiệu nào được mở khóa.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Session Devices & Placement Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session Devices */}
        <div className="lg:col-span-6 app-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Laptop className="text-blue-600" size={18} />
                Thiết Bị Truy Cập (Session Devices)
              </h3>
              <span className="text-xs text-gray-400">Desktop / Mobile / Tablet</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Cơ cấu thiết bị học viên sử dụng để tối ưu trải nghiệm giao diện Responsive:
            </p>
          </div>

          {(() => {
            const devList = data?.device_distribution || [];
            const totalDev = devList.reduce((acc: number, d: any) => acc + (d.cnt || 0), 0) || 1;
            const desktopCount = (devList.find((d: any) => (d.device || "").toLowerCase().includes("desktop"))?.cnt || 0);
            const mobileCount = (devList.find((d: any) => (d.device || "").toLowerCase().includes("mobile"))?.cnt || 0);
            const tabletCount = (devList.find((d: any) => (d.device || "").toLowerCase().includes("tablet"))?.cnt || 0);

            const desktopPct = Math.round((desktopCount / totalDev) * 100);
            const mobilePct = Math.round((mobileCount / totalDev) * 100);
            const tabletPct = Math.max(0, 100 - desktopPct - mobilePct);

            return (
              <div className="space-y-4 my-auto">
                {/* Visual Multi-segment bar */}
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                  <div style={{ width: `${desktopPct}%` }} className="bg-indigo-600 h-full transition-all duration-500" title={`Desktop: ${desktopPct}%`}></div>
                  <div style={{ width: `${mobilePct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Mobile: ${mobilePct}%`}></div>
                  <div style={{ width: `${tabletPct}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Tablet: ${tabletPct}%`}></div>
                </div>

                {/* 3 cards */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-col items-center text-center">
                    <Laptop size={20} className="text-indigo-600 mb-1" />
                    <span className="text-xs font-bold text-gray-800">Desktop</span>
                    <span className="text-lg font-black text-indigo-700 mt-0.5">{desktopPct}%</span>
                    <span className="text-[10px] text-gray-400">{desktopCount} sessions</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col items-center text-center">
                    <Smartphone size={20} className="text-emerald-600 mb-1" />
                    <span className="text-xs font-bold text-gray-800">Mobile</span>
                    <span className="text-lg font-black text-emerald-700 mt-0.5">{mobilePct}%</span>
                    <span className="text-[10px] text-gray-400">{mobileCount} sessions</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 flex flex-col items-center text-center">
                    <Tablet size={20} className="text-amber-600 mb-1" />
                    <span className="text-xs font-bold text-gray-800">Tablet</span>
                    <span className="text-lg font-black text-amber-700 mt-0.5">{tabletPct}%</span>
                    <span className="text-[10px] text-gray-400">{tabletCount} sessions</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <p className="text-[11px] text-gray-400 pt-3 border-t border-gray-100 text-center">
            Tổng cộng {(data?.device_distribution || []).reduce((acc: number, d: any) => acc + (d.cnt || 0), 0)} phiên đăng nhập đã được ghi nhận.
          </p>
        </div>

        {/* Placement Test Results */}
        <div className="lg:col-span-6 app-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BookCheck className="text-purple-600" size={18} />
                Kết Quả Khảo Sát Đầu Vào (Placement Tests)
              </h3>
              <span className="text-xs text-gray-400">Trình độ New Users</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Phân phối trình độ CEFR thực tế từ bài Placement Test của học viên mới:
            </p>
          </div>

          <div className="space-y-3 my-auto">
            {cefrOrder.map((lvl) => {
              const res = (data?.placement_test_results || []).find((p: any) => p.cefr_level === lvl) || { cefr_level: lvl, cnt: 0, avg_score: 0 };
              const maxPlCount = Math.max(1, ...(data?.placement_test_results || []).map((p: any) => p.cnt || 0));
              const pct = Math.round(((res.cnt || 0) / maxPlCount) * 100);

              return (
                <div key={lvl} className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center border ${cefrColors[lvl] || 'bg-gray-100'}`}>
                    {lvl}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-800">Trình độ {lvl}</span>
                      <span className="text-gray-500 font-medium">
                        <strong>{res.cnt || 0}</strong> học viên {res.avg_score ? `(ĐTB: ${res.avg_score}đ)` : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 pt-3 border-t border-gray-100 text-center">
            Dữ liệu tự động đồng bộ từ module Placement Test khi học viên hoàn thành khảo sát.
          </p>
        </div>
      </div>

      {/* Section: Top 20 Most Active Users Table */}
      <div className="app-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-[var(--brand)]" size={20} />
              Bảng Xếp Hạng Người Dùng Tích Cực (Top Active Users)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi chuỗi học tập (streak), mức độ tương tác AI và trình độ CEFR của từng thành viên
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-60">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm học viên..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 focus:outline-none font-medium"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="STUDENT">Học sinh</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                <th className="pb-3 pl-2">#</th>
                <th className="pb-3">Người dùng</th>
                <th className="pb-3">Vai trò</th>
                <th className="pb-3">CEFR</th>
                <th className="pb-3">Chuỗi (Streak)</th>
                <th className="pb-3">Lượt dùng AI</th>
                <th className="pb-3">Điểm tích lũy</th>
                <th className="pb-3">Hoạt động gần nhất</th>
                <th className="pb-3 text-right pr-2">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-50">
              {topUsers.map((u: any, idx: number) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="hover:bg-gray-50/80 transition cursor-pointer group"
                >
                  <td className="py-3 pl-2 font-mono text-gray-400 font-bold">{idx + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs">
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-[var(--brand)] transition">
                          {u.name || "Chưa đặt tên"}
                        </p>
                        <p className="text-[11px] text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        u.role === "ADMIN"
                          ? "bg-red-100 text-red-700"
                          : u.role === "TEACHER"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                        cefrColors[u.cefr_level] || "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {u.cefr_level || "Chưa test"}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                      <Flame size={13} className="text-amber-500" />
                      {u.streak || 0} ngày
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {u.ai_calls || 0} calls
                    </span>
                  </td>
                  <td className="py-3 font-bold text-gray-700">
                    {(u.points || 0).toLocaleString()} pts
                  </td>
                  <td className="py-3 text-gray-400 font-mono text-[11px]">
                    {u.last_active || "Gần đây"}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <button className="p-1 text-gray-400 group-hover:text-[var(--brand)] rounded-md hover:bg-indigo-50">
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    Không tìm thấy người dùng phù hợp với tiêu chí lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Slide-in Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Hồ Sơ Chi Tiết Học Viên</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Avatar + Basic info */}
              <div className="flex items-center gap-4 my-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
                  {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">{selectedUser.name || "Chưa đặt tên"}</h4>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      ID #{selectedUser.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium">Trình độ CEFR</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                    <Award size={16} className="text-amber-500" />
                    {selectedUser.cefr_level || "Chưa xác định"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium">Chuỗi học tập</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                    <Flame size={16} className="text-amber-500" />
                    {selectedUser.streak || 0} ngày
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium">Tương tác AI</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-purple-600" />
                    {selectedUser.ai_calls || 0} requests
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium">Điểm học tập</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {(selectedUser.points || 0).toLocaleString()} pts
                  </p>
                </div>
              </div>

              {/* Behavior insights */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Chỉ số tương tác
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Lần đăng nhập cuối:</span>
                    <span className="font-semibold text-gray-800">{selectedUser.last_active || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Mức độ cam kết:</span>
                    <span className="font-semibold text-emerald-600">
                      {(selectedUser.streak || 0) >= 7 ? "Rất cao 🔥" : (selectedUser.streak || 0) >= 3 ? "Tốt" : "Bình thường"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Tần suất dùng AI:</span>
                    <span className="font-semibold text-purple-700">
                      {(selectedUser.ai_calls || 0) > 50 ? "Heavy User (VIP)" : (selectedUser.ai_calls || 0) > 10 ? "Thường xuyên" : "Mới bắt đầu"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition text-xs"
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
