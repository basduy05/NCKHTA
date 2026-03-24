"use client";

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Volume2, Search, Sparkles, Brain } from 'lucide-react';

interface PracticeTabProps {
  authFetch: any;
  API_URL: string;
}

export function PracticeTab({ authFetch, API_URL }: PracticeTabProps) {
  const [activePractice, setActivePractice] = useState<"general" | "pronunciation" | "listening">("general");
  const [practiceData, setPracticeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPractice = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/student/practice?type=${activePractice}`);
      if (res.ok) setPracticeData(await res.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPractice();
  }, [activePractice]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="text-emerald-600" size={20} />
            Luyện tập tương tác (Practice)
          </h2>
          <p className="text-gray-500 text-sm">Chọn chế độ luyện tập phù hợp với mục tiêu của bạn.</p>
        </div>
        <div className="flex gap-2">
          {["general", "pronunciation", "listening"].map(t => (
            <button key={t} onClick={() => setActivePractice(t as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activePractice === t ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? <p className="text-center py-10 text-gray-400">Đang tải...</p> : practiceData.length === 0 ? <p className="text-center py-10 text-gray-400">Chưa có bài tập nào.</p> : practiceData.map((p, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
               <h3 className="font-bold text-lg text-slate-800 mb-2">{p.title || "Bài luyện tập"}</h3>
               <p className="text-sm text-gray-600">{p.description}</p>
            </div>
            <button className="mt-6 bg-indigo-50 text-indigo-600 font-bold py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">Bắt đầu ngay</button>
          </div>
        ))}
      </div>
    </div>
  );
}
