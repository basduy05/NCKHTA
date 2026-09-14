"use client";
import React, { useState, useEffect } from "react";
import {
  GraduationCap, Clock, BookMarked, Layers, BarChart3, Trophy,
  TrendingUp, Sparkles, ArrowRight, Target, CheckCircle2, Award, Zap, Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import Link from "next/link";

import StreakCalendar from "./StreakCalendar";
import BadgesCard from "./BadgesCard";
import PushNotificationButton from "./PushNotificationButton";
import { Newspaper, Share2, Crown, Check, ExternalLink, Copy } from "lucide-react";

interface OverviewTabProps {
  API_URL: string;
}

export default function OverviewTab({ API_URL }: OverviewTabProps) {
  const { token, user, authFetch, refreshUser } = useAuth();
  const { showAlert } = useNotification();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dailyChallenges, setDailyChallenges] = useState<any | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  // Phase 3: Parent Portal & Subscription states
  const [subStatus, setSubStatus] = useState<any>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const [showParentModal, setShowParentModal] = useState(false);
  const [parentCode, setParentCode] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const STATS_CACHE_KEY = "student_overview_stats_cache";
  const STATS_CACHE_TTL_MS = 20_000;

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await authFetch(`${API_URL}/student/subscription/status`);
      if (res.ok) {
        const json = await res.json();
        setSubStatus(json);
      }
    } catch (e) {
      console.warn("Sub status fetch error:", e);
    }
  };

  const handleUpgradeMock = async () => {
    setUpgrading(true);
    try {
      const res = await authFetch(`${API_URL}/student/subscription/upgrade-mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: "premium", months: 1 })
      });
      if (res.ok) {
        const json = await res.json();
        showAlert(json.message || "Nâng cấp iEdu PRO thành công!", "success");
        setShowSubModal(false);
        await fetchSubscriptionStatus();
        refreshUser();
      } else {
        showAlert("Không thể kích hoạt lúc này.", "warning");
      }
    } catch (e) {
      showAlert("Lỗi nâng cấp gói học viên", "error");
    } finally {
      setUpgrading(false);
    }
  };

  const handleOpenParentPortal = async () => {
    setShowParentModal(true);
    setGeneratingLink(true);
    try {
      let code = parentCode;
      if (!code) {
        const res = await authFetch(`${API_URL}/student/parent-link/generate-code`, {
          method: "POST"
        });
        if (res.ok) {
          const json = await res.json();
          code = json.code || json.link_code;
        } else {
          // Fallback to current parent link
          const currRes = await authFetch(`${API_URL}/student/parent-link/current`);
          if (currRes.ok) {
            const currJson = await currRes.json();
            code = currJson.code || currJson.link_code;
          }
        }
      }
      if (code) {
        setParentCode(code);
      } else {
        showAlert("Không thể lấy mã liên kết lúc này, vui lòng thử lại.", "warning");
      }
    } catch (e) {
      console.error("Parent portal error:", e);
      showAlert("Lỗi khi kết nối cổng phụ huynh", "error");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyParentLink = () => {
    if (!parentCode) return;
    const url = `${window.location.origin}/report/${parentCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchDailyChallenges = async () => {
    try {
      const res = await authFetch(`${API_URL}/student/daily-challenges`);
      if (res.ok) {
        const json = await res.json();
        setDailyChallenges(json);
      }
    } catch (e) {
      console.warn("Daily challenges fetch error:", e);
    }
  };

  const handleClaimChallenge = async (key: string) => {
    try {
      setClaimingKey(key);
      const res = await authFetch(`${API_URL}/student/daily-challenges/${key}/claim`, {
        method: "POST"
      });
      if (res.ok) {
        const json = await res.json();
        showAlert(json.message || "Đã nhận điểm thưởng thành công!", "success");
        await fetchDailyChallenges();
        refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert(err.detail || "Không thể nhận thưởng lúc này", "warning");
      }
    } catch (e) {
      showAlert("Lỗi kết nối máy chủ", "error");
    } finally {
      setClaimingKey(null);
    }
  };

  useEffect(() => {
    (async () => {
      fetchDailyChallenges();
      fetchSubscriptionStatus();
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
    indigo: { icon: "text-[var(--brand)]", text: "text-[var(--brand)]", bg: "bg-[var(--brand-soft)]" },
    orange: { icon: "text-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
    blue:   { icon: "text-blue-600",   text: "text-blue-700",   bg: "bg-blue-50" },
    purple: { icon: "text-purple-600", text: "text-purple-700", bg: "bg-purple-50" },
  };

  const quickLinks = [
    { label: "Đọc báo tra từ", href: "/dashboard/student?tab=news",        icon: Newspaper,  color: "bg-indigo-600" },
    { label: "Tra từ điển",    href: "/dashboard/student?tab=dictionary",  icon: BookMarked, color: "bg-[var(--brand)]" },
    { label: "Luyện thi",      href: "/dashboard/student?tab=practice",    icon: Trophy,     color: "bg-blue-600" },
    { label: "Kho ngữ pháp",   href: "/dashboard/student?tab=grammar",     icon: Layers,     color: "bg-teal-600" },
    { label: "Học với AI",     href: "/dashboard/student?tab=ai-tools",    icon: Sparkles,   color: "bg-violet-600" },
  ];

  return (
    <>
      <div className="space-y-6">
      {/* Hero banner */}
      <div className="bg-[var(--brand)] rounded-[var(--r-xl)] p-5 sm:p-6 text-white relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full -ml-10 -mb-10" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-200 text-xs sm:text-sm font-medium">Xin chào trở lại</span>
              {subStatus?.is_premium ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/90 text-slate-900 text-[11px] font-black tracking-wide shadow-sm">
                  <Crown size={12} className="fill-slate-900" /> iEdu PRO
                </span>
              ) : (
                <button
                  onClick={() => setShowSubModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition"
                >
                  Gói Miễn phí &bull; Nâng cấp PRO
                </button>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-0.5">{user?.name} 👋</h2>
            <p className="text-blue-100 text-xs sm:text-sm">Tiếp tục hành trình học tiếng Anh của bạn.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenParentPortal}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/20 text-xs font-semibold transition text-white"
            >
              <Share2 size={15} /> Báo cáo Phụ huynh
            </button>

            {stats && (
              <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <Trophy size={18} className="text-yellow-300 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-blue-200 uppercase font-semibold">Điểm TB</p>
                  <p className="text-lg font-bold">{stats?.average_percent ?? 0}%</p>
                </div>
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/20">
              <PushNotificationButton API_URL={API_URL} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {statCards.map((c, i) => {
          const col = colorMap[c.color];
          return (
            <Link key={i} href={c.href}
              className="bg-white rounded-xl p-4 sm:p-4.5 border border-gray-100 shadow-xs hover:shadow-sm hover:border-gray-200 transition-all group">
              <div className={`w-9 h-9 ${col.bg} rounded-xl flex items-center justify-center mb-3`}>
                <c.icon size={18} className={col.icon} />
              </div>
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
              <ArrowRight size={13} className={`mt-2 ${col.icon} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Link>
          );
        })}
      </div>

      {/* Daily Challenges Widget (Phase 2 - Task 2.13) */}
      {dailyChallenges && dailyChallenges.challenges && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-sm">
                <Target size={18} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  Thử Thách Hàng Ngày (Daily Quests)
                  {dailyChallenges.all_completed && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Hoàn thành 3/3
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500">
                  Hoàn thành nhiệm vụ mỗi ngày để duy trì thói quen và nhận điểm thưởng
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 self-start sm:self-auto">
              Hôm nay: {dailyChallenges.date}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {dailyChallenges.challenges.map((ch: any) => {
              const pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));
              return (
                <div
                  key={ch.key}
                  className={`p-4 rounded-xl border transition-all ${
                    ch.completed
                      ? "bg-emerald-50/40 border-emerald-200/80"
                      : "bg-gray-50/70 border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ch.icon || "🎯"}</span>
                      <h4 className="font-bold text-sm text-gray-900 leading-tight">
                        {ch.title}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      +{ch.points} pts
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[32px]">
                    {ch.description}
                  </p>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                      <span>Tiến độ</span>
                      <span>{ch.progress}/{ch.target}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          ch.completed ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    {ch.claimed ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <CheckCircle2 size={13} /> Đã nhận thưởng
                      </span>
                    ) : ch.completed ? (
                      <button
                        type="button"
                        onClick={() => handleClaimChallenge(ch.key)}
                        disabled={claimingKey === ch.key}
                        className="text-xs font-bold px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition active:scale-95 flex items-center gap-1.5"
                      >
                        {claimingKey === ch.key ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                        <span>Nhận +{ch.points}đ</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium py-1">
                        Đang thực hiện...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Streak Calendar Heatmap */}
      <StreakCalendar API_URL={API_URL} />

      {/* 2. Achievement Badges */}
      <BadgesCard API_URL={API_URL} />

      {/* Score summary */}
      {stats && stats.assignments_submitted > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart3 size={18} className="text-[var(--brand)]" /> Tổng kết học tập
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Tổng điểm",      value: `${stats.total_score}/${stats.total_max_score}`, color: "text-[var(--brand)]" },
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
          <TrendingUp size={18} className="text-[var(--brand)]" /> Truy cập nhanh
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

      {/* MODAL: PARENT PORTAL SHARING (3.9) */}
      {showParentModal && (
        <div
          className="fixed inset-0 !mt-0 !m-0 top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
                <Share2 size={20} /> Cổng Báo Cáo Cho Phụ Huynh
              </div>
              <button
                onClick={() => setShowParentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Chia sẻ liên kết này để phụ huynh xem tiến độ học tập, điểm bài tập, chuỗi streak và từ vựng của bạn mà không cần đăng nhập.
            </p>

            {generatingLink ? (
              <div className="py-8 text-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
                Đang khởi tạo liên kết bảo mật...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-gray-800 truncate">
                    {typeof window !== "undefined" && `${window.location.origin}/report/${parentCode || ""}`}
                  </span>
                  <button
                    onClick={handleCopyParentLink}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 transition"
                  >
                    <Copy size={13} /> {copied ? "Đã chép!" : "Sao chép"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                  <span>Mã liên kết: <strong className="font-mono text-gray-800 font-bold">{parentCode}</strong></span>
                  {parentCode && (
                    <a
                      href={`/report/${parentCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Xem trang mẫu <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowParentModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBSCRIPTION UPGRADE (3.13) */}
      {showSubModal && (
        <div
          className="fixed inset-0 !mt-0 !m-0 top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <Crown size={24} />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Nâng Cấp iEdu PRO</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Khai phá toàn bộ sức mạnh AI và các tính năng học tập chuyên sâu
              </p>
            </div>

            <div className="space-y-3 bg-gradient-to-br from-amber-50/50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-4">
              {[
                "Luyện phát âm AI không giới hạn lượt thực hành",
                "Phiên âm chuẩn IPA quốc tế CMU Pronouncing Dictionary",
                "Xuất kho từ vựng sang Anki deck / Flashcard PDF",
                "Trợ lý AI Teacher bot tương tác trong nhóm học",
                "Đề thi đọc hiểu độc quyền từ tin tức thời sự BBC / CNN",
                "Huy hiệu PRO vinh danh trên bảng xếp hạng"
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-gray-800 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <span className="text-2xl font-extrabold text-gray-900">99.000đ</span>
              <span className="text-xs text-gray-500"> / tháng</span>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Tặng ngay +200 điểm thưởng XP khi kích hoạt</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleUpgradeMock}
                disabled={upgrading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Crown size={16} />
                {upgrading ? "Đang kích hoạt gói PRO..." : "Kích hoạt iEdu PRO ngay"}
              </button>
              <button
                onClick={() => setShowSubModal(false)}
                className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

