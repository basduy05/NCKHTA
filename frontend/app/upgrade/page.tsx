"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import {
  Crown, Check, Sparkles, ArrowLeft, Shield, Zap, BookOpen,
  Brain, Award, Users, FileDown, Clock, Star, HelpCircle
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

export default function UpgradePage() {
  const { user, token, authFetch, refreshUser } = useAuth();
  const { showAlert } = useNotification();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    authFetch(`${API_URL}/student/subscription/status`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setSubStatus(data);
      })
      .catch(() => {});
  }, [token, authFetch]);

  const handleUpgradeMock = async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    setIsUpgrading(true);
    try {
      const months = billingCycle === "yearly" ? 12 : 1;
      const res = await authFetch(`${API_URL}/student/subscription/upgrade-mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: "premium", months })
      });
      if (res.ok) {
        const data = await res.json();
        showAlert(data.message || "Chúc mừng bạn đã nâng cấp thành công lên iEdu PRO!", "success");
        await refreshUser();
        setSubStatus({ is_premium: true, tier: "premium", status_display: "iEdu PRO" });
      } else {
        showAlert("Không thể nâng cấp gói. Vui lòng thử lại sau.", "error");
      }
    } catch {
      showAlert("Lỗi kết nối máy chủ.", "error");
    } finally {
      setIsUpgrading(false);
    }
  };

  const isCurrentPro = subStatus?.is_premium || user?.subscription_tier === "premium";

  return (
    <div className="min-h-screen bg-[var(--surface-2)] text-slate-900 dark:text-white pb-20">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Về Bảng Điều Khiển</span>
        </Link>
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full border border-amber-200/60 text-xs font-bold">
          <Crown size={14} className="text-amber-500 fill-amber-500" />
          <span>{isCurrentPro ? "Đang sử dụng iEdu PRO" : "Dùng thử tính năng cao cấp"}</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="max-w-4xl mx-auto px-4 text-center pt-8 pb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[var(--brand)] text-xs font-bold mb-4 border border-blue-100 dark:border-blue-900 shadow-xs">
          <Sparkles size={14} />
          <span>Mở khóa toàn bộ tiềm năng tiếng Anh của bạn</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          Học tiếng Anh thông minh hơn cùng <span className="text-[var(--brand)]">iEdu PRO</span>
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Sử dụng AI Coach không giới hạn, ghi nhớ từ vựng vĩnh viễn với thuật toán FSRS và tiếp cận đầy đủ ngân hàng đề thi chất lượng cao.
        </p>

        {/* Billing Switcher */}
        <div className="mt-8 inline-flex items-center p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "monthly"
                ? "bg-[var(--brand)] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Thanh toán theo tháng
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-[var(--brand)] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Thanh toán theo năm</span>
            <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              Tiết kiệm 25%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* FREE TIER */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gói Miễn Phí</h3>
                <p className="text-xs text-slate-500 mt-1">Dành cho học viên bắt đầu làm quen</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                <BookOpen size={20} />
              </div>
            </div>

            <div className="my-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <span className="text-4xl font-black text-slate-900 dark:text-white">0 đ</span>
              <span className="text-xs text-slate-400 ml-1">/ mãi mãi</span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              {[
                "Tra từ điển cơ bản Anh - Việt",
                "Lưu trữ tối đa 50 từ vựng cá nhân",
                "10 lượt trợ lý AI Coach mỗi ngày",
                "Luyện phát âm từ đơn cơ bản",
                "Tham gia lớp học và làm bài tập của giáo viên",
                "Xem bảng xếp hạng và chuỗi ngày học streak"
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Check size={16} className="text-slate-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <button
              disabled
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl font-bold text-xs cursor-default"
            >
              {isCurrentPro ? "Gói cơ bản" : "Đang sử dụng"}
            </button>
          </div>
        </div>

        {/* PRO TIER */}
        <div className="relative bg-gradient-to-b from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-950/20 rounded-3xl border-2 border-[var(--brand)] p-8 shadow-xl shadow-blue-500/10 flex flex-col justify-between">
          <div className="absolute -top-3.5 right-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
            <Crown size={13} className="fill-white" /> Khuyên dùng
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  iEdu PRO
                  <Sparkles size={18} className="text-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">Dành cho học sinh bứt phá điểm số & mục tiêu</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-[var(--brand)] flex items-center justify-center">
                <Crown size={20} className="fill-[var(--brand)]" />
              </div>
            </div>

            <div className="my-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {billingCycle === "yearly" ? "74.000 đ" : "99.000 đ"}
              </span>
              <span className="text-xs text-slate-500 ml-1">/ tháng</span>
              {billingCycle === "yearly" && (
                <p className="text-[11px] text-emerald-600 font-bold mt-1">
                  Thanh toán 890.000 đ / 12 tháng (tiết kiệm 298.000 đ)
                </p>
              )}
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
              {[
                "AI Coach & Sửa văn không giới hạn lượt dùng",
                "Thuật toán FSRS Spaced Repetition ghi nhớ vĩnh viễn",
                "AI Teacher Bot hỗ trợ trong nhóm học tập 24/7",
                "Phát âm chuẩn CMU Pronouncing Dictionary & sóng âm",
                "Sinh bài tập đọc hiểu Reading tự động từ tin tức",
                "Adaptive Roadmap thích ứng và dự báo ngày cán đích ETA",
                "Tải trọn bộ Anki Deck & PDF in thẻ Flashcard",
                "Tặng ngay 200 điểm XP thi đua khi kích hoạt"
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span className="font-semibold">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <button
              onClick={handleUpgradeMock}
              disabled={isUpgrading || isCurrentPro}
              className="w-full py-3.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Crown size={16} className="fill-white" />
              {isUpgrading
                ? "Đang kích hoạt gói..."
                : isCurrentPro
                ? "Bạn đã là thành viên iEdu PRO ✨"
                : "Kích hoạt gói iEdu PRO ngay"}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Kích hoạt tức thì &bull; Hỗ trợ hoàn tiền trong 7 ngày
            </p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="max-w-4xl mx-auto px-4 mt-16 pt-12 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-slate-800 text-[var(--brand)] flex items-center justify-center mx-auto">
            <Shield size={20} />
          </div>
          <h4 className="text-sm font-bold">Bảo mật tuyệt đối</h4>
          <p className="text-xs text-slate-500">Mọi dữ liệu học tập và thông tin cá nhân đều được mã hóa an toàn.</p>
        </div>

        <div className="space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 flex items-center justify-center mx-auto">
            <Zap size={20} />
          </div>
          <h4 className="text-sm font-bold">Kích hoạt tức thì</h4>
          <p className="text-xs text-slate-500">Tài khoản được nâng cấp ngay lập tức không cần chờ phê duyệt.</p>
        </div>

        <div className="space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-slate-800 text-amber-600 flex items-center justify-center mx-auto">
            <Award size={20} />
          </div>
          <h4 className="text-sm font-bold">Hiệu quả kiểm chứng</h4>
          <p className="text-xs text-slate-500">Hơn 12.000 học sinh đã cải thiện trung bình 1.5 band điểm cùng iEdu.</p>
        </div>
      </div>
    </div>
  );
}
