"use client";
import React, { useState, useEffect } from "react";
import { BarChart3, Trophy, CheckCircle2, TrendingUp } from "lucide-react";
import { EmptyState } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

interface ScoresTabProps {
  API_URL: string;
}

export default function ScoresTab({ API_URL }: ScoresTabProps) {
  const { token, authFetch } = useAuth();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/scores`);
        if (res.ok) setScores(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token, authFetch, API_URL]);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );

  if (scores.length === 0) {
    return (
      <div className="app-card">
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="Chưa có kết quả nào"
          body="Hoàn thành bài tập & bài kiểm tra để xem điểm số tại đây."
        />
      </div>
    );
  }

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
  ];
  const colorMap: Record<string, { icon: string; bg: string }> = {
    indigo: { icon: "text-[var(--brand)]", bg: "bg-[var(--brand-soft)]" },
    green:  { icon: "text-green-600",  bg: "bg-green-50" },
    yellow: { icon: "text-yellow-600", bg: "bg-yellow-50" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const col = colorMap[card.color];
          return (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className={`w-10 h-10 ${col.bg} rounded-xl flex items-center justify-center mb-3`}>
                <card.icon size={19} className={col.icon} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--brand)]" />
          <h3 className="font-semibold text-gray-900">Chi tiết kết quả</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {scores.map((s) => {
            const pct = s.max_score > 0 ? Math.round(s.score / s.max_score * 100) : 0;
            const col = getScoreColor(pct);
            return (
              <div key={s.id} className="px-5 py-4 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{s.assignment_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.class_name} · {new Date(s.submitted_at).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${col.bg} ${col.text} border ${col.border} flex-shrink-0 ml-4`}>
                    {s.score}/{s.max_score} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${col.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
