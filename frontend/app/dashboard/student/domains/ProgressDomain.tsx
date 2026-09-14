"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Component, Trophy, TrendingUp } from "lucide-react";
import DomainShortcutsBanner from "../../../components/DomainShortcutsBanner";

const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
  </div>
);

const ScoresTab = dynamic(() => import("../ScoresTab"), { ssr: false, loading: TabLoader });
const RankingTab = dynamic(() => import("../RankingTab"), { ssr: false, loading: TabLoader });
const RoadmapTab = dynamic(() => import("../RoadmapTab"), { ssr: false, loading: TabLoader });

interface ProgressDomainProps {
  API_URL: string;
  initialSubTab?: string;
  onSubTabChange?: (sub: string) => void;
}

const SUB_TABS = [
  { id: "scores",  label: "Kết quả học tập", icon: Component },
  { id: "ranking", label: "Bảng xếp hạng",   icon: Trophy },
  { id: "roadmap", label: "Lộ trình học tập", icon: TrendingUp },
];

export default function ProgressDomain({
  API_URL,
  initialSubTab = "scores",
  onSubTabChange
}: ProgressDomainProps) {
  const validIds = ["scores", "ranking", "roadmap"];
  const [activeSub, setActiveSub] = useState<string>(
    validIds.includes(initialSubTab) ? initialSubTab : "scores"
  );

  useEffect(() => {
    if (initialSubTab && validIds.includes(initialSubTab)) {
      setActiveSub(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSelectSub = (sub: string) => {
    setActiveSub(sub);
    onSubTabChange?.(sub);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Sub-tab Pill Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-3)] rounded-2xl w-fit max-w-full overflow-x-auto shadow-inner">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSub === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectSub(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
                  : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
              }`}
            >
              <Icon size={15} className={isActive ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div>
        <div style={{ display: activeSub === "scores" ? "block" : "none" }}>
          <ScoresTab API_URL={API_URL} />
        </div>
        <div style={{ display: activeSub === "ranking" ? "block" : "none" }}>
          <RankingTab API_URL={API_URL} />
        </div>
        <div style={{ display: activeSub === "roadmap" ? "block" : "none" }}>
          <RoadmapTab API_URL={API_URL} />
        </div>
      </div>

      {/* Contextual next-steps */}
      <DomainShortcutsBanner domain="progress" subTab={activeSub} />
    </div>
  );
}
