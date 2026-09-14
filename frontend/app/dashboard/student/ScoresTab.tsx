"use client";
import React, { useState, useEffect } from "react";
import { 
  BarChart3, Trophy, CheckCircle2, TrendingUp, Sparkles, 
  GraduationCap, Clock, Award, Users, ChevronRight, CheckCircle, 
  AlertCircle, HelpCircle, X
} from "lucide-react";
import { EmptyState, Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import BadgesCard from "./BadgesCard";

interface ScoresTabProps {
  API_URL: string;
}

export default function ScoresTab({ API_URL }: ScoresTabProps) {
  const { token, user, authFetch, refreshUser } = useAuth();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Leaderboard state
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "week" | "month" | "class">("all");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Points history state
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);

  // Placement Test state
  const [placementStatus, setPlacementStatus] = useState<any>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [placementQuestions, setPlacementQuestions] = useState<any[]>([]);
  const [placementAnswers, setPlacementAnswers] = useState<Record<string, number>>({});
  const [submittingTest, setSubmittingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Fetch student scores
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/scores`);
        if (res.ok) setScores(await res.json());
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    })();
  }, [token, authFetch, API_URL]);

  // Fetch placement status
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/placement-test/status`);
        if (res.ok) setPlacementStatus(await res.json());
      } catch (e) {}
    })();
  }, [token, authFetch, API_URL]);

  // Fetch points history
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/points/history?limit=15`);
        if (res.ok) setPointsHistory(await res.json());
      } catch (e) {}
    })();
  }, [token, authFetch, API_URL]);

  // Fetch leaderboard whenever filter changes
  useEffect(() => {
    (async () => {
      setLoadingLeaderboard(true);
      try {
        const res = await authFetch(`${API_URL}/student/leaderboard?period=${leaderboardPeriod}`);
        if (res.ok) setLeaderboard(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLeaderboard(false);
      }
    })();
  }, [leaderboardPeriod, token, authFetch, API_URL]);

  // Start placement test
  const startPlacementTest = async () => {
    try {
      const res = await authFetch(`${API_URL}/student/placement-test`);
      if (res.ok) {
        const data = await res.json();
        setPlacementQuestions(data.questions || []);
        setPlacementAnswers({});
        setTestResult(null);
        setShowPlacementModal(true);
      }
    } catch (e) {
      alert("Không thể tải bài kiểm tra. Vui lòng thử lại sau.");
    }
  };

  // Submit placement test
  const submitPlacementTest = async () => {
    if (Object.keys(placementAnswers).length === 0) {
      alert("Vui lòng trả lời ít nhất 1 câu hỏi!");
      return;
    }
    setSubmittingTest(true);
    try {
      const res = await authFetch(`${API_URL}/student/placement-test/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: placementAnswers }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        setPlacementStatus({
          completed: true,
          score: data.score,
          total_questions: data.total_questions,
          cefr_level: data.cefr_level,
        });
        refreshUser();
      }
    } catch (e) {
      alert("Lỗi khi gửi bài kiểm tra!");
    } finally {
      setSubmittingTest(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
  );

  const totalScore = scores.reduce((s, r) => s + r.score, 0);
  const totalMax = scores.reduce((s, r) => s + r.max_score, 0);
  const avgPercent = totalMax > 0 ? Math.round(totalScore / totalMax * 100) : 0;
  const excellentCount = scores.filter(s => s.max_score > 0 && Math.round(s.score / s.max_score * 100) >= 80).length;

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return { text: "text-green-600", bg: "bg-green-50", bar: "bg-green-500", border: "border-green-100" };
    if (pct >= 50) return { text: "text-yellow-600", bg: "bg-yellow-50", bar: "bg-yellow-400", border: "border-yellow-100" };
    return { text: "text-red-600", bg: "bg-red-50", bar: "bg-red-500", border: "border-red-100" };
  };

  const statCards = [
    { label: "Bài đã làm", value: scores.length, icon: CheckCircle2, color: "indigo" },
    { label: "Điểm trung bình", value: `${avgPercent}%`, icon: BarChart3, color: "green" },
    { label: "Xuất sắc (≥80%)", value: excellentCount, icon: Trophy, color: "yellow" },
    { 
      label: "Trình độ CEFR", 
      value: placementStatus?.cefr_level || (user as any)?.cefr_level || "B1", 
      icon: GraduationCap, 
      color: "purple" 
    },
  ];

  const colorMap: Record<string, { icon: string; bg: string }> = {
    indigo: { icon: "text-[var(--brand)]", bg: "bg-[var(--brand-soft)]" },
    green:  { icon: "text-green-600",  bg: "bg-green-50" },
    yellow: { icon: "text-yellow-600", bg: "bg-yellow-50" },
    purple: { icon: "text-purple-600", bg: "bg-purple-50" },
  };

  return (
    <div className="space-y-6">
      {/* 1. Stat Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const col = colorMap[card.color];
          return (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className={`w-10 h-10 ${col.bg} rounded-xl flex items-center justify-center mb-3`}>
                <card.icon size={19} className={col.icon} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* 2. Placement Test Banner (Phase 1.13) */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <Sparkles size={12} /> Đánh giá năng lực chuẩn CEFR
            </div>
            <h3 className="text-lg sm:text-xl font-bold">
              {placementStatus?.completed 
                ? `Trình độ hiện tại của bạn: ${placementStatus.cefr_level} (${placementStatus.score}/${placementStatus.total_questions} điểm)`
                : "Kiểm tra phân loại đầu vào (Placement Test)"}
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              {placementStatus?.completed
                ? "Bạn đã hoàn thành bài kiểm tra phân loại. Có thể làm lại bất kỳ lúc nào để cập nhật trình độ và nhận đề xuất bài tập thích ứng!"
                : "Làm bài test 15 câu hỏi nhanh để xác định trình độ A1-C1 của bạn và nhận ngay 50 điểm thưởng!"}
            </p>
          </div>
          <button
            onClick={startPlacementTest}
            className="self-start sm:self-center shrink-0 bg-white text-indigo-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition active:scale-95"
          >
            {placementStatus?.completed ? "Làm lại bài Test" : "Bắt đầu Test ngay (50 pts)"}
          </button>
        </div>
      </div>

      {/* 3. Grid: Leaderboard & Points Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaderboard with Filters (Phase 1.10) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Bảng Xếp Hạng</h3>
            </div>
            {/* Filter Period Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl gap-1 text-xs font-semibold">
              {[
                { id: "all", label: "Toàn trường" },
                { id: "week", label: "Tuần này" },
                { id: "month", label: "Tháng này" },
                { id: "class", label: "Lớp học" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLeaderboardPeriod(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    leaderboardPeriod === tab.id
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 flex-1 overflow-y-auto max-h-[420px]">
            {loadingLeaderboard ? (
              <div className="p-8 text-center text-gray-400 text-sm animate-pulse">
                Đang tải bảng xếp hạng...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Chưa có dữ liệu xếp hạng cho chu kỳ này.
              </div>
            ) : (
              leaderboard.map((item, idx) => {
                const isCurrentUser = user && (item.id === user.id || item.name === user.name);
                const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                return (
                  <div
                    key={idx}
                    className={`px-4 sm:px-5 py-3 flex items-center justify-between transition ${
                      isCurrentUser ? "bg-blue-50/60 dark:bg-blue-900/20 font-semibold" : "hover:bg-gray-50 dark:hover:bg-gray-750"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {rankIcon}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                        {item.name ? item.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-1.5">
                          {item.name}
                          {isCurrentUser && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                              Bạn
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {item.points || 0} pts
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Points Activity Feed (Phase 1.11) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Clock size={16} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Lịch Sử Tích Điểm</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50 flex-1 overflow-y-auto max-h-[420px]">
            {pointsHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                Chưa có lịch sử tích điểm. Hoàn thành bài quiz hoặc placement test để tích điểm!
              </div>
            ) : (
              pointsHistory.map((log) => (
                <div key={log.id} className="p-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[170px]">
                      {log.action}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      +{log.points} pts
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                      {log.details}
                    </p>
                  )}
                  <span className="text-[10px] text-gray-400 block mt-1">
                    {new Date(log.created_at).toLocaleDateString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Assignment Scores List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--brand)]" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Chi tiết kết quả bài tập</h3>
        </div>
        {scores.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<BarChart3 size={28} />}
              title="Chưa có kết quả nào"
              body="Hoàn thành bài tập & bài kiểm tra để xem điểm số tại đây."
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {scores.map((s) => {
              const pct = s.max_score > 0 ? Math.round(s.score / s.max_score * 100) : 0;
              const col = getScoreColor(pct);
              return (
                <div key={s.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{s.assignment_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.class_name} · {new Date(s.submitted_at).toLocaleDateString("vi-VN")}</p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${col.bg} ${col.text} border ${col.border} flex-shrink-0 ml-4`}>
                      {s.score}/{s.max_score} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${col.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Achievement Badges Section */}
      <BadgesCard API_URL={API_URL} />

      {/* 6. Placement Test Modal (Phase 1.13) */}
      {showPlacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-850 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                  <GraduationCap size={20} /> Bài Kiểm Tra Phân Loại CEFR (Placement Test)
                </h3>
                <p className="text-xs text-blue-100">15 câu hỏi đa kỹ năng: Ngữ pháp, Từ vựng & Đọc hiểu</p>
              </div>
              <button
                onClick={() => setShowPlacementModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {testResult ? (
                /* Results View */
                <div className="text-center space-y-5 animate-scale-up">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 text-3xl font-extrabold shadow-inner mx-auto">
                    {testResult.cefr_level}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      Trình độ của bạn: {testResult.cefr_level}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                      {testResult.level_description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400">Điểm số</p>
                      <p className="text-lg font-bold text-blue-600">{testResult.score}/{testResult.total_questions}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400">Tỷ lệ đúng</p>
                      <p className="text-lg font-bold text-emerald-600">{testResult.percentage}%</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-400">Thưởng</p>
                      <p className="text-lg font-bold text-amber-600">+{testResult.points_awarded} pts</p>
                    </div>
                  </div>

                  {/* Review Questions */}
                  <div className="text-left space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h5 className="font-bold text-sm text-gray-800 dark:text-gray-200">Chi tiết đáp án:</h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {testResult.review?.map((r: any, idx: number) => (
                        <div key={idx} className={`p-3 rounded-lg text-xs border ${r.is_correct ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"}`}>
                          <p className="font-semibold text-gray-900">{idx + 1}. {r.question}</p>
                          <p className="mt-1">
                            <span className="text-gray-500">Bạn chọn: </span>
                            <span className={r.is_correct ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>{r.chosen}</span>
                            {!r.is_correct && (
                              <span className="ml-2 text-emerald-700 font-bold">✓ Đáp án đúng: {r.correct_answer}</span>
                            )}
                          </p>
                          <p className="text-gray-500 mt-0.5 italic">{r.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Questions Form */
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium pb-2 border-b border-gray-100 dark:border-gray-700">
                    <span>Đã làm: {Object.keys(placementAnswers).length}/{placementQuestions.length} câu</span>
                    <span className="text-blue-600 font-semibold">Tích lũy: +50 pts khi hoàn thành</span>
                  </div>

                  {placementQuestions.map((q, idx) => (
                    <div key={q.id} className="space-y-2.5 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                          Câu {idx + 1} ({q.level})
                        </span>
                        <span className="text-[11px] text-gray-400 capitalize">{q.category}</span>
                      </div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{q.question}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isSelected = placementAnswers[String(q.id)] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => setPlacementAnswers(prev => ({ ...prev, [String(q.id)]: optIdx }))}
                              className={`text-left text-xs px-3.5 py-2.5 rounded-lg border transition font-medium flex items-center gap-2 ${
                                isSelected 
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs" 
                                  : "bg-white dark:bg-gray-750 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${isSelected ? "border-white bg-white text-blue-600 font-bold" : "border-gray-300"}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
              {testResult ? (
                <Button intent="brand" onClick={() => setShowPlacementModal(false)}>
                  Hoàn tất & Đóng
                </Button>
              ) : (
                <>
                  <Button intent="ghost" onClick={() => setShowPlacementModal(false)}>
                    Hủy
                  </Button>
                  <Button
                    intent="brand"
                    onClick={submitPlacementTest}
                    loading={submittingTest}
                    disabled={submittingTest || Object.keys(placementAnswers).length === 0}
                  >
                    Nộp bài & Chấm điểm
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
