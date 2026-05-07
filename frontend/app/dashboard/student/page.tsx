"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { 
  Trophy, Sparkles, AlertCircle 
} from "lucide-react";

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
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
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

  const getTitle = (tab: string) => {
    switch (tab) {
      case "overview": return "Tổng quan";
      case "classes": return "Lớp học của tôi";
      case "assignments": return "Bài tập & Kiểm tra";
      case "dictionary": return "Tra từ điển";
      case "vocabulary": return "Từ vựng đã lưu";
      case "ai-tools": return "Học với AI";
      case "grammar": return "Kho Ngữ Pháp";
      case "scores": return "Kết quả học tập";
      case "ipa": return "Luyện phát âm IPA";
      case "practice": return "Luyện thi";
      case "ranking": return "Bảng xếp hạng toàn cầu";
      case "roadmap": return "Lộ trình học tập cá nhân";
      default: return "Dashboard";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getTitle(activeTab)}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Học sinh · <span className="text-gray-600 font-medium">{user?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshUser()}
            className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3.5 py-2 rounded-xl border border-yellow-100 font-semibold text-sm hover:bg-yellow-100 transition"
          >
            <Trophy size={14} className="text-yellow-500" /> {user?.points || 0} pts
          </button>
          <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3.5 py-2 rounded-xl border border-indigo-100 font-semibold text-sm">
            <Sparkles size={14} className="text-indigo-500" /> {user?.credits_ai || 0} credits
          </div>
        </div>
      </div>

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
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
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
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
