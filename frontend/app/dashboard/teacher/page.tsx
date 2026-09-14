"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { AlertCircle, Volume2, X, Crown } from "lucide-react";
import { ALL_WORDS_DATABASE, WordDetail } from "../../components/DictionaryData";
import dynamic from "next/dynamic";

// Static default landing tab
import OverviewTab from "./OverviewTab";

const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]"></div>
  </div>
);

// Dynamic tabs
const ClassesTab = dynamic(() => import("./ClassesTab"), { ssr: false, loading: TabLoader });
const StudentsTab = dynamic(() => import("./StudentsTab"), { ssr: false, loading: TabLoader });
const LessonsTab = dynamic(() => import("./LessonsTab"), { ssr: false, loading: TabLoader });
const AssignmentsTab = dynamic(() => import("./AssignmentsTab"), { ssr: false, loading: TabLoader });
const ChatTab = dynamic(() => import("./ChatTab"), { ssr: false, loading: TabLoader });
const AIToolsTab = dynamic(() => import("./AIToolsTab").then(m => m.AIToolsTab), { ssr: false, loading: TabLoader });
const GrammarTab = dynamic(() => import("./GrammarTab").then(m => m.GrammarTab), { ssr: false, loading: TabLoader });
const IpaTab = dynamic(() => import("./IpaTab").then(m => m.IpaTab), { ssr: false, loading: TabLoader });
const PracticeTab = dynamic(() => import("./PracticeTab").then(m => m.PracticeTab), { ssr: false, loading: TabLoader });

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { user, token, isInitialized, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedWordInfo, setSelectedWordInfo] = useState<WordDetail | null>(null);
  const { showAlert } = useNotification();

  // Proactively refresh user data when entering key tabs
  useEffect(() => {
    if (activeTab === "overview" || activeTab === "ai-tools") {
      refreshUser();
    }
  }, [activeTab, refreshUser]);

  // Auth check
  useEffect(() => {
    if (!isInitialized) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.role || "").toString().toLowerCase();
    if (role !== "teacher") {
      router.replace("/dashboard");
    }
  }, [isInitialized, token, user, router]);

  if (!isInitialized || !token || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)]"></div>
      </div>
    );
  }

  const handleTextareaDoubleClick = async (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const textVal = textarea.value;
    
    let left = start;
    while (left > 0 && /\w/.test(textVal[left - 1])) left--;
    let right = start;
    while (right < textVal.length && /\w/.test(textVal[right])) right++;
    
    const word = textVal.substring(left, right).toLowerCase();
    if (!word) return;

    let localData = ALL_WORDS_DATABASE[word] || 
                    ALL_WORDS_DATABASE[word.replace(/s$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/es$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/ing$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/ed$/, '')];

    if (localData) {
      setSelectedWordInfo(localData);
    } else {
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (response.ok) {
          const apiDataList = await response.json();
          const firstEntry = apiDataList[0];
          const meaning = firstEntry.meanings[0];
          const def = meaning.definitions[0];
          
          const formattedData: WordDetail = {
            word: firstEntry.word,
            phonetic: firstEntry.phonetics.find((p: any) => p.text)?.text || firstEntry.phonetic || "/.../",
            type: meaning.partOfSpeech,
            translation: "Đang tải bản dịch...",
            example: def.example || "No example available.",
            engMeaning: def.definition || "No definition found.",
            level: "N/A"
          };
          setSelectedWordInfo(formattedData);
        } else {
          showAlert(`Không tìm thấy từ "${word}" trong từ điển.`, 'error');
        }
      } catch (err) {
        showAlert(`Không tìm thấy từ "${word}" và lỗi kết nối API.`, 'error');
      }
    }
  };

  const speak = (text: string, lang: string = "en-US") => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
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
              Bạn đã sử dụng hết số credits AI miễn phí hôm nay. Nâng cấp lên <strong className="text-[var(--brand)]">iEdu PRO</strong> để tạo bài giảng và hỗ trợ chấm bài không giới hạn.
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

      {/* Word Lookup Modal */}
      {selectedWordInfo && (
        <div className="fixed inset-0 !mt-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="app-card max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[var(--brand)] px-6 py-5 text-white relative">
              <button
                onClick={() => setSelectedWordInfo(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition"
              >
                <X size={16} />
              </button>
              <h3 className="text-xl font-bold mb-1">{selectedWordInfo.word}</h3>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => speak(selectedWordInfo.word)} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition text-sm">
                  <Volume2 size={14} /> <span className="font-mono">{selectedWordInfo.phonetic}</span>
                </button>
                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase">{selectedWordInfo.level || 'N/A'}</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <span className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wide block mb-1">Loại từ & Nghĩa</span>
                <p className="text-[var(--ink-1)] font-semibold text-base leading-tight">
                  <span className="bg-[var(--brand-soft)] text-[var(--brand)] px-2 py-0.5 rounded text-xs mr-2">{selectedWordInfo.type}</span>
                  {selectedWordInfo.translation}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wide block mb-1">Định nghĩa tiếng Anh</span>
                <p className="text-[var(--ink-2)] text-sm italic leading-relaxed">"{selectedWordInfo.engMeaning}"</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[var(--ink-3)] uppercase tracking-wide block mb-1">Ví dụ</span>
                <p className="text-[var(--ink-2)] text-sm leading-relaxed">{selectedWordInfo.example}</p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => setSelectedWordInfo(null)}
                  className="w-full py-2.5 bg-[var(--surface-3)] text-[var(--ink-2)] font-semibold rounded-xl text-sm hover:bg-[var(--line)] transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab rendering */}
      {activeTab === "overview" && <OverviewTab API_URL={API_URL} />}
      {activeTab === "classes" && <ClassesTab API_URL={API_URL} />}
      {activeTab === "students" && <StudentsTab API_URL={API_URL} />}
      {activeTab === "lessons" && <LessonsTab API_URL={API_URL} handleTextareaDoubleClick={handleTextareaDoubleClick} />}
      {activeTab === "assignments" && <AssignmentsTab API_URL={API_URL} handleTextareaDoubleClick={handleTextareaDoubleClick} />}
      {activeTab === "chat" && <ChatTab API_URL={API_URL} />}
      {activeTab === "ai-tools" && <AIToolsTab authFetch={authFetch} user={user} API_URL={API_URL} setShowCreditModal={setShowCreditModal} handleTextareaDoubleClick={handleTextareaDoubleClick} />}
      {activeTab === "grammar" && <GrammarTab authFetch={authFetch} API_URL={API_URL} />}
      {activeTab === "practice" && <PracticeTab authFetch={authFetch} API_URL={API_URL} />}
      {activeTab === "ipa" && <IpaTab authFetch={authFetch} API_URL={API_URL} />}
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)]"></div></div>}>
      <TeacherDashboardContent />
    </Suspense>
  );
}
