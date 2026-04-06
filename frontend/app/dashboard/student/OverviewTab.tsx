"use client";
import React, { useState, useEffect } from "react";
import { 
  GraduationCap, Clock, BookMarked, Layers, BarChart3, Trophy, BrainCircuit 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface OverviewTabProps {
  API_URL: string;
}

export default function OverviewTab({ API_URL }: OverviewTabProps) {
  const { token, user, authFetch } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const STATS_CACHE_KEY = "student_overview_stats_cache";
  const STATS_CACHE_TTL_MS = 20 * 1000;

  useEffect(() => {
    (async () => {
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
            if (typeof window !== "undefined") {
              sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ ts: now, data }));
            }
          } catch {}
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token, authFetch, API_URL]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  const cards = [
    { label: "Lớp học", value: stats?.classes_enrolled ?? 0, icon: GraduationCap, color: "blue" },
    { label: "Bài cần làm", value: stats?.assignments_pending ?? 0, icon: Clock, color: "orange" },
    { label: "Từ vựng", value: stats?.vocab_count ?? 0, icon: BookMarked, color: "indigo" },
    { label: "Cần ôn tập", value: stats?.review_needed ?? 0, icon: Layers, color: "purple" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold mb-2">Chào mừng trở lại, {user?.name}! 🎓</h2>
          <p className="text-blue-100 text-lg">Tiếp tục hành trình học tập thông minh với iEdu.</p>
        </div>
        <div className="absolute right-4 bottom-4 flex items-center gap-3 bg-white/15 backdrop-blur-sm px-5 py-3 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-blue-100 uppercase font-medium">Điểm TB</p>
            <p className="text-2xl font-extrabold flex items-center"><Trophy size={20} className="mr-1 text-yellow-300" />{stats?.average_percent ?? 0}%</p>
          </div>
        </div>
        <BrainCircuit className="absolute -right-8 -bottom-8 text-white/10 w-48 h-48" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const colors: Record<string, string> = {
            blue: "bg-blue-50 text-blue-600",
            purple: "bg-purple-50 text-purple-600",
            indigo: "bg-indigo-50 text-indigo-600",
            orange: "bg-orange-50 text-orange-600",
          };
          return (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className={`w-10 h-10 ${colors[c.color]} rounded-lg flex items-center justify-center mb-3`}>
                <c.icon size={20} />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </div>
          );
        })}
      </div>

      {stats && stats.assignments_submitted > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-blue-600" /> Tổng kết điểm số</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.total_score}/{stats.total_max_score}</p>
              <p className="text-sm text-gray-500 mt-1">Tổng điểm</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-green-600">{stats.average_percent}%</p>
              <p className="text-sm text-gray-500 mt-1">Điểm trung bình</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-purple-600">{stats.assignments_submitted}</p>
              <p className="text-sm text-gray-500 mt-1">Bài đã hoàn thành</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
