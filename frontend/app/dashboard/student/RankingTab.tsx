"use client";
import React, { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface RankingTabProps {
  API_URL: string;
}

export default function RankingTab({ API_URL }: RankingTabProps) {
  const { token, authFetch, user } = useAuth();
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

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-gray-100 rounded-2xl" />
      <div className="h-48 bg-gray-100 rounded-2xl" />
      {Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
    </div>
  );

  const myRank = ranking.findIndex(r => r.name === user?.name) + 1;
  const top3 = ranking.slice(0, 3);

  const podiumOrder = [1, 0, 2];
  const podiumConfig = [
    { heightClass: "h-24", bg: "bg-yellow-400", ring: "ring-yellow-300", emoji: "🥇", label: "1st" },
    { heightClass: "h-16", bg: "bg-gray-300",   ring: "ring-gray-200",   emoji: "🥈", label: "2nd" },
    { heightClass: "h-12", bg: "bg-orange-400", ring: "ring-orange-300", emoji: "🥉", label: "3rd" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-yellow-100 text-sm font-medium mb-1">Thứ hạng của bạn</p>
            <h2 className="text-4xl font-bold">{myRank > 0 ? `#${myRank}` : "—"}</h2>
            <p className="text-yellow-100 mt-1 text-sm">{ranking.length} người tham gia xếp hạng</p>
          </div>
          <Trophy size={56} className="text-white/30" />
        </div>
      </div>

      {/* Podium top 3 */}
      {top3.length === 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h3 className="font-semibold text-gray-900 text-center mb-6">Top 3 dẫn đầu</h3>
          <div className="flex items-end justify-center gap-6">
            {podiumOrder.map((idx) => {
              const r = top3[idx];
              const cfg = podiumConfig[idx];
              if (!r) return null;
              const isMe = r.name === user?.name;
              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <span className="text-2xl">{cfg.emoji}</span>
                  <div className={`w-14 h-14 rounded-full ${cfg.bg} ring-4 ${cfg.ring} flex items-center justify-center text-white font-bold text-lg shadow-lg ${isMe ? "ring-indigo-400" : ""}`}>
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-semibold text-gray-800 text-sm text-center max-w-[80px] truncate">{r.name}</p>
                  <p className="font-bold text-indigo-600 text-sm">{r.points} pts</p>
                  <div className={`w-20 ${cfg.heightClass} ${cfg.bg} rounded-t-xl opacity-70`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Bảng xếp hạng đầy đủ</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {ranking.map((r, i) => {
            const isMe = r.name === user?.name;
            return (
              <div key={i} className={`flex items-center gap-4 px-5 py-3.5 transition ${isMe ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  i === 0 ? "bg-yellow-400 text-white" :
                  i === 1 ? "bg-gray-300 text-white" :
                  i === 2 ? "bg-orange-400 text-white" :
                  "bg-gray-100 text-gray-500"
                }`}>{i + 1}</div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isMe ? "bg-indigo-200 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <p className={`font-semibold flex-1 ${isMe ? "text-indigo-700" : "text-gray-800"}`}>
                  {r.name}
                  {isMe && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full ml-2 font-medium">Bạn</span>}
                </p>
                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                  <Trophy size={13} className="text-yellow-500" />
                  <span>{r.points}</span>
                  <span className="text-xs text-gray-400 font-normal">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
