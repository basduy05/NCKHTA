"use client";
import React, { useState, useEffect } from "react";
import {
  BookText, FileText, ChevronLeft, ChevronRight,
  CheckCircle2, Sparkles, Trophy, X, ArrowRight,
  GraduationCap, BookOpen, Search, SlidersHorizontal,
  ClipboardPaste, Loader2, AlertCircle, Keyboard,
  ListChecks, Save, Trash2, Eye, ChevronDown, ChevronUp,
  Pencil, Check, FolderOpen, Folder
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import FeedbackButton from "../../components/FeedbackButton";

interface GrammarTabProps {
  API_URL: string;
}

const CEFR_LEVELS = [
  { id: "Pre-A1", label: "Pre-A1", sublabel: "Beginner",          gradient: "from-purple-500 to-purple-700", ring: "ring-purple-400", chip: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "A1",    label: "A1",    sublabel: "Elementary",          gradient: "from-blue-500 to-blue-700",    ring: "ring-blue-400",   chip: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "A2",    label: "A2",    sublabel: "Pre-Intermediate",    gradient: "from-cyan-500 to-cyan-700",    ring: "ring-cyan-400",   chip: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "B1",    label: "B1",    sublabel: "Intermediate",        gradient: "from-green-500 to-green-700",  ring: "ring-green-400",  chip: "bg-green-100 text-green-700 border-green-200" },
  { id: "B2",    label: "B2",    sublabel: "Upper-Intermediate",  gradient: "from-yellow-500 to-yellow-600",ring: "ring-yellow-400", chip: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: "C1",    label: "C1",    sublabel: "Advanced",            gradient: "from-orange-500 to-orange-700",ring: "ring-orange-400", chip: "bg-orange-100 text-orange-700 border-orange-200" },
];
const getLevelConfig = (levelId: string) => CEFR_LEVELS.find(l => l.id === levelId) ?? CEFR_LEVELS[3];

type PracticeMode = "choice" | "typing";

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseMarkdown = (text: string) => {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .replace(/###\s?(.*?)(?=\n|$)/g,'<h3>$1</h3>')
    .replace(/##\s?(.*?)(?=\n|$)/g,'<h2>$1</h2>')
    .replace(/#\s?(.*?)(?=\n|$)/g,'<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')
    .replace(/\*(.*?)\*/g,'<i>$1</i>')
    .replace(/__(.*?)__/g,'<u>$1</u>')
    .replace(/^\d+\.\s(.*$)/gim,'<li>$1</li>')
    .replace(/^\- (.*$)/gim,'<li>$1</li>')
    .replace(/\n\n/g,'<br/><br/>')
    .replace(/\n/g,'<br/>');
};
const stripHtml = (html: string) => html ? html.replace(/<[^>]+>/g,' ').replace(/[#*`_]/g,'').replace(/\s+/g,' ').trim() : "";

// Build tree structure from flat rules list
function buildTree(rules: any[]) {
  const roots: any[] = [];
  const map: Record<number, any> = {};
  rules.forEach(r => { map[r.id] = { ...r, children: [] }; });
  rules.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(map[r.id]);
    } else {
      roots.push(map[r.id]);
    }
  });
  return roots;
}

export default function GrammarTab({ API_URL }: GrammarTabProps) {
  const { authFetch, refreshUser, user } = useAuth();
  const { showAlert } = useNotification();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  // Practice state
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("choice");
  const [practicing, setPracticing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [usingStoredQuizzes, setUsingStoredQuizzes] = useState(false);
  const [storedRuleName, setStoredRuleName] = useState("");

  const [showPracticeConfig, setShowPracticeConfig] = useState(false);
  const [pendingStoredRuleId, setPendingStoredRuleId] = useState<number | null>(null);

  // Parse modal
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseTab, setParseTab] = useState<"ai" | "local">("ai");
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [localParsedQuestions, setLocalParsedQuestions] = useState<any[]>([]);
  const [localParseError, setLocalParseError] = useState<string | null>(null);
  const [localParsing, setLocalParsing] = useState(false);
  const [selectedSaveRuleId, setSelectedSaveRuleId] = useState<string>("");
  const [savingQuizzes, setSavingQuizzes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Edit parsed questions
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/student/grammar`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch { showAlert("Lỗi tải danh sách ngữ pháp", "error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchRules(); }, []);

  const toggleRule = (id: number) =>
    setSelectedRules(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleExpand = (id: number) =>
    setExpandedNodes(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const isAnswerCorrect = (userAns: string, correctAns: string) => {
    const u = userAns.toLowerCase().trim();
    const c = correctAns.toLowerCase().trim();
    if (u === c) return true;
    if (u.length === 1 && c.startsWith(u + '.')) return true;
    return false;
  };

  const startAIPractice = async () => {
    if (selectedRules.length === 0) return showAlert("Chọn ít nhất 1 chủ đề!", "warning");
    setShowPracticeConfig(false);
    setPracticing(true); setSubmitted(false); setQuestions([]); setCurrentIdx(0); setQuestionSubmitted(false); setAnswers({});
    setUsingStoredQuizzes(false); setStoredRuleName("");
    try {
      const res = await authFetch(`${API_URL}/student/grammar/practice`, {
        method: "POST", body: JSON.stringify({ rule_ids: selectedRules, difficulty })
      });
      if (res.ok) {
        const data = await res.json();
        const rawQ = Array.isArray(data) ? data : (data.questions || data.quiz || []);
        const validQ = (Array.isArray(rawQ) ? rawQ : []).filter((q: any) => q && (q.question || q.q));
        setQuestions(validQ); refreshUser();
      } else { showAlert("Không thể tạo bài tập, vui lòng thử lại.", "error"); setPracticing(false); }
    } catch { showAlert("Lỗi kết nối", "error"); setPracticing(false); }
  };

  const startStoredQuizPractice = async (ruleId: number) => {
    const rule = rules.find(r => r.id === ruleId);
    setPendingStoredRuleId(null); setShowPracticeConfig(false);
    setPracticing(true); setSubmitted(false); setQuestions([]); setCurrentIdx(0); setQuestionSubmitted(false); setAnswers({});
    setUsingStoredQuizzes(true); setStoredRuleName(rule?.name || "");
    try {
      const res = await authFetch(`${API_URL}/student/grammar/${ruleId}/quizzes`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) { setQuestions(data); }
        else { showAlert("Chủ đề này chưa có bài tập có sẵn.", "warning"); setPracticing(false); }
      } else { showAlert("Không thể tải bài tập.", "error"); setPracticing(false); }
    } catch { showAlert("Lỗi kết nối", "error"); setPracticing(false); }
  };

  const submitPractice = async () => {
    let correct = 0;
    questions.forEach((q, i) => { if (isAnswerCorrect(answers[i] || "", q.answer || "")) correct++; });
    const total = questions.length;
    const newScore = total > 0 ? Math.round((correct / total) * 100) : 0;
    setScore(newScore); setSubmitted(true);
    try {
      const part = usingStoredQuizzes
        ? storedRuleName || "Bài tập có sẵn"
        : selectedRules.map(id => rules.find(r => r.id === id)?.name).filter(Boolean).join(", ") || "General";
      await authFetch(`${API_URL}/student/scores/save-practice`, {
        method: "POST",
        body: JSON.stringify({
          test_type: "Grammar", skill: "Grammar", part,
          score: newScore,
          title: `Luyện tập ngữ pháp: ${usingStoredQuizzes ? "Bài tập có sẵn" : difficulty}`,
        }),
      });
      refreshUser();
    } catch { /* non-critical */ }
  };

  // ── AI parse ──────────────────────────────────────────────────────────────
  const handleAIParse = async () => {
    if (!parseText.trim()) return;
    setParsing(true); setParseError(null);
    try {
      const res = await authFetch(`${API_URL}/student/grammar/parse-text`, {
        method: "POST", body: JSON.stringify({ text: parseText }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Lỗi ${res.status}`); }
      const data = await res.json();
      const rawQ = Array.isArray(data) ? data : (data.questions || data.quiz || []);
      const validQ = (Array.isArray(rawQ) ? rawQ : []).filter((q: any) => q && (q.question || q.q));
      if (validQ.length === 0) throw new Error("Không tìm thấy câu hỏi nào trong văn bản.");
      setLocalParsedQuestions(validQ.map((q: any) => ({ ...q, question: q.question || q.q })));
      setParseTab("local"); setParseText(""); refreshUser();
    } catch (e: any) { setParseError(e.message || "Lỗi khi phân tích văn bản"); }
    finally { setParsing(false); }
  };

  // ── Local parse ──────────────────────────────────────────────────────────
  const handleLocalParse = async () => {
    if (!parseText.trim()) return;
    setLocalParsing(true); setLocalParseError(null); setLocalParsedQuestions([]); setSavedSuccess(false); setEditingIdx(null);
    try {
      const res = await authFetch(`${API_URL}/student/grammar/parse-text-local`, {
        method: "POST", body: JSON.stringify({ text: parseText }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Lỗi ${res.status}`); }
      const data = await res.json();
      if (!data.questions || data.questions.length === 0) throw new Error("Không tìm thấy câu hỏi nào. Kiểm tra định dạng văn bản.");
      setLocalParsedQuestions(data.questions);
    } catch (e: any) { setLocalParseError(e.message || "Lỗi phân tích"); }
    finally { setLocalParsing(false); }
  };

  const practiceLocalQuestions = () => {
    if (localParsedQuestions.length === 0) return;
    setQuestions(localParsedQuestions);
    setCurrentIdx(0); setAnswers({}); setSubmitted(false); setQuestionSubmitted(false);
    setShowParseModal(false); setParseText(""); setLocalParsedQuestions([]);
    setPracticing(true); setUsingStoredQuizzes(false); setStoredRuleName("");
  };

  const saveLocalQuizzes = async () => {
    if (!selectedSaveRuleId || localParsedQuestions.length === 0) return;
    setSavingQuizzes(true);
    try {
      const res = await authFetch(`${API_URL}/student/grammar/quizzes/save`, {
        method: "POST", body: JSON.stringify({ rule_id: parseInt(selectedSaveRuleId), questions: localParsedQuestions }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Lỗi lưu bài tập"); }
      const data = await res.json();
      setSavedSuccess(true); showAlert(`Đã lưu ${data.saved} câu hỏi vào chủ đề!`, "success"); fetchRules();
    } catch (e: any) { showAlert(e.message || "Lỗi khi lưu bài tập", "error"); }
    finally { setSavingQuizzes(false); }
  };

  // ── Edit parsed questions ─────────────────────────────────────────────────
  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditDraft(JSON.parse(JSON.stringify(localParsedQuestions[i])));
  };
  const cancelEdit = () => { setEditingIdx(null); setEditDraft(null); };
  const saveEdit = () => {
    if (editingIdx === null || !editDraft) return;
    const updated = [...localParsedQuestions];
    updated[editingIdx] = editDraft;
    setLocalParsedQuestions(updated);
    setEditingIdx(null); setEditDraft(null);
  };
  const removeQuestion = (i: number) => {
    setLocalParsedQuestions(prev => prev.filter((_, idx) => idx !== i));
    if (editingIdx === i) { setEditingIdx(null); setEditDraft(null); }
  };

  // ── Practice view ────────────────────────────────────────────────────────
  if (practicing) {
    return (
      <div className="space-y-4 min-h-[80vh] flex flex-col items-center justify-center">
        {questions.length === 0 ? (
          <div className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100 flex flex-col items-center max-w-md w-full text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-600" size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Đang tải bài tập...</h3>
            <p className="text-gray-400 font-bold text-sm">Vui lòng đợi!</p>
          </div>
        ) : (
          <div className="fixed inset-0 !mt-0 z-[150] flex flex-col bg-white overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-10 px-4 sm:px-6 py-3 flex items-center gap-3 border-b border-gray-100">
              <button onClick={() => setPracticing(false)} className="bg-gray-50 p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-md transition-all">
                <X size={20} />
              </button>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-700 rounded-full"
                  style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg font-black text-xs border ${practiceMode === "choice" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"}`}>
                  {practiceMode === "choice" ? <ListChecks size={11} /> : <Keyboard size={11} />}
                  {practiceMode === "choice" ? "Choice" : "Typing"}
                </span>
                <span className="font-black text-teal-600 text-base bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 whitespace-nowrap">{currentIdx + 1}/{questions.length}</span>
              </div>
            </div>

            {!submitted ? (() => {
              const q = questions[currentIdx];
              if (!q) return null;
              const showChoiceMode = practiceMode === "choice" && q.options && q.options.length > 0;
              return (
                <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-10 flex flex-col pt-8">
                  <div className="mb-8 text-center">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-50 text-teal-700 rounded-xl font-black uppercase tracking-widest text-xs mb-5 border border-teal-100">
                      <GraduationCap size={13} />
                      {practiceMode === "typing" ? "Nhập đáp án" : q.type === "FIB" ? "Điền vào chỗ trống" : q.type === "TFNG" ? "Đúng / Sai / Không có" : "Chọn đáp án đúng"}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-snug max-w-2xl mx-auto">{q.question}</h2>
                  </div>
                  <div className="w-full max-w-2xl mx-auto space-y-3">
                    {showChoiceMode ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt: string, idx: number) => {
                          const isSelected = answers[currentIdx] === opt;
                          const isCorrect = opt === q.answer;
                          let cls = "bg-white border-gray-100 hover:border-teal-400 hover:bg-teal-50/30 text-gray-700 shadow-sm";
                          if (questionSubmitted) {
                            if (isCorrect) cls = "bg-green-100 border-green-500 text-green-800 shadow-lg scale-[1.02] ring-2 ring-green-400/30";
                            else if (isSelected) cls = "bg-red-50 border-red-400 text-red-600";
                            else cls = "opacity-40 border-gray-100";
                          } else if (isSelected) cls = "bg-teal-100 border-teal-500 text-teal-800 shadow-md scale-[1.01] ring-2 ring-teal-400/20";
                          return (
                            <button key={idx} disabled={questionSubmitted}
                              onClick={() => setAnswers({ ...answers, [currentIdx]: opt })}
                              className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 font-bold text-sm md:text-base flex items-center gap-3 ${cls}`}>
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-black flex-shrink-0 text-xs transition-all ${questionSubmitted && isCorrect ? "border-green-600 text-green-700 bg-white" : questionSubmitted && isSelected ? "border-red-500 text-red-600 bg-white" : isSelected ? "border-teal-600 text-teal-600 bg-white" : "border-gray-200 text-gray-400"}`}>
                                {questionSubmitted && isCorrect ? <CheckCircle2 size={16} /> : questionSubmitted && isSelected ? <X size={14} /> : String.fromCharCode(65 + idx)}
                              </div>
                              <span className="flex-1 text-sm">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative max-w-lg mx-auto">
                        {!questionSubmitted && q.options && q.options.length > 0 && (
                          <p className="text-center text-xs text-gray-400 font-bold mb-3 uppercase tracking-widest">Nhập chữ cái (A/B/C/D) hoặc nội dung đáp án</p>
                        )}
                        <input autoFocus type="text"
                          value={answers[currentIdx] || ""}
                          onChange={e => setAnswers({ ...answers, [currentIdx]: e.target.value })}
                          onKeyDown={e => { if (e.key === "Enter" && !questionSubmitted && answers[currentIdx]) setQuestionSubmitted(true); }}
                          placeholder="Nhập đáp án..."
                          className={`w-full text-2xl font-black text-center p-6 border-b-4 rounded-2xl outline-none transition-all shadow-lg ${questionSubmitted ? (isAnswerCorrect(answers[currentIdx] || "", q.answer) ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-200 bg-gray-50 focus:border-teal-500 focus:bg-white"}`}
                          disabled={questionSubmitted} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-h-[100px]" />
                  <div className={`fixed bottom-0 left-0 right-0 border-t-2 px-4 sm:px-10 p-5 transition-all duration-300 ${questionSubmitted ? (isAnswerCorrect(String(answers[currentIdx]||""), String(q.answer||"")) ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200") : "bg-white border-gray-100"}`}>
                    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex-1 w-full">
                        {questionSubmitted && (
                          <div className="flex items-center gap-3 animate-in slide-in-from-left-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white shadow-lg ${isAnswerCorrect(String(answers[currentIdx]||""), String(q.answer||"")) ? "text-green-500" : "text-red-500"}`}>
                              {isAnswerCorrect(String(answers[currentIdx]||""), String(q.answer||"")) ? <CheckCircle2 size={28} /> : <X size={28} />}
                            </div>
                            <div>
                              <h3 className={`font-black text-base ${isAnswerCorrect(String(answers[currentIdx]||""), String(q.answer||"")) ? "text-green-800" : "text-red-800"}`}>
                                {isAnswerCorrect(String(answers[currentIdx]||""), String(q.answer||"")) ? "Xuất sắc! 🔥" : "Sai rồi!"}
                              </h3>
                              <p className={`font-bold text-sm mt-0.5 ${isAnswerCorrect(String(answers[currentIdx]||""), String(q.answer||"")) ? "text-green-700" : "text-red-700"}`}>
                                Đáp án: <span className="px-2 py-0.5 bg-white rounded-lg ml-1 text-xs font-black shadow-sm">{q.answer}</span>
                              </p>
                              {(q.explanation_vn || q.explanation || q.explanation_en) && (
                                <p className="text-xs mt-1 font-medium opacity-70 text-gray-700 max-w-xl">
                                  {q.explanation_vn || q.explanation || q.explanation_en}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="w-full sm:w-auto">
                        {!questionSubmitted ? (
                          <button onClick={() => setQuestionSubmitted(true)} disabled={!answers[currentIdx]}
                            className="w-full sm:w-auto px-10 py-3.5 rounded-2xl font-black text-base text-white bg-teal-600 hover:bg-teal-700 shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:bg-gray-300 uppercase tracking-wider">
                            Kiểm tra
                          </button>
                        ) : (
                          <button onClick={() => {
                            if (currentIdx < questions.length - 1) { setCurrentIdx(currentIdx + 1); setQuestionSubmitted(false); }
                            else { submitPractice(); }
                          }}
                            className={`w-full sm:w-auto px-10 py-3.5 rounded-2xl font-black text-base text-white shadow-lg active:scale-95 transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${isAnswerCorrect(String(answers[currentIdx]||""), String(q.answer||"")) ? "bg-green-600" : "bg-red-500"}`}>
                            {currentIdx < questions.length - 1 ? "Tiếp tục" : "Kết thúc"} <ArrowRight size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50/50">
                <div className="bg-white p-10 md:p-16 rounded-[40px] shadow-xl text-center max-w-sm w-full border border-gray-100">
                  <Trophy size={80} className="mx-auto text-yellow-400 drop-shadow-lg mb-6 animate-bounce" />
                  <h3 className="text-3xl font-black mb-2 text-gray-900">Hoàn thành!</h3>
                  <p className="text-gray-400 font-bold mb-6 text-sm uppercase tracking-widest">Bạn đã vượt qua thử thách</p>
                  <div className="bg-teal-50 rounded-3xl py-6 my-6 border-2 border-teal-100">
                    <p className="text-teal-600 font-black uppercase tracking-widest text-xs mb-1">Điểm số</p>
                    <p className="text-5xl font-black text-teal-700">{score}<span className="text-2xl text-teal-300">%</span></p>
                    <p className="text-teal-500 font-bold text-xs mt-1">{questions.filter((_,i) => isAnswerCorrect(answers[i]||"",questions[i]?.answer||"")).length}/{questions.length} câu đúng</p>
                  </div>
                  <button onClick={() => setPracticing(false)}
                    className="w-full bg-gray-900 text-white px-6 py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg text-base active:scale-95">
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

  // ── Rule Detail View ─────────────────────────────────────────────────────
  if (selectedRule) {
    const lvlCfg = getLevelConfig(selectedRule.level || "B1");
    return (
      <div className="space-y-5 max-w-4xl mx-auto pb-16 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-[28px] border border-gray-100 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-teal-50 p-3 rounded-2xl"><BookOpen className="text-teal-600" size={28} /></div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${lvlCfg.chip}`}>{lvlCfg.label} · {lvlCfg.sublabel}</span>
                {selectedRule.quiz_count > 0 && <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{selectedRule.quiz_count} bài tập</span>}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-gray-900">{selectedRule.name}</h2>
              <p className="text-xs font-bold text-gray-400 mt-0.5">{new Date(selectedRule.created_at).toLocaleDateString("vi-VN")}</p>
            </div>
          </div>
          <button onClick={() => setSelectedRule(null)}
            className="group bg-gray-50 hover:bg-gray-900 text-gray-500 hover:text-white px-5 py-3 rounded-xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-sm text-sm">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Quay lại
          </button>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[32px] border border-gray-100 shadow-lg">
          <div className="rich-text max-w-none"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedRule.description) || "<p class='opacity-50 italic font-bold'>Chủ đề này chưa có nội dung mô tả.</p>" }} />
        </div>

        {selectedRule.file_name && (
          <div className="bg-indigo-50 p-5 rounded-[28px] border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-3 rounded-xl shadow text-indigo-500"><FileText size={28} /></div>
              <div>
                <h3 className="font-black text-indigo-900 text-base">Tài liệu học tập</h3>
                <p className="text-sm text-indigo-600 font-bold truncate max-w-xs">{selectedRule.file_name}</p>
              </div>
            </div>
            <a href={`${API_URL}/student/grammar/${selectedRule.id}/file`} target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-gray-900 hover:text-white px-6 py-3 rounded-xl font-black shadow-lg transition-all text-sm active:scale-95 flex items-center justify-center gap-2">
              Tải về <ArrowRight size={16} />
            </a>
          </div>
        )}

        {selectedRule.quiz_count > 0 && (
          <div className="bg-teal-50 p-5 rounded-[28px] border border-teal-100">
            <h3 className="font-black text-gray-900 text-base mb-1 flex items-center gap-2">
              <ListChecks size={18} className="text-teal-600" /> Bài tập có sẵn ({selectedRule.quiz_count} câu)
            </h3>
            <p className="text-gray-500 font-bold text-xs mb-4">Luyện tập không cần AI credits — điểm được ghi nhận.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setPendingStoredRuleId(selectedRule.id); setShowPracticeConfig(true); setSelectedRule(null); }}
                className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-black flex items-center gap-1.5 shadow hover:bg-teal-700 transition-all active:scale-95 text-sm">
                <ListChecks size={15} /> Luyện tập ngay
              </button>
              {isAdmin && (
                <button onClick={async () => {
                  if (confirm(`Xóa ${selectedRule.quiz_count} câu hỏi?`)) {
                    const res = await authFetch(`${API_URL}/student/grammar/${selectedRule.id}/quizzes`, { method: "DELETE" });
                    if (res.ok) { showAlert("Đã xóa!", "success"); fetchRules(); setSelectedRule({ ...selectedRule, quiz_count: 0 }); }
                  }
                }} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-black flex items-center gap-1.5 hover:bg-red-100 transition-all text-sm">
                  <Trash2 size={13} /> Xóa
                </button>
              )}
            </div>
          </div>
        )}

        <button onClick={() => { toggleRule(selectedRule.id); setSelectedRule(null); }}
          className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${selectedRules.includes(selectedRule.id) ? "bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100" : "bg-teal-600 text-white hover:bg-teal-700"}`}>
          {selectedRules.includes(selectedRule.id) ? <><X size={18} /> Bỏ chọn</> : <><CheckCircle2 size={18} /> Thêm vào bài luyện AI</>}
        </button>
      </div>
    );
  }

  // ── Main List View ───────────────────────────────────────────────────────
  const flatFiltered = rules.filter(r => {
    const matchLevel = !activeLevel || r.level === activeLevel;
    const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchLevel && matchSearch;
  });
  const treeRoots = buildTree(searchQuery || activeLevel ? flatFiltered : rules);

  const levelCounts = CEFR_LEVELS.reduce<Record<string, number>>((acc, l) => {
    acc[l.id] = rules.filter(r => r.level === l.id).length;
    return acc;
  }, {});
  const totalQuizzes = rules.reduce((sum, r) => sum + (r.quiz_count || 0), 0);

  const RuleCard = ({ rule, depth = 0 }: { rule: any; depth?: number }) => {
    const isSelected = selectedRules.includes(rule.id);
    const lvlCfg = getLevelConfig(rule.level || "B1");
    const quizCount = rule.quiz_count || 0;
    const hasChildren = rule.children && rule.children.length > 0;
    const isExpanded = expandedNodes.has(rule.id);

    return (
      <div className={depth > 0 ? `ml-3 sm:ml-5 border-l-2 border-gray-100 pl-2 sm:pl-3 mt-2` : ""}>
        <div className={`group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer ${isSelected ? `ring-2 ring-teal-400 shadow-lg` : "hover:shadow-sm"}`}
          style={{ background: depth === 0 ? undefined : undefined }}>
          <div className={`flex items-start gap-2 p-3 sm:p-4 rounded-2xl border transition-colors ${isSelected ? "bg-teal-50 border-teal-200" : "bg-white border-gray-100 hover:border-teal-200 hover:bg-gray-50/50"}`}>
            {/* Expand toggle */}
            {hasChildren ? (
              <button onClick={e => { e.stopPropagation(); toggleExpand(rule.id); }}
                className="mt-0.5 text-gray-400 hover:text-teal-600 transition-colors flex-shrink-0">
                {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
              </button>
            ) : <div className="w-4 flex-shrink-0" />}

            {/* Main content */}
            <div className="flex-1 min-w-0" onClick={() => setSelectedRule(rule)}>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${lvlCfg.chip}`}>{lvlCfg.label}</span>
                {rule.file_name && <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-black text-[9px] border border-indigo-100"><FileText size={8} /> FILE</span>}
                {quizCount > 0 && <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded-full font-black text-[9px] border border-teal-100"><ListChecks size={8} /> {quizCount}</span>}
                {hasChildren && <span className="text-[9px] font-black text-gray-400">{rule.children.length} chủ đề con</span>}
              </div>
              <h4 className={`font-black text-sm tracking-tight leading-tight ${isSelected ? "text-teal-700" : "text-gray-900 group-hover:text-teal-700"}`}>{rule.name}</h4>
              <p className="text-gray-400 text-xs mt-0.5 line-clamp-1 font-medium">{stripHtml(rule.description) || "—"}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {quizCount > 0 && (
                <button onClick={e => { e.stopPropagation(); setPendingStoredRuleId(rule.id); setShowPracticeConfig(true); }}
                  className="text-[9px] font-black px-1.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all flex items-center gap-0.5 whitespace-nowrap">
                  <ListChecks size={9} /> Luyện
                </button>
              )}
              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${isSelected ? "bg-teal-600 border-teal-600 text-white" : "border-gray-200 bg-white hover:border-teal-400"}`}
                onClick={e => { e.stopPropagation(); toggleRule(rule.id); }}>
                {isSelected && <CheckCircle2 size={12} />}
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {rule.children.map((child: any) => (
              <RuleCard key={child.id} rule={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300 pb-28">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-5 text-white relative overflow-hidden shadow-xl shadow-teal-200/40">
        <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white/20 p-2 rounded-xl"><BookText size={20} /></div>
              <span className="font-black text-teal-100 uppercase tracking-widest text-xs">Kho Ngữ Pháp</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-none mb-1">Grammar Exercises</h1>
            <p className="text-teal-100 font-bold text-xs sm:text-sm">Luyện tập ngữ pháp theo trình độ CEFR — điểm được ghi nhận</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { val: rules.length, label: "Chủ đề" },
                { val: totalQuizzes, label: "Bài tập" },
                { val: "6", label: "Cấp độ" },
              ].map(({ val, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 border border-white/10 text-xs">
                  <span className="font-black text-base">{val}</span>
                  <span className="text-teal-100 font-bold">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 border border-white/10 text-xs">
                <Sparkles size={13} className="text-yellow-300" />
                <span className="text-teal-100 font-bold">AI Practice</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row sm:flex-row gap-2 flex-shrink-0">
            <button onClick={() => { setShowParseModal(true); setParseTab(isAdmin ? "local" : "ai"); setLocalParsedQuestions([]); setSavedSuccess(false); }}
              className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-1.5 transition-all active:scale-95">
              <ClipboardPaste size={16} />
              {isAdmin ? "Nhập bài tập" : "Phân tích đề"}
            </button>
            <button onClick={() => { if (selectedRules.length > 0) setShowPracticeConfig(true); else showAlert("Chọn chủ đề từ danh sách bên dưới!", "warning"); }}
              className="bg-white text-teal-700 hover:bg-teal-50 px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-1.5 shadow-lg transition-all active:scale-95">
              <Sparkles size={16} />
              {selectedRules.length > 0 ? `Luyện ${selectedRules.length}` : "Bắt đầu"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Browse by Level ── */}
      <div className="mb-5">
        <h2 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-widest">
          <SlidersHorizontal size={16} className="text-teal-600" /> Browse by Level
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CEFR_LEVELS.map(lvl => {
            const count = levelCounts[lvl.id] || 0;
            const isActive = activeLevel === lvl.id;
            return (
              <button key={lvl.id} onClick={() => setActiveLevel(isActive ? null : lvl.id)}
                className={`group rounded-2xl p-3 text-left transition-all duration-200 ${isActive ? `bg-gradient-to-br ${lvl.gradient} text-white shadow-lg scale-[1.03] ring-2 ${lvl.ring}/30` : "bg-white border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.01]"}`}>
                <p className={`text-xl font-black tracking-tighter mb-0.5 ${isActive ? "text-white" : "text-gray-900"}`}>{lvl.label}</p>
                <p className={`text-[10px] font-bold mb-1 ${isActive ? "text-white/70" : "text-gray-400"}`}>{lvl.sublabel}</p>
                <p className={`font-black text-sm ${isActive ? "text-white" : "text-gray-700"}`}>{count}<span className={`text-[9px] font-bold ml-0.5 ${isActive ? "text-white/60" : "text-gray-400"}`}> ct</span></p>
              </button>
            );
          })}
        </div>
        {activeLevel && <button onClick={() => setActiveLevel(null)} className="mt-2 text-xs font-black text-teal-600 hover:underline flex items-center gap-1"><X size={11} /> Tất cả</button>}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm chủ đề ngữ pháp..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-gray-100 focus:border-teal-400 rounded-xl outline-none font-bold text-sm text-gray-700 placeholder-gray-400 transition-all shadow-sm" />
      </div>

      {/* ── Topic Tree ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
            {activeLevel ? `${activeLevel} · ${getLevelConfig(activeLevel).sublabel}` : "Tất cả chủ đề"}
            <span className="text-xs font-black text-gray-400">({flatFiltered.length})</span>
          </h3>
          <div className="flex items-center gap-3">
            {!searchQuery && !activeLevel && (
              <button onClick={() => { const allIds = rules.filter(r=>r.children||true).map(r=>r.id); setExpandedNodes(expandedNodes.size > 0 ? new Set() : new Set(allIds)); }}
                className="text-xs font-black text-teal-600 hover:underline flex items-center gap-1">
                {expandedNodes.size > 0 ? <><ChevronUp size={12} /> Thu gọn</> : <><ChevronDown size={12} /> Mở rộng</>}
              </button>
            )}
            {selectedRules.length > 0 && (
              <button onClick={() => setSelectedRules([])} className="text-xs font-black text-rose-500 hover:underline flex items-center gap-1">
                <X size={11} /> Bỏ chọn ({selectedRules.length})
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{Array(5).fill(0).map((_,i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}</div>
        ) : treeRoots.length === 0 ? (
          <div className="py-12 text-center">
            <BookText size={48} className="mx-auto text-gray-100 mb-3" />
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
              {searchQuery ? "Không tìm thấy chủ đề" : "Kho ngữ pháp đang được cập nhật"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {treeRoots.map(r => <RuleCard key={r.id} rule={r} depth={0} />)}
          </div>
        )}
      </div>

      <FeedbackButton feature="grammar" />

      {/* ── Sticky Practice Bar ── */}
      {selectedRules.length > 0 && (
        <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-50 p-3">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-xl p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-black text-gray-900 text-sm">{selectedRules.length} chủ đề đã chọn</p>
              <p className="text-gray-400 text-xs font-bold truncate">{selectedRules.map(id => rules.find(r=>r.id===id)?.name).filter(Boolean).join(" · ")}</p>
            </div>
            <button onClick={() => setShowPracticeConfig(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl font-black flex items-center gap-1.5 shadow-lg transition-all active:scale-95 text-sm whitespace-nowrap">
              <Sparkles size={14} /> Học với AI
            </button>
          </div>
        </div>
      )}

      {/* ── Practice Config Modal ── */}
      {showPracticeConfig && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowPracticeConfig(false); setPendingStoredRuleId(null); }} />
          <div className="relative z-10 bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Cấu hình luyện tập</h3>
                <p className="text-xs text-gray-400 font-bold mt-0.5">
                  {pendingStoredRuleId ? rules.find(r=>r.id===pendingStoredRuleId)?.name : `${selectedRules.length} chủ đề`}
                </p>
              </div>
              <button onClick={() => { setShowPracticeConfig(false); setPendingStoredRuleId(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <p className="font-black text-gray-700 text-xs uppercase tracking-widest mb-2">Chế độ làm bài</p>
              <div className="grid grid-cols-2 gap-2">
                {[{ val: "choice" as PracticeMode, icon: <ListChecks size={18} />, label: "Choice", sub: "Chọn A/B/C/D", color: "teal" },
                  { val: "typing" as PracticeMode, icon: <Keyboard size={18} />, label: "Typing", sub: "Nhập đáp án", color: "orange" }].map(m => (
                  <button key={m.val} onClick={() => setPracticeMode(m.val)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${practiceMode === m.val ? `border-${m.color}-500 bg-${m.color}-50` : "border-gray-100 hover:border-gray-200"}`}>
                    <span className={practiceMode === m.val ? `text-${m.color}-600` : "text-gray-400"}>{m.icon}</span>
                    <p className={`font-black text-xs mt-1 ${practiceMode === m.val ? `text-${m.color}-700` : "text-gray-700"}`}>{m.label}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{m.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {!pendingStoredRuleId && (
              <div className="mb-5">
                <p className="font-black text-gray-700 text-xs uppercase tracking-widest mb-2">Độ khó (AI)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[{ val: "Easy", label: "Cơ bản", sub: "A1-A2", ac: "border-green-500 bg-green-50 text-green-700" },
                    { val: "Medium", label: "Trung cấp", sub: "B1-B2", ac: "border-blue-500 bg-blue-50 text-blue-700" },
                    { val: "Hard", label: "Nâng cao", sub: "C1-C2", ac: "border-purple-500 bg-purple-50 text-purple-700" }
                  ].map(d => (
                    <button key={d.val} onClick={() => setDifficulty(d.val)}
                      className={`p-2 rounded-xl border-2 text-center transition-all ${difficulty === d.val ? d.ac : "border-gray-100"}`}>
                      <p className={`font-black text-xs ${difficulty === d.val ? "" : "text-gray-700"}`}>{d.label}</p>
                      <p className="text-[9px] text-gray-400 font-bold">{d.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setShowPracticeConfig(false); setPendingStoredRuleId(null); }}
                className="flex-1 py-3 rounded-xl font-black text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition">Hủy</button>
              {pendingStoredRuleId ? (
                <button onClick={() => startStoredQuizPractice(pendingStoredRuleId)}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-teal-600 hover:bg-teal-700 transition shadow-md flex items-center justify-center gap-1.5">
                  <ListChecks size={15} /> Bắt đầu
                </button>
              ) : (
                <button onClick={startAIPractice}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-teal-600 hover:bg-teal-700 transition shadow-md flex items-center justify-center gap-1.5">
                  <Sparkles size={15} /> Học với AI
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Parse Modal ── */}
      {showParseModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!parsing && !localParsing) { setShowParseModal(false); setParseError(null); setLocalParseError(null); setLocalParsedQuestions([]); setSavedSuccess(false); setEditingIdx(null); } }} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl rounded-t-[28px] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-teal-100 p-2 rounded-xl"><ClipboardPaste size={18} className="text-teal-600" /></div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Phân tích đề thi</h3>
                  <p className="text-xs text-gray-400 font-bold">Trích xuất câu hỏi & đáp án từ văn bản</p>
                </div>
              </div>
              <button onClick={() => { setShowParseModal(false); setParseError(null); setLocalParseError(null); setLocalParsedQuestions([]); setSavedSuccess(false); setEditingIdx(null); }} disabled={parsing || localParsing}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-40"><X size={18} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5 flex-shrink-0">
              <button onClick={() => setParseTab("ai")}
                className={`pb-2.5 pt-3 px-3 font-black text-xs flex items-center gap-1.5 border-b-2 transition-all ${parseTab === "ai" ? "border-teal-500 text-teal-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                <Sparkles size={13} /> AI Phân tích <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full text-[9px]">3 credits</span>
              </button>
              <button onClick={() => setParseTab("local")}
                className={`pb-2.5 pt-3 px-3 font-black text-xs flex items-center gap-1.5 border-b-2 transition-all ${parseTab === "local" ? "border-orange-500 text-orange-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                <ListChecks size={13} /> Phân tích thông minh <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[9px]">Miễn phí</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {parseTab === "ai" ? (
                <>
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-xs text-teal-700">
                    <p className="font-black mb-1">Cách dùng:</p>
                    <ul className="space-y-0.5 opacity-80">
                      <li>• Copy văn bản từ PDF/Word có câu hỏi trắc nghiệm</li>
                      <li>• AI nhận biết câu hỏi, đáp án A/B/C/D và đáp án đúng</li>
                      <li>• Sau khi phân tích có thể <strong>chỉnh sửa từng câu</strong> trước khi luyện</li>
                      <li>• Tốn <strong>3 AI credits</strong> mỗi lần phân tích</li>
                    </ul>
                  </div>
                  <textarea value={parseText} onChange={e => setParseText(e.target.value)}
                    placeholder={"Dán văn bản đề thi vào đây...\n\nVí dụ:\n1. She _____ to school every day.\nA. goes  B. go  C. went  D. going\n\nAnswer key: 1-A"}
                    disabled={parsing} rows={8}
                    className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-400 rounded-xl p-3 outline-none text-xs font-mono text-gray-700 resize-y transition-all disabled:opacity-60" />
                  {parseError && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><p>{parseError}</p></div>}
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{parseText.length} / 12,000</span><span className="font-bold text-teal-600">3 credits</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-700">
                    <p className="font-black mb-1">Phân tích thông minh — không cần AI:</p>
                    <ul className="space-y-0.5 opacity-80">
                      <li>• Nhận diện câu hỏi số thứ tự (1. 2. 3. ...)</li>
                      <li>• Phát hiện đáp án A. B. C. D. và bảng đáp án (1-A, 2-C...)</li>
                      <li>• Sau phân tích có thể <strong>chỉnh sửa câu hỏi & đáp án</strong></li>
                      {isAdmin && <li>• Admin có thể <strong>lưu bài tập vào chủ đề</strong></li>}
                    </ul>
                  </div>

                  {localParsedQuestions.length === 0 ? (
                    <>
                      <textarea value={parseText} onChange={e => setParseText(e.target.value)}
                        placeholder={"Dán văn bản đề thi vào đây...\n\nVí dụ:\n1. She _____ to school every day.\nA. goes\nB. go\nC. went\nD. going\n\nAnswer key: 1-A, 2-C"}
                        disabled={localParsing} rows={8}
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-400 rounded-xl p-3 outline-none text-xs font-mono text-gray-700 resize-y transition-all disabled:opacity-60" />
                      {localParseError && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700"><AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><p>{localParseError}</p></div>}
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{parseText.length} / 20,000</span><span className="font-bold text-green-600">Miễn phí</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-black text-gray-900 text-sm flex items-center gap-1.5"><Eye size={14} className="text-teal-600" /> {localParsedQuestions.length} câu hỏi</p>
                        <button onClick={() => { setLocalParsedQuestions([]); setSavedSuccess(false); setEditingIdx(null); }}
                          className="text-xs font-black text-gray-400 hover:text-gray-600 flex items-center gap-1"><X size={11} /> Nhập lại</button>
                      </div>

                      {/* Editable question list */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {localParsedQuestions.map((q, i) => (
                          <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                            {editingIdx === i ? (
                              /* Edit mode */
                              <div className="p-3 space-y-2">
                                <div>
                                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Câu hỏi</label>
                                  <textarea value={editDraft.question} onChange={e => setEditDraft({ ...editDraft, question: e.target.value })}
                                    rows={2} className="w-full text-xs border-2 border-teal-300 rounded-lg p-2 font-medium outline-none resize-none mt-1 bg-white" />
                                </div>
                                {editDraft.options && editDraft.options.length > 0 && (
                                  <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Đáp án (chọn ✓ làm đáp án đúng)</label>
                                    <div className="space-y-1 mt-1">
                                      {editDraft.options.map((opt: string, j: number) => (
                                        <div key={j} className="flex items-center gap-2">
                                          <button onClick={() => setEditDraft({ ...editDraft, answer: opt })}
                                            className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${editDraft.answer === opt ? "bg-teal-500 border-teal-500 text-white" : "border-gray-300"}`}>
                                            {editDraft.answer === opt && <Check size={12} />}
                                          </button>
                                          <input value={opt} onChange={e => {
                                            const newOpts = [...editDraft.options];
                                            newOpts[j] = e.target.value;
                                            const newAnswer = editDraft.answer === opt ? e.target.value : editDraft.answer;
                                            setEditDraft({ ...editDraft, options: newOpts, answer: newAnswer });
                                          }} className="flex-1 text-xs border border-gray-200 rounded-lg p-1.5 outline-none font-medium bg-white" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {(!editDraft.options || editDraft.options.length === 0) && (
                                  <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Đáp án đúng</label>
                                    <input value={editDraft.answer} onChange={e => setEditDraft({ ...editDraft, answer: e.target.value })}
                                      className="w-full text-xs border-2 border-teal-300 rounded-lg p-2 outline-none mt-1 font-medium bg-white" />
                                  </div>
                                )}
                                <div className="flex gap-2 pt-1">
                                  <button onClick={saveEdit} className="flex-1 py-1.5 bg-teal-600 text-white rounded-lg font-black text-xs flex items-center justify-center gap-1">
                                    <Check size={12} /> Lưu
                                  </button>
                                  <button onClick={cancelEdit} className="flex-1 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-black text-xs">Hủy</button>
                                </div>
                              </div>
                            ) : (
                              /* Display mode */
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-black text-gray-900 text-xs mb-1.5">{i + 1}. {q.question}</p>
                                    {q.options && q.options.length > 0 && (
                                      <div className="grid grid-cols-2 gap-1 mb-1.5">
                                        {q.options.map((opt: string, j: number) => (
                                          <span key={j} className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${opt === q.answer ? "bg-green-100 text-green-700 border border-green-200" : "bg-white text-gray-500 border border-gray-100"}`}>
                                            {opt === q.answer && "✓ "}{opt}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {q.answer && <p className="text-[10px] font-black text-teal-600">Đáp án: {q.answer}</p>}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => startEdit(i)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil size={12} /></button>
                                    <button onClick={() => removeQuestion(i)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={12} /></button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Save to topic (admin) */}
                      {isAdmin && !savedSuccess && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <p className="font-black text-blue-900 text-xs mb-2 flex items-center gap-1.5"><Save size={13} /> Lưu vào chủ đề ngữ pháp</p>
                          <div className="flex gap-2">
                            <select value={selectedSaveRuleId} onChange={e => setSelectedSaveRuleId(e.target.value)}
                              className="flex-1 bg-white border-2 border-blue-200 rounded-lg px-2 py-1.5 outline-none font-bold text-gray-700 text-xs focus:border-blue-400">
                              <option value="">-- Chọn chủ đề --</option>
                              {rules.map(r => <option key={r.id} value={r.id}>{r.name} ({r.level})</option>)}
                            </select>
                            <button onClick={saveLocalQuizzes} disabled={!selectedSaveRuleId || savingQuizzes}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-black text-xs hover:bg-blue-700 transition disabled:opacity-40 flex items-center gap-1 flex-shrink-0">
                              {savingQuizzes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Lưu
                            </button>
                          </div>
                        </div>
                      )}
                      {savedSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 font-black text-xs">
                          <CheckCircle2 size={14} /> Đã lưu thành công!
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 flex gap-2">
              {parseTab === "ai" ? (
                <>
                  <button onClick={() => { setShowParseModal(false); setParseError(null); setParseText(""); }} disabled={parsing}
                    className="flex-1 py-2.5 rounded-xl font-black text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40">Hủy</button>
                  <button onClick={handleAIParse} disabled={parsing || !parseText.trim()}
                    className="flex-1 sm:flex-none sm:px-8 py-2.5 rounded-xl font-black text-sm text-white bg-teal-600 hover:bg-teal-700 transition flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40">
                    {parsing ? <><Loader2 size={15} className="animate-spin" /> Đang phân tích...</> : <><Sparkles size={15} /> Phân tích ngay</>}
                  </button>
                </>
              ) : localParsedQuestions.length === 0 ? (
                <>
                  <button onClick={() => { setShowParseModal(false); setLocalParseError(null); setParseText(""); }} disabled={localParsing}
                    className="flex-1 py-2.5 rounded-xl font-black text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40">Hủy</button>
                  <button onClick={handleLocalParse} disabled={localParsing || !parseText.trim()}
                    className="flex-1 sm:flex-none sm:px-8 py-2.5 rounded-xl font-black text-sm text-white bg-orange-500 hover:bg-orange-600 transition flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40">
                    {localParsing ? <><Loader2 size={15} className="animate-spin" /> Đang phân tích...</> : <><ListChecks size={15} /> Phân tích ngay</>}
                  </button>
                </>
              ) : (
                <button onClick={practiceLocalQuestions}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm text-white bg-teal-600 hover:bg-teal-700 transition flex items-center justify-center gap-1.5 shadow-lg">
                  <Sparkles size={15} /> Luyện tập ngay ({localParsedQuestions.length} câu)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
