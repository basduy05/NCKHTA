"use client";

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Upload, Layers, Brain, LayoutDashboard, Search, Network, 
  BrainCircuit, ChevronUp, ChevronDown, Volume2, Bookmark, Lightbulb, 
  CheckCircle2, X, PlayCircle, BookText, AlertCircle, Info, Trash2, 
  BarChart3, Plus, ArrowLeft, Send, ExternalLink, Globe, Languages
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface AIToolsTabProps {
  authFetch: any;
  user: any;
  API_URL: string;
  setShowCreditModal: (show: boolean) => void;
  handleTextareaDoubleClick: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
}

export function AIToolsTab({ authFetch, user, API_URL, setShowCreditModal, handleTextareaDoubleClick }: AIToolsTabProps) {
  const { showAlert } = useNotification();
  const [activeAI, setActiveAI] = useState<"vocab" | "dict" | "graph">("vocab");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [loading, setLoading] = useState(false);
  const [vocabResult, setVocabResult] = useState<any[]>([]);
  const [quizResult, setQuizResult] = useState<any[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [flippedWord, setFlippedWord] = useState<number | null>(null);
  const [showRecallQuiz, setShowRecallQuiz] = useState(false);
  const [recallAnswers, setRecallAnswers] = useState<Record<number, string>>({});
  const [recallSubmitted, setRecallSubmitted] = useState(false);
  
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const [dictWord, setDictWord] = useState("");
  const [dictResult, setDictResult] = useState<any>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  
  const [graphTopic, setGraphTopic] = useState("all");
  const [graphData, setGraphData] = useState<any>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const speak = (text: string) => {
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const simulateSyllabify = (word: string) => {
    if (!word) return [];
    if (word.length <= 4) return [word];
    const vowels = "aeiouyAEIOUY";
    let syllables = [];
    let current = "";
    for (let i = 0; i < word.length; i++) {
        current += word[i];
        if (vowels.includes(word[i]) && i < word.length - 1 && !vowels.includes(word[i+1])) {
            syllables.push(current);
            current = "";
        }
    }
    if (current) syllables.push(current);
    return syllables;
  };

  const handleExtractVocab = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setVocabResult([]);
    try {
      const res = await authFetch(`${API_URL}/teacher/ai/extract-vocab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("API error");
      
      const data = await res.json();
      if (data.vocabulary) {
        setVocabResult(data.vocabulary);
        setCurrentCardIdx(0);
      }
    } catch (err) {
      console.error(err);
      showAlert("Extraction failed. Check Credits.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileProcess = async () => {
    if (!file) return;
    setLoading(true);
    setVocabResult([]);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await authFetch(`${API_URL}/teacher/ai/extract-vocab-file`, {
        method: "POST",
        body: formData
      });
      if (res.status === 402) return setShowCreditModal(true);
      if (!res.ok) throw new Error("API failed");
      
      const data = await res.json();
      if (data.vocabulary) {
        setVocabResult(data.vocabulary);
        setCurrentCardIdx(0);
      }
    } catch (err) {
      console.error(err);
      showAlert("Error processing file", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setQuizResult([]);
    try {
      const res = await authFetch(`${API_URL}/teacher/ai/generate-quiz`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("Quiz generation failed");
      
      const data = await res.json();
      if (data.quiz) {
        setQuizResult(data.quiz);
        setCurrentQuizIdx(0);
        setQuizAnswers({});
        setQuizSubmitted(false);
      }
    } catch (err) {
      console.error(err);
      showAlert("Quiz failed. Check Credits", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDictSearch = async () => {
    if (!dictWord.trim()) return;
    setDictLoading(true);
    setDictError(null);
    try {
      const res = await authFetch(`${API_URL}/teacher/dictionary/search`, {
        method: "POST",
        body: JSON.stringify({ word: dictWord })
      });
      if (!res.ok) throw new Error("Word not found");
      const data = await res.json();
      setDictResult(data);
    } catch (e: any) {
      setDictError(e.message || "Search failed");
      setDictResult(null);
    } finally {
      setDictLoading(false);
    }
  };

  const handleLoadGraph = async () => {
    setGraphLoading(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/ai/knowledge-graph?topic=${graphTopic}`);
      if (!res.ok) throw new Error("Graph failed");
      const data = await res.json();
      setGraphData(data);
    } catch {
      showAlert("Graph failed", 'error');
    } finally {
      setGraphLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Teacher Dashboard</h1>
          <p className="text-gray-500 font-medium mt-1">Quản lý lớp học và sử dụng Lexicon AI để tối ưu bài giảng.</p>
        </div>
      </section>

      <section className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 shadow-inner group-hover:scale-110 transition-transform duration-500">
             <Sparkles size={40} className="text-yellow-300 animate-pulse" />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black mb-2 tracking-tight">Nâng tầm giảng dạy với Lexicon AI</h2>
            <p className="text-indigo-100/90 text-lg font-medium max-w-xl">Trích xuất từ vựng thông minh, tạo Flashcards tự động và xây dựng kho ngữ liệu chỉ trong vài giây.</p>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:bg-white/15 transition-colors"></div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </section>

      <section className="bg-white rounded-3xl border border-indigo-50 p-6 shadow-xl shadow-indigo-100/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Sparkles className="text-indigo-600" size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-900">Magic AI Input</h2>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">Smart Extraction</span>
        </div>
        
        <div className="space-y-4">
          <div className="relative group">
            {inputMode === "text" ? (
              <textarea 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl p-6 text-base font-medium placeholder:text-slate-400 min-h-[160px] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none shadow-inner" 
                placeholder="Dán văn bản tiếng Anh vào đây... Lexicon AI sẽ tự động phân tích và trích xuất từ vựng, tạo flashcards và bài luyện tập thử nghiệm."
                value={text}
                onChange={e => setText(e.target.value)}
                onDoubleClick={handleTextareaDoubleClick}
              />
            ) : (
              <div className="border-4 border-dashed border-indigo-100 bg-slate-50 rounded-2xl p-12 flex flex-col items-center justify-center relative cursor-pointer hover:bg-slate-100 transition min-h-[160px]">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
                }} accept=".txt,.pdf,.docx" />
                <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-4">
                  <Upload size={32} className="text-indigo-400" />
                </div>
                <p className="font-black text-gray-700">{file ? file.name : "Kéo thả hoặc nhấn để chọn tệp học liệu"}</p>
                <p className="text-sm text-slate-400 mt-2">Hỗ trợ định dạng .txt, .pdf, .docx</p>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
                <div className="flex gap-1.5 mb-3">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <p className="text-indigo-700 font-bold text-sm">Lexicon AI đang phân tích...</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex gap-2">
              <button 
                onClick={() => setInputMode("text")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${inputMode === "text" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white text-slate-600 border-gray-100 hover:bg-slate-50"}`}
              >
                Nhập văn bản
              </button>
              <button 
                onClick={() => setInputMode("file")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${inputMode === "file" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white text-slate-600 border-gray-100 hover:bg-slate-50"}`}
              >
                Tải tệp
              </button>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => inputMode === "text" ? handleExtractVocab() : handleFileProcess()}
                disabled={loading || (inputMode === "text" ? !text.trim() : !file)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
              >
                <Layers size={18} /> Extract Vocab
              </button>
              <button 
                onClick={() => handleGenerateQuiz()}
                disabled={loading || !text.trim() || inputMode === "file"}
                className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 disabled:opacity-30 hover:scale-[1.02] active:scale-95"
              >
                <Brain size={18} /> Generate Quiz
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "vocab", label: "Dashboard Trích xuất", icon: LayoutDashboard },
          { id: "dict", label: "Từ điển Lexicon", icon: Search },
          { id: "graph", label: "Đồ thị tri thức", icon: Network },
        ].map((tab) => {
          const Icon = tab.id === "vocab" ? BrainCircuit : tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAI(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shrink-0 border ${activeAI === tab.id ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100" : "bg-white text-slate-600 border-gray-100 hover:bg-slate-50"}`}
            >
              <Icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeAI === "vocab" && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {vocabResult.length > 0 && (
            <>
              <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <BrainCircuit className="text-indigo-600" size={24} />
                    Flashcard Slider
                  </h3>
                  <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl border border-indigo-100 font-bold text-xs">
                    Card {currentCardIdx + 1} of {vocabResult.length}
                  </div>
                </div>

                <div className="max-w-xl mx-auto relative group">
                  <button 
                    onClick={() => { setCurrentCardIdx(prev => Math.max(0, prev - 1)); setFlippedWord(null); }}
                    disabled={currentCardIdx === 0}
                    className="absolute -left-16 top-1/2 w-12 h-12 bg-white rounded-2xl border border-gray-100 shadow-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0 z-20"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <ChevronUp className="-rotate-90" size={24} />
                  </button>
                  <button 
                    onClick={() => { setCurrentCardIdx(prev => Math.min(vocabResult.length - 1, prev + 1)); setFlippedWord(null); }}
                    disabled={currentCardIdx === vocabResult.length - 1}
                    className="absolute -right-16 top-1/2 w-12 h-12 bg-white rounded-2xl border border-gray-100 shadow-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0 z-20"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <ChevronDown className="-rotate-90" size={24} />
                  </button>

                  <div className="perspective-1000 h-[450px]">
                    {vocabResult.map((w: any, idx: number) => {
                      if (idx !== currentCardIdx) return null;
                      return (
                        <div 
                          key={idx}
                          onClick={() => setFlippedWord(flippedWord === idx ? null : idx)}
                          className={`relative w-full h-full transition-all duration-700 preserve-3d cursor-pointer ${flippedWord === idx ? 'rotate-y-180' : ''}`}
                        >
                          <div className="absolute inset-0 backface-hidden bg-white border border-indigo-50 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-10 transition-all hover:border-indigo-200">
                            <div className="absolute top-8 left-10">
                              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">{w.level || 'B2'}</span>
                            </div>
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-indigo-50/50">
                              <Sparkles className="text-indigo-600" size={32} />
                            </div>
                            <h4 className="text-5xl font-black text-indigo-900 mb-2 tracking-tight line-clamp-1">{w.word}</h4>
                            <div className="flex gap-1 mb-4">
                              {simulateSyllabify(w.word).map((s: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-100">{s}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-lg mb-8">
                               <Volume2 size={24} className="text-indigo-400" />
                               <span>{w.phonetic || w.phon || "/.../"}</span>
                            </div>
                            {w.pos && <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl uppercase border border-purple-100/50">{w.pos}</span>}
                          </div>
                          
                          <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-10 rotate-y-180 text-white text-center">
                            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-6">Translation</span>
                            <h4 className="text-4xl font-black mb-4 text-indigo-50">{w.meaning_vn || w.meaning}</h4>
                            {w.meaning_en && <p className="text-indigo-100 text-lg mb-8 leading-relaxed italic line-clamp-3">"{w.meaning_en}"</p>}
                            {w.example && (
                              <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm mt-4">
                                <p className="text-white text-lg italic leading-relaxed line-clamp-3">&ldquo;{w.example}&rdquo;</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-8 flex justify-center gap-4">
                     <button 
                       onClick={(e) => { e.stopPropagation(); speak(vocabResult[currentCardIdx].word); }}
                       className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition transform hover:scale-105 active:scale-95"
                     >
                       <Volume2 size={24} /> Pronounce
                     </button>
                     <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const w = vocabResult[currentCardIdx];
                        try {
                          await authFetch(`${API_URL}/student/vocabulary/save`, {
                            method: "POST",
                            body: JSON.stringify({ word: w.word, phonetic: w.phonetic || w.phon || "", pos: w.pos || "", meaning_en: w.meaning_en || "", meaning_vn: w.meaning_vn || w.meaning, example: w.example, level: w.level || 'B2', source: "ai-extraction" })
                          });
                          showAlert(`Đã lưu "${w.word}" vào kho từ vựng!`, 'success');
                        } catch { }
                      }}
                      className="w-16 h-16 bg-white border border-gray-100 text-emerald-500 rounded-2xl flex items-center justify-center hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 active:scale-95"
                     >
                       <Bookmark size={28} />
                     </button>
                  </div>
                </div>
              </section>

              <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <BookText size={24} className="text-indigo-600" />
                  Syllable & Pronunciation Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vocabResult.map((w: any, idx: number) => {
                    const syllables = simulateSyllabify(w.word);
                    return (
                      <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between gap-4 shadow-sm group hover:border-indigo-200 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{w.pos || "Vocab"}</span>
                            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg">{w.level || "B2"}</span>
                          </div>
                          <h4 className="text-xl font-black text-slate-800 tracking-tight">{w.word}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {syllables.map((s, i) => (
                              <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100/50">{s}</span>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => speak(w.word)} className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                          <Volume2 size={24} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-900 p-8 rounded-[3rem] shadow-2xl shadow-indigo-200 text-white overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                  <div>
                    <h3 className="text-2xl font-black flex items-center gap-3">
                      <Brain size={28} className="text-indigo-300" />
                      Recall Master Challenge
                    </h3>
                    <p className="text-indigo-200 font-medium text-sm mt-1">Kiểm tra khả năng ghi nhớ nghĩa của các từ vừa trích xuất.</p>
                  </div>
                  <button 
                    onClick={() => { setShowRecallQuiz(!showRecallQuiz); setRecallAnswers({}); setRecallSubmitted(false); }}
                    className="bg-white text-indigo-900 px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                  >
                    {showRecallQuiz ? <><X size={18} /> Close Quiz</> : <><PlayCircle size={18} /> Start Recall Quiz</>}
                  </button>
                </div>

                {showRecallQuiz && (
                  <div className="space-y-4 animate-in slide-in-from-top-6 duration-500 relative z-10">
                    {vocabResult.map((w: any, idx: number) => (
                      <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-white/15">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1 block">Meaning</span>
                          <h4 className="text-xl font-black text-white">{w.meaning_vn || w.meaning}</h4>
                        </div>
                        <div className="flex-[1.5] relative">
                          <input 
                            type="text"
                            className={`w-full bg-white/5 border-2 px-6 py-3 rounded-2xl outline-none transition-all font-black text-lg ${
                              recallSubmitted 
                                ? (recallAnswers[idx]?.toLowerCase().trim() === w.word.toLowerCase().trim() ? "border-emerald-400 text-emerald-300" : "border-rose-400 text-rose-300")
                                : "border-white/10 focus:border-indigo-400 text-white focus:bg-white/10"
                            }`}
                            placeholder="Type the English word..."
                            value={recallAnswers[idx] || ""}
                            onChange={(e) => setRecallAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                            disabled={recallSubmitted}
                          />
                          {recallSubmitted && recallAnswers[idx]?.toLowerCase().trim() !== w.word.toLowerCase().trim() && (
                            <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1.5 bg-emerald-400/10 px-3 py-1 rounded-lg w-fit">
                              <CheckCircle2 size={12} /> Correct answer: {w.word}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {!recallSubmitted && Object.keys(recallAnswers).length > 0 && (
                      <div className="text-center mt-8">
                        <button 
                          onClick={() => setRecallSubmitted(true)}
                          className="bg-indigo-400 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-500/50 hover:bg-indigo-300 transition-all hover:scale-105 active:scale-95"
                        >
                          Finish & Check Progress
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl -ml-24 -mb-24"></div>
              </div>
            </>
          )}

          {quizResult.length > 0 && (
            <section className="space-y-6 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                   <Brain className="text-rose-500" size={24} />
                   Interactive AI Practice
                 </h3>
                 <div className="flex gap-2">
                    <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100">Score: {quizScore}/{quizResult.length}</span>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-rose-50 p-8 shadow-2xl shadow-rose-100/20 relative overflow-hidden min-h-[500px]">
                 <div className="mb-10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {currentQuizIdx + 1} of {quizResult.length}</span>
                      <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{Math.round(((currentQuizIdx + 1) / quizResult.length) * 100)}% Progress</span>
                    </div>
                    <div className="h-3 w-full bg-slate-50 rounded-full p-0.5 border border-slate-100 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-500 to-indigo-600 rounded-full transition-all duration-700 shadow-sm" 
                        style={{ width: `${((currentQuizIdx + 1) / quizResult.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                     <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-rose-50/50">
                        <Lightbulb className="text-rose-500" size={32} />
                     </div>
                     <h4 className="text-2xl font-black text-gray-900 mb-10 max-w-2xl leading-tight text-center">
                        {quizResult[currentQuizIdx].question || quizResult[currentQuizIdx].q}
                     </h4>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                        {(quizResult[currentQuizIdx].options || []).map((opt: string, i: number) => {
                          const isSelected = quizAnswers[currentQuizIdx] === i;
                          const correctAnsIdx = typeof quizResult[currentQuizIdx].ans === 'number' ? quizResult[currentQuizIdx].ans : (quizResult[currentQuizIdx].options?.findIndex((o: string) => o === (quizResult[currentQuizIdx].correct_answer || quizResult[currentQuizIdx].answer)) ?? -1);
                          const isCorrect = i === correctAnsIdx;
                          
                          let btnClass = "bg-slate-50 border-transparent text-slate-600 hover:border-indigo-200 hover:bg-white";
                          if (isSelected) btnClass = "bg-indigo-50 border-indigo-500 text-indigo-900 ring-4 ring-indigo-50/50";
                          if (quizSubmitted) {
                            if (isCorrect) btnClass = "bg-emerald-50 border-emerald-500 text-emerald-900";
                            else if (isSelected) btnClass = "bg-rose-50 border-rose-500 text-rose-900";
                            else btnClass = "bg-slate-50 border-transparent text-slate-400 opacity-60";
                          }

                          return (
                            <button
                              key={i}
                              disabled={quizSubmitted}
                              onClick={() => setQuizAnswers(prev => ({ ...prev, [currentQuizIdx]: i }))}
                              className={`p-6 rounded-3xl border-2 font-bold text-left transition-all relative group ${btnClass}`}
                            >
                               <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-colors ${isSelected ? "bg-indigo-600 text-white" : "bg-white text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                                    {String.fromCharCode(65 + i)}
                                  </div>
                                  <span className="text-base">{opt}</span>
                               </div>
                            </button>
                          );
                        })}
                     </div>

                     <div className="mt-12 flex items-center gap-4">
                        {currentQuizIdx > 0 && !quizSubmitted && (
                          <button 
                            onClick={() => setCurrentQuizIdx(prev => prev - 1)}
                            className="bg-white text-slate-400 px-6 py-4 rounded-[1.25rem] font-black border border-gray-100 hover:bg-slate-50 transition-all"
                          >
                            Back
                          </button>
                        )}
                        
                        {!quizSubmitted ? (
                          currentQuizIdx === quizResult.length - 1 ? (
                            <button 
                              onClick={() => {
                                let s = 0;
                                quizResult.forEach((q, idx) => {
                                  const correctAnsIdx = typeof q.ans === 'number' ? q.ans : (q.options?.findIndex((o: string) => o === (q.correct_answer || q.answer)) ?? -1);
                                  if (quizAnswers[idx] === correctAnsIdx) s++;
                                });
                                setQuizScore(s);
                                setQuizSubmitted(true);
                              }}
                              disabled={Object.keys(quizAnswers).length < quizResult.length}
                              className="bg-emerald-600 text-white px-8 py-4 rounded-[1.25rem] font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-40"
                            >
                              Submit & Finalize
                            </button>
                          ) : (
                            <button 
                              onClick={() => setCurrentQuizIdx(prev => Math.min(quizResult.length - 1, prev + 1))}
                              className="bg-indigo-600 text-white px-8 py-4 rounded-[1.25rem] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                            >
                              Next Question
                            </button>
                          )
                        ) : (
                          <button 
                            onClick={() => {
                              setQuizAnswers({});
                              setQuizSubmitted(false);
                              setQuizScore(0);
                              setCurrentQuizIdx(0);
                            }}
                            className="bg-slate-900 text-white px-10 py-4 rounded-[1.25rem] font-black hover:bg-black transition-all shadow-xl shadow-slate-200"
                          >
                            Try Again
                          </button>
                        )}
                     </div>
                  </div>
                </div>

                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-50 rounded-full -ml-12 -mb-12"></div>
            </section>
          )}
        </div>
      )}

      {activeAI === "dict" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-50 shadow-xl shadow-indigo-100/20">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Search className="text-indigo-600" size={24} />
              Lexicon Dictionary
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 group">
                <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-lg font-bold placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-inner"
                  placeholder="Tra từ vựng English (vd: elusive, persistence...)"
                  value={dictWord}
                  onChange={(e) => setDictWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDictSearch()}
                />
              </div>
              <button 
                onClick={handleDictSearch} 
                className="bg-indigo-600 text-white py-4 px-10 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 translate-y-0"
                disabled={dictLoading}
              >
                {dictLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Searching...</span>
                  </div>
                ) : "Tra từ"}
              </button>
            </div>
          </div>

          {dictError && (
            <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] p-6 flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <AlertCircle size={28} className="text-rose-500" />
              </div>
              <div>
                <p className="text-rose-900 font-black text-lg">{dictError}</p>
                <p className="text-rose-700 text-sm mt-1">Vui lòng kiểm tra lại từ khóa và thử lại.</p>
              </div>
              <button onClick={() => setDictError(null)} className="text-rose-600 text-xs font-black uppercase tracking-widest hover:text-rose-800 transition-colors">Dismiss</button>
            </div>
          )}

          {dictResult && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 pb-8 border-b border-gray-100">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                       <h2 className="text-6xl font-black text-slate-900 tracking-tighter">{dictResult.word}</h2>
                       <button onClick={() => speak(dictResult.word)} className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                         <Volume2 size={32} />
                       </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 items-center mt-6">
                      {dictResult.phonetic_uk && (
                        <button onClick={() => speak(dictResult.word)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-gray-100 hover:bg-indigo-50 transition-colors">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">UK</span>
                          <span className="font-bold text-slate-700">{dictResult.phonetic_uk}</span>
                          <Volume2 size={16} className="text-indigo-400" />
                        </button>
                      )}
                      {dictResult.phonetic_us && (
                        <button onClick={() => speak(dictResult.word)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-gray-100 hover:bg-indigo-50 transition-colors">
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">US</span>
                          <span className="font-bold text-slate-700">{dictResult.phonetic_us}</span>
                          <Volume2 size={16} className="text-rose-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {dictResult.wikipedia && (
                    <div className="w-full md:w-80 bg-blue-50/50 rounded-3xl p-6 border border-blue-100 shadow-inner">
                      <div className="flex items-center gap-2 mb-3">
                         <Globe className="text-blue-500" size={18} />
                         <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Knowledge Base</span>
                      </div>
                      {dictResult.wikipedia.title && (
                        <p className="text-sm font-black text-slate-900 mb-2 truncate">{dictResult.wikipedia.title}</p>
                      )}
                      {dictResult.wikipedia.extract && (
                        <p className="text-blue-700 text-xs mt-2 line-clamp-4">{dictResult.wikipedia.extract}</p>
                      )}
                      {dictResult.wikipedia.url && (
                        <a href={dictResult.wikipedia.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                          Đọc thêm trên Wikipedia →
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {dictResult.meanings && dictResult.meanings.map((m: any, i: number) => {
                  const colors = [
                    { bg: "bg-indigo-50", text: "text-indigo-700", accent: "border-indigo-500" },
                    { bg: "bg-rose-50", text: "text-rose-700", accent: "border-rose-500" },
                    { bg: "bg-teal-50", text: "text-teal-700", accent: "border-teal-500" },
                    { bg: "bg-amber-50", text: "text-amber-700", accent: "border-amber-500" }
                  ][i % 4];
                  return (
                    <div key={i} className={`border-l-4 ${colors.accent} pl-5 py-1 relative hover:bg-slate-50 transition-colors rounded-r-xl mb-6`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 ${colors.bg} ${colors.text} rounded-lg border border-current opacity-60`}>{m.part_of_speech || "Word"}</span>
                        {m.tags?.map((t: string, j: number) => (
                           <span key={j} className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wide">{t}</span>
                        ))}
                      </div>
                      <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-snug">{m.definition_vn || m.definition}</h4>
                      {m.definition_en && <p className="text-slate-500 font-medium text-lg mt-2 italic leading-relaxed">"{m.definition_en}"</p>}
                      
                      {m.examples?.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {m.examples.slice(0, 2).map((ex: string, j: number) => (
                            <div key={j} className="flex items-start gap-2">
                               <div className="w-1 h-1 bg-indigo-300 rounded-full mt-2"></div>
                               <p className="text-slate-500 text-base leading-relaxed italic">{ex}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {dictResult.sources?.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Info size={12} />
                      Nguồn tham chiếu: {dictResult.sources.join(" • ")}
                      {dictResult._from_cache && " (cached)"}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {activeAI === "graph" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-cyan-50 shadow-xl shadow-cyan-100/20">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Network className="text-cyan-600" size={24} />
              Knowledge Mapping
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 group">
                <Network size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-cyan-500 transition-colors" />
                <input
                  type="text"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-lg font-bold placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all shadow-inner"
                  placeholder="Nhập chủ đề để lọc đồ thị (vd: all, environment...)"
                  value={graphTopic}
                  onChange={(e) => setGraphTopic(e.target.value)}
                />
              </div>
              <button 
                onClick={handleLoadGraph} 
                disabled={graphLoading}
                className="bg-cyan-600 text-white py-4 px-10 rounded-2xl font-black text-lg shadow-xl shadow-cyan-200 hover:bg-cyan-700 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 translate-y-0"
              >
                {graphLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Loading...</span>
                  </div>
                ) : "Tải đồ thị"}
              </button>
            </div>
          </div>

          {graphData && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Network size={20} className="text-cyan-600" />
                Đồ thị tri thức ({graphData.nodes?.length || 0} nodes, {graphData.links?.length || 0} links)
              </h3>
              {graphData.nodes?.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Chưa có dữ liệu trong đồ thị. Tra từ điển hoặc phân tích văn bản để xây dựng đồ thị.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {graphData.nodes?.map((n: any, i: number) => (
                    <div key={i} className={`p-3 rounded-xl border ${n.type === "Level" ? "bg-yellow-50 border-yellow-200" : "bg-cyan-50 border-cyan-200"}`}>
                      <p className="font-bold text-gray-900">{n.label}</p>
                      {n.meaning_vn && <p className="text-sm text-gray-600">{n.meaning_vn}</p>}
                      <div className="flex gap-1 mt-1">
                        {n.type && <span className="text-xs bg-white px-1.5 py-0.5 rounded text-gray-500">{n.type}</span>}
                        {n.level && <span className="text-xs bg-white px-1.5 py-0.5 rounded text-blue-600 font-bold">{n.level}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {graphData.links?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-600 mb-2">Quan hệ:</h4>
                  <div className="flex flex-wrap gap-2">
                    {graphData.links.map((l: any, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-lg">
                        {l.source} <span className="text-cyan-600 font-bold">{l.type}</span> {l.target}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
