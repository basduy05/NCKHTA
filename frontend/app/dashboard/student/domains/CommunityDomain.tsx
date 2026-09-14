"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Users, MessageSquare } from "lucide-react";
import { usePresence } from "../../../hooks/usePresence";
import DomainShortcutsBanner from "../../../components/DomainShortcutsBanner";

const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
  </div>
);

const GroupsTab = dynamic(() => import("../GroupsTab"), { ssr: false, loading: TabLoader });
const ChatTab = dynamic(() => import("../ChatTab"), { ssr: false, loading: TabLoader });

interface CommunityDomainProps {
  API_URL: string;
  initialSubTab?: string;
  onSubTabChange?: (sub: string) => void;
}

export default function CommunityDomain({
  API_URL,
  initialSubTab = "groups",
  onSubTabChange
}: CommunityDomainProps) {
  const [activeSub, setActiveSub] = useState<string>(
    initialSubTab === "chat" ? "chat" : "groups"
  );
  const { unreadChatCount } = usePresence();

  useEffect(() => {
    if (initialSubTab && (initialSubTab === "groups" || initialSubTab === "chat")) {
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
          onClick={() => handleSelectSub("groups")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
            activeSub === "groups"
              ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
              : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
          }`}
        >
          <Users size={15} className={activeSub === "groups" ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
          <span>Nhóm học tập</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSub("chat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all whitespace-nowrap ${
            activeSub === "chat"
              ? "bg-white text-[var(--ink-1)] shadow-xs font-bold"
              : "text-[var(--ink-2)] hover:text-[var(--ink-1)] font-medium"
          }`}
        >
          <MessageSquare size={15} className={activeSub === "chat" ? "text-[var(--brand)]" : "text-[var(--ink-3)]"} />
          <span>Chat trực tuyến</span>
          {unreadChatCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shrink-0">
              {unreadChatCount > 99 ? "99+" : unreadChatCount}
            </span>
          )}
        </button>
      </div>

      {/* Sub-tab content */}
      <div>
        <div style={{ display: activeSub === "groups" ? "block" : "none" }}>
          <GroupsTab API_URL={API_URL} />
        </div>
        <div style={{ display: activeSub === "chat" ? "block" : "none" }}>
          <ChatTab API_URL={API_URL} />
        </div>
      </div>

      {/* Contextual next-steps */}
      <DomainShortcutsBanner domain="community" subTab={activeSub} />
    </div>
  );
}
