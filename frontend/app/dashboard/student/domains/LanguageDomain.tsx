"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, BookMarked, BookText, Newspaper } from "lucide-react";
import DomainShortcutsBanner from "../../../components/DomainShortcutsBanner";

const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
  </div>
);

const DictionaryTab = dynamic(() => import("../DictionaryTab"), { ssr: false, loading: TabLoader });
const VocabularyTab = dynamic(() => import("../VocabularyTab"), { ssr: false, loading: TabLoader });
const GrammarTab = dynamic(() => import("../GrammarTab"), { ssr: false, loading: TabLoader });
const NewsTab = dynamic(() => import("../NewsTab"), { ssr: false, loading: TabLoader });

interface LanguageDomainProps {
  API_URL: string;
  initialSubTab?: string;
  onSubTabChange?: (sub: string) => void;
}

const SUB_TABS = [
  { id: "dictionary", label: "Tra từ điển", icon: Search },
  { id: "vocabulary", label: "Từ vựng đã lưu", icon: BookMarked },
  { id: "grammar",    label: "Kho ngữ pháp",   icon: BookText },
  { id: "news",       label: "Đọc báo tiếng Anh", icon: Newspaper },
];

export default function LanguageDomain({
  API_URL,
  initialSubTab = "dictionary",
  onSubTabChange
}: LanguageDomainProps) {
  const validIds = ["dictionary", "vocabulary", "grammar", "news"];
  const [activeSub, setActiveSub] = useState<string>(
    validIds.includes(initialSubTab) ? initialSubTab : "dictionary"
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
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
        <div style={{ display: activeSub === "dictionary" ? "block" : "none" }}>
          <DictionaryTab API_URL={API_URL} />
        </div>
        <div style={{ display: activeSub === "vocabulary" ? "block" : "none" }}>
          <VocabularyTab API_URL={API_URL} />
        </div>
        <div style={{ display: activeSub === "grammar" ? "block" : "none" }}>
          <GrammarTab API_URL={API_URL} />
        </div>
        <div style={{ display: activeSub === "news" ? "block" : "none" }}>
          <NewsTab API_URL={API_URL} />
        </div>
      </div>

      {/* Contextual next-steps */}
      <DomainShortcutsBanner domain="language" subTab={activeSub} />
    </div>
  );
}
