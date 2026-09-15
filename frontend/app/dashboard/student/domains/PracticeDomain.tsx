"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Award, Mic } from "lucide-react";
import DomainShortcutsBanner from "../../../components/DomainShortcutsBanner";
import { useDomainPlugins } from "../../../plugins/pluginRegistry";
import "../../../plugins/cambridge-mock/CambridgeMockPlugin"; // Ensure default partner plugins are registered
import { useI18n } from "../../../context/I18nContext";

const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
  </div>
);

const PracticeTab = dynamic(() => import("../PracticeTab"), { ssr: false, loading: TabLoader });
const IpaTab = dynamic(() => import("../IpaTab"), { ssr: false, loading: TabLoader });

interface PracticeDomainProps {
  API_URL: string;
  initialSubTab?: string;
  onSubTabChange?: (sub: string) => void;
  setShowCreditModal?: (show: boolean) => void;
}

export default function PracticeDomain({
  API_URL,
  initialSubTab = "practice",
  onSubTabChange,
  setShowCreditModal
}: PracticeDomainProps) {
  const { t, localize } = useI18n();
  const plugins = useDomainPlugins("practice");

  const [activeSub, setActiveSub] = useState<string>(initialSubTab || "practice");

  useEffect(() => {
    if (initialSubTab) {
      setActiveSub(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSelectSub = (sub: string) => {
    setActiveSub(sub);
    onSubTabChange?.(sub);
  };

  const activePlugin = plugins.find((p) => p.id === activeSub);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Sub-tab Pill Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-3)] rounded-2xl w-fit max-w-full overflow-x-auto shadow-inner">
        <button
          type="button"
          onClick={() => handleSelectSub("practice")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
            activeSub === "practice"
              ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
              : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
          }`}
        >
          <Award size={15} className={activeSub === "practice" ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
          <span>{t("sub.practice", "Luyện thi & Đề test")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSub("ipa")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
            activeSub === "ipa"
              ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
              : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
          }`}
        >
          <Mic size={15} className={activeSub === "ipa" ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
          <span>{t("sub.ipa", "Phát âm chuẩn IPA")}</span>
        </button>

        {/* Dynamic Registered Plugins */}
        {plugins.map((plugin) => {
          const isSelected = activeSub === plugin.id;
          const PluginIcon = plugin.icon || Award;
          const label = localize(plugin.label, plugin.id);
          return (
            <button
              key={plugin.id}
              type="button"
              onClick={() => handleSelectSub(plugin.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
                isSelected
                  ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
                  : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
              }`}
            >
              <PluginIcon size={15} className={isSelected ? "text-amber-600" : "text-[var(--ink-3)]"} />
              <span>{label}</span>
              {plugin.badge && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 tracking-wider">
                  {plugin.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div>
        <div style={{ display: activeSub === "practice" ? "block" : "none" }}>
          <PracticeTab API_URL={API_URL} setShowCreditModal={setShowCreditModal} />
        </div>
        <div style={{ display: activeSub === "ipa" ? "block" : "none" }}>
          <IpaTab API_URL={API_URL} />
        </div>

        {/* Plugin Tab Content */}
        {activePlugin && (
          <div>
            <activePlugin.component API_URL={API_URL} setShowCreditModal={setShowCreditModal} />
          </div>
        )}
      </div>

      {/* Contextual next-steps */}
      <DomainShortcutsBanner domain="practice" subTab={activeSub} />
    </div>
  );
}
