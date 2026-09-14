"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { GraduationCap, ClipboardList } from "lucide-react";

import DomainShortcutsBanner from "../../../components/DomainShortcutsBanner";

const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
  </div>
);

const ClassesTab = dynamic(() => import("../ClassesTab"), { ssr: false, loading: TabLoader });
const AssignmentsTab = dynamic(() => import("../AssignmentsTab"), { ssr: false, loading: TabLoader });

interface LearningDomainProps {
  API_URL: string;
  initialSubTab?: string;
  onSubTabChange?: (sub: string) => void;
}

export default function LearningDomain({
  API_URL,
  initialSubTab = "classes",
  onSubTabChange
}: LearningDomainProps) {
  const [activeSub, setActiveSub] = useState<string>(
    initialSubTab === "assignments" ? "assignments" : "classes"
  );

  useEffect(() => {
    if (initialSubTab && (initialSubTab === "classes" || initialSubTab === "assignments")) {
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
        <button
          type="button"
          onClick={() => handleSelectSub("classes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
            activeSub === "classes"
              ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
              : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
          }`}
        >
          <GraduationCap size={15} className={activeSub === "classes" ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
          <span>Lớp học của tôi</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSub("assignments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
            activeSub === "assignments"
              ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
              : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
          }`}
        >
          <ClipboardList size={15} className={activeSub === "assignments" ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
          <span>Bài tập & Kiểm tra</span>
        </button>
      </div>

      {/* Sub-tab content */}
      <div>
        <div style={{ display: activeSub === "classes" ? "block" : "none" }}>
          <ClassesTab API_URL={API_URL} />
        </div>
        <div style={{ display: activeSub === "assignments" ? "block" : "none" }}>
          <AssignmentsTab API_URL={API_URL} />
        </div>
      </div>

      {/* Contextual next-steps */}
      <DomainShortcutsBanner domain="learning" subTab={activeSub} />
    </div>
  );
}
