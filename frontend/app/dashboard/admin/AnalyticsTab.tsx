"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, Users, AlertTriangle, ShieldCheck,
  Sparkles, RefreshCw, ArrowDownRight, Layers, Award,
  Send, Gift, Search, Filter, CheckCircle2, ChevronRight
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useNotification } from "@/app/context/NotificationContext";

interface FunnelStage {
  stage: string;
  count: number;
  conversion_rate: number;
  drop_off_rate: number;
  color: string;
}

interface HeatmapRow {
  feature_id: string;
  feature_name: string;
  domain: string;
  total_usage: number;
  adoption_rate: number;
  daily_intensity: Array<{ day: string; value: number }>;
}

interface ChurnPrediction {
  user_id: number;
  name: string;
  email: string;
  cefr_level: string;
  points: number;
  streak: number;
  credits_ai: number;
  last_study_date: string;
  risk_score: number;
  risk_level: "high" | "medium" | "low";
  recommended_action: string;
}

interface AnalyticsData {
  summary: {
    total_students: number;
    high_risk_count: number;
    medium_risk_count: number;
    healthy_count: number;
  };
  funnel: FunnelStage[];
  heatmap: HeatmapRow[];
  churn_predictions: ChurnPrediction[];
}

export default function AnalyticsTab({ API_URL }: { API_URL: string }) {
  const { authFetch } = useAuth();
  const { showAlert } = useNotification();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state for churn table
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_URL}/admin/analytics`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Failed to load BI analytics", err);
      setError("Không thể tải dữ liệu phân tích BI. Vui lòng kiểm tra kết nối backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleTriggerAction = (student: ChurnPrediction) => {
    showAlert(`Đã kích hoạt hành động giữ chân cho ${student.name}: "${student.recommended_action}"`, "success");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)]" />
        <p className="text-xs font-semibold text-[var(--ink-3)]">Đang phân tích dữ liệu Business Intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center space-y-3">
        <AlertTriangle size={28} className="mx-auto text-red-500" />
        <p className="text-sm font-semibold">{error || "Không có dữ liệu"}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const filteredStudents = data.churn_predictions.filter((s) => {
    if (riskFilter !== "all" && s.risk_level !== riskFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        s.cefr_level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-[var(--brand)] border border-blue-100">
              <BarChart3 size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[var(--ink-1)]">
                Business Intelligence & Analytics (Phase 4)
              </h2>
              <p className="text-xs text-[var(--ink-3)]">
                Phân tích chuyển đổi Funnel, Heatmap sử dụng tính năng và Thuật toán AI dự đoán rời bỏ (Churn Prediction)
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--line)] text-xs font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-3)] transition"
        >
          <RefreshCw size={13} />
          <span>Làm mới chỉ số</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between text-[var(--ink-3)] text-xs font-bold uppercase tracking-wider">
            <span>Tổng học viên</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-[var(--ink-1)] mt-2">
            {data.summary.total_students}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Dữ liệu hồ sơ active</p>
        </div>

        <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200/80 shadow-xs">
          <div className="flex items-center justify-between text-red-700 text-xs font-bold uppercase tracking-wider">
            <span>Nguy cơ cao (Churn Risk)</span>
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600 mt-2">
            {data.summary.high_risk_count}
          </p>
          <p className="text-[11px] text-red-700 font-semibold mt-0.5">Cần gửi nhắc nhở can thiệp</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
            <span>Cần chú ý (Medium Risk)</span>
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {data.summary.medium_risk_count}
          </p>
          <p className="text-[11px] text-amber-800 font-semibold mt-0.5">Giảm chuỗi học liên tiếp</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <span>Học viên tích cực (Healthy)</span>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {data.summary.healthy_count}
          </p>
          <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">Duy trì streak đều đặn</p>
        </div>
      </div>

      {/* ─── 1. CONVERSION FUNNEL (Đăng ký -> Ngày 1 -> Ngày 7 -> Ngày 30) ─── */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--ink-1)] flex items-center gap-2">
              <Layers size={18} className="text-[var(--brand)]" />
              <span>Conversion Funnel: Đăng ký → Ngày 1 → Ngày 7 → Ngày 30</span>
            </h3>
            <p className="text-xs text-[var(--ink-3)]">
              Theo dõi tỷ lệ người dùng quay lại và duy trì việc học theo chu kỳ thời gian
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {data.funnel.map((f, idx) => (
            <div
              key={f.stage}
              className="relative p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] space-y-2 overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: f.color }}
              />
              <div className="flex items-center justify-between text-xs font-bold text-[var(--ink-2)]">
                <span>Giai đoạn {idx + 1}</span>
                <span className="text-xs font-mono font-bold text-[var(--ink-1)]">
                  {f.count} users
                </span>
              </div>
              <p className="text-xs font-semibold text-[var(--ink-1)] line-clamp-1">{f.stage}</p>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--ink-3)]">Tỷ lệ chuyển đổi:</span>
                  <span className="font-extrabold text-[var(--brand)]">{f.conversion_rate}%</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, f.conversion_rate)}%`, backgroundColor: f.color }}
                  />
                </div>
              </div>

              {f.drop_off_rate > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold pt-1">
                  <ArrowDownRight size={12} />
                  <span>Rơi rụng {f.drop_off_rate}% so với mốc trước</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── 2. FEATURE ADOPTION HEATMAP ─── */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-[var(--ink-1)] flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <span>Feature Adoption Heatmap (Mức độ tiếp nhận tính năng)</span>
          </h3>
          <p className="text-xs text-[var(--ink-3)]">
            Mật độ tương tác của học viên trên từng phân hệ chức năng qua các ngày trong tuần
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--ink-3)] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Tính năng / Phân hệ</th>
                <th className="py-2.5 px-2 text-center">T2</th>
                <th className="py-2.5 px-2 text-center">T3</th>
                <th className="py-2.5 px-2 text-center">T4</th>
                <th className="py-2.5 px-2 text-center">T5</th>
                <th className="py-2.5 px-2 text-center">T6</th>
                <th className="py-2.5 px-2 text-center">T7</th>
                <th className="py-2.5 px-2 text-center">CN</th>
                <th className="py-2.5 px-3 text-right">Tổng lượt</th>
                <th className="py-2.5 px-3 text-right">Adoption Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {data.heatmap.map((row) => (
                <tr key={row.feature_id} className="hover:bg-[var(--surface-2)] transition">
                  <td className="py-2.5 px-3 font-semibold text-[var(--ink-1)]">
                    <span className="block">{row.feature_name}</span>
                    <span className="text-[10px] text-[var(--ink-3)] capitalize">Domain: {row.domain}</span>
                  </td>

                  {/* 7 Day Heatmap Cells */}
                  {row.daily_intensity.map((d) => {
                    // Shading calculation: higher value = deeper color
                    let bg = "bg-blue-50 text-blue-700";
                    if (d.value > 60) bg = "bg-blue-600 text-white font-bold";
                    else if (d.value > 40) bg = "bg-blue-400 text-white font-semibold";
                    else if (d.value > 20) bg = "bg-blue-200 text-blue-900";

                    return (
                      <td key={d.day} className="py-2.5 px-1.5 text-center">
                        <div
                          className={`w-9 h-7 mx-auto rounded-lg flex items-center justify-center text-[10px] transition-transform hover:scale-110 shadow-2xs ${bg}`}
                          title={`${row.feature_name} (${d.day}): ${d.value} lượt tương tác`}
                        >
                          {d.value}
                        </div>
                      </td>
                    );
                  })}

                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[var(--ink-1)]">
                    {row.total_usage}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {row.adoption_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 3. CHURN PREDICTION ENGINE ─── */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--ink-1)] flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span>Dự đoán Rủi ro Rời bỏ Học tập (Churn Prediction Engine)</span>
            </h3>
            <p className="text-xs text-[var(--ink-3)]">
              Mô hình chấm điểm nguy cơ (0-100) theo chuỗi học streak, điểm số, mức tiêu hao AI credits & gợi ý can thiệp
            </p>
          </div>

          {/* Risk Level Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-3)] rounded-xl self-start sm:self-auto">
            {(["all", "high", "medium", "low"] as const).map((lvl) => {
              const labelMap = {
                all: "Tất cả",
                high: "Nguy cơ cao",
                medium: "Cần chú ý",
                low: "An toàn",
              };
              const isSelected = riskFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setRiskFilter(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isSelected
                      ? "bg-white text-[var(--ink-1)] shadow-xs"
                      : "text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                  }`}
                >
                  {labelMap[lvl]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search input */}
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên học viên, email hoặc trình độ..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-xs text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:border-[var(--brand)] outline-none"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[var(--ink-3)] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Học viên</th>
                <th className="py-2.5 px-3">Trình độ</th>
                <th className="py-2.5 px-3">Điểm & Chuỗi streak</th>
                <th className="py-2.5 px-3">AI Credits</th>
                <th className="py-2.5 px-3">Ngày học gần nhất</th>
                <th className="py-2.5 px-3">Chỉ số rủi ro</th>
                <th className="py-2.5 px-3">Hành động giữ chân đề xuất</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Không tìm thấy học viên nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  let badge = {
                    text: "Cao (>70%)",
                    classes: "bg-red-100 text-red-800 border-red-200",
                  };
                  if (s.risk_level === "medium") {
                    badge = {
                      text: "Trung bình (40-70%)",
                      classes: "bg-amber-100 text-amber-800 border-amber-200",
                    };
                  } else if (s.risk_level === "low") {
                    badge = {
                      text: "An toàn (<40%)",
                      classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    };
                  }

                  return (
                    <tr key={s.user_id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="py-3 px-3">
                        <p className="font-bold text-[var(--ink-1)]">{s.name}</p>
                        <p className="text-[11px] text-[var(--ink-3)]">{s.email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[var(--brand)] border border-blue-100">
                          {s.cefr_level || "B1"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-[var(--ink-1)]">{s.points} pts</p>
                        <p className="text-[11px] text-amber-600 font-medium">🔥 {s.streak} ngày liên tiếp</p>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[var(--ink-2)]">
                        {s.credits_ai} cr
                      </td>
                      <td className="py-3 px-3 text-[var(--ink-3)]">
                        {s.last_study_date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.classes}`}>
                            {s.risk_score} pts
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs text-[var(--ink-2)]">
                        <p className="text-[11px] leading-relaxed italic">
                          💡 {s.recommended_action}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleTriggerAction(s)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-[11px] font-bold shadow-2xs transition flex items-center gap-1 ml-auto whitespace-nowrap"
                        >
                          <Send size={11} />
                          <span>Kích hoạt</span>
                        </button>
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
