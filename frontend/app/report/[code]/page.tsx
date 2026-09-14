"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  Award, 
  Flame, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Calendar,
  TrendingUp,
  Brain,
  Share2
} from "lucide-react";

interface ReportData {
  student_name: string;
  level: string;
  points: number;
  streak_days: number;
  total_study_minutes: number;
  vocab_stats: {
    total: number;
    mastered: number;
    retention_rate: number;
  };
  weak_areas: string[];
  strong_areas: string[];
  recent_activities: Array<{
    score: number;
    max_score: number;
    submitted_at: string;
    assignment_title: string;
  }>;
  generated_at: string;
}

export default function ParentReportPage() {
  const params = useParams();
  const code = params?.code as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) return;
    const fetchReport = async () => {
      try {
        setLoading(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        let res = await fetch(`${apiBase}/student/public/report/${code}`);
        if (!res.ok) {
          res = await fetch(`${apiBase}/public/report/${code}`);
        }
        if (!res.ok) {
          throw new Error("Không thể tải báo cáo. Mã chia sẻ có thể đã hết hạn hoặc không tồn tại.");
        }
        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message || "Lỗi tải báo cáo học tập");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [code]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Đang tải báo cáo học tập của học viên...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 p-8 rounded-2xl max-w-md w-full text-center shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Báo cáo không khả dụng</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Về trang chủ iEdu
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
            <Brain className="w-64 h-64 text-white" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" /> Cổng thông tin phụ huynh iEdu
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                Báo Cáo Học Tập: {report.student_name}
              </h1>
              <p className="text-indigo-100 text-sm mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Cập nhật lúc {report.generated_at}
              </p>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-semibold transition"
            >
              <Share2 className="w-4 h-4" />
              {copied ? "Đã sao chép link!" : "Chia sẻ báo cáo"}
            </button>
          </div>
        </div>

        {/* Highlight Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
              <Flame className="w-4 h-4 text-orange-500" /> Chuỗi học tập
            </span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">
              {report.streak_days} <span className="text-sm font-normal text-slate-500">ngày</span>
            </span>
            <span className="text-xs text-emerald-600 font-medium mt-1">Duy trì rất đều đặn</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Cấp độ CEFR
            </span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {report.level}
            </span>
            <span className="text-xs text-slate-500 mt-1">Khung năng lực Châu Âu</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
              <BookOpen className="w-4 h-4 text-emerald-500" /> Vốn từ đã thuộc
            </span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">
              {report.vocab_stats.mastered} <span className="text-sm font-normal text-slate-500">/ {report.vocab_stats.total}</span>
            </span>
            <span className="text-xs text-emerald-600 font-medium mt-1">
              {report.vocab_stats.retention_rate}% ghi nhớ FSRS
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
              <Award className="w-4 h-4 text-amber-500" /> Điểm thưởng (XP)
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {report.points.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 mt-1">Tích luỹ học tập</span>
          </div>
        </div>

        {/* Analysis: Strengths & Focus Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Điểm mạnh nổi bật
            </h3>
            {report.strong_areas && report.strong_areas.length > 0 ? (
              <ul className="space-y-2.5">
                {report.strong_areas.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Đang ghi nhận thêm dữ liệu bài làm xuất sắc.</p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500" /> Trọng tâm đang củng cố
            </h3>
            {report.weak_areas && report.weak_areas.length > 0 ? (
              <ul className="space-y-2.5">
                {report.weak_areas.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Không có lỗ hổng ngữ pháp nghiêm trọng.</p>
            )}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-500" /> Kết quả các bài tập gần đây
          </h3>
          {report.recent_activities && report.recent_activities.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {report.recent_activities.map((act, idx) => {
                const percent = act.max_score > 0 ? Math.round((act.score / act.max_score) * 100) : 100;
                return (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {act.assignment_title}
                      </p>
                      <p className="text-xs text-slate-400">
                        Nộp lúc: {new Date(act.submitted_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                          percent >= 80
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : percent >= 60
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {act.score} / {act.max_score} ({percent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Chưa có bài kiểm tra nào được nộp gần đây.</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-400">
          Hệ thống giáo dục thông minh iEdu AI &bull; Báo cáo được bảo mật và chỉ xem bằng liên kết này.
        </div>
      </div>
    </div>
  );
}
