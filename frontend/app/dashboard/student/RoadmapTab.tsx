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
  const [streamingText, setStreamingText] = useState("");

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStreamingText("");
    try {
      const res = await authFetch(`${API_URL}/student/roadmap`);
      if (res.ok) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "");
              if (dataStr === "[DONE]") continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.status === "generating") {
                  setStreamingText(prev => (prev + (data.chunk || "")).slice(-500));
                } else if (data.title) {
                  setRoadmap(data);
                }
              } catch (e) {}
            }
          }
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
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-[3rem] p-10 border border-slate-700 shadow-2xl overflow-hidden relative group min-h-[400px] flex flex-col justify-center">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.8)]"></div>
            <h3 className="text-cyan-400 font-mono text-sm font-bold uppercase tracking-[0.2em]">Neural Roadmap Architect</h3>
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-800"></span>
            <span className="w-2 h-2 rounded-full bg-slate-800"></span>
            <span className="w-2 h-2 rounded-full bg-slate-800"></span>
          </div>
        </div>
        
        <div className="font-mono text-sm text-cyan-50/60 h-48 overflow-hidden relative">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none z-10"></div>
          <p className="whitespace-pre-wrap break-all leading-relaxed">
            {streamingText || "> Initializing pedagogical analysis...\n> Retrieving vocabulary mastery data...\n> Constructing optimal learning vectors...\n> Waiting for AI sequence stream..."}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500/30 border-t-cyan-500"></div>
            <span className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Processing Data Chunks</span>
          </div>
          <span className="text-slate-700 font-mono text-[10px]">v.roadmap-alpha-9</span>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
      <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
      <h3 className="text-xl font-bold text-red-700 mb-2">Oops! Có lỗi xảy ra</h3>
      <p className="text-red-600 mb-6">{error}</p>
      <button onClick={fetchRoadmap} className="btn-primary px-8 py-3 rounded-xl shadow-lg">Thử lại</button>
    </div>
  );

  if (!roadmap) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
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
          </div>
        </div>
        <Sparkles className="absolute -right-12 -top-12 text-white/10 w-64 h-64" />
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
                 <button onClick={fetchRoadmap} className="w-full bg-white text-blue-600 border border-blue-100 py-3.5 rounded-2xl font-bold text-sm shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2 group">
                    <Sparkles size={16} className="group-hover:animate-pulse" /> Cập nhật lộ trình mới
                 </button>
                 <p className="text-[10px] text-gray-400 text-center mt-3 font-medium uppercase tracking-widest">Powered by AI Education</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
