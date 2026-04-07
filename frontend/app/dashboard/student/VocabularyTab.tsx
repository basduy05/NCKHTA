"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  BookMarked, Clock, Search, PlayCircle, Volume2, Edit3, Trash2, 
  Brain, X, Sparkles, CheckCircle2, ArrowRight, Lightbulb 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

interface VocabularyTabProps {
  API_URL: string;
}

export default function VocabularyTab({ API_URL }: VocabularyTabProps) {
  const { token, authFetch, refreshUser } = useAuth();
  const { showAlert, showConfirm } = useNotification();
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
        <span className={`inline-flex items-center justify-center min-w-[140px] px-4 mx-2 border-b-4 font-black transition-all duration-300 ${
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
            
            if (percentage >= 80) message = `Tuyệt vời! Bạn đã hoàn thành xuất sắc bài ôn tập.`;
            else if (percentage >= 50) message = `Khá tốt! Bạn đã hoàn thành bài ôn tập.`;
            else {
                message = `Bạn đã hoàn thành bài ôn tập. Hãy cố gắng hơn ở lần sau nhé!`;
                type = 'info';
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
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 font-medium">AI đang tạo bài luyện tập từ vựng...</p>
          </div>
        )}

      {practiceExercises.length > 0 && !generatingPractice && currentEx && (
        <div className="fixed inset-0 !mt-0 z-50 flex flex-col bg-white overflow-y-auto animate-in slide-in-from-bottom-5 duration-300">
          {/* Top Progress Header */}
          <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 flex items-center gap-6 border-b border-gray-100">
            <button onClick={() => setPracticeExercises([])} className="text-gray-400 hover:text-gray-600 transition"><X size={28} /></button>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500 rounded-full" 
                  style={{ width: `${((currentExerciseIdx) / practiceExercises.length) * 100}%` }}
                />
            </div>
            <span className="font-extrabold text-blue-600 text-lg">{currentExerciseIdx + 1} / {practiceExercises.length}</span>
          </div>
          
          {/* Main Quiz Content */}
          <div className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center">
            
            <div className="mb-10 text-center">
              <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-bold uppercase tracking-widest text-xs mb-6 shadow-sm border border-blue-100">
                {currentEx.type === 'FIB' ? 'Điền vào chỗ trống' : currentEx.type === 'SPELLING' ? 'Nghe và Viết' : currentEx.type === 'PARAPHRASE' ? 'Cụm từ đồng nghĩa' : 'Chọn đáp án đúng'}
              </span>
              
              <h2 className="text-3xl md:text-4xl font-black text-gray-800 leading-tight mb-6 px-4">
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
                    <h4 className="font-black text-blue-500 uppercase tracking-widest text-[10px]">Từ vựng</h4>
                    <h4 className="font-black text-purple-500 uppercase tracking-widest text-[10px]">Định nghĩa</h4>
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
                             className={`p-4 md:p-5 rounded-2xl border-2 text-center font-black text-lg transition-all flex items-center justify-center ${
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
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${exerciseSubmitted && isCorrect ? 'border-green-600 text-green-700 bg-white' : exerciseSubmitted && isSelected ? 'border-red-500 text-red-600 bg-white' : isSelected ? 'border-blue-600 text-blue-600 bg-white' : 'border-gray-300 text-gray-400'}`}>
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
                    className={`w-full text-3xl font-black text-center p-8 border-b-4 rounded-3xl outline-none transition-all shadow-sm ${exerciseSubmitted ? (String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-300 bg-gray-50 focus:border-blue-500 focus:bg-white focus:shadow-xl"}`}
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
          <div className={`border-t-2 sm:px-12 p-6 transition-colors duration-300 ${exerciseSubmitted ? (String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200") : "bg-white border-gray-100"}`}>
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
                         <h3 className={`font-black text-2xl ${String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "text-green-800" : "text-red-800"}`}>
                           {String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "Tuyệt vời!" : "Sai rồi!"}
                         </h3>
                         <p className={`font-bold mt-1 text-lg ${String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "text-green-700" : "text-red-700"}`}>
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
                    <button 
                      onClick={() => submitCurrentExercise()} 
                      disabled={!practiceAnswers[currentExerciseIdx]} 
                      className="w-full sm:w-auto px-12 py-5 rounded-2xl font-black text-xl text-white bg-blue-500 hover:bg-blue-600 shadow-[0_6px_0_0_#2563ea] active:shadow-[0_0px_0_0_#2563ea] active:translate-y-[6px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-[6px] disabled:bg-gray-300 uppercase tracking-widest"
                    >
                        Kiểm tra
                    </button>
                 ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                        <div className="bg-white/50 backdrop-blur-sm p-2 rounded-2xl flex gap-2 shadow-sm w-full sm:w-auto">
                            {[ 
                                { r: 1, l: "Lại", c: "hover:bg-red-100 text-red-600 border border-red-200" },
                                { r: 2, l: "Khó", c: "hover:bg-orange-100 text-orange-600 border border-orange-200" },
                                { r: 3, l: "Khá", c: "hover:bg-green-100 text-green-600 border border-green-200" },
                                { r: 4, l: "Dễ", c: "hover:bg-blue-100 text-blue-600 border border-blue-200" }
                            ].map(btn => (
                                <button key={btn.r} onClick={() => {
                                    setPracticeResults(prev => { const next = [...prev]; next[next.length - 1].rating = btn.r; return next; });
                                    nextExercise();
                                }} className={`w-14 h-14 flex flex-col items-center justify-center rounded-xl font-black transition-colors bg-white shadow-sm ${btn.c}`}>
                                    <span className="text-[15px]">{btn.l}</span>
                                    <span className="text-[10px] opacity-70">Rate: {btn.r}</span>
                                </button>
                            ))}
                        </div>
                        <button 
                          onClick={nextExercise} 
                          className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-xl text-white shadow-[0_6px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[6px] transition-all uppercase tracking-widest ${String(practiceAnswers[currentExerciseIdx] || "").toLowerCase().trim() === String(currentEx.answer || "").toLowerCase().trim() ? "bg-green-600" : "bg-red-600"}`}
                        >
                          {currentExerciseIdx < practiceExercises.length - 1 ? "Tiếp tục" : "Hoàn thành"} <ArrowRight size={24} className="inline ml-2 -mt-1" />
                        </button>
                    </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      {editingWord && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
