"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { AlertCircle } from "lucide-react";

// Modularized Tab Components
import OverviewTab from "./OverviewTab";
import ClassesTab from "./ClassesTab";
import AssignmentsTab from "./AssignmentsTab";
import DictionaryTab from "./DictionaryTab";
import VocabularyTab from "./VocabularyTab";
import AIToolsTab from "./AIToolsTab";
import GrammarTab from "./GrammarTab";
import ScoresTab from "./ScoresTab";
import IpaTab from "./IpaTab";
import PracticeTab from "./PracticeTab";
import RankingTab from "./RankingTab";
import RoadmapTab from "./RoadmapTab";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { user, token, isInitialized, refreshUser } = useAuth();
  const router = useRouter();
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set([activeTab]));
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    setVisitedTabs(prev => new Set([...prev, activeTab]));
    if (activeTab === "overview" || activeTab === "ranking" || activeTab === "ai-tools") {
      refreshUser();
    }
  }, [activeTab, refreshUser]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.role || "").toString().toLowerCase();
    if (role !== "student") {
      router.replace("/dashboard");
    }
  }, [isInitialized, token, user, router]);

  if (!isInitialized || !token || !user) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)]"></div></div>;
  }

  const renderTab = (tabName: string) => {
    if (!visitedTabs.has(tabName)) return null;
    
    const isHidden = activeTab !== tabName;
    const style = isHidden ? { display: 'none' } : {};

    return (
      <div key={tabName} style={style} className="animate-in fade-in duration-300">
        {tabName === "overview" && <OverviewTab API_URL={API_URL} />}
        {tabName === "classes" && <ClassesTab API_URL={API_URL} />}
        {tabName === "assignments" && <AssignmentsTab API_URL={API_URL} />}
        {tabName === "dictionary" && <DictionaryTab API_URL={API_URL} />}
        {tabName === "vocabulary" && <VocabularyTab API_URL={API_URL} />}
        {tabName === "ai-tools" && <AIToolsTab API_URL={API_URL} setShowCreditModal={setShowCreditModal} />}
        {tabName === "grammar" && <GrammarTab API_URL={API_URL} />}
        {tabName === "scores" && <ScoresTab API_URL={API_URL} />}
        {tabName === "ipa" && <IpaTab API_URL={API_URL} />}
        {tabName === "practice" && <PracticeTab API_URL={API_URL} setShowCreditModal={setShowCreditModal} />}
        {tabName === "ranking" && <RankingTab API_URL={API_URL} />}
        {tabName === "roadmap" && <RoadmapTab API_URL={API_URL} />}
      </div>
    );
  };

  return (
    <div className="space-y-5">

      {showCreditModal && (
        <div className="fixed inset-0 !mt-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Hết lượt sử dụng AI!</h3>
            <p className="text-gray-500 text-center mb-6 text-sm">
              Bạn đã dùng hết credits AI hôm nay. Quay lại vào ngày mai hoặc liên hệ quản trị viên.
            </p>
            <button
              onClick={() => setShowCreditModal(false)}
              className="w-full bg-[var(--brand)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--brand-dark)] transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {["overview", "classes", "assignments", "dictionary", "vocabulary", "ai-tools", "grammar", "scores", "ipa", "practice", "ranking", "roadmap"].map(tab => renderTab(tab))}
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)]" /></div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
