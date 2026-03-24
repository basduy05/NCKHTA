"use client";
import React, { useState, useEffect, useCallback } from "react";
import { 
  BookMarked, Clock, Search, PlayCircle, Volume2, Edit3, Trash2, 
  Brain, X, Sparkles, CheckCircle2, ArrowRight, Lightbulb 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface VocabularyTabProps {
  API_URL: string;
}

export default function VocabularyTab({ API_URL }: VocabularyTabProps) {
  const { token, authFetch, refreshUser } = useAuth();
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // AI Practice states
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceExercises, setPracticeExercises] = useState<any[]>([]);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [practiceResults, setPracticeResults] = useState<any[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const [streamingText, setStreamingText] = useState("");
  
  // Edit Vocabulary states
  const [editingWord, setEditingWord] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
    if (!confirm("Xóa từ này khỏi kho từ vựng?")) return;
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
    setStreamingText("");
    setPracticeExercises([]);
    try {
      const res = await authFetch(`${API_URL}/student/vocabulary/practice`, {
        method: "POST",
        body: JSON.stringify({ word_ids: [] }) 
      });
      if (res.ok) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "");
              if (dataStr === "[DONE]") continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.status === "generating") {
                  setStreamingText(prev => (prev + (data.chunk || "")).slice(-500));
                } else if (Array.isArray(data)) {
                  setPracticeExercises(data);
                  setCurrentExerciseIdx(0);
                  setPracticeResults([]);
                  setPracticeAnswers({});
                  setExerciseSubmitted(false);
                  setShowHint(false);
                  refreshUser();
                }
              } catch (e) {}
            }
          }
        }
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Lỗi khi chuẩn bị bài tập");
      }
    } catch (e) { 
        alert("Lỗi kết nối. Vui lòng kiểm tra lại dịch vụ AI."); 
    }
    finally { setGeneratingPractice(false); }
  };

  const submitCurrentExercise = (rating?: number) => {
    const ex = practiceExercises[currentExerciseIdx];
    const ans = practiceAnswers[currentExerciseIdx] || "";
    const isCorrect = ans.toLowerCase().trim() === ex.answer.toLowerCase().trim();
    
    const finalRating = rating || (isCorrect ? 3 : 1);
    
    setPracticeResults(prev => [...prev, { word_id: ex.word_id, correct: isCorrect, rating: finalRating }]);
    setExerciseSubmitted(true);
  };

  const nextExercise = async () => {
    if (currentExerciseIdx < practiceExercises.length - 1) {
      setCurrentExerciseIdx(prev => prev + 1);
      setExerciseSubmitted(false);
      setShowHint(false);
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
            alert(`Chúc mừng! Bạn đã hoàn thành bài ôn tập.\nĐúng: ${correctCount}/${practiceExercises.length}\nĐiểm thưởng: +${correctCount * 10}`);
            setPracticeExercises([]);
            // Force a slight delay to ensure DB commit is visible to next query
            setTimeout(() => fetchWords(), 500);
        } else {
            alert("Lỗi khi lưu kết quả bài tập.");
        }
      } catch (e) { 
          console.error(e);
          alert("Lỗi khi kết nối máy chủ để lưu kết quả."); 
      }
    }
  };

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const currentEx = practiceExercises[currentExerciseIdx];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
              <BookMarked size={18} /> {words.length} từ đã lưu
            </div>
            {words.some(w => !w.scheduled_at || new Date(w.scheduled_at) <= new Date()) && (
               <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 animate-pulse">
                 <Clock size={18} /> {words.filter(w => !w.scheduled_at || new Date(w.scheduled_at) <= new Date()).length} từ cần ôn
               </div>
            )}
            <div className="hidden lg:flex items-center gap-1">
              {levels.map(l => {
                const count = words.filter(w => w.level === l).length;
                if (count === 0) return null;
                return <span key={l} className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">{l}:{count}</span>;
              })}
            </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Tìm từ vựng..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none w-full md:w-48 focus:ring-2 focus:ring-blue-500/20"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={startRichPractice}
            disabled={generatingPractice || words.length === 0}
            className="btn-primary py-2 px-6 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50"
          >
            {generatingPractice ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <PlayCircle size={18} />}
            Luyện tập SR
          </button>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
          <BookMarked size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-700">Chưa có từ vựng nào</h3>
          <p className="text-gray-500 text-sm">Tra từ điển để lưu từ mới vào kho.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {words.map((w) => {
            const isDue = !w.scheduled_at || new Date(w.scheduled_at) <= new Date();
            return (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group relative overflow-hidden">
                {isDue && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] px-2 py-0.5 font-bold rounded-bl-lg">CẦN ÔN TẬP</div>}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-blue-800">{w.word}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 font-bold uppercase">{w.pos || 'N/A'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold">{w.level || 'B1'}</span>
                    </div>
                  </div>
                  <button onClick={() => speak(w.word, w.audio_url)} className="p-2 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"><Volume2 size={18} /></button>
                </div>
                
                <p className="text-gray-800 font-medium line-clamp-2 mb-2">{w.meaning_vn}</p>
                {w.example && <p className="text-gray-500 text-xs italic line-clamp-2 border-l-2 border-gray-200 pl-2">{w.example}</p>}
                
                {renderFSRSStatus(w)}

                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400">
                    <div className="flex gap-2">
                        <span>Đã thuộc: {Math.min(w.review_count || 0, 5)}/5</span>
                        <div className="flex gap-0.5 items-center">
                            {[1,2,3,4,5].map(step => (
                                <div key={step} className={`w-1.5 h-1.5 rounded-full ${step <= (w.review_count || 0) ? 'bg-green-500' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingWord(w)} className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-600 transition"><Edit3 size={14} /></button>
                        <button onClick={() => deleteWord(w.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition"><Trash2 size={14} /></button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {generatingPractice && (
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-700 shadow-2xl overflow-hidden relative group max-w-2xl mx-auto my-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <h3 className="text-emerald-500 font-mono text-xs font-bold uppercase tracking-widest">Lexicon AI Stream</h3>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
              </div>
            </div>
            <div className="font-mono text-sm text-slate-300 h-48 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none z-10"></div>
              <p className="whitespace-pre-wrap break-all opacity-90 leading-relaxed font-mono">
                {streamingText || "> Establishing neural connection...\n> Initializing LLM context...\n> Waiting for vocabulary chunks..."}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-slate-500 font-mono text-[10px] animate-pulse">STATUS: RECEIVING_CHUNKS</span>
              <span className="text-slate-600 font-mono text-[10px]">v4.0.2-stable</span>
            </div>
          </div>
        )}

      {practiceExercises.length > 0 && !generatingPractice && currentEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
              <div>
                <p className="text-xs opacity-80 font-bold uppercase tracking-widest mb-1">Cấp độ: {currentEx.level || 'B1'}</p>
                <h3 className="font-extrabold text-xl flex items-center gap-2 underline decoration-blue-400 underline-offset-4 decoration-2">
                  <Brain size={24} /> Câu hỏi {currentExerciseIdx + 1}/{practiceExercises.length}
                </h3>
              </div>
              <button onClick={() => setPracticeExercises([])} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"><X size={24} /></button>
            </div>
            
            <div className="p-8">
              <div className="mb-8">
                <p className="text-gray-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-500" /> AI Instruction
                </p>
                <h4 className="text-2xl font-black text-gray-900 leading-tight mb-4">{currentEx.question}</h4>
                
                {currentEx.type === 'fill_blank' && (
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 italic text-gray-700 border-l-4 border-l-blue-500">
                    "{currentEx.context}"
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {currentEx.options ? (
                  <div className="grid grid-cols-1 gap-3">
                    {currentEx.options.map((opt: string, i: number) => {
                      const isSelected = practiceAnswers[currentExerciseIdx] === opt;
                      const isCorrect = opt === currentEx.answer;
                      let cls = "border-gray-100 bg-gray-50 hover:border-blue-300 hover:shadow-md";
                      if (exerciseSubmitted) {
                        if (isCorrect) cls = "border-green-500 bg-green-50 text-green-700 ring-4 ring-green-500/10";
                        else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
                        else cls = "opacity-40 grayscale";
                      } else if (isSelected) cls = "border-blue-600 bg-blue-50 text-blue-700 ring-4 blue-500/10";

                      return (
                        <button key={i} disabled={exerciseSubmitted}
                          onClick={() => setPracticeAnswers({ ...practiceAnswers, [currentExerciseIdx]: opt })}
                          className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 font-bold text-lg ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      autoFocus type="text"
                      value={practiceAnswers[currentExerciseIdx] || ""}
                      onChange={e => setPracticeAnswers({ ...practiceAnswers, [currentExerciseIdx]: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter' && !exerciseSubmitted) submitCurrentExercise(); }}
                      placeholder="Gõ đáp án của bạn..."
                      className={`w-full text-2xl p-6 border-2 rounded-2xl outline-none transition-all font-bold ${exerciseSubmitted ? (practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-100 bg-gray-50 focus:border-blue-500 focus:bg-white focus:shadow-xl"}`}
                      disabled={exerciseSubmitted}
                    />
                  </div>
                )}

                {showHint && !exerciseSubmitted && (
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-yellow-800 text-sm animate-in slide-in-from-top-2">
                        <strong>Gợi ý từ AI:</strong> {currentEx.hint_vn || "Hãy nghĩ về nghĩa tiếng Việt của từ này."}
                    </div>
                )}
              </div>

              {exerciseSubmitted && (
                <div className={`mt-8 p-5 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 ${practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  <div className={`p-3 rounded-full ${practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? <CheckCircle2 size={32} /> : <X size={32} />}
                  </div>
                  <div>
                    <h5 className="font-black text-lg">{practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? "Tuyệt vời!" : "Chưa chính xác!"}</h5>
                    <p className="font-medium">Đáp án đúng: <span className="underline decoration-2">{currentEx.answer}</span></p>
                    {currentEx.explanation_vn && <p className="text-sm mt-1 opacity-80">{currentEx.explanation_vn}</p>}
                  </div>
                </div>
              )}

              <div className="mt-10 flex flex-col gap-4">
                {!exerciseSubmitted ? (
                    <div className="flex justify-between items-center">
                        <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-yellow-600 font-bold flex items-center gap-1 transition text-sm">
                            <Lightbulb size={18} /> {showHint ? "Ẩn gợi ý" : "Xem gợi ý"}
                        </button>
                        <button onClick={() => submitCurrentExercise()} disabled={!practiceAnswers[currentExerciseIdx]} className="btn-primary px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition transform active:scale-95 disabled:opacity-50">
                            KIỂM TRA
                        </button>
                    </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Đánh giá mức độ ghi nhớ (FSRS)</p>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { r: 1, l: "Quên", c: "bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white" },
                                { r: 2, l: "Khó", c: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-600 hover:text-white" },
                                { r: 3, l: "Tốt", c: "bg-green-50 text-green-600 border-green-200 hover:bg-green-600 hover:text-white" },
                                { r: 4, l: "Dễ", c: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white" }
                            ].map(btn => (
                                <button key={btn.r} 
                                    onClick={() => {
                                        setPracticeResults(prev => {
                                            const next = [...prev];
                                            next[next.length - 1].rating = btn.r;
                                            return next;
                                        });
                                        nextExercise();
                                    }}
                                    className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all font-black ${btn.c}`}
                                >
                                    <span className="text-lg">{btn.l}</span>
                                    <span className="text-[10px] opacity-70 font-bold">Rating: {btn.r}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <button onClick={nextExercise} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-black transition shadow-xl transform active:scale-95">
                      {currentExerciseIdx < practiceExercises.length - 1 ? "TIẾP THEO" : "HOÀN THÀNH"} <ArrowRight size={24} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-blue-100 transform animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
              <button onClick={() => setEditingWord(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition"><X size={18} /></button>
              <h3 className="text-2xl font-black mb-1">Chỉnh sửa từ vựng</h3>
              <p className="opacity-80 text-sm">Cập nhật thông tin cho từ "{editingWord.word}"</p>
            </div>
            <form onSubmit={updateWord} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Từ vựng</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold" value={editingWord.word} onChange={e => setEditingWord({...editingWord, word: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phát âm</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-mono" value={editingWord.phonetic || ""} onChange={e => setEditingWord({...editingWord, phonetic: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Loại từ (POS)</label>
                  <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" value={editingWord.pos || ""} onChange={e => setEditingWord({...editingWord, pos: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cấp độ (CEFR)</label>
                  <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" value={editingWord.level || "B1"} onChange={e => setEditingWord({...editingWord, level: e.target.value})}>
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nghĩa tiếng Việt</label>
                <input type="text" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-blue-800" value={editingWord.meaning_vn || ""} onChange={e => setEditingWord({...editingWord, meaning_vn: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ví dụ</label>
                <textarea rows={2} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 italic" value={editingWord.example || ""} onChange={e => setEditingWord({...editingWord, example: e.target.value})} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" disabled={isUpdating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition disabled:opacity-50">
                  {isUpdating ? "Đang lưu..." : "Cập nhật"}
                </button>
                <button type="button" onClick={() => setEditingWord(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
