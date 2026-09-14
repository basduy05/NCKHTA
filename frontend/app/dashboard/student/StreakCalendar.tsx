import React, { useEffect, useState } from "react";
import { Flame, Calendar, RefreshCw, Award, CheckCircle2, Zap, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

interface DayData {
  date: string;
  count: number;
}

interface StreakCalendarData {
  streak_days: number;
  total_reviews: number;
  calendar: DayData[];
}

export default function StreakCalendar({ API_URL }: { API_URL: string }) {
  const { authFetch, refreshUser } = useAuth();
  const { showAlert } = useNotification();
  const [data, setData] = useState<StreakCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

  const fetchStreak = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/student/streak-calendar?days=63`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching streak calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const res = await authFetch(`${API_URL}/student/streak/milestones`);
      if (res.ok) {
        const json = await res.json();
        setMilestones(json.milestones || []);
      }
    } catch (err) {
      console.warn("Error fetching streak milestones:", err);
    }
  };

  const handleClaimMilestone = async (days: number) => {
    try {
      setClaimingMilestone(days);
      const res = await authFetch(`${API_URL}/student/streak/claim-milestone`, {
        method: "POST",
        body: JSON.stringify({ milestone_days: days })
      });
      if (res.ok) {
        const json = await res.json();
        showAlert(json.message || `Đã nhận phần thưởng mốc ${days} ngày!`, "success");
        await fetchMilestones();
        refreshUser();
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert(err.detail || "Không thể nhận thưởng lúc này", "warning");
      }
    } catch (err) {
      showAlert("Lỗi kết nối máy chủ", "error");
    } finally {
      setClaimingMilestone(null);
    }
  };

  useEffect(() => {
    fetchStreak();
    fetchMilestones();
  }, []);

  // Intensity color
  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    if (count <= 3) return "bg-emerald-200 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-800";
    if (count <= 8) return "bg-emerald-400 dark:bg-emerald-600 border-emerald-500 text-white";
    if (count <= 15) return "bg-emerald-500 dark:bg-emerald-500 border-emerald-600 text-white";
    return "bg-emerald-700 dark:bg-emerald-400 border-emerald-800 text-white";
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-base">
              Chuỗi ngày học (Daily Streak)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-semibold">
                {data?.streak_days || 0} ngày liên tiếp
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tổng cộng {data?.total_reviews || 0} lượt ôn tập trong 60 ngày gần nhất
            </p>
          </div>
        </div>

        <button
          onClick={fetchStreak}
          disabled={loading}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300"
          title="Làm mới lịch học"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Cập nhật</span>
        </button>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[580px]">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 justify-start">
            {data?.calendar?.map((day, idx) => {
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-4 h-4 rounded-[4px] border transition-transform duration-150 hover:scale-125 cursor-pointer ${getColor(
                    day.count
                  )}`}
                  title={`${day.date}: ${day.count} lượt ôn tập`}
                />
              );
            })}
          </div>

          {/* Legend and Tooltip */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span>Ít hơn</span>
              <div className="w-3 h-3 rounded-[3px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-900 border border-emerald-300" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-400 border border-emerald-500" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-600 border border-emerald-700" />
              <span>Nhiều hơn</span>
            </div>

            <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {hoveredDay ? (
                <span>
                  <strong>{hoveredDay.count}</strong> từ ôn tập vào ngày {hoveredDay.date}
                </span>
              ) : (
                <span className="text-gray-400">Rê chuột vào ô để xem chi tiết ngày học</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Streak Milestone Rewards (Phase 2 - Task 2.14) */}
      {milestones && milestones.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Cột Mốc Thưởng Chuỗi Học (Streak Milestones)
            </h4>
            <span className="text-xs text-gray-400">
              Duy trì chuỗi học để mở khóa huy hiệu và điểm tích lũy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {milestones.map((ms: any) => {
              return (
                <div
                  key={ms.days}
                  className={`p-3.5 rounded-xl border transition-all ${
                    ms.claimed
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                      : ms.eligible
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-400/40"
                      : "bg-gray-50/60 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{ms.icon}</span>
                      <div>
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 block leading-tight">
                          {ms.days} Ngày
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {ms.title.split("(")[0]}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                      +{ms.points}đ
                    </span>
                  </div>

                  {/* Progress towards milestone */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                      <span>Tiến độ</span>
                      <span>{ms.current_streak}/{ms.days} ngày ({ms.progress_percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          ms.claimed ? "bg-amber-500" : ms.eligible ? "bg-emerald-500" : "bg-blue-600"
                        }`}
                        style={{ width: `${ms.progress_percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    {ms.claimed ? (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Đã nhận thưởng
                      </span>
                    ) : ms.eligible ? (
                      <button
                        type="button"
                        onClick={() => handleClaimMilestone(ms.days)}
                        disabled={claimingMilestone === ms.days}
                        className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg shadow-sm transition active:scale-95 flex items-center gap-1.5"
                      >
                        {claimingMilestone === ms.days ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                        <span>Nhận +{ms.points}đ</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">
                        Còn {Math.max(0, ms.days - ms.current_streak)} ngày nữa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
