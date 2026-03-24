"use client";
import React, { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  if (scores.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
        <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có kết quả nào</h3>
        <p className="text-gray-500">Hoàn thành bài tập để xem kết quả tại đây.</p>
      </div>
    );
  }

  const totalScore = scores.reduce((s, r) => s + r.score, 0);
  const totalMax = scores.reduce((s, r) => s + r.max_score, 0);
  const avgPercent = totalMax > 0 ? Math.round(totalScore / totalMax * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-blue-600">{scores.length}</p>
          <p className="text-sm text-gray-500">Bài đã làm</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-green-600">{totalScore}/{totalMax}</p>
          <p className="text-sm text-gray-500">Tổng điểm</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-purple-600">{avgPercent}%</p>
          <p className="text-sm text-gray-500">Trung bình</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Bài tập</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Lớp</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Điểm</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scores.map((s) => {
                const pct = s.max_score > 0 ? Math.round(s.score / s.max_score * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">{s.assignment_title}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{s.class_name}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {s.score}/{s.max_score}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-500">
                      {new Date(s.submitted_at).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
