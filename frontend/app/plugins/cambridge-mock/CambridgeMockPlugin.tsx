"use client";
import React, { useState, useEffect } from "react";
import { Award, Clock, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Trophy, ChevronRight, Crown } from "lucide-react";
import { registerPlugin } from "../pluginRegistry";

interface Question {
  id: number;
  section: string;
  passage?: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

const CAMBRIDGE_QUESTIONS: Question[] = [
  {
    id: 1,
    section: "Reading & Use of English (Part 1 - Multiple Choice Cloze)",
    passage: "Modern research into sleep cycles indicates that adequate rest is _______ for cognitive performance and memory consolidation.",
    prompt: "Choose the word which best fits the gap:",
    options: ["elementary", "vital", "demanding", "urgent"],
    answer: 1,
    explanation: "'Vital' means absolutely necessary or essential, which correctly pairs with the academic context of cognitive health.",
  },
  {
    id: 2,
    section: "Reading & Use of English (Part 2 - Prepositions & Collocations)",
    passage: "The committee was unanimous _______ its decision to allocate additional funding to educational technology.",
    prompt: "Select the most appropriate preposition:",
    options: ["in", "with", "upon", "for"],
    answer: 0,
    explanation: "The standard collocation is 'unanimous in (doing) something'.",
  },
  {
    id: 3,
    section: "Reading & Use of English (Part 3 - Word Formation)",
    passage: "The archaeologist made a fascinating _______ when digging near the historic city wall.",
    prompt: "Select the correct form of the root word 'DISCOVER':",
    options: ["discovery", "discoverer", "discoverable", "discovered"],
    answer: 0,
    explanation: "'Discovery' is the singular countable noun fitting the context with indefinite article 'a'.",
  },
  {
    id: 4,
    section: "Listening Comprehension (Diagnostic Inference)",
    prompt: "Audio transcript: 'We initially anticipated over two hundred attendees, but due to the unexpected storm, scarcely half showed up.' — How many people attended?",
    options: ["Exactly 200", "More than 200", "Approximately 100", "Zero"],
    answer: 2,
    explanation: "'Scarcely half' of 200 means roughly or slightly fewer than 100 attendees.",
  },
];

export default function CambridgeMockTab({
  API_URL,
  setShowCreditModal,
}: {
  API_URL?: string;
  setShowCreditModal?: (show: boolean) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isActive, setIsActive] = useState(true);

  // Timer countdown
  useEffect(() => {
    if (!isActive || submitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, submitted, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const currentQ = CAMBRIDGE_QUESTIONS[currentIdx];

  const handleSelect = (optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionIdx }));
  };

  const calculateScore = () => {
    let correct = 0;
    CAMBRIDGE_QUESTIONS.forEach((q) => {
      if (selectedAnswers[q.id] === q.answer) {
        correct += 1;
      }
    });
    return correct;
  };

  const score = calculateScore();
  const percentage = Math.round((score / CAMBRIDGE_QUESTIONS.length) * 100);

  const getCEFRBand = () => {
    if (percentage >= 85) return { band: "C1 Advanced", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (percentage >= 60) return { band: "B2 Vantage", color: "text-blue-600 bg-blue-50 border-blue-200" };
    return { band: "B1 Intermediate", color: "text-amber-600 bg-amber-50 border-amber-200" };
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setTimeLeft(600);
    setCurrentIdx(0);
    setIsActive(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Partner Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-5 sm:p-6 shadow-md">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs flex items-center gap-1">
                <Crown size={11} className="fill-amber-300 text-amber-300" /> Partner Plugin
              </span>
              <span className="text-xs text-amber-100 font-medium">Cambridge English Assessment Standard</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Cambridge Diagnostic Mock Test
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 max-w-xl">
              Bài thi thử chuẩn hóa khảo sát năng lực ngôn ngữ theo khung Cambridge B2 First & C1 Advanced.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-300" />
              <div className="text-xs">
                <p className="text-white/70 text-[10px] uppercase font-bold">Thời gian</p>
                <p className="font-mono font-bold text-sm">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="text-xs text-right">
              <p className="text-white/70 text-[10px] uppercase font-bold">Câu hỏi</p>
              <p className="font-bold text-sm">
                {Object.keys(selectedAnswers).length}/{CAMBRIDGE_QUESTIONS.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Examination View */}
      {!submitted ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Question Navigator */}
          <div className="lg:col-span-1 bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-3)]">
              Danh sách câu hỏi
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-2 gap-2">
              {CAMBRIDGE_QUESTIONS.map((q, idx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                      isCurrent
                        ? "bg-[var(--brand)] text-white shadow-sm"
                        : isAnswered
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    <span>Câu {idx + 1}</span>
                    {isAnswered && <CheckCircle2 size={12} />}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-sm transition"
              >
                Nộp bài sớm
              </button>
            </div>
          </div>

          {/* Question Card */}
          <div className="lg:col-span-3 bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <span className="text-xs font-semibold text-[var(--brand)] bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                {currentQ.section}
              </span>
              <span className="text-xs text-[var(--ink-3)] font-medium">
                Câu {currentIdx + 1} / {CAMBRIDGE_QUESTIONS.length}
              </span>
            </div>

            {currentQ.passage && (
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-sm font-medium leading-relaxed text-[var(--ink-1)]">
                {currentQ.passage}
              </div>
            )}

            <div className="text-sm font-bold text-[var(--ink-1)]">
              {currentQ.prompt}
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === oIdx;
                const letter = String.fromCharCode(65 + oIdx);
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelect(oIdx)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all ${
                      isSelected
                        ? "border-[var(--brand)] bg-blue-50/70 text-[var(--brand-dark)] font-semibold shadow-xs"
                        : "border-[var(--line)] hover:border-slate-300 hover:bg-[var(--surface-2)] text-[var(--ink-1)]"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[var(--surface-3)] text-[var(--ink-3)]"
                      }`}
                    >
                      {letter}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Navigator */}
            <div className="pt-4 border-t border-[var(--line)] flex items-center justify-between">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                className="px-4 py-2 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--ink-2)] disabled:opacity-40 hover:bg-[var(--surface-3)] transition"
              >
                Câu trước
              </button>

              {currentIdx < CAMBRIDGE_QUESTIONS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((p) => Math.min(CAMBRIDGE_QUESTIONS.length - 1, p + 1))}
                  className="px-5 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-semibold hover:bg-[var(--brand-dark)] transition flex items-center gap-1"
                >
                  <span>Câu kế</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold hover:opacity-95 transition"
                >
                  Hoàn thành bài thi
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Result Screen */
        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="text-center space-y-2 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-100 shadow-sm">
              <Trophy size={32} />
            </div>
            <h3 className="text-2xl font-black text-[var(--ink-1)]">Kết quả bài thi Cambridge</h3>
            <p className="text-xs text-[var(--ink-3)]">
              Đánh giá phản xạ ngôn ngữ theo tiêu chuẩn Cambridge Assessment English
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-[var(--surface-2)] p-4 rounded-xl text-center border border-[var(--line)]">
              <p className="text-[10px] uppercase font-bold text-[var(--ink-3)]">Số câu đúng</p>
              <p className="text-2xl font-black text-[var(--brand)] mt-1">
                {score} / {CAMBRIDGE_QUESTIONS.length}
              </p>
            </div>
            <div className="bg-[var(--surface-2)] p-4 rounded-xl text-center border border-[var(--line)]">
              <p className="text-[10px] uppercase font-bold text-[var(--ink-3)]">Tỷ lệ chuẩn xác</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{percentage}%</p>
            </div>
            <div className="bg-[var(--surface-2)] p-4 rounded-xl text-center border border-[var(--line)]">
              <p className="text-[10px] uppercase font-bold text-[var(--ink-3)]">Khung CEFR ước tính</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-xs font-bold border ${getCEFRBand().color}`}>
                {getCEFRBand().band}
              </span>
            </div>
          </div>

          {/* Question-by-question Review */}
          <div className="space-y-3 pt-4 border-t border-[var(--line)] max-w-3xl mx-auto">
            <h4 className="text-sm font-bold text-[var(--ink-1)]">Chi tiết đáp án & Giải thích:</h4>
            {CAMBRIDGE_QUESTIONS.map((q, idx) => {
              const userAns = selectedAnswers[q.id];
              const isCorrect = userAns === q.answer;
              return (
                <div key={q.id} className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--ink-1)]">
                      Câu {idx + 1}: {q.prompt}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {isCorrect ? "Chính xác" : "Chưa đúng"}
                    </span>
                  </div>
                  <p className="text-[var(--ink-2)]">
                    Đáp án đúng: <strong>{q.options[q.answer]}</strong>
                    {userAns !== undefined && !isCorrect && (
                      <span className="text-red-600 ml-2">(Bạn chọn: {q.options[userAns]})</span>
                    )}
                  </p>
                  <p className="text-[var(--ink-3)] text-[11px] italic">
                    💡 {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:bg-[var(--brand-dark)] transition"
            >
              <RefreshCw size={14} />
              <span>Làm lại bài thi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Auto-register partner plugin into PluginRegistry
registerPlugin({
  id: "cambridge-test",
  domain: "practice",
  label: {
    vi: "Cambridge Mock Test",
    en: "Cambridge Mock Test",
    km: "ការប្រឡងសាកល្បង Cambridge",
  },
  icon: Award,
  component: CambridgeMockTab,
  requiredSubscription: "premium",
  badge: "PRO",
  order: 10,
  description: "Chuẩn hóa đề thi theo chuẩn Cambridge English B2-C1",
});
