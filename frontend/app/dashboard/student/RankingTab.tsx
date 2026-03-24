"use client";
import React, { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface RankingTabProps {
  API_URL: string;
}

export default function RankingTab({ API_URL }: RankingTabProps) {
  const { token, authFetch } = useAuth();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/ranking`);
        if (res.ok) setRanking(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token, authFetch, API_URL]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-in fade-in zoom-in-95 duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Trophy className="text-yellow-500" /> Bảng xếp hạng toàn cầu</h2>
      <div className="space-y-3">
        {ranking.map((r, i) => (
          <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${i === 0 ? 'bg-yellow-50 border-yellow-200' : i === 1 ? 'bg-gray-50 border-gray-200' : i === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-50'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {i + 1}
              </div>
              <p className="font-bold text-gray-800">{r.name}</p>
            </div>
            <p className="font-extrabold text-blue-600">{r.points} pts</p>
          </div>
        ))}
      </div>
    </div>
  );
}
