"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookMarked, Clock, Search, PlayCircle, Volume2, Edit3, Trash2,
  Brain, X, Sparkles, CheckCircle2, ArrowRight, Lightbulb,
  RotateCw, Shuffle, Layers, ArrowLeft, Award,
  Download, Upload, FileText, FileSpreadsheet, Printer
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { Button, Modal, Confetti, useSound, EmptyState, Skeleton } from "../../components/ui";
import PushNotificationButton from "./PushNotificationButton";

interface VocabularyTabProps {
  API_URL: string;
}

export default function VocabularyTab({ API_URL }: VocabularyTabProps) {
  const { token, authFetch, refreshUser } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const sfx = useSound();
  const [confettiTick, setConfettiTick] = useState(0);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Flashcard mode states (Phase 2 - Task 2.5)
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardList, setFlashcardList] = useState<any[]>([]);
  const [flashcardStats, setFlashcardStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [flashcardDone, setFlashcardDone] = useState(false);

  // AI Practice states
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceExercises, setPracticeExercises] = useState<any[]>([]);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [practiceResults, setPracticeResults] = useState<any[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [matchingSelections, setMatchingSelections] = useState<{ word: string | null, def: string | null }>({ word: null, def: null });
  const [matches, setMatches] = useState<Record<string, string>>({});
  
  // Randomize definitions for Matching exercises once per exercise
  const shuffledDefs = useMemo(() => {
    const currentEx = practiceExercises[currentExerciseIdx];
    if (currentEx?.type === 'MATCHING' && currentEx.matching_pairs) {
      return [...currentEx.matching_pairs].map(p => p.def).sort(() => Math.random() - 0.5);
    }
    return [];
  }, [practiceExercises, currentExerciseIdx]);
  
  const renderSentenceWithBlank = (text: string, currentIdx: number) => {
    if (!text || !text.includes('[blank]')) return text;
    
    const parts = text.split('[blank]');
    const answer = practiceAnswers[currentIdx];
    const currentEx = practiceExercises[currentIdx];
    const isCorrect = exerciseSubmitted && String(answer || "").toLowerCase().trim() === String(currentEx?.answer || "").toLowerCase().trim();
    
    return (
      <span className="leading-relaxed">
        {parts[0]}
        <span className={`inline-flex items-center justify-center min-w-[140px] px-4 mx-2 border-b-4 font-semibold transition-all duration-300 ${
          exerciseSubmitted ? (isCorrect ? "text-green-600 border-green-500 bg-green-50/50" : "text-red-600 border-red-500 bg-red-50/50") :
          answer ? "text-blue-600 border-blue-400 bg-blue-50/50" : "text-gray-300 border-gray-200 bg-gray-50 animate-pulse"
        } rounded-2xl py-2 -mb-2`}>
          {answer || "........."}
        </span>
        {parts[1]}
      </span>
    );
  };

  
  // Edit Vocabulary states
  const [editingWord, setEditingWord] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Phase 3 (3.5 & 3.6): Export & Import Vocabulary states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const handleExport = async (format: 'anki' | 'csv' | 'pdf') => {
    setShowExportDropdown(false);
    try {
      const res = await authFetch(`${API_URL}/student/vocabulary/export?format=${format}`);
      if (!res.ok) throw new Error("Xuất file thất bại");
      if (format === 'pdf') {
        const html = await res.text();
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = format === 'anki' ? "eam_anki_deck.txt" : "eam_vocabulary.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      showAlert("Có lỗi xảy ra khi tải file xuất.", "error");
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    setIsImporting(true);
    try {
      const res = await authFetch(`${API_URL}/student/vocabulary/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: importText })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(`Đã nhập thành công ${data.imported_count} từ vựng!`, "success");
        setShowImportModal(false);
        setImportText("");
        fetchWords();
        refreshUser();
      } else {
        showAlert(data.detail || "Nhập từ vựng thất bại", "error");
      }
    } catch (e) {
      showAlert("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchWords = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (levelFilter) params.set("level", levelFilter);
      const res = await authFetch(`${API_URL}/student/vocabulary?${params}`);
      if (res.ok) {
        const serverWords = await res.json();
        setWords(serverWords);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, debouncedSearch, levelFilter, authFetch, API_URL]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const deleteWord = async (id: number) => {
    const confirmed = await showConfirm("Xóa từ này khỏi kho từ vựng?");
    if (!confirmed) return;
    setDeleting(id);
    try {
      const res = await authFetch(`${API_URL}/student/vocabulary/${id}`, { method: "DELETE" });
      if (res.ok) setWords(words.filter(w => w.id !== id));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const updateWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord) return;
    setIsUpdating(true);
    try {
      const res = await authFetch(`${API_URL}/student/vocabulary/${editingWord.id}`, {
        method: "PUT",
        body: JSON.stringify(editingWord)
      });
      if (res.ok) {
        setWords(words.map(w => w.id === editingWord.id ? editingWord : w));
        setEditingWord(null);
      }
    } catch (e) { console.error(e); }
    finally { setIsUpdating(false); }
  };

  const speak = (text: string, audio_url?: string) => {
    if (audio_url) {
      new Audio(audio_url).play().catch(() => {});
      return;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
    }
  };

  const renderFSRSStatus = (w: any) => {
    if (w.stability === undefined || w.stability === null) return null;
    const stability = parseFloat(w.stability);
    const difficulty = parseFloat(w.difficulty);
    
    let color = "text-red-500";
    if (stability > 30) color = "text-green-500";
    else if (stability > 10) color = "text-blue-500";
    else if (stability > 3) color = "text-yellow-600";

    return (
      <div className="flex items-center gap-3 mt-2 text-[9px] font-bold uppercase tracking-wider">
        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-500">Độ bền: <span className={color}>{stability.toFixed(1)} ngày</span></span>
        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-500">Độ khó: {difficulty.toFixed(1)}</span>
      </div>
    );
  };

  const startRichPractice = async () => {
    setGeneratingPractice(true);
    setPracticeExercises([]);
    try {
      // Collect IDs of words that are due or just the top 10 if none are due
      const dueWords = words.filter(w => !w.scheduled_at || new Date(w.scheduled_at) <= new Date());
      const selectedWords = dueWords.length > 0 ? dueWords : words.slice(0, 10);
      const wordIds = selectedWords.map(w => w.id);

      const res = await authFetch(`${API_URL}/student/vocabulary/practice`, {
        method: "POST",
        body: JSON.stringify({ word_ids: wordIds }) 
      });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          const rawEx = data.exercises || data.quiz || (Array.isArray(data) ? data : []);
          const validEx = Array.isArray(rawEx) ? rawEx.filter((ex: any) => ex && (ex.question || ex.q || ex.type === 'MATCHING')) : [];
          
          if (validEx.length === 0) {
            showAlert("AI không tạo được câu hỏi phù hợp. Vui lòng thử lại.", 'warning');
            return;
          }

          setPracticeExercises(validEx);      
          setCurrentExerciseIdx(0);
          setPracticeResults([]);
          setPracticeAnswers({});
          setExerciseSubmitted(false);
          setShowHint(false);
          setMatches({});
          setMatchingSelections({ word: null, def: null });
          refreshUser();
        }
      } else {
        const errorData = await res.json();
        showAlert(errorData.detail || "Lỗi khi chuẩn bị bài tập", 'error');
      }
    } catch (e) { 
        showAlert("Lỗi kết nối. Vui lòng kiểm tra lại dịch vụ AI.", 'error'); 
    }
    finally { setGeneratingPractice(false); }
  };

  const submitCurrentExercise = (rating?: number) => {
    const ex = practiceExercises[currentExerciseIdx];
    const ans = practiceAnswers[currentExerciseIdx] || "";
    
    let isCorrect = false;
    if (ex.type === 'MATCHING') {
      const pairCount = ex.matching_pairs?.length || 0;
      isCorrect = Object.keys(matches).length === pairCount;
    } else {
      isCorrect = ans.toLowerCase().trim() === ex.answer.toLowerCase().trim();
    }
    
    const finalRating = rating || (isCorrect ? 3 : 1);
    setPracticeResults(prev => [...prev, { word_id: ex.word_id, correct: isCorrect, rating: finalRating }]);
    setExerciseSubmitted(true);
    if (isCorrect) sfx.correct(); else sfx.wrong();
  };

  const nextExercise = async () => {
    if (currentExerciseIdx < practiceExercises.length - 1) {
      setCurrentExerciseIdx(prev => prev + 1);
      setExerciseSubmitted(false);
      setShowHint(false);
      setMatches({});
      setMatchingSelections({ word: null, def: null });
    } else {
      try {
        // Filter out any results that might be missing word_id (safety)
        const validResults = practiceResults.filter(r => r.word_id);
        const res = await authFetch(`${API_URL}/student/vocabulary/practice/complete`, {
          method: "POST",
          body: JSON.stringify({ results: validResults })
        });
        
        if (res.ok) {
            refreshUser();
            const correctCount = practiceResults.filter(r => r.correct).length;
            const percentage = (correctCount / practiceExercises.length) * 100;

            let message = "";
            let type: 'success' | 'warning' | 'info' = 'success';

            if (percentage >= 80) {
              message = `Tuyệt vời! Bạn đã hoàn thành xuất sắc bài ôn tập.`;
              sfx.levelUp();
              setConfettiTick(t => t + 1);
            } else if (percentage >= 50) {
              message = `Khá tốt! Bạn đã hoàn thành bài ôn tập.`;
              sfx.finish();
            } else {
                message = `Bạn đã hoàn thành bài ôn tập. Hãy cố gắng hơn ở lần sau nhé!`;
                type = 'info';
                sfx.finish();
            }
            
            showAlert(`${message}\nĐúng: ${correctCount}/${practiceExercises.length}\nĐiểm thưởng: +${correctCount * 10}`, type);
            setPracticeExercises([]);
            // Force a slight delay to ensure DB commit is visible to next query
            setTimeout(() => fetchWords(), 500);
        } else {
            showAlert("Lỗi khi lưu kết quả bài tập.", 'error');
        }
      } catch (e) { 
          console.error(e);
          showAlert("Lỗi khi kết nối máy chủ để lưu kết quả.", 'error'); 
      }
    }
  };

  const startFlashcards = () => {
    if (words.length === 0) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setFlashcardList(shuffled);
    setFlashcardIdx(0);
    setIsFlipped(false);
    setFlashcardStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setFlashcardDone(false);
    setShowFlashcards(true);
  };

  const handleRateFlashcard = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    setFlashcardStats(prev => ({ ...prev, [rating]: prev[rating] + 1 }));
    setIsFlipped(false);
    if (flashcardIdx + 1 < flashcardList.length) {
      setFlashcardIdx(idx => idx + 1);
    } else {
      setFlashcardDone(true);
      sfx.levelUp();
      setConfettiTick(t => t + 1);
    }
  };

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const currentEx = practiceExercises[currentExerciseIdx];

  if (loading) return (
    <div className="space-y-5">
      <Skeleton variant="card" height={68} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} variant="card" height={160} />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <Confetti trigger={confettiTick} />

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-[var(--brand)] border border-blue-100">
          <BookMarked size={13} /> {words.length} từ đã lưu
        </span>
        {words.some(w => !w.scheduled_at || new Date(w.scheduled_at) <= new Date()) && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Clock size={13} /> {words.filter(w => !w.scheduled_at || new Date(w.scheduled_at) <= new Date()).length} cần ôn
          </span>
        )}
        <div className="hidden lg:flex items-center gap-1 ml-1">
          {levels.map(l => {
            const count = words.filter(w => w.level === l).length;
            if (count === 0) return null;
            return (
              <span key={l} className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[var(--surface-3)] text-[var(--ink-2)]">
                {l}:{count}
              </span>
            );
          })}
        </div>
        <div className="ml-auto">
          <PushNotificationButton API_URL={API_URL} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="app-card p-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
          <input
            type="text" placeholder="Tìm từ vựng..."
            className="pl-9 pr-3 py-2 w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-blue-100 transition"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative">
            <Button
              intent="ghost"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={words.length === 0}
              iconLeft={<Download size={15} />}
              size="sm"
            >
              Xuất từ vựng
            </Button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => handleExport('anki')}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition"
                >
                  <FileText size={15} className="text-blue-500" /> Bộ thẻ Anki Deck (.txt)
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition"
                >
                  <FileSpreadsheet size={15} className="text-emerald-500" /> Bảng tính Excel (.csv)
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2.5 transition"
                >
                  <Printer size={15} className="text-indigo-500" /> Bản in Flashcard (PDF)
                </button>
              </div>
            )}
          </div>

          {/* Import Button */}
          <Button
            intent="ghost"
            onClick={() => setShowImportModal(true)}
            iconLeft={<Upload size={15} />}
            size="sm"
          >
            Nhập Quizlet / Anki
          </Button>

          <Button
            intent="ghost"
            onClick={startFlashcards}
            disabled={words.length === 0}
            iconLeft={<Layers size={16} />}
            size="sm"
          >
            Thẻ Flashcard
          </Button>
          <Button
            intent="brand"
            onClick={startRichPractice}
            disabled={generatingPractice || words.length === 0}
            loading={generatingPractice}
            iconLeft={!generatingPractice ? <PlayCircle size={16} /> : null}
            size="sm"
          >
            Luyện tập SR
          </Button>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="app-card">
          <EmptyState
            icon={<BookMarked size={24} />}
            title="Chưa có từ vựng nào"
            body="Tra từ điển và nhấn 'Lưu từ' để thêm từ vào kho của bạn."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {words.map((w) => {
            const isDue = !w.scheduled_at || new Date(w.scheduled_at) <= new Date();
            return (
              <div key={w.id} className="app-card app-card--hover p-5 group relative overflow-hidden">
                {isDue && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] px-2.5 py-0.5 font-semibold rounded-bl-lg tracking-wide uppercase">
                    Cần ôn
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-[var(--brand)]">{w.word}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--brand-soft)] text-[var(--brand)] font-semibold uppercase">{w.pos || 'N/A'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--ink-2)] font-semibold">{w.level || 'B1'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => speak(w.word, w.audio_url)}
                    className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-[var(--ink-3)] hover:text-[var(--brand)] transition"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>

                <p className="text-sm text-[var(--ink-1)] font-medium line-clamp-2 mb-2">{w.meaning_vn}</p>
                {w.example && (
                  <p className="text-xs text-[var(--ink-3)] italic line-clamp-2 border-l-2 border-[var(--line)] pl-2">
                    {w.example}
                  </p>
                )}

                {renderFSRSStatus(w)}

                <div className="mt-4 pt-3 border-t border-[var(--line)] flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--ink-3)]">
                    <span>{Math.min(w.review_count || 0, 5)}/5</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(step => (
                        <div key={step} className={`w-1.5 h-1.5 rounded-full ${step <= (w.review_count || 0) ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setEditingWord(w)}
                      className="p-1 text-[var(--ink-3)] hover:text-[var(--brand)] hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => deleteWord(w.id)}
                      className="p-1 text-[var(--ink-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {generatingPractice && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)]"></div>
            <p className="text-gray-500 font-medium">AI đang tạo bài luyện tập từ vựng...</p>
          </div>
        )}

      {practiceExercises.length > 0 && !generatingPractice && currentEx && (
        <div className="fixed inset-0 !mt-0 z-50 flex flex-col bg-white overflow-y-auto animate-in slide-in-from-bottom-5 duration-300">
          {/* Top Progress Header */}
          <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-5 py-3.5 flex items-center gap-4 border-b border-[var(--line)]">
            <button onClick={() => setPracticeExercises([])} className="text-[var(--ink-3)] hover:text-[var(--ink-1)] transition p-1"><X size={22} /></button>
            <div className="flex-1 h-2.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                style={{ width: `${((currentExerciseIdx) / practiceExercises.length) * 100}%` }}
              />
            </div>
            <span className="font-bold text-[var(--brand)] text-sm tabular-nums">{currentExerciseIdx + 1} / {practiceExercises.length}</span>
          </div>
          
          {/* Main Quiz Content */}
          <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center">
            
            <div className="mb-10 text-center">
              <span className="inline-block px-3 py-1 bg-[var(--brand-soft)] text-[var(--brand)] rounded-lg font-semibold uppercase tracking-wide text-xs mb-5 border border-blue-100">
                {currentEx.type === 'FIB' ? 'Điền vào chỗ trống' : currentEx.type === 'SPELLING' ? 'Nghe và Viết' : currentEx.type === 'PARAPHRASE' ? 'Cụm từ đồng nghĩa' : 'Chọn đáp án đúng'}
              </span>

              <h2 className="text-2xl md:text-3xl font-bold text-[var(--ink-1)] leading-tight mb-6 px-4">
                {currentEx.type === 'MATCHING' 
                  ? "Ghép từ với định nghĩa tương ứng" 
                  : (currentEx.type === 'FIB' || currentEx.type === 'SPELLING')
                    ? renderSentenceWithBlank(currentEx.question || currentEx.context || "", currentExerciseIdx)
                    : currentEx.question}
              </h2>
              
              {currentEx.type !== 'MATCHING' && currentEx.type !== 'FIB' && currentEx.type !== 'SPELLING' && currentEx.context && (
                <div className="text-xl md:text-2xl font-medium text-gray-600 bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100 leading-relaxed max-w-2xl mx-auto shadow-inner">
                  {currentEx.context}
                </div>
              )}

              {currentEx.type === 'SPELLING' && (
                <button 
                  onClick={() => speak(currentEx.answer)} 
                  className="mt-6 mx-auto bg-blue-100 hover:bg-blue-200 text-blue-600 p-5 rounded-full transition transform active:scale-90 shadow-md"
                >
                  <Volume2 size={36} />
                </button>
              )}
            </div>

            <div className="w-full max-w-6xl mx-auto space-y-4">
              {currentEx.type === 'MATCHING' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-[1fr_2.5fr] gap-4 mb-2 px-4">
                    <h4 className="font-semibold text-blue-500 uppercase tracking-widest text-[10px]">Từ vựng</h4>
                    <h4 className="font-semibold text-purple-500 uppercase tracking-widest text-[10px]">Định nghĩa</h4>
                  </div>
                  
                  <div className="grid grid-cols-[1fr_2.5fr] gap-x-6 gap-y-3 items-stretch">
                    {(currentEx.matching_pairs || []).map((pair: any, i: number) => {
                       const word = pair.word;
                       const def = shuffledDefs[i];
                       
                       const isWordMatched = !!matches[word];
                       const isWordSelected = matchingSelections.word === word;
                       
                       const matchedWordForDef = Object.keys(matches).find(k => matches[k] === def);
                       const isDefSelected = matchingSelections.def === def;

                       return (
                        <React.Fragment key={i}>
                           <button 
                             disabled={exerciseSubmitted || isWordMatched}
                             onClick={() => setMatchingSelections(prev => ({ ...prev, word: word }))}
                             className={`p-4 md:p-5 rounded-2xl border-2 text-center font-semibold text-lg transition-all flex items-center justify-center ${
                               isWordMatched ? "bg-green-50 border-green-200 text-green-600 opacity-50" :
                               isWordSelected ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-500/10" :
                               "bg-white border-gray-100 hover:border-blue-200 text-gray-700 shadow-sm hover:shadow-md"
                             }`}
                           >
                              {word}
                           </button>

                           <button 
                             disabled={exerciseSubmitted || !!matchedWordForDef}
                             onClick={() => {
                                if (matchingSelections.word) {
                                   const correctPair = currentEx.matching_pairs.find((p: any) => p.word === matchingSelections.word);
                                   if (correctPair && correctPair.def === def) {
                                      setMatches(prev => ({ ...prev, [matchingSelections.word!]: def }));
                                      setMatchingSelections({ word: null, def: null });
                                      if (Object.keys(matches).length + 1 === currentEx.matching_pairs.length) {
                                         submitCurrentExercise(4);
                                      }
                                   } else {
                                      showAlert("Không khớp! Thử lại nhé.", 'warning');
                                      setMatchingSelections({ word: null, def: null });
                                   }
                                } else {
                                   setMatchingSelections(prev => ({ ...prev, def: def }));
                                }
                             }}
                             className={`p-4 md:p-5 rounded-2xl border-2 text-left text-base font-bold transition-all leading-snug flex items-center ${
                               matchedWordForDef ? "bg-green-50 border-green-200 text-green-600 opacity-50" :
                               isDefSelected ? "bg-purple-50 border-purple-500 text-purple-700 shadow-sm ring-2 ring-purple-500/10" :
                               "bg-white border-gray-100 hover:border-purple-200 text-gray-600 shadow-sm hover:shadow-md"
                             }`}
                           >
                              {def}
                           </button>
                        </React.Fragment>
                       );
                    })}
                  </div>
                </div>
              ) : currentEx.options && currentEx.type !== 'SPELLING' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentEx.options.map((opt: string, i: number) => {
                    const isSelected = practiceAnswers[currentExerciseIdx] === opt;
                    const isCorrect = opt === currentEx.answer;
                    
                    let bgClass = "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 shadow-sm";
                    if (exerciseSubmitted) {
                      if (isCorrect) bgClass = "bg-green-100 border-green-500 text-green-800 shadow-md scale-[1.02] z-10 ring-4 ring-green-500/20";
                      else if (isSelected) bgClass = "bg-red-50 border-red-400 text-red-600";
                      else bgClass = "opacity-40 grayscale border-gray-100";
                    } else if (isSelected) {
                      bgClass = "bg-blue-100 border-blue-500 text-blue-800 shadow-md scale-[1.02] ring-4 ring-blue-500/20";
                    }

                    return (
                      <button 
                        key={i} 
                        disabled={exerciseSubmitted}
                        onClick={() => setPracticeAnswers({ ...practiceAnswers, [currentExerciseIdx]: opt })}
                        className={`p-6 md:p-8 rounded-3xl border-2 text-left transition-all duration-300 font-bold text-lg md:text-xl flex items-center gap-4 ${bgClass}`}
                      >
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${exerciseSubmitted && isCorrect ? 'border-green-600 text-green-700 bg-white' : exerciseSubmitted && isSelected ? 'border-red-500 text-red-600 bg-white' : isSelected ? 'border-blue-600 text-blue-600 bg-white' : 'border-gray-300 text-gray-400'}`}>
                           {exerciseSubmitted && isCorrect ? <CheckCircle2 size={16}/> : exerciseSubmitted && isSelected ? <X size={16}/> : i + 1}
                        </div>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="relative max-w-lg mx-auto">
                  <input
                    autoFocus type="text"
                    value={practiceAnswers[currentExerciseIdx] || ""}
                    onChange={e => setPracticeAnswers({ ...practiceAnswers, [currentExerciseIdx]: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter' && !exerciseSubmitted && practiceAnswers[currentExerciseIdx]) submitCurrentExercise(); }}
                    placeholder={currentEx.type === 'SPELLING' ? "Nghe và nhập chính xác từ..." : "Nhập đáp án..."}
                    className={`w-full text-3xl font-semibold text-center p-8 border-b-4 rounded-3xl outline-none transition-all shadow-sm ${exerciseSubmitted ? (String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-300 bg-gray-50 focus:border-blue-500 focus:bg-white focus:shadow-xl"}`}
                    disabled={exerciseSubmitted}
                  />
                  {currentEx.type === 'SPELLING' && !exerciseSubmitted && (
                     <p className="text-center text-sm text-gray-400 mt-4 font-bold flex items-center justify-center gap-1">
                        <Sparkles size={14} className="text-yellow-500"/> Gợi ý: {currentEx.hint_vn || "Cố gắng nghe kỹ!"}
                     </p>
                  )}
                </div>
              )}
            </div>
            
            {showHint && !exerciseSubmitted && currentEx.hint_vn && currentEx.type !== 'SPELLING' && (
                <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-200 text-yellow-800 text-sm md:text-base font-medium max-w-2xl mx-auto mt-8 flex items-start gap-3 animate-in fade-in zoom-in-95">
                    <Lightbulb size={24} className="text-yellow-600 flex-shrink-0" />
                    <p><strong>Gợi ý từ AI:</strong> {currentEx.hint_vn}</p>
                </div>
            )}

            {/* Empty space filler to push the footer down */}
            <div className="flex-1"></div>
          </div>

          {/* Bottom Action Footer */}
          <div className={`border-t sm:px-12 p-5 transition-colors duration-300 ${exerciseSubmitted ? (String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "bg-[var(--duo-correct-soft,#D7FFB8)] border-green-200" : "bg-[var(--duo-wrong-soft,#FFDFE0)] border-red-200") : "bg-white border-[var(--line)]"}`}>
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
               
               {/* Left side: Status or Feedback */}
               <div className="flex-1 flex items-center gap-6 w-full sm:w-auto">
                 {!exerciseSubmitted ? (
                    <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-gray-700 font-bold flex items-center gap-2 transition px-4 py-2 hover:bg-gray-100 rounded-xl">
                        <Lightbulb size={20} /> {showHint ? "Ẩn gợi ý" : "Xin gợi ý"}
                    </button>
                 ) : (
                    <div className="flex items-center gap-5 flex-1 w-full animate-in slide-in-from-left-4">
                       <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? 'bg-white text-green-500' : 'bg-white text-red-500'}`}>
                         {String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? <CheckCircle2 size={40} /> : <X size={40} />}
                       </div>
                       <div>
                         <h3 className={`font-bold text-xl ${String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "text-green-800" : "text-red-700"}`}>
                           {String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "Tuyệt vời!" : "Sai rồi!"}
                         </h3>
                         <p className={`font-semibold mt-1 text-base ${String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "text-green-700" : "text-red-600"}`}>
                            Đáp án: <span className="underline decoration-4 underline-offset-4">{currentEx.answer}</span>
                         </p>
                         {currentEx.explanation_en && <p className="text-sm mt-2 opacity-80 text-gray-800 max-w-xl">{currentEx.explanation_en}</p>}
                       </div>
                    </div>
                 )}
               </div>

               {/* Right side: Action Buttons */}
               <div className="w-full sm:w-auto flex-shrink-0">
                 {!exerciseSubmitted ? (
                    <Button
                      onClick={() => submitCurrentExercise()}
                      disabled={!practiceAnswers[currentExerciseIdx]}
                      intent="info"
                      size="lg"
                      block
                    >
                        Kiểm tra
                    </Button>
                 ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                        <div className="bg-white/50 backdrop-blur-sm p-2 rounded-2xl flex gap-2 shadow-sm w-full sm:w-auto">
                            {[
                                { r: 1, l: "Lại", c: "hover:bg-red-100 text-red-600 border-2 border-red-200" },
                                { r: 2, l: "Khó", c: "hover:bg-orange-100 text-orange-600 border-2 border-orange-200" },
                                { r: 3, l: "Khá", c: "hover:bg-green-100 text-green-600 border-2 border-green-200" },
                                { r: 4, l: "Dễ", c: "hover:bg-blue-100 text-blue-600 border-2 border-blue-200" }
                            ].map(btn => (
                                <button key={btn.r} onClick={() => {
                                    sfx.click();
                                    setPracticeResults(prev => { const next = [...prev]; next[next.length - 1].rating = btn.r; return next; });
                                    nextExercise();
                                }} className={`w-14 h-14 flex flex-col items-center justify-center rounded-2xl font-semibold transition-colors bg-white shadow-sm active:scale-95 ${btn.c}`}>
                                    <span className="text-[15px]">{btn.l}</span>
                                    <span className="text-[10px] opacity-70">Rate: {btn.r}</span>
                                </button>
                            ))}
                        </div>
                        <Button
                          onClick={() => { sfx.click(); nextExercise(); }}
                          intent={String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "correct" : "wrong"}
                          size="lg"
                          withSound={false}
                          iconRight={<ArrowRight size={20} />}
                          className="w-full sm:w-auto"
                        >
                          {currentExerciseIdx < practiceExercises.length - 1 ? "Tiếp tục" : "Hoàn thành"}
                        </Button>
                    </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!editingWord}
        onClose={() => setEditingWord(null)}
        title={editingWord ? `Chỉnh sửa "${editingWord.word}"` : "Chỉnh sửa từ vựng"}
        size="md"
        footer={editingWord ? (
          <>
            <Button type="button" intent="ghost" onClick={() => setEditingWord(null)}>
              Hủy
            </Button>
            <Button type="button" intent="primary" loading={isUpdating} onClick={(e) => updateWord(e as any)}>
              {isUpdating ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </>
        ) : null}
      >
        {editingWord && (
          <form onSubmit={updateWord} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1.5">Từ vựng</label>
                <input type="text" className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-blue-100 font-semibold transition" value={editingWord.word} onChange={e => setEditingWord({...editingWord, word: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1.5">Phát âm</label>
                <input type="text" className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-blue-100 font-mono transition" value={editingWord.phonetic || ""} onChange={e => setEditingWord({...editingWord, phonetic: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1.5">Loại từ (POS)</label>
                <input type="text" className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-blue-100 transition" value={editingWord.pos || ""} onChange={e => setEditingWord({...editingWord, pos: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1.5">Cấp độ (CEFR)</label>
                <select className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-blue-100 transition" value={editingWord.level || "B1"} onChange={e => setEditingWord({...editingWord, level: e.target.value})}>
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1.5">Nghĩa tiếng Việt</label>
              <input type="text" className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-blue-100 font-semibold text-[var(--brand)] transition" value={editingWord.meaning_vn || ""} onChange={e => setEditingWord({...editingWord, meaning_vn: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-3)] uppercase tracking-wide mb-1.5">Ví dụ</label>
              <textarea rows={2} className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-blue-100 italic transition" value={editingWord.example || ""} onChange={e => setEditingWord({...editingWord, example: e.target.value})} />
            </div>
            <button type="submit" className="hidden" />
          </form>
        )}
      </Modal>

      {/* 3D Flashcard Mode Modal (Phase 2 - Task 2.5) */}
      <Modal
        open={showFlashcards}
        onClose={() => setShowFlashcards(false)}
        title={flashcardDone ? "Kết Quả Phiên Flashcard" : `Thẻ Ghi Nhớ (${flashcardIdx + 1}/${flashcardList.length || 1})`}
        size="lg"
      >
        {flashcardDone ? (
          <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-200">
              <Award size={36} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--ink-1)]">Xuất Sắc! Bạn Đã Hoàn Thành Phiên Ôn</h3>
              <p className="text-sm text-[var(--ink-2)] mt-1">Đã ôn tập toàn bộ {flashcardList.length} thẻ từ vựng trong kho.</p>
            </div>

            <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto pt-2">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900 text-center">
                <span className="text-lg font-bold text-red-600 block">{flashcardStats.again}</span>
                <span className="text-[11px] text-red-500 font-medium">Chưa thuộc</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900 text-center">
                <span className="text-lg font-bold text-amber-600 block">{flashcardStats.hard}</span>
                <span className="text-[11px] text-amber-500 font-medium">Hơi khó</span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 text-center">
                <span className="text-lg font-bold text-blue-600 block">{flashcardStats.good}</span>
                <span className="text-[11px] text-blue-500 font-medium">Đã nhớ</span>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-100 dark:border-green-900 text-center">
                <span className="text-lg font-bold text-green-600 block">{flashcardStats.easy}</span>
                <span className="text-[11px] text-green-500 font-medium">Rất dễ</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <Button intent="ghost" onClick={() => setShowFlashcards(false)}>
                Đóng
              </Button>
              <Button intent="brand" iconLeft={<RotateCw size={15} />} onClick={startFlashcards}>
                Luyện tập lượt mới
              </Button>
            </div>
          </div>
        ) : flashcardList.length > 0 ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="w-full bg-[var(--surface-3)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--brand)] h-full transition-all duration-300 rounded-full"
                style={{ width: `${((flashcardIdx + 1) / flashcardList.length) * 100}%` }}
              />
            </div>

            {/* 3D Flip Card */}
            {(() => {
              const currentCard = flashcardList[flashcardIdx];
              return (
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full min-h-[280px] sm:min-h-[310px] rounded-2xl cursor-pointer p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-500 shadow-md border border-[var(--line)] select-none hover:shadow-lg bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950 text-center"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--brand-soft)] text-[var(--brand)] uppercase tracking-wide">
                      {currentCard?.pos || "Từ vựng"}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-gray-800 text-[var(--ink-2)]">
                      {currentCard?.level || "B1"}
                    </span>
                  </div>

                  {!isFlipped ? (
                    /* Front Side */
                    <div className="my-auto space-y-3">
                      <h2 className="text-3xl sm:text-4xl font-black text-[var(--ink-1)] tracking-tight">
                        {currentCard?.word}
                      </h2>
                      {currentCard?.phonetic && (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm sm:text-base font-mono text-[var(--ink-2)]">
                            {currentCard.phonetic}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speak(currentCard.word, currentCard.audio_url);
                            }}
                            className="p-1.5 rounded-full bg-blue-50 dark:bg-gray-800 text-blue-600 hover:bg-blue-100 transition"
                            title="Nghe phát âm"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-[var(--ink-3)] pt-2 flex items-center justify-center gap-1">
                        <RotateCw size={12} className="animate-spin-slow" />
                        Nhấn thẻ để lật xem nghĩa
                      </p>
                    </div>
                  ) : (
                    /* Back Side */
                    <div className="my-auto space-y-3 animate-in fade-in duration-300">
                      <div className="space-y-1">
                        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--brand)]">
                          {currentCard?.meaning_vn || "Chưa có nghĩa tiếng Việt"}
                        </h3>
                        {currentCard?.meaning_en && (
                          <p className="text-sm text-[var(--ink-2)] font-medium">
                            {currentCard.meaning_en}
                          </p>
                        )}
                      </div>
                      {currentCard?.example && (
                        <div className="bg-slate-100/70 dark:bg-gray-800/60 p-3 rounded-xl text-xs sm:text-sm text-[var(--ink-2)] italic flex items-center justify-between gap-2 text-left mt-3">
                          <span className="flex-1">"{currentCard.example}"</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speak(currentCard.example, undefined);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 shrink-0"
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 size={14} />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-[var(--ink-3)] pt-1">
                        Chọn mức độ nhớ bên dưới để tiếp tục
                      </p>
                    </div>
                  )}

                  <div className="text-[11px] text-[var(--ink-3)] font-medium flex items-center justify-between w-full pt-3 border-t border-[var(--line)]/50">
                    <span>Thẻ {flashcardIdx + 1} / {flashcardList.length}</span>
                    <span>{isFlipped ? "Đang xem mặt sau" : "Đang xem mặt trước"}</span>
                  </div>
                </div>
              );
            })()}

            {/* Spaced Repetition Rating Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => handleRateFlashcard('again')}
                className="py-2.5 px-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/30 dark:hover:bg-red-900/50 text-xs font-semibold border border-red-200 dark:border-red-900 transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Chưa thuộc</span>
                <span className="text-[10px] text-red-500 font-normal">&lt; 1 ngày</span>
              </button>
              <button
                onClick={() => handleRateFlashcard('hard')}
                className="py-2.5 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 text-xs font-semibold border border-amber-200 dark:border-amber-900 transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Hơi khó</span>
                <span className="text-[10px] text-amber-500 font-normal">2 ngày</span>
              </button>
              <button
                onClick={() => handleRateFlashcard('good')}
                className="py-2.5 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 text-xs font-semibold border border-blue-200 dark:border-blue-900 transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Đã nhớ</span>
                <span className="text-[10px] text-blue-500 font-normal">4 ngày</span>
              </button>
              <button
                onClick={() => handleRateFlashcard('easy')}
                className="py-2.5 px-1 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950/30 dark:hover:bg-green-900/50 text-xs font-semibold border border-green-200 dark:border-green-900 transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Rất dễ</span>
                <span className="text-[10px] text-green-500 font-normal">7 ngày</span>
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Phase 3 (3.6): Import Quizlet / Anki Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 !mt-0 !m-0 top-0 left-0 right-0 bottom-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Upload size={18} className="text-indigo-600" />
                Nhập từ vựng từ Quizlet / Anki / CSV
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Dán nội dung sao chép từ Quizlet (Word &lt;Tab&gt; Definition) hoặc CSV (Word, Meaning):
            </p>

            <textarea
              rows={8}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={"apple\tquả táo\nbanana\tquả chuối\nchallenge\tthử thách"}
              className="w-full p-3 font-mono text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-400">
                Tự động chuẩn hóa IPA CMU và thuật toán FSRS
              </span>
              <div className="flex gap-2">
                <Button
                  intent="ghost"
                  size="sm"
                  onClick={() => setShowImportModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  intent="brand"
                  size="sm"
                  onClick={handleImport}
                  loading={isImporting}
                  disabled={!importText.trim() || isImporting}
                >
                  Xác nhận nhập
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
