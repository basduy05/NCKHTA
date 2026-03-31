"use client";
import React, { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, Clock, Sparkles, Layers, Lightbulb, AlertCircle 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface RoadmapTabProps {
  API_URL: string;
}

export default function RoadmapTab({ API_URL }: RoadmapTabProps) {
  const { token, authFetch } = useAuth();
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadmap = useCallback(async (refresh = false) => {
    if (!refresh) setLoading(true);
    setError(null);
    try {
      const url = refresh ? `${API_URL}/student/roadmap?refresh=true` : `${API_URL}/student/roadmap`;
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setRoadmap(data);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || "Không thể tạo lộ trình lúc này.");
      }
    } catch (e) {
      setError("Lỗi kết nối máy chủ AI.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, API_URL]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-500 font-medium">Đang chuẩn bị lộ trình học tập cá nhân...</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
      <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
      <h3 className="text-xl font-bold text-red-700 mb-2">Oops! Có lỗi xảy ra</h3>
      <p className="text-red-600 mb-6">{error}</p>
      <button onClick={() => fetchRoadmap()} className="btn-primary px-8 py-3 rounded-xl shadow-lg">Thử lại</button>
    </div>
  );

  if (!roadmap) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* 1. Profile Summary Card (What we know about you) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <TrendingUp size={24} />
              </div>
              <span className="text-blue-100 font-bold tracking-widest uppercase text-sm">AI Learning Path</span>
            </div>
            <h2 className="text-4xl font-black mb-4 leading-tight">{roadmap.title}</h2>
            <p className="text-blue-50 text-xl font-medium leading-relaxed mb-6 opacity-90">{roadmap.summary_vn}</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                <Clock size={18} className="text-blue-200" />
                <span className="font-bold">{roadmap.estimated_completion}</span>
              </div>
              {roadmap._from_cache && (
                <div className="text-xs text-blue-100/60 font-medium italic">
                  * Lộ trình đã được lưu (Sẽ tự động cập nhật khi bạn tiến bộ)
                </div>
              )}
            </div>
          </div>
          <Sparkles className="absolute -right-12 -top-12 text-white/10 w-64 h-64" />
        </div>

        {/* System Profile Statistics */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
           <div>
             <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Dữ liệu hiện tại</h4>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-500">Từ vựng</span>
                   <span className="text-lg font-black text-blue-600">{roadmap.user_stats?.vocab_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-500">Điểm số</span>
                   <span className="text-lg font-black text-indigo-600">{roadmap.user_stats?.points || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-500">Trình độ</span>
                   <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-md font-bold text-xs">
                     {roadmap.user_stats?.current_level || "B1"}
                   </span>
                </div>
             </div>
           </div>
           <p className="text-[10px] text-gray-400 mt-4 italic leading-tight">
             AI sẽ tự động đổi lộ trình khi bạn học thêm 20 từ hoặc +500 điểm.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Layers className="text-blue-600" /> Các giai đoạn học tập
          </h3>
          <div className="space-y-4 relative">
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-200 to-transparent"></div>
            {roadmap.phases?.map((phase: any, i: number) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative ml-14">
                <div className="absolute -left-[45px] top-6 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-200 ring-4 ring-white z-10 transition-transform group-hover:scale-110">
                  {i + 1}
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-xl font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors">{phase.name}</h4>
                    <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                      <Clock size={14} /> Thời gian dự kiến: {phase.duration}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {phase.focus_topics?.map((topic: string, j: number) => (
                      <span key={j} className="text-[10px] uppercase tracking-wider font-black px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {phase.tasks_vn?.map((task: string, j: number) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <p className="text-gray-700 text-sm font-medium">{task}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-6">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Lightbulb className="text-yellow-500" /> Lời khuyên từ AI
              </h3>
              <div className="space-y-4">
                {roadmap.tips_vn?.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 shadow-sm shadow-yellow-100/50">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <span className="text-lg">💡</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed font-medium">{tip}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-100 bg-gradient-to-b from-transparent to-blue-50/30 rounded-b-3xl -mx-6 -mb-6 p-6 px-12">
                 <button 
                  onClick={() => fetchRoadmap(true)} 
                  disabled={loading}
                  className="w-full bg-white text-blue-600 border border-blue-100 py-3.5 rounded-2xl font-bold text-sm shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                 >
                    <Sparkles size={16} className={loading ? "animate-spin" : "group-hover:animate-pulse"} /> 
                    {loading ? "Đang tính toán..." : "Yêu cầu AI lập lại lộ trình"}
                 </button>
                 <p className="text-[10px] text-gray-400 text-center mt-3 font-medium uppercase tracking-widest">Powered by AI Education</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
