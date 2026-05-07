"use client";
import React, { useState, useEffect } from "react";
import {
  BookText, FileText, ChevronLeft, ChevronRight,
  CheckCircle2, Sparkles, Trophy, X, ArrowRight,
  GraduationCap, BookOpen, Search, SlidersHorizontal
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import FeedbackButton from "../../components/FeedbackButton";

interface GrammarTabProps {
  API_URL: string;
}

const CEFR_LEVELS = [
  { id: "Pre-A1", label: "Pre-A1", sublabel: "Beginner", gradient: "from-purple-500 to-purple-700", ring: "ring-purple-400", chip: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "A1",     label: "A1",     sublabel: "Elementary",         gradient: "from-blue-500 to-blue-700",   ring: "ring-blue-400",   chip: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "A2",     label: "A2",     sublabel: "Pre-Intermediate",   gradient: "from-cyan-500 to-cyan-700",   ring: "ring-cyan-400",   chip: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "B1",     label: "B1",     sublabel: "Intermediate",       gradient: "from-green-500 to-green-700", ring: "ring-green-400",  chip: "bg-green-100 text-green-700 border-green-200" },
  { id: "B2",     label: "B2",     sublabel: "Upper-Intermediate", gradient: "from-yellow-500 to-yellow-600",ring: "ring-yellow-400", chip: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: "C1",     label: "C1",     sublabel: "Advanced",           gradient: "from-orange-500 to-orange-700",ring: "ring-orange-400", chip: "bg-orange-100 text-orange-700 border-orange-200" },
];

const getLevelConfig = (levelId: string) =>
  CEFR_LEVELS.find(l => l.id === levelId) ?? CEFR_LEVELS[3];

export default function GrammarTab({ API_URL }: GrammarTabProps) {
  const { authFetch, refreshUser } = useAuth();
  const { showAlert } = useNotification();

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Practice State
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [practicing, setPracticing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);

  const parseMarkdown = (text: string) => {
    if (!text) return "";
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    return text
      .replace(/###\s?(.*?)(?=\n|$)/g, '<h3>$1</h3>')
      .replace(/##\s?(.*?)(?=\n|$)/g, '<h2>$1</h2>')
      .replace(/#\s?(.*?)(?=\n|$)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, ' ').replace(/[#*`_]/g, '').replace(/\s+/g, ' ').trim();
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/student/grammar`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      showAlert("Lỗi khi tải danh sách ngữ pháp", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const toggleRule = (id: number) => {
    setSelectedRules(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const startPractice = async () => {
    if (selectedRules.length === 0) return showAlert("Chọn ít nhất 1 chủ đề!", "warning");
    setPracticing(true);
    setSubmitted(false);
    setQuestions([]);
    setCurrentIdx(0);
    setQuestionSubmitted(false);
    try {
      const res = await authFetch(`${API_URL}/student/grammar/practice`, {
        method: "POST",
        body: JSON.stringify({ rule_ids: selectedRules, difficulty })
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const rawQ = Array.isArray(data) ? data : (data.questions || data.quiz || []);
          const validQ = Array.isArray(rawQ) ? rawQ.filter((q: any) => q && (q.question || q.q)) : [];
          setQuestions(validQ);
          refreshUser();
        }
      } else {
        showAlert("Không thể tạo bài tập, vui lòng thử lại sau.", "error");
        setPracticing(false);
      }
    } catch (e) {
      console.error(e);
      showAlert("Lỗi kết nối", "error");
      setPracticing(false);
    }
  };

  const submitPractice = async () => {
    let correctCount = 0;
    questions.forEach((q, i) => {
      const uAns = String(answers[i] || "").toLowerCase().trim();
      const cAns = String(q.answer || "").toLowerCase().trim();
      if (uAns === cAns) correctCount++;
    });
    const totalQuestions = questions.length;
    const newScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    setScore(newScore);
    setSubmitted(true);
    try {
      await authFetch(`${API_URL}/student/scores/save-practice`, {
        method: "POST",
        body: JSON.stringify({
          test_type: "Grammar",
          skill: "Grammar",
          part: selectedRules.map(id => rules.find(r => r.id === id)?.name).join(", ") || "General",
          score: newScore,
          title: `Luyện tập ngữ pháp: ${difficulty}`,
        }),
      });
      refreshUser();
    } catch (error) {
      console.error("Failed to save grammar practice score:", error);
    }
  };

  // ── Practice Mode ──────────────────────────────────────────────────────────
  if (practicing) {
    return (
      <div className="space-y-6 min-h-[80vh] flex flex-col items-center justify-center">
        {questions.length === 0 ? (
          <div className="bg-white rounded-[40px] p-12 md:p-20 shadow-2xl border border-gray-100 flex flex-col items-center justify-center max-w-2xl w-full text-center">
            <div className="relative mb-10">
              <div className="w-24 h-24 border-[6px] border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-600" size={32} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Đang phân tích cấu trúc...</h3>
            <p className="text-gray-500 font-bold text-lg">AI đang thiết kế bài tập cá nhân hóa. Đợi chút nhé!</p>
          </div>
        ) : (
          <div className="fixed inset-0 !mt-0 z-[150] flex flex-col bg-white overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-10 px-8 py-6 flex items-center gap-8 border-b border-gray-100">
              <button onClick={() => setPracticing(false)} className="bg-gray-50 p-3 rounded-2xl text-gray-400 hover:text-gray-900 transition-all hover:bg-white hover:shadow-md"><X size={24} /></button>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-700 rounded-full"
                  style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
              </div>
              <span className="font-black text-teal-600 text-xl tracking-tighter bg-teal-50 px-4 py-2 rounded-2xl border border-teal-100 whitespace-nowrap">{currentIdx + 1} / {questions.length}</span>
            </div>

            {!submitted ? (() => {
              const q = questions[currentIdx];
              if (!q) return null;
              return (
                <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-16 flex flex-col pt-12">
                  <div className="mb-14 text-center">
                    <span className="inline-flex items-center gap-2 px-6 py-2 bg-teal-50 text-teal-700 rounded-2xl font-black uppercase tracking-[0.2em] text-xs mb-8 shadow-sm border border-teal-100">
                      <GraduationCap size={16} />
                      {q.type === "FIB" ? "Điền vào chỗ trống" : q.type === "TFNG" ? "Đúng / Sai / Không có" : "Chọn đáp án đúng"}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.2] max-w-3xl mx-auto">{q.question}</h2>
                  </div>

                  <div className="w-full max-w-3xl mx-auto space-y-5">
                    {q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {q.options.map((opt: string, idx: number) => {
                          const isSelected = answers[currentIdx] === opt;
                          const isCorrect = opt === q.answer;
                          let bgClass = "bg-white border-gray-100 hover:border-teal-400 hover:bg-teal-50/30 text-gray-700 shadow-sm";
                          if (questionSubmitted) {
                            if (isCorrect) bgClass = "bg-green-100 border-green-500 text-green-800 shadow-xl scale-[1.03] z-10 ring-4 ring-green-500/20";
                            else if (isSelected) bgClass = "bg-red-50 border-red-400 text-red-600";
                            else bgClass = "opacity-40 grayscale border-gray-100";
                          } else if (isSelected) {
                            bgClass = "bg-teal-100 border-teal-500 text-teal-800 shadow-lg scale-[1.02] ring-4 ring-teal-500/20";
                          }
                          return (
                            <button key={idx} disabled={questionSubmitted}
                              onClick={() => setAnswers({ ...answers, [currentIdx]: opt })}
                              className={`p-8 rounded-[32px] border-2 text-left transition-all duration-300 font-black text-lg md:text-xl flex items-center gap-6 ${bgClass}`}>
                              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black flex-shrink-0 transition-all ${questionSubmitted && isCorrect ? "border-green-600 text-green-700 bg-white scale-110" : questionSubmitted && isSelected ? "border-red-500 text-red-600 bg-white" : isSelected ? "border-teal-600 text-teal-600 bg-white" : "border-gray-200 text-gray-400"}`}>
                                {questionSubmitted && isCorrect ? <CheckCircle2 size={24} /> : questionSubmitted && isSelected ? <X size={24} /> : String.fromCharCode(65 + idx)}
                              </div>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative max-w-xl mx-auto">
                        <input autoFocus type="text"
                          value={answers[currentIdx] || ""}
                          onChange={e => setAnswers({ ...answers, [currentIdx]: e.target.value })}
                          onKeyDown={e => { if (e.key === "Enter" && !questionSubmitted && answers[currentIdx]) setQuestionSubmitted(true); }}
                          placeholder="Nhập đáp án của bạn..."
                          className={`w-full text-4xl font-black text-center p-10 border-b-8 rounded-[40px] outline-none transition-all shadow-2xl ${questionSubmitted ? (answers[currentIdx]?.toLowerCase().trim() === q.answer.toLowerCase() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-200 bg-gray-50 focus:border-teal-500 focus:bg-white"}`}
                          disabled={questionSubmitted}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-h-[150px]"></div>

                  <div className={`fixed bottom-0 left-0 right-0 border-t-4 sm:px-16 p-8 transition-all duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] ${questionSubmitted ? (String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200") : "bg-white border-gray-100"}`}>
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-8">
                      <div className="flex-1 w-full">
                        {questionSubmitted && (
                          <div className="flex items-center gap-6 flex-1 w-full animate-in slide-in-from-left-6">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xl transform rotate-12 ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "bg-white text-green-500" : "bg-white text-red-500"}`}>
                              {String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? <CheckCircle2 size={50} /> : <X size={50} />}
                            </div>
                            <div>
                              <h3 className={`font-black text-3xl tracking-tight ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "text-green-800" : "text-red-800"}`}>
                                {String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "Xuất sắc! 🔥" : "Opps! Thử lại nhé."}
                              </h3>
                              <p className={`font-black mt-1 text-xl ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "text-green-700" : "text-red-700"}`}>
                                Đáp án chuẩn: <span className="px-3 py-1 bg-white rounded-xl shadow-sm ml-2">{q.answer}</span>
                              </p>
                              {(q.explanation || q.explanation_vn || q.explanation_en) && (
                                <p className="text-base mt-2 font-bold opacity-70 text-gray-800 max-w-2xl">
                                  {q.explanation || q.explanation_vn || q.explanation_en}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="w-full sm:w-auto flex-shrink-0">
                        {!questionSubmitted ? (
                          <button onClick={() => setQuestionSubmitted(true)} disabled={!answers[currentIdx]}
                            className="w-full sm:w-auto px-16 py-6 rounded-[28px] font-black text-2xl text-white bg-teal-600 hover:bg-teal-700 shadow-[0_8px_0_0_#0d9488] active:shadow-none active:translate-y-[8px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-[8px] disabled:bg-gray-300 uppercase tracking-widest">
                            Kiểm tra ngay
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (currentIdx < questions.length - 1) { setCurrentIdx(currentIdx + 1); setQuestionSubmitted(false); }
                              else { submitPractice(); }
                            }}
                            className={`w-full sm:w-auto px-14 py-6 rounded-[28px] font-black text-2xl text-white shadow-[0_8px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[8px] transition-all uppercase tracking-widest flex items-center justify-center gap-3 ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "bg-green-600" : "bg-red-600"}`}>
                            {currentIdx < questions.length - 1 ? "Tiếp tục" : "Kết thúc"} <ArrowRight size={28} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
                <div className="bg-white p-16 md:p-24 rounded-[60px] shadow-2xl text-center max-w-xl w-full transform animate-in zoom-in-95 duration-700 border border-gray-100">
                  <div className="relative inline-block mb-10">
                    <Trophy size={120} className="text-yellow-400 drop-shadow-[0_10px_10px_rgba(250,204,21,0.4)] transform -rotate-12 animate-bounce" />
                    <Sparkles className="absolute -top-4 -right-4 text-yellow-500 animate-pulse" size={40} />
                  </div>
                  <h3 className="text-5xl font-black mb-4 text-gray-900 tracking-tighter">Hoàn thành!</h3>
                  <p className="text-gray-400 font-bold mb-10 text-lg uppercase tracking-widest">Bạn đã vượt qua thử thách</p>
                  <div className="bg-teal-50 rounded-[40px] py-10 my-10 border-2 border-teal-100 relative overflow-hidden">
                    <p className="text-teal-600 font-black uppercase tracking-[0.3em] text-sm mb-2">Điểm số</p>
                    <p className="text-7xl font-black text-teal-700 flex items-center justify-center gap-4">
                      {score}<span className="text-4xl text-teal-300">%</span>
                    </p>
                    <p className="text-teal-500 font-bold mt-2 text-sm">{questions.filter((_, i) => String(answers[i] || "").toLowerCase().trim() === String(questions[i]?.answer || "").toLowerCase().trim()).length} / {questions.length} câu đúng</p>
                  </div>
                  <button onClick={() => setPracticing(false)}
                    className="w-full bg-gray-900 text-white px-10 py-6 rounded-[32px] font-black hover:bg-black transition-all shadow-xl text-xl active:scale-95">
                    Quay về Kho Ngữ Pháp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Rule Detail View ──────────────────────────────────────────────────────
  if (selectedRule) {
    const lvlCfg = getLevelConfig(selectedRule.level || "B1");
    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl">
          <div className="flex items-center gap-6">
            <div className="bg-teal-50 p-4 rounded-[24px]"><BookOpen className="text-teal-600" size={40} /></div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${lvlCfg.chip}`}>{lvlCfg.label} · {lvlCfg.sublabel}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{selectedRule.name}</h2>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">{new Date(selectedRule.created_at).toLocaleDateString("vi-VN")}</p>
            </div>
          </div>
          <button onClick={() => setSelectedRule(null)}
            className="group bg-gray-50 hover:bg-gray-900 text-gray-500 hover:text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all active:scale-95 shadow-sm">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Quay lại
          </button>
        </div>

        <div className="bg-white p-10 md:p-16 rounded-[48px] border border-gray-100 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/30 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <div className="relative z-10 rich-text max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedRule.description) || "<p class='opacity-50 italic font-bold'>Chủ đề này chưa có nội dung mô tả.</p>" }} />
        </div>

        {selectedRule.file_name && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 md:p-12 rounded-[48px] border-2 border-dashed border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-inner">
            <div className="flex items-center gap-6">
              <div className="bg-white p-5 rounded-[28px] shadow-lg text-indigo-500"><FileText size={42} /></div>
              <div>
                <h3 className="font-black text-indigo-900 text-2xl mb-2">Tài liệu học tập đính kèm</h3>
                <p className="text-lg text-indigo-600 font-bold opacity-80 truncate max-w-xs md:max-w-md">{selectedRule.file_name}</p>
              </div>
            </div>
            <a href={`${API_URL}/student/grammar/${selectedRule.id}/file`} target="_blank" rel="noopener noreferrer"
              className="w-full md:w-auto bg-white text-indigo-600 hover:bg-gray-900 hover:text-white px-12 py-5 rounded-[28px] font-black shadow-xl hover:shadow-indigo-200 transition-all text-xl active:scale-95 flex items-center justify-center gap-3">
              Tải về để học <ArrowRight size={24} />
            </a>
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => { toggleRule(selectedRule.id); setSelectedRule(null); }}
            className={`flex-1 py-5 rounded-[28px] font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${selectedRules.includes(selectedRule.id) ? "bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100" : "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200"}`}>
            {selectedRules.includes(selectedRule.id) ? <><X size={22} /> Bỏ chọn</> : <><CheckCircle2 size={22} /> Thêm vào bài luyện</>}
          </button>
        </div>
      </div>
    );
  }

  // ── Main List View ────────────────────────────────────────────────────────
  const filteredRules = rules.filter(r => {
    const matchLevel = !activeLevel || r.level === activeLevel;
    const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchLevel && matchSearch;
  });

  const levelCounts = CEFR_LEVELS.reduce<Record<string, number>>((acc, l) => {
    acc[l.id] = rules.filter(r => r.level === l.id).length;
    return acc;
  }, {});

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* ── Hero Section ── */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-700 rounded-[40px] p-10 md:p-14 mb-10 text-white relative overflow-hidden shadow-2xl shadow-teal-200/50">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full blur-3xl -ml-10 -mb-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 p-3 rounded-2xl"><BookText size={28} /></div>
              <span className="font-black text-teal-100 uppercase tracking-widest text-sm">Kho Ngữ Pháp</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-3">Grammar Exercises</h1>
            <p className="text-teal-100 font-bold text-lg">Luyện tập ngữ pháp với bài tập được thiết kế theo trình độ CEFR</p>
            <div className="flex flex-wrap gap-6 mt-6">
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm">
                <span className="font-black text-2xl">{rules.length}</span>
                <span className="text-teal-100 font-bold text-sm">Chủ đề</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm">
                <span className="font-black text-2xl">6</span>
                <span className="text-teal-100 font-bold text-sm">Cấp độ CEFR</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm">
                <Sparkles size={18} className="text-yellow-300" />
                <span className="text-teal-100 font-bold text-sm">AI Practice</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { if (selectedRules.length > 0) startPractice(); else showAlert("Chọn chủ đề từ danh sách bên dưới để bắt đầu luyện tập!", "warning"); }}
            className="flex-shrink-0 bg-white text-teal-700 hover:bg-teal-50 px-10 py-5 rounded-[28px] font-black text-xl flex items-center gap-3 shadow-xl transition-all active:scale-95 group">
            <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />
            {selectedRules.length > 0 ? `Luyện ${selectedRules.length} chủ đề` : "Bắt đầu luyện tập"}
          </button>
        </div>
      </div>

      {/* ── Browse by Level ── */}
      <div className="mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-5 tracking-tight flex items-center gap-3">
          <SlidersHorizontal size={22} className="text-teal-600" /> Browse by Level
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CEFR_LEVELS.map(lvl => {
            const count = levelCounts[lvl.id] || 0;
            const isActive = activeLevel === lvl.id;
            return (
              <button key={lvl.id} onClick={() => setActiveLevel(isActive ? null : lvl.id)}
                className={`group relative overflow-hidden rounded-[28px] p-5 text-left transition-all duration-300 ${isActive ? `bg-gradient-to-br ${lvl.gradient} text-white shadow-xl scale-[1.04] ring-4 ${lvl.ring}/30` : "bg-white border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] hover:border-gray-200"}`}>
                <p className={`text-3xl font-black tracking-tighter mb-1 ${isActive ? "text-white" : "text-gray-900"}`}>{lvl.label}</p>
                <p className={`text-xs font-bold mb-3 ${isActive ? "text-white/70" : "text-gray-400"}`}>{lvl.sublabel}</p>
                <p className={`font-black text-lg ${isActive ? "text-white" : "text-gray-700"}`}>{count} <span className={`text-xs font-bold ${isActive ? "text-white/60" : "text-gray-400"}`}>chủ đề</span></p>
                {isActive && <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full shadow-md"></div>}
              </button>
            );
          })}
        </div>
        {activeLevel && (
          <button onClick={() => setActiveLevel(null)} className="mt-4 text-sm font-black text-teal-600 hover:underline flex items-center gap-1">
            <X size={14} /> Xem tất cả cấp độ
          </button>
        )}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm chủ đề ngữ pháp..."
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 focus:border-teal-400 rounded-[20px] outline-none font-bold text-gray-700 placeholder-gray-400 transition-all shadow-sm"
          />
        </div>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
          className="bg-white border-2 border-gray-100 text-gray-700 rounded-[20px] px-6 py-4 outline-none font-black focus:border-teal-400 transition-all shadow-sm">
          <option value="Easy">Cơ bản (A1-A2)</option>
          <option value="Medium">Trung cấp (B1-B2)</option>
          <option value="Hard">Nâng cao (C1-C2)</option>
        </select>
      </div>

      {/* ── Topic Grid ── */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">
            {activeLevel ? `${activeLevel} · ${getLevelConfig(activeLevel).sublabel}` : "Tất cả chủ đề"}
            <span className="ml-3 text-sm font-black text-gray-400">({filteredRules.length})</span>
          </h3>
          {selectedRules.length > 0 && (
            <button onClick={() => setSelectedRules([])} className="text-xs font-black text-rose-500 hover:underline flex items-center gap-1">
              <X size={13} /> Bỏ chọn ({selectedRules.length})
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array(6).fill(0).map((_, i) => <div key={i} className="h-40 bg-gray-50 rounded-[28px] animate-pulse" />)}
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="py-20 text-center">
            <BookText size={80} className="mx-auto text-gray-100 mb-6" />
            <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">
              {searchQuery ? "Không tìm thấy chủ đề phù hợp" : "Kho ngữ pháp đang được cập nhật"}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredRules.map((r: any) => {
              const isSelected = selectedRules.includes(r.id);
              const lvlCfg = getLevelConfig(r.level || "B1");
              return (
                <li key={r.id}
                  className={`group relative overflow-hidden p-1 rounded-[32px] transition-all duration-500 cursor-pointer ${isSelected ? `bg-gradient-to-br ${lvlCfg.gradient} scale-[1.02] shadow-2xl` : "bg-gray-100 hover:bg-gray-200 shadow-sm"}`}>
                  <div className={`flex flex-col h-full bg-white p-7 rounded-[30px] transition-colors ${isSelected ? "bg-white/95" : "hover:bg-gray-50/50"}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${lvlCfg.chip}`}>{lvlCfg.label}</span>
                          {r.file_name && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-black text-[10px] border border-indigo-100">
                              <FileText size={10} /> FILE
                            </span>
                          )}
                        </div>
                        <h4 onClick={() => setSelectedRule(r)} className={`font-black text-xl tracking-tight leading-tight transition-colors hover:text-teal-700 cursor-pointer ${isSelected ? "text-teal-700" : "text-gray-900"}`}>{r.name}</h4>
                      </div>
                      <div
                        className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ml-4 cursor-pointer ${isSelected ? "bg-teal-600 border-teal-600 text-white shadow-lg" : "border-gray-200 bg-white group-hover:border-teal-400"}`}
                        onClick={(e) => { e.stopPropagation(); toggleRule(r.id); }}>
                        {isSelected && <CheckCircle2 size={18} />}
                      </div>
                    </div>

                    <div className="text-gray-500 font-medium line-clamp-2 leading-relaxed mb-4 flex-1 text-sm bg-gray-50/30 rounded-xl p-3 border border-gray-50 group-hover:border-teal-100 transition-colors">
                      {stripHtml(r.description) || "Chưa có nội dung mô tả."}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                      <button onClick={() => setSelectedRule(r)} className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${isSelected ? "text-teal-600" : "text-gray-400 group-hover:text-teal-500"}`}>
                        Chi tiết <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FeedbackButton feature="grammar" />

      {/* ── Sticky Practice Bar ── */}
      {selectedRules.length > 0 && (
        <div className="fixed bottom-0 left-60 right-0 z-50 p-5">
          <div className="max-w-4xl mx-auto bg-white rounded-[28px] border border-gray-100 shadow-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="flex-1">
              <p className="font-black text-gray-900 text-lg">{selectedRules.length} chủ đề đã chọn</p>
              <p className="text-gray-400 text-sm font-bold">{selectedRules.map(id => rules.find(r => r.id === id)?.name).filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex items-center gap-4">
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="bg-gray-50 border-2 border-gray-100 text-gray-700 rounded-[16px] px-5 py-3 outline-none font-black focus:border-teal-400 transition-all text-sm">
                <option value="Easy">Cơ bản</option>
                <option value="Medium">Trung cấp</option>
                <option value="Hard">Nâng cao</option>
              </select>
              <button onClick={startPractice}
                className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-[20px] font-black flex items-center gap-2 shadow-xl shadow-teal-200 transition-all active:scale-95 text-sm">
                <Sparkles size={18} /> Học với AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
