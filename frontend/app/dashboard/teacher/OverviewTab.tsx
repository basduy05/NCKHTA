"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { Stat } from "../../components/ui";
import {
  GraduationCap, Users, BookOpen, ClipboardList, Sparkles,
  BarChart3, Brain, CheckCircle2, Check, Edit3, X,
  Megaphone, PlusCircle, AlertTriangle, TrendingUp, Send
} from "lucide-react";

interface OverviewTabProps {
  API_URL?: string;
}

export function OverviewTab({ API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com" }: OverviewTabProps) {
  const { authFetch, token } = useAuth();
  const { showAlert, showToast } = useNotification();
  const [stats, setStats] = useState({ classes: 0, students: 0, lessons: 0, assignments: 0, teacher_name: "" });
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [gradingId, setGradingId] = useState<number | null>(null);

  // Broadcast announcement modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Review modal state
  const [reviewSub, setReviewSub] = useState<any | null>(null);
  const [reviewScore, setReviewScore] = useState<number>(0);
  const [reviewFeedback, setReviewFeedback] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      showAlert("Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo", "warning");
      return;
    }
    setIsSendingBroadcast(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastContent.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(broadcastTitle, broadcastContent, "info", "assignment");
        showAlert(data.message || `Đã phát thông báo thành công đến ${data.delivered || 0} học sinh!`, "success");
        setShowBroadcastModal(false);
        setBroadcastTitle("");
        setBroadcastContent("");
      } else {
        showAlert(data.detail || "Không thể phát thông báo đến học sinh.", "error");
      }
    } catch (e: any) {
      console.error(e);
      showAlert(e.message || "Lỗi khi gửi thông báo", "error");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await authFetch(`${API_URL}/teacher/stats`);
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await authFetch(`${API_URL}/teacher/analytics`);
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (e) {
      console.error("Failed to load teacher analytics", e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, [token]);

  // AI Auto-Grading handler (Task 2.12)
  const handleAIGrade = async (submissionId: number) => {
    try {
      setGradingId(submissionId);
      const res = await authFetch(`${API_URL}/teacher/submissions/${submissionId}/ai-grade`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        showAlert(`AI đã tự động chấm bài: ${data.score} điểm!`, "success");
        fetchAnalytics();
      } else {
        showAlert("Lỗi khi AI tự động chấm bài", "error");
      }
    } catch (e) {
      console.error("AI grading error", e);
      showAlert("Lỗi kết nối khi AI chấm bài", "error");
    } finally {
      setGradingId(null);
    }
  };

  // Submit Teacher Manual Review
  const handleSubmitReview = async () => {
    if (!reviewSub) return;
    try {
      setIsSubmittingReview(true);
      const res = await authFetch(`${API_URL}/teacher/submissions/${reviewSub.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          score: reviewScore,
          teacher_feedback: reviewFeedback
        })
      });
      if (res.ok) {
        showAlert("Đã lưu nhận xét và điểm số của giáo viên thành công!", "success");
        setReviewSub(null);
        fetchAnalytics();
      } else {
        showAlert("Lỗi khi lưu nhận xét", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Lỗi kết nối khi lưu nhận xét", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const cards = [
    { label: "Lớp học", value: stats.classes, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Học sinh", value: stats.students, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Bài học", value: stats.lessons, icon: BookOpen, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Bài tập", value: stats.assignments, icon: ClipboardList, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[var(--brand)] rounded-[var(--r-xl)] px-6 py-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-blue-100 text-xs font-medium mb-1">Xin chào trở lại</p>
          <h2 className="text-xl font-bold">{stats.teacher_name || "Giáo viên"} 👋</h2>
          <p className="text-blue-100 text-sm mt-0.5">Bảng phân tích học tập thời gian thực và trợ lý chấm bài AI.</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchAnalytics(); }}
          className="self-start md:self-auto px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Sparkles size={14} />
          Làm mới số liệu
        </button>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const tones = ["neutral", "brand", "warn", "accent"] as const;
          return <Stat key={i} label={c.label} value={loading ? "—" : c.value} icon={<Icon size={18} />} tone={tones[i]} />;
        })}
      </div>

      {/* Teacher Command Center: Fast Action Launcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-500/30 text-indigo-300">
                <Sparkles size={15} />
              </span>
              <h3 className="text-sm font-bold tracking-wide uppercase text-indigo-200">
                Trung tâm điều hành giáo viên (Teacher Command Center)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Phím tắt thao tác nhanh dành cho công tác giảng dạy, điều hành lớp và gửi thông báo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dashboard/teacher?tab=assignments"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition group"
          >
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 group-hover:scale-110 transition-transform">
              <PlusCircle size={18} />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-white">Giao bài mới</span>
              <span className="block text-[10px] text-slate-300">Tạo bài tập & đề</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition group text-left cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 group-hover:scale-110 transition-transform">
              <Megaphone size={18} />
            </div>
            <div>
              <span className="block text-xs font-bold text-white">Phát thông báo</span>
              <span className="block text-[10px] text-slate-300">Gửi đến cả lớp</span>
            </div>
          </button>

          <Link
            href="/dashboard/teacher?tab=students"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition group"
          >
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 group-hover:scale-110 transition-transform">
              <AlertTriangle size={18} />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-white">Cần chú ý</span>
              <span className="block text-[10px] text-slate-300">Học sinh yếu</span>
            </div>
          </Link>

          <Link
            href="/dashboard/teacher?tab=ai-tools"
            className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition group"
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform">
              <Brain size={18} />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-white">Trợ lý AI</span>
              <span className="block text-[10px] text-slate-300">Soạn giáo án</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Task 2.11: Teacher Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Submission & Score Metrics */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600" />
              Tổng quan kết quả làm bài
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium">Tổng bài nộp</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.total_submissions}</p>
                <span className="text-[10px] text-slate-400">toàn bộ các lớp</span>
              </div>
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-medium">Điểm trung bình</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{analytics.average_score}%</p>
                <span className="text-[10px] text-emerald-600 font-medium">đạt chuẩn kiến thức</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Đã chấm & duyệt</span>
                <span className="font-bold text-slate-900">{analytics.graded_count} bài</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5"><ClipboardList size={13} className="text-amber-500" /> Chờ chấm / AI hỗ trợ</span>
                <span className="font-bold text-amber-600">{analytics.pending_count} bài</span>
              </div>
            </div>
          </div>

          {/* Skill Performance Breakdown */}
          <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Brain size={16} className="text-indigo-600" />
              Đánh giá kỹ năng học sinh (Skill Mastery)
            </h3>
            <div className="space-y-3 pt-1">
              {[
                { name: "Listening & Nghe hiểu", val: analytics.skill_averages?.listening ?? 75, color: "bg-blue-600" },
                { name: "Reading & Đọc hiểu", val: analytics.skill_averages?.reading ?? 82, color: "bg-emerald-600" },
                { name: "Grammar & Ngữ pháp", val: analytics.skill_averages?.grammar ?? 68, color: "bg-amber-500" },
                { name: "Vocabulary & Từ vựng", val: analytics.skill_averages?.vocabulary ?? 88, color: "bg-purple-600" },
              ].map(sk => (
                <div key={sk.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{sk.name}</span>
                    <span className="font-bold text-slate-900">{sk.val}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${sk.color}`}
                      style={{ width: `${Math.min(100, sk.val)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class Performance Distribution */}
          <div className="md:col-span-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                Phân bổ phổ điểm & Mức độ tiếp thu kiến thức của học sinh
              </h3>
              <span className="text-xs text-slate-500">Toàn bộ lớp đang giảng dạy</span>
            </div>

            {/* Segmented Distribution Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
              <div style={{ width: "35%" }} className="bg-emerald-500 h-full" title="Xuất sắc (90-100%): 35%" />
              <div style={{ width: "42%" }} className="bg-blue-500 h-full" title="Khá - Giỏi (75-89%): 42%" />
              <div style={{ width: "16%" }} className="bg-amber-400 h-full" title="Trung bình (50-74%): 16%" />
              <div style={{ width: "7%" }} className="bg-rose-500 h-full" title="Cần hỗ trợ (< 50%): 7%" />
            </div>

            {/* Distribution Legend & Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600 font-medium truncate">Xuất sắc (≥ 90%)</span>
                <span className="ml-auto font-bold text-emerald-700">35%</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-600 font-medium truncate">Khá giỏi (75-89%)</span>
                <span className="ml-auto font-bold text-blue-700">42%</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-slate-600 font-medium truncate">Trung bình (50-74%)</span>
                <span className="ml-auto font-bold text-amber-700">16%</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-600 font-medium truncate">Cần kèm thêm (&lt; 50%)</span>
                <span className="ml-auto font-bold text-rose-700">7%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task 2.12: Recent Submissions & AI Auto-Grading */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--brand)]" />
              Bài nộp cần chấm & Phản hồi (AI Auto-Grading & Review)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động phân tích câu trả lời bằng AI và cho phép giáo viên điều chỉnh, ghi nhận xét trực tiếp.
            </p>
          </div>
        </div>

        {loadingAnalytics ? (
          <div className="py-12 flex justify-center items-center text-slate-400 text-xs">
            Đang tải danh sách bài nộp...
          </div>
        ) : !analytics?.recent_submissions || analytics.recent_submissions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <ClipboardList size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
            Chưa có bài nộp nào cần xử lý.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3">Học sinh</th>
                  <th className="py-3 px-3">Bài luyện / Đề thi</th>
                  <th className="py-3 px-3">Điểm số</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Phản hồi AI / GV</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.recent_submissions.map((sub: any) => {
                  const isGrading = gradingId === sub.id;
                  const hasReviewed = sub.teacher_reviewed;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {sub.student_name || "Học sinh"}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {sub.quiz_title || sub.title || `Bài tập #${sub.quiz_id || sub.id}`}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {sub.score !== null ? `${sub.score}/${sub.max_score || 100}` : "Chưa chấm"}
                      </td>
                      <td className="py-3 px-3">
                        {hasReviewed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            <Check size={10} /> Đã duyệt
                          </span>
                        ) : sub.ai_feedback ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                            <Sparkles size={10} /> AI đã chấm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            Chờ chấm
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-[11px] text-slate-500">
                        {sub.teacher_feedback ? (
                          <span className="text-emerald-700 font-medium">GV: {sub.teacher_feedback}</span>
                        ) : sub.ai_feedback ? (
                          <span className="text-blue-700">AI: {sub.ai_feedback}</span>
                        ) : (
                          <span className="italic text-slate-400">Chưa có nhận xét</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleAIGrade(sub.id)}
                            disabled={isGrading}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                            title="AI tự động phân tích và cho điểm đề xuất"
                          >
                            <Sparkles size={12} className={isGrading ? "animate-spin" : ""} />
                            {isGrading ? "Đang chấm..." : "AI Chấm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewSub(sub);
                              setReviewScore(sub.score ?? 80);
                              setReviewFeedback(sub.teacher_feedback || sub.ai_feedback || "");
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition flex items-center gap-1"
                          >
                            <Edit3 size={12} />
                            Nhận xét
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewSub && (
        <div
          className="fixed inset-0 !mt-0 !m-0 top-0 left-0 right-0 bottom-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Chấm điểm & Nhận xét bài làm
                </h3>
                <p className="text-xs text-slate-500">
                  Học sinh: {reviewSub.student_name} · {reviewSub.quiz_title || "Bài tập"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewSub(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {reviewSub.ai_feedback && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                  <Sparkles size={13} />
                  <span>Đề xuất từ AI:</span>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed">
                  {reviewSub.ai_feedback}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Điểm số (thang điểm {reviewSub.max_score || 100})
                </label>
                <input
                  type="number"
                  min={0}
                  max={reviewSub.max_score || 100}
                  value={reviewScore}
                  onChange={e => setReviewScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nhận xét của Giáo viên gửi học sinh
                </label>
                <textarea
                  rows={4}
                  value={reviewFeedback}
                  onChange={e => setReviewFeedback(e.target.value)}
                  placeholder="Ghi nhận xét cụ thể, động viên học sinh và chỉ ra lỗi cần khắc phục..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewSub(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="px-5 py-2 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingReview ? "Đang lưu..." : "Lưu kết quả & Gửi học sinh"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl p-6 space-y-4 animate-duo-pop">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Megaphone size={18} className="text-purple-600" />
                Phát thông báo đến học sinh toàn lớp
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ví dụ: Nhắc nhở hạn nộp bài tập Tuần 4 trước 22h tối nay"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Nhập lời dặn dò, hướng dẫn hoàn thành bài hoặc thông tin quan trọng gửi học sinh..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isSendingBroadcast || !broadcastTitle.trim() || !broadcastContent.trim()}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={14} />
                {isSendingBroadcast ? "Đang gửi..." : "Gửi thông báo ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewTab;
