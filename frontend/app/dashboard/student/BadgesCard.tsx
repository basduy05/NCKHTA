"use client";
import React, { useEffect, useState } from "react";
import { Award, Lock, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface Badge {
  id: number;
  key: string;
  name: string;
  description_vn: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  condition_type: string;
  condition_value: number;
  is_earned: boolean;
  earned_at: string | null;
  current_progress: number;
}

export default function BadgesCard({ API_URL }: { API_URL: string }) {
  const { authFetch } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/student/badges`);
      if (res.ok) {
        const json = await res.json();
        setBadges(json.badges || []);
      }
    } catch (err) {
      console.error("Error fetching badges:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, []);

  const earnedCount = badges.filter((b) => b.is_earned).length;

  const tierColors = {
    bronze: "from-amber-600 to-amber-700 text-amber-100 border-amber-500/40",
    silver: "from-slate-400 to-slate-500 text-slate-100 border-slate-300/40",
    gold: "from-yellow-400 to-amber-500 text-amber-950 border-yellow-300/60 shadow-yellow-500/20",
    platinum: "from-indigo-400 to-purple-600 text-white border-purple-300/50 shadow-purple-500/20",
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
              Huy hiệu Thành tích
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold">
                {earnedCount}/{badges.length} đã đạt
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Khám phá và mở khóa các mốc phấn đấu học tập
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {badges.map((b) => {
            const pct = Math.min(
              100,
              Math.round((b.current_progress / (b.condition_value || 1)) * 100)
            );
            return (
              <div
                key={b.id}
                className={`relative rounded-2xl p-3.5 border transition-all duration-200 flex flex-col justify-between ${
                  b.is_earned
                    ? "bg-gradient-to-b from-white to-amber-50/40 dark:from-gray-900 dark:to-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-sm"
                    : "bg-gray-50/60 dark:bg-gray-800/30 border-gray-200/60 dark:border-gray-800/60 opacity-75"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl select-none">{b.icon}</span>
                    {b.is_earned ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã đạt
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {pct}%
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate mb-1">
                    {b.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">
                    {b.description_vn}
                  </p>
                </div>

                {!b.is_earned && (
                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                    <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
