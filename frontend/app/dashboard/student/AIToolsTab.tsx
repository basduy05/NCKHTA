"use client";
import React, { useState } from "react";
import { 
  Sparkles, Upload, Layers, PlayCircle, Bookmark, BookText, 
  Brain, Award, Trophy, CheckCircle2, XCircle, X, Volume2, 
  Lightbulb, ArrowRight 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ALL_WORDS_DATABASE, simulateSyllabify, WordDetail } from "../../components/DictionaryData";
import { useNotification } from "../../context/NotificationContext";

interface AIToolsTabProps {
  setShowCreditModal: (s: boolean) => void;
  API_URL: string;
}

export default function AIToolsTab({ setShowCreditModal, API_URL }: AIToolsTabProps) {
  const { user, authFetch, refreshUser } = useAuth();
  const { showAlert } = useNotification();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [flippedWord, setFlippedWord] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [selectedWordInfo, setSelectedWordInfo] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [matchingSelections, setMatchingSelections] = useState<{ word: string | null, def: string | null }>({ word: null, def: null });
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [showRecallQuiz, setShowRecallQuiz] = useState(false);
  const [recallAnswers, setRecallAnswers] = useState<Record<number, string>>({});
  const [recallSubmitted, setRecallSubmitted] = useState(false);
  const [tab, setTab] = useState<"analyze" | "grammar" | "reading" | "writing" | "speaking">("analyze");
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  
  // Defensive rendering helpers to prevent "Objects are not valid as a React child"
  const renderValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string" || typeof val === "number") return val;
    if (Array.isArray(val)) return val.map(v => renderValue(v)).join(", ");
    if (typeof val === "object") {
      return Object.entries(val)
        .map(([k, v]) => `${k}: ${renderValue(v)}`)
        .join(" | ");
    }
    return String(val);
  };

  const getOptionsArray = (q: any) => {
    if (!q || !q.options) return [];
    if (Array.isArray(q.options)) return q.options;
    if (typeof q.options === 'object' && q.options !== null) {
      // Handle {A: "...", B: "..."} format
      return Object.values(q.options);
    }
    return [];
  };

  const analyze = async (type: "text" | "file") => {
    if (type === "text" && !text) return;
    if (type === "file" && !file) return;

    if (user && user.credits_ai !== undefined && user.credits_ai <= 0) {
      setShowCreditModal(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setAnswers({});
    setSubmitted(false);

    try {
      let data;
      if (type === "text") {
        const res = await authFetch(`${API_URL}/student/analyze-text`, {
          method: "POST",
          body: JSON.stringify({ text, num_questions: 5 }),
        });
        if (res.status === 429) throw new Error("Vượt quá giới hạn sử dụng hàng ngày (50 lượt). Vui lòng quay lại sau.");
        if (!res.ok) throw new Error("Lỗi hệ thống AI (API error)");
        
        const jsonData = await res.json();
        refreshUser();
        data = jsonData;
      } else {
        const formData = new FormData();
        // @ts-ignore
        formData.append("file", file);
        formData.append("num_questions", "5");
        formData.append("exercise_type", "mixed");

        const res = await authFetch(`${API_URL}/student/file/upload-analyze`, {
          method: "POST",
          body: formData,
        });
        
        if (res.status === 429) throw new Error("Vượt quá giới hạn sử dụng hàng ngày (50 lượt). Vui lòng quay lại sau.");
        if (!res.ok) throw new Error("Lỗi hệ thống AI (API error)");

        const jsonData = await res.json();
        refreshUser();
        data = jsonData;
      }

      const words = Array.isArray(data.vocabulary) ? data.vocabulary.filter((w: any) => w).map((w: any) => ({
        word: renderValue(w.word || "Unknown"),
        phon: renderValue(w.phonetic || w.phon || ""),
        meaning: renderValue(w.meaning_vn || w.meaning || w.vietnamese_meaning || ""),
        meaning_en: renderValue(w.meaning_en || w.english_definition || ""),
        example: renderValue(w.example || ""),
        level: renderValue(w.level || "B1"),
        pos: renderValue(w.pos || "")
      })) : [];

      const quiz = Array.isArray(data.quiz || data.exercises) ? (data.quiz || data.exercises).map((q: any) => {
        return { 
            question: renderValue(q.question || q.q || ""), 
            options: Array.isArray(q.options) ? q.options.map((o: any) => renderValue(o)) : [], 
            answer: renderValue(q.answer || q.correct_answer || ""),
            type: (q.type || "mcq").toUpperCase(),
            explanation_vn: renderValue(q.explanation_vn || q.explanation || ""),
            hint_vn: renderValue(q.hint_vn || q.hint || ""),
            matching_pairs: q.matching_pairs || [],
            context: renderValue(q.context || "")
        };
      }) : [];

      setResult({ words, quiz });
      setCurrentQuizIdx(0);
      setQuizAnswers({});
      setIsQuizSubmitted(false);
      setShowHint(false);
      setMatches({});
      setMatchingSelections({ word: null, def: null });
    } catch (e) {
      console.error(e);
      showAlert("Lỗi khi phân tích nội dung. Vui lòng thử lại.", 'error');
    } finally {
      setLoading(false);
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

  const handleTextareaDoubleClick = async (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const textVal = textarea.value;
    
    let left = start;
    while (left > 0 && /[\w']/.test(textVal[left - 1])) left--;
    let right = start;
    while (right < textVal.length && /[\w']/.test(textVal[right])) right++;
    
    const word = textVal.substring(left, right).trim();
    if (!word || word.length < 2) return;

    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/student/dictionary/lookup`, {
        method: "POST",
        body: JSON.stringify({ word }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Backend returns AI-enhanced data with meanings array
        if (data && data.word) {
          const firstMeaning = data.meanings && data.meanings[0];
          setSelectedWordInfo({
            word: data.word,
            phonetic: data.phonetic_uk || data.phonetic_us || "/.../",
            type: firstMeaning?.pos || data.pos || "n/a",
            translation: firstMeaning?.meaning_vn || "N/A",
            engMeaning: firstMeaning?.definition_en || "N/A",
            example: firstMeaning?.examples ? (Array.isArray(firstMeaning.examples) ? firstMeaning.examples[0] : firstMeaning.examples) : "No example",
            level: data.level || "B1",
            fullData: data // Keep full data for potential future use
          });
        }
      } else {
        showAlert(`Không tìm thấy từ "${word}"`, 'warning');
      }
    } catch (err) {
      showAlert("Lỗi kết nối từ điển.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-blue-600" /> Phân tích văn bản với AI
        </h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setInputMode("text")} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${inputMode === "text" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
            Nhập văn bản
          </button>
          <button onClick={() => setInputMode("file")} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${inputMode === "file" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
            Tải tệp lên
          </button>
        </div>

        {inputMode === "text" ? (
          <div className="space-y-3">
            <textarea
              rows={5}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none resize-none transition text-base"
              placeholder="Dán một đoạn văn bản tiếng Anh vào đây để AI trích xuất từ vựng và tạo câu hỏi trắc nghiệm... (Double click vào từ bất kỳ để tra nhanh)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onDoubleClick={handleTextareaDoubleClick}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={() => analyze("text")}
                disabled={loading || !text.trim()}
                className="btn-primary py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md disabled:opacity-50 transition"
              >
                {loading ? "AI đang xử lý..." : <><Sparkles size={18} /> Phân tích</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-8 flex flex-col items-center justify-center relative cursor-pointer hover:bg-blue-50 transition min-h-[160px]">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
              }} accept=".txt,.pdf,.docx" />
              <Upload size={32} className="text-blue-400 mb-2" />
              <p className="font-bold text-gray-700">{file ? file.name : "Kéo thả hoặc nhấn để chọn tệp"}</p>
              <p className="text-sm text-gray-500 mt-1">Hỗ trợ .txt, .pdf, .docx</p>
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={() => analyze("file")}
                disabled={loading || !file}
                className="btn-primary py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md disabled:opacity-50 transition"
              >
                {loading ? "AI đang xử lý..." : <><Sparkles size={18} /> Phân tích Tệp</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-8">
          {result.words.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Layers size={20} className="text-purple-600" /> Flashcard Từ Vựng
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-bold">{result.words.length} từ</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {result.words.map((w: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative h-60 cursor-pointer group perspective-1000"
                  >
                    <div onClick={() => setFlippedWord(flippedWord === idx ? null : idx)} className={`w-full h-full transition-all duration-700 transform-style-3d ${flippedWord === idx ? "rotate-y-180" : "hover:scale-[1.02] active:scale-95"}`}>
                      <div className="absolute w-full h-full backface-hidden bg-white border-2 border-blue-100 rounded-3xl shadow-sm group-hover:shadow-xl group-hover:border-blue-300 flex flex-col items-center justify-center p-6 transition-all">
                        <span className="absolute top-4 right-4 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">{w.level}</span>
                        <h4 className="text-3xl font-black text-blue-800 lowercase tracking-tighter mb-2">{w.word}</h4>
                        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                          {simulateSyllabify(w.word).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[9px] font-bold rounded-md border border-gray-100 italic">{s}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-4 py-1.5 rounded-2xl border border-gray-100">
                           <Volume2 size={14} className="text-blue-400" />
                           <span className="font-mono text-xs font-bold leading-none">{w.phon}</span>
                        </div>
                        {w.pos && <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 mt-4 px-3 py-1 bg-purple-50 rounded-full">{w.pos}</span>}
                      </div>
                      <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 rotate-y-180 text-white text-center">
                        <div className="w-10 h-1 bg-white/20 rounded-full mb-6" />
                        <h4 className="text-xl font-black mb-2 leading-tight uppercase tracking-tight">{w.meaning}</h4>
                        {w.meaning_en && <p className="text-blue-100 text-xs font-medium mb-4 leading-relaxed line-clamp-2">{w.meaning_en}</p>}
                        {w.example && (
                          <p className="text-blue-50/80 text-[11px] italic border-t border-white/10 pt-4 px-2 font-serif">
                            &ldquo;{w.example}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await authFetch(`${API_URL}/student/vocabulary/save`, {
                            method: "POST",
                            body: JSON.stringify({ word: w.word, phonetic: w.phon, pos: w.pos || "", meaning_en: w.meaning_en || "", meaning_vn: w.meaning, example: w.example, level: w.level, source: "ai-analysis" })
                          });
                          if (res.ok) showAlert(`Đã lưu "${w.word}" vào kho từ vựng!`, 'success');
                        } catch { }
                      }}
                      className="absolute bottom-2 right-2 z-10 p-1.5 bg-white/90 hover:bg-green-50 border border-gray-200 rounded-lg transition shadow-sm" title="Lưu từ"
                    >
                      <Bookmark size={14} className="text-green-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.words.length > 0 && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <BookText size={20} />
                </div>
                Detailed Word Analysis
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {result.words.map((w: any, idx: number) => {
                  const syllables = simulateSyllabify(w.word);
                  return (
                    <div key={idx} className="group p-5 bg-gray-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-indigo-100 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6">
                      <div className="md:w-1/3">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{w.pos || "Vocabulary"}</span>
                           <span className="text-[9px] font-black uppercase text-white bg-indigo-600 px-2 py-0.5 rounded">{w.level || "B1"}</span>
                        </div>
                        <h4 className="text-2xl font-black text-gray-800 lowercase leading-none mb-3 group-hover:text-indigo-600 transition-colors">{w.word}</h4>
                        <div className="flex flex-wrap gap-1">
                          {syllables.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white text-gray-400 text-[10px] font-bold rounded-lg border border-gray-100 group-hover:border-indigo-100 group-hover:text-indigo-400 transition-all">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 border-l-0 md:border-l border-gray-200 md:pl-6 transition-colors group-hover:border-indigo-200">
                        <div className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                           <p className="text-sm font-bold text-gray-700 leading-tight">{w.meaning}</p>
                        </div>
                        {w.meaning_en && (
                          <div className="flex items-start gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-2 shrink-0" />
                             <p className="text-xs text-gray-500 italic leading-snug">{w.meaning_en}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.words.length > 0 && (
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <Brain size={20} className="text-blue-600" /> Thử Thách Ghi Nhớ (Recall Quiz)
                  </h3>
                  <p className="text-blue-700/70 text-sm">Kiểm tra khả năng nhớ nghĩa của các từ vựng vừa trích xuất.</p>
                </div>
                <button 
                  onClick={() => {
                    setShowRecallQuiz(!showRecallQuiz);
                    setRecallAnswers({});
                    setRecallSubmitted(false);
                  }}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <PlayCircle size={18} /> {showRecallQuiz ? "Đóng Quiz" : "Bắt đầu Recall Quiz"}
                </button>
              </div>

              {showRecallQuiz && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                  {result.words.map((w: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Nghĩa tiếng Việt</span>
                        <h4 className="text-xl font-black text-blue-800">{w.meaning}</h4>
                      </div>
                      <div className="flex-[2]">
                        <input 
                          type="text"
                        className={`w-full px-4 py-2 rounded-lg border-2 outline-none transition font-bold ${
                          recallSubmitted 
                            ? (recallAnswers[idx]?.toLowerCase().trim() === w.word.toLowerCase().trim() ? "border-green-400 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-700")
                            : "border-gray-100 focus:border-blue-400 text-gray-800"
                        }`}
                        value={recallAnswers[idx] || ""}
                        onChange={(e) => setRecallAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                      />
                      {recallSubmitted && recallAnswers[idx]?.toLowerCase().trim() !== w.word.toLowerCase().trim() && (
                        <p className="text-[10px] text-green-600 font-bold mt-1 inline-flex items-center gap-1">
                          <CheckCircle2 size={10} /> Đáp án đúng: {w.word}
                        </p>
                      )}
                      </div>
                    </div>
                  ))}
                  
                  {!recallSubmitted && Object.keys(recallAnswers).length > 0 && (
                    <div className="text-center mt-6">
                      <button 
                        onClick={() => setRecallSubmitted(true)}
                        className="btn-primary px-8 py-3 rounded-xl shadow-xl shadow-blue-200"
                      >
                        Kiểm tra kết quả
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {result.quiz.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Award size={22} className="text-blue-600" /> IELTS Practice Quiz
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400">
                    {currentQuizIdx + 1} / {result.quiz.length}
                  </span>
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300" 
                      style={{ width: `${((currentQuizIdx + 1) / result.quiz.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {submitted ? (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                   <div className={`mb-8 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 ${score / result.quiz.length >= 0.8 ? "bg-green-50 border-2 border-green-100" : (score / result.quiz.length >= 0.5 ? "bg-blue-50 border-2 border-blue-100" : "bg-orange-50 border-2 border-orange-100")}`}>
                      <div className="flex items-center gap-4 text-center md:text-left">
                        <div className={`p-4 rounded-full ${score / result.quiz.length >= 0.8 ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
                           <Trophy size={40} />
                        </div>
                        <div>
                           <h4 className={`text-2xl font-black ${score / result.quiz.length >= 0.8 ? "text-green-800" : "text-orange-800"}`}>
                              {score / result.quiz.length >= 0.8 ? "Tuyệt vời!" : (score / result.quiz.length >= 0.5 ? "Khá tốt!" : "Cố gắng lên!")}
                           </h4>
                           <p className="text-gray-600 font-bold">Bạn đã hoàn thành bài tập với {score}/{result.quiz.length} điểm.</p>
                        </div>
                      </div>
                      
                      {score < result.quiz.length && (
                        <button 
                          onClick={async () => {
                            const wrongQuestions = result.quiz.filter((q: any, i: number) => {
                              const userAns = (quizAnswers[i] || "").toLowerCase().trim();
                               const correctAns = q.answer.toLowerCase().trim();
                               return userAns !== correctAns;
                            });
                            
                            for (const q of wrongQuestions) {
                              const wordMatch = q.question.match(/['"](.*?)['"]/);
                              const word = wordMatch ? wordMatch[1] : q.answer;
                              try {
                                await authFetch(`${API_URL}/student/vocabulary/quiz-error`, {
                                  method: "POST",
                                  body: JSON.stringify({ word, context: q.question })
                                });
                              } catch (e) {}
                            }
                            showAlert("Đã thêm các từ bạn làm sai vào Flashcard!", 'success');
                          }}
                          className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-sm shadow-md border border-blue-100 hover:shadow-lg transition active:scale-95"
                        >
                          Lưu câu sai vào Flashcards
                        </button>
                      )}
                      <button onClick={() => { setSubmitted(false); setResult(null); }} className="btn-primary px-8 py-3 rounded-xl shadow-lg">Làm bài mới</button>
                   </div>
                </div>
              ) : (
                <div key={currentQuizIdx} className="animate-in slide-in-from-right-4 duration-300">
                  <div className="mb-10 text-center">
                    <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-bold uppercase tracking-widest text-xs mb-6 shadow-sm border border-blue-100">
                      {result.quiz[currentQuizIdx].type === 'FIB' ? 'Điền vào chỗ trống' : result.quiz[currentQuizIdx].type === 'SPELLING' ? 'Nghe và Viết' : result.quiz[currentQuizIdx].type === 'PARAPHRASE' ? 'Câu đồng nghĩa' : result.quiz[currentQuizIdx].type === 'MATCHING' ? 'Nối cặp từ' : 'Chọn đáp án đúng'}
                    </span>
                    
                    <h2 className="text-3xl md:text-4xl font-black text-gray-800 leading-tight mb-6">
                      {result.quiz[currentQuizIdx].type === 'MATCHING' ? "Ghép từ với định nghĩa tương ứng" : result.quiz[currentQuizIdx].question}
                    </h2>
                    
                    {result.quiz[currentQuizIdx].type !== 'MATCHING' && (result.quiz[currentQuizIdx].type === 'FIB' || result.quiz[currentQuizIdx].context) && (
                      <div className="text-xl md:text-2xl font-medium text-gray-600 bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100 leading-relaxed max-w-2xl mx-auto shadow-inner">
                        {result.quiz[currentQuizIdx].context}
                      </div>
                    )}

                    {result.quiz[currentQuizIdx].type === 'SPELLING' && (
                      <button 
                        onClick={() => speak(result.quiz[currentQuizIdx].answer)} 
                        className="mt-6 mx-auto bg-blue-100 hover:bg-blue-200 text-blue-600 p-5 rounded-full transition transform active:scale-90 shadow-md"
                      >
                        <Volume2 size={36} />
                      </button>
                    )}
                  </div>

                  <div className="w-full max-w-4xl mx-auto space-y-4">
                    {result.quiz[currentQuizIdx].type === 'MATCHING' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                         <div className="space-y-3">
                            <h4 className="text-center font-black text-blue-500 uppercase tracking-widest text-xs mb-4">Từ vựng</h4>
                            {(result.quiz[currentQuizIdx].matching_pairs || []).map((pair: any, i: number) => {
                               const isMatched = !!matches[pair.word];
                               const isSelected = matchingSelections.word === pair.word;
                               return (
                                  <button 
                                    key={i}
                                    disabled={isQuizSubmitted || isMatched}
                                    onClick={() => setMatchingSelections(prev => ({ ...prev, word: pair.word }))}
                                    className={`w-full p-6 md:p-8 rounded-3xl border-2 text-center font-black text-xl md:text-2xl transition-all ${
                                      isMatched ? "bg-green-50 border-green-200 text-green-600 opacity-50" :
                                      isSelected ? "bg-blue-100 border-blue-500 text-blue-700 shadow-md scale-[1.02] ring-4 ring-blue-500/20" :
                                      "bg-white border-gray-100 hover:border-blue-200 text-gray-700 shadow-sm"
                                    }`}
                                  >
                                     {pair.word}
                                  </button>
                               )
                            })}
                         </div>
                         <div className="space-y-3">
                            <h4 className="text-center font-black text-purple-500 uppercase tracking-widest text-xs mb-4">Định nghĩa</h4>
                            {(result.quiz[currentQuizIdx].matching_pairs || []).map((pair: any, i: number) => {
                               const def = pair.def;
                               const matchedWord = Object.keys(matches).find(k => matches[k] === def);
                               const isSelected = matchingSelections.def === def;
                               return (
                                  <button 
                                    key={i}
                                    disabled={isQuizSubmitted || !!matchedWord}
                                    onClick={() => {
                                       if (matchingSelections.word) {
                                          const correctPair = result.quiz[currentQuizIdx].matching_pairs.find((p: any) => p.word === matchingSelections.word);
                                          if (correctPair && correctPair.def === def) {
                                             const newMatches = { ...matches, [matchingSelections.word!]: def };
                                             setMatches(newMatches);
                                             setMatchingSelections({ word: null, def: null });
                                             if (Object.keys(newMatches).length === result.quiz[currentQuizIdx].matching_pairs.length) {
                                                setQuizAnswers({...quizAnswers, [currentQuizIdx]: "MATCHED"});
                                                setIsQuizSubmitted(true);
                                             }
                                          } else {
                                             showAlert("Không khớp! Thử lại nhé.", 'warning');
                                             setMatchingSelections({ word: null, def: null });
                                          }
                                       } else {
                                          setMatchingSelections(prev => ({ ...prev, def: def }));
                                       }
                                    }}
                                    className={`w-full p-6 md:p-8 rounded-3xl border-2 text-left text-lg md:text-xl font-bold transition-all leading-tight ${
                                      matchedWord ? "bg-green-50 border-green-200 text-green-600 opacity-50" :
                                      isSelected ? "bg-purple-100 border-purple-500 text-purple-700 shadow-md scale-[1.02] ring-4 ring-purple-500/20" :
                                      "bg-white border-gray-100 hover:border-purple-200 text-gray-600 shadow-sm"
                                    }`}
                                  >
                                     {def}
                                  </button>
                               )
                            })}
                         </div>
                      </div>
                    ) : result.quiz[currentQuizIdx].options && result.quiz[currentQuizIdx].type !== 'SPELLING' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.quiz[currentQuizIdx].options.map((opt: string, i: number) => {
                          const isSelected = quizAnswers[currentQuizIdx] === opt;
                          const isCorrect = opt === result.quiz[currentQuizIdx].answer;
                          let bgClass = "bg-white border-gray-100 hover:border-blue-200 text-gray-700";
                          if (isQuizSubmitted) {
                            if (isCorrect) bgClass = "bg-green-100 border-green-500 text-green-800 scale-[1.02] shadow-md z-10 ring-4 ring-green-500/20";
                            else if (isSelected) bgClass = "bg-red-50 border-red-400 text-red-600 opacity-90";
                            else bgClass = "opacity-40 grayscale border-gray-100";
                          } else if (isSelected) {
                            bgClass = "bg-blue-100 border-blue-500 text-blue-800 shadow-md scale-[1.02] ring-4 ring-blue-500/20";
                          }
                          return (
                            <button
                              key={i}
                              disabled={isQuizSubmitted}
                              onClick={() => {
                                 setQuizAnswers({ ...quizAnswers, [currentQuizIdx]: opt });
                                 setIsQuizSubmitted(true);
                              }}
                              className={`p-6 md:p-8 rounded-3xl border-2 text-left transition-all duration-300 font-bold flex items-center gap-4 ${bgClass}`}
                            >
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${isQuizSubmitted && isCorrect ? 'border-green-600 text-green-700 bg-white' : isSelected ? 'border-blue-600 text-blue-600 bg-white' : 'border-gray-300 text-gray-400'}`}>
                                 {isQuizSubmitted && isCorrect ? <CheckCircle2 size={16}/> : i + 1}
                              </div>
                              <span className="flex-1 text-lg">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="max-w-lg mx-auto">
                        <input
                          type="text"
                          autoFocus
                          value={quizAnswers[currentQuizIdx] || ""}
                          disabled={isQuizSubmitted}
                          placeholder={result.quiz[currentQuizIdx].type === 'SPELLING' ? "Nghe và nhập chính xác..." : "Nhập đáp án..."}
                          className={`w-full text-3xl font-black text-center p-8 border-b-4 rounded-3xl outline-none transition-all shadow-sm ${isQuizSubmitted ? ((quizAnswers[currentQuizIdx] || "").toLowerCase().trim() === result.quiz[currentQuizIdx].answer.toLowerCase() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-300 bg-gray-50 focus:border-blue-500 focus:bg-white focus:shadow-xl"}`}
                          onChange={(e) => setQuizAnswers({...quizAnswers, [currentQuizIdx]: e.target.value})}
                          onKeyDown={(e) => {
                             if (e.key === 'Enter' && quizAnswers[currentQuizIdx] && !isQuizSubmitted) { setIsQuizSubmitted(true); }
                          }}
                        />
                      </div>
                    )}
                    {showHint && !isQuizSubmitted && result.quiz[currentQuizIdx].hint_vn && (
                        <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-200 text-yellow-800 text-sm md:text-base font-medium max-w-2xl mx-auto mt-8 flex items-start gap-3 animate-in fade-in zoom-in-95">
                            <Lightbulb size={24} className="text-yellow-600 flex-shrink-0" />
                            <p><strong>Gợi ý từ AI:</strong> {result.quiz[currentQuizIdx].hint_vn}</p>
                        </div>
                    )}
                  </div>

                  <div className={`mt-10 p-6 rounded-3xl transition-all duration-500 border-2 ${isQuizSubmitted ? ((quizAnswers[currentQuizIdx] || "").toLowerCase().trim() === (result.quiz[currentQuizIdx].answer || "").toLowerCase().trim() || quizAnswers[currentQuizIdx] === "MATCHED" ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200") : "bg-white border-transparent shadow-sm"}`}>
                     <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        {!isQuizSubmitted ? (
                           <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-gray-700 font-bold flex items-center gap-2 transition px-4 py-2 hover:bg-gray-100 rounded-xl">
                              <Lightbulb size={20} /> {showHint ? "Ẩn gợi ý" : "Xin gợi ý"}
                           </button>
                        ) : (
                           <div className="flex items-center gap-4 animate-in slide-in-from-left-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md bg-white ${((quizAnswers[currentQuizIdx] || "").toLowerCase().trim() === (result.quiz[currentQuizIdx].answer || "").toLowerCase().trim() || quizAnswers[currentQuizIdx] === "MATCHED") ? 'text-green-500' : 'text-red-500'}`}>
                                 {((quizAnswers[currentQuizIdx] || "").toLowerCase().trim() === (result.quiz[currentQuizIdx].answer || "").toLowerCase().trim() || quizAnswers[currentQuizIdx] === "MATCHED") ? <CheckCircle2 size={28} /> : <X size={28} />}
                              </div>
                              <div>
                                 <h3 className={`font-black text-xl leading-none ${((quizAnswers[currentQuizIdx] || "").toLowerCase().trim() === (result.quiz[currentQuizIdx].answer || "").toLowerCase().trim() || quizAnswers[currentQuizIdx] === "MATCHED") ? "text-green-800" : "text-red-800"}`}>
                                    {((quizAnswers[currentQuizIdx] || "").toLowerCase().trim() === (result.quiz[currentQuizIdx].answer || "").toLowerCase().trim() || quizAnswers[currentQuizIdx] === "MATCHED") ? "Tuyệt vời!" : "Sai rồi!"}
                                 </h3>
                                 {result.quiz[currentQuizIdx].type !== 'MATCHING' && (
                                    <p className="font-bold text-sm mt-1 opacity-75">Đáp án đúng: <span className="underline decoration-green-500/30">{result.quiz[currentQuizIdx].answer}</span></p>
                                 )}
                              </div>
                           </div>
                        )}

                        <div className="flex gap-3 w-full md:w-auto">
                          {!isQuizSubmitted && result.quiz[currentQuizIdx].type !== 'MATCHING' ? (
                            <button
                              disabled={!quizAnswers[currentQuizIdx]}
                              onClick={() => setIsQuizSubmitted(true)}
                              className="w-full md:w-auto px-10 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black shadow-[0_4px_0_0_#2563ea] active:shadow-none active:translate-y-[4px] transition-all uppercase tracking-widest text-sm"
                            >
                               Kiểm tra
                            </button>
                          ) : (
                             currentQuizIdx < result.quiz.length - 1 ? (
                                <button
                                  onClick={() => {
                                     setCurrentQuizIdx(currentQuizIdx + 1);
                                     setIsQuizSubmitted(false);
                                     setShowHint(false);
                                     setMatches({});
                                     setMatchingSelections({ word: null, def: null });
                                  }}
                                  className="w-full md:w-auto px-10 py-3 rounded-2xl bg-gray-800 hover:bg-black text-white font-black shadow-[0_4px_0_0_#000] active:shadow-none active:translate-y-[4px] transition-all uppercase tracking-widest text-sm"
                                >
                                  Tiếp tục
                                </button>
                             ) : (
                                <button
                                  onClick={() => {
                                    let s = 0;
                                    result.quiz.forEach((q: any, i: number) => {
                                       const userAns = (quizAnswers[i] || "").toLowerCase().trim();
                                       const correctAns = (q.answer || "").toLowerCase().trim();
                                       if (userAns === correctAns || userAns === "MATCHED") s++;
                                    });
                                    setScore(s);
                                    setSubmitted(true);
                                  }}
                                  className="w-full md:w-auto px-10 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black shadow-[0_4px_0_0_#059669] active:shadow-none active:translate-y-[4px] transition-all uppercase tracking-widest text-sm"
                                >
                                  Hoàn thành
                                </button>
                             )
                          )}
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {selectedWordInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-blue-100 transform animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
              <button 
                onClick={() => setSelectedWordInfo(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition"
              >
                <X size={18} />
              </button>
              <h3 className="text-2xl font-black mb-1">{selectedWordInfo.word}</h3>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => speak(selectedWordInfo.word)} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
                  <Volume2 size={16} /> <span className="font-mono text-sm">{selectedWordInfo.phonetic}</span>
                </button>
                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase">{selectedWordInfo.level || 'A1'}</span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">Loại từ & Nghĩa</span>
                <p className="text-gray-900 font-bold text-lg leading-tight">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm mr-2">{selectedWordInfo.type}</span> 
                  {selectedWordInfo.translation}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">Định nghĩa tiếng Anh</span>
                <p className="text-gray-700 text-sm italic leading-relaxed">"{selectedWordInfo.engMeaning}"</p>
              </div>

              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">Ví dụ</span>
                <p className="text-gray-700 text-sm leading-relaxed">{selectedWordInfo.example}</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const res = await authFetch(`${API_URL}/student/vocabulary/save`, {
                        method: "POST",
                        body: JSON.stringify({ 
                          word: selectedWordInfo.word, 
                          phonetic: selectedWordInfo.phonetic, 
                          pos: selectedWordInfo.type, 
                          meaning_en: selectedWordInfo.engMeaning, 
                          meaning_vn: selectedWordInfo.translation, 
                          example: selectedWordInfo.example, 
                          level: selectedWordInfo.level || 'A1', 
                          source: "lookup-modal" 
                        })
                      });
                      if (res.ok) {
                        showAlert(`Đã thêm "${selectedWordInfo.word}" vào flashcards!`, 'success');
                        setSelectedWordInfo(null);
                      }
                    } catch { }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2"
                >
                  <Bookmark size={18} /> Thêm vào Flashcards
                </button>
                <button
                  onClick={() => setSelectedWordInfo(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
