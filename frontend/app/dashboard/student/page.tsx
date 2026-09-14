"use client";
import React, { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { AlertCircle, Crown } from "lucide-react";
import dynamic from "next/dynamic";

// Default landing tab loaded statically
import OverviewTab from "./OverviewTab";

// Loading placeholder for lazy domain modules
const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
  </div>
);

// Domain components (consolidating 15 tabs into 7 coherent domains)
const LearningDomain = dynamic(() => import("./domains/LearningDomain"), { ssr: false, loading: TabLoader });
const CommunityDomain = dynamic(() => import("./domains/CommunityDomain"), { ssr: false, loading: TabLoader });
const LanguageDomain = dynamic(() => import("./domains/LanguageDomain"), { ssr: false, loading: TabLoader });
const PracticeDomain = dynamic(() => import("./domains/PracticeDomain"), { ssr: false, loading: TabLoader });
const ProgressDomain = dynamic(() => import("./domains/ProgressDomain"), { ssr: false, loading: TabLoader });
const AIToolsTab = dynamic(() => import("./AIToolsTab"), { ssr: false, loading: TabLoader });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

// Legacy tab to domain mapping for 100% backward compatibility
const LEGACY_MAP: Record<string, { domain: string; defaultSub: string }> = {
  classes:     { domain: "learning",  defaultSub: "classes" },
  assignments: { domain: "learning",  defaultSub: "assignments" },
  groups:      { domain: "community", defaultSub: "groups" },
  chat:        { domain: "community", defaultSub: "chat" },
  dictionary:  { domain: "language",  defaultSub: "dictionary" },
  vocabulary:  { domain: "language",  defaultSub: "vocabulary" },
  grammar:     { domain: "language",  defaultSub: "grammar" },
  news:        { domain: "language",  defaultSub: "news" },
  practice:    { domain: "practice",  defaultSub: "practice" },
  ipa:         { domain: "practice",  defaultSub: "ipa" },
  scores:      { domain: "progress",  defaultSub: "scores" },
  ranking:     { domain: "progress",  defaultSub: "ranking" },
  roadmap:     { domain: "progress",  defaultSub: "roadmap" },
};

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "overview";
  const rawSub = searchParams.get("sub") || "";

  // Resolve domain and subtab (support both new domain URLs and legacy tab URLs)
  const legacyResolved = LEGACY_MAP[rawTab];
  const activeDomain = legacyResolved ? legacyResolved.domain : rawTab;
  const activeSub = rawSub || (legacyResolved ? legacyResolved.defaultSub : "");

  const { user, token, isInitialized, refreshUser } = useAuth();
  const router = useRouter();
  const [visitedDomains, setVisitedDomains] = useState<Set<string>>(new Set([activeDomain]));
  const [showCreditModal, setShowCreditModal] = useState(false);

  useEffect(() => {
    setVisitedDomains(prev => new Set([...prev, activeDomain]));
    if (activeDomain === "overview" || activeDomain === "progress" || activeDomain === "ai-tools") {
      refreshUser();
    }
  }, [activeDomain, refreshUser]);

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

  const handleSubTabChange = useCallback((domain: string, sub: string) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", domain);
      url.searchParams.set("sub", sub);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  if (!isInitialized || !token || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)]"></div>
      </div>
    );
  }

  const renderDomain = (domainName: string) => {
    if (!visitedDomains.has(domainName)) return null;
    const isHidden = activeDomain !== domainName;
    const style = isHidden ? { display: "none" } : {};

    return (
      <div key={domainName} style={style} className="animate-in fade-in duration-200">
        {domainName === "overview" && <OverviewTab API_URL={API_URL} />}
        {domainName === "learning" && (
          <LearningDomain
            API_URL={API_URL}
            initialSubTab={activeSub}
            onSubTabChange={(sub) => handleSubTabChange("learning", sub)}
          />
        )}
        {domainName === "community" && (
          <CommunityDomain
            API_URL={API_URL}
            initialSubTab={activeSub}
            onSubTabChange={(sub) => handleSubTabChange("community", sub)}
          />
        )}
        {domainName === "language" && (
          <LanguageDomain
            API_URL={API_URL}
            initialSubTab={activeSub}
            onSubTabChange={(sub) => handleSubTabChange("language", sub)}
          />
        )}
        {domainName === "practice" && (
          <PracticeDomain
            API_URL={API_URL}
            initialSubTab={activeSub}
            onSubTabChange={(sub) => handleSubTabChange("practice", sub)}
            setShowCreditModal={setShowCreditModal}
          />
        )}
        {domainName === "ai-tools" && (
          <AIToolsTab API_URL={API_URL} setShowCreditModal={setShowCreditModal} />
        )}
        {domainName === "progress" && (
          <ProgressDomain
            API_URL={API_URL}
            initialSubTab={activeSub}
            onSubTabChange={(sub) => handleSubTabChange("progress", sub)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Credit limit modal with Pro Upgrade CTA */}
      {showCreditModal && (
        <div className="fixed inset-0 !mt-0 !m-0 z-[120] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 rounded-3xl flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400 shadow-sm">
              <Crown size={32} className="fill-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Hết lượt AI trong ngày!
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
              Bạn đã sử dụng hết số credits AI miễn phí hôm nay. Nâng cấp lên <strong className="text-[var(--brand)]">iEdu PRO</strong> để học và hỏi đáp AI không giới hạn cùng nhiều đặc quyền hấp dẫn.
            </p>
            <div className="space-y-2.5">
              <Link
                href="/upgrade"
                onClick={() => setShowCreditModal(false)}
                className="w-full py-3 bg-gradient-to-r from-[var(--brand)] to-indigo-600 hover:opacity-95 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-200 transition flex items-center justify-center gap-2"
              >
                <Crown size={16} className="fill-white" />
                <span>Nâng cấp iEdu PRO ngay</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowCreditModal(false)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-200 transition"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      )}

      {["overview", "learning", "community", "language", "practice", "ai-tools", "progress"].map(domain =>
        renderDomain(domain)
      )}
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
