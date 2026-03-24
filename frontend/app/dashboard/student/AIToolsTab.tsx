"use client";
import React, { useState } from "react";
import { 
  Sparkles, Upload, Layers, PlayCircle, Bookmark, BookText, 
  Brain, Award, Trophy, CheckCircle2, XCircle, X, Volume2 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ALL_WORDS_DATABASE, simulateSyllabify, WordDetail } from "../../components/DictionaryData";

interface AIToolsTabProps {
  setShowCreditModal: (s: boolean) => void;
  API_URL: string;
}

export default function AIToolsTab({ setShowCreditModal, API_URL }: AIToolsTabProps) {
  const { user, authFetch, refreshUser } = useAuth();
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
  const [showRecallQuiz, setShowRecallQuiz] = useState(false);
  const [recallAnswers, setRecallAnswers] = useState<Record<number, string>>({});
  const [recallSubmitted, setRecallSubmitted] = useState(false);

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
        if (!res.ok) throw new Error("API error");
        
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = "";
        let finalData: any = { vocabulary: [], quiz: [] };

        while (reader && !done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              let rawJson = line.trim();
              if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
              if (rawJson === "[DONE]" || !rawJson) continue;

              try {
                const chunkData = JSON.parse(rawJson);
                if (chunkData.status === "success" || !chunkData.status) {
                  finalData = { ...finalData, ...chunkData };
                }
              } catch (e) { }
            }
          }
        }
        refreshUser();
        data = finalData;
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
        
        if (!res.ok) throw new Error("API error");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = "";
        let finalData: any = { vocabulary: [], quiz: [] };

        while (reader && !done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              let rawJson = line.trim();
              if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
              if (rawJson === "[DONE]" || !rawJson) continue;

              try {
                const chunkData = JSON.parse(rawJson);
                if (chunkData.status === "success" || !chunkData.status) {
                  finalData = { ...finalData, ...chunkData };
                }
              } catch (e) { }
            }
          }
        }
        refreshUser();
        data = finalData;
      }

      const words = Array.isArray(data.vocabulary) ? data.vocabulary.map((w: any) => ({
        word: w.word || "Unknown",
        phon: w.phonetic || w.phon || "",
        meaning: w.meaning_vn || w.meaning || w.vietnamese_meaning || "",
        meaning_en: w.meaning_en || w.english_definition || "",
        example: w.example || "",
        level: w.level || "B1",
        pos: w.pos || ""
      })) : [];

      const quiz = Array.isArray(data.quiz) ? data.quiz.map((q: any) => {
        let ansIndex = 0;
        if (typeof q.correct_answer === "number") ansIndex = q.correct_answer;
        else if (typeof q.correct_answer === "string" && Array.isArray(q.options)) {
          const idx = q.options.findIndex((o: string) => o.toLowerCase() === q.correct_answer.toLowerCase());
          if (idx !== -1) ansIndex = idx;
        } else if (q.ans !== undefined) ansIndex = q.ans;
        return { 
            question: q.question || q.q || "", 
            options: q.options || [], 
            answer: q.correct_answer || q.answer || "",
            ans: ansIndex,
            type: q.type || "mcq",
            explanation: q.explanation || ""
        };
      }) : [];

      setResult({ words, quiz });
    } catch (e) {
      console.error(e);
      alert("Lỗi khi phân tích nội dung. Vui lòng thử lại.");
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
          alert(`Không tìm thấy từ "${word}" trong từ điển.`);
        }
      } catch (err) {
        alert(`Không tìm thấy từ "${word}" và lỗi kết nối API.`);
      }
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
                    className="relative h-52 cursor-pointer perspective-1000"
                  >
                    <div onClick={() => setFlippedWord(flippedWord === idx ? null : idx)} className={`w-full h-full transition-transform duration-500 transform-style-3d ${flippedWord === idx ? "rotate-y-180" : ""}`}>
                      <div className="absolute w-full h-full backface-hidden bg-white border-2 border-blue-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 flex flex-col items-center justify-center p-5 transition">
                        <h4 className="text-2xl font-extrabold text-blue-700 mb-1">{w.word}</h4>
                        <div className="flex gap-1 mb-2">
                          {simulateSyllabify(w.word).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded border border-blue-100">{s}</span>
                          ))}
                        </div>
                        <p className="text-gray-400 font-mono text-sm flex items-center"><PlayCircle size={14} className="mr-1" /> {w.phon}</p>
                        {w.pos && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded mt-1">{w.pos}</span>}
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-100 text-xs font-bold text-gray-500 rounded">{w.level}</span>
                      </div>
                      <div className="absolute w-full h-full backface-hidden bg-blue-600 rounded-xl shadow-lg flex flex-col items-center justify-center p-5 rotate-y-180 text-white text-center">
                        <h4 className="text-lg font-bold mb-1">{w.meaning}</h4>
                        {w.meaning_en && <p className="text-blue-200 text-xs mb-2">{w.meaning_en}</p>}
                        {w.example && <p className="text-blue-200 text-sm italic border-t border-blue-500/50 pt-2">&ldquo;{w.example}&rdquo;</p>}
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
                          if (res.ok) alert(`Đã lưu "${w.word}" vào kho từ vựng!`);
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
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
              <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <BookText size={20} className="text-indigo-600" /> Phân tách Âm Tiết & Định Nghĩa
              </h3>
              <div className="space-y-3">
                {result.words.map((w: any, idx: number) => {
                  const syllables = simulateSyllabify(w.word);
                  return (
                    <div key={idx} className="p-4 bg-white rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{w.pos || "Vocabulary"}</span>
                          <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase">{w.level || "B1"}</span>
                        </div>
                        <h4 className="text-xl font-black text-indigo-800 lowercase tracking-tight">{w.word}</h4>
                        <div className="flex gap-1.5 mt-2">
                          {syllables.map((s, i) => (
                            <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-[1.5] space-y-1">
                        <p className="text-sm font-bold text-gray-700 leading-tight">
                          <span className="text-indigo-500 mr-2">Nghĩa:</span>{w.meaning}
                        </p>
                        {w.meaning_en && (
                          <p className="text-xs text-gray-500 italic leading-snug">
                            <span className="text-indigo-400 font-bold not-italic mr-2">Định nghĩa:</span>{w.meaning_en}
                          </p>
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
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Award size={20} className="text-green-600" /> IELTS Practice Quiz
              </h3>

              {submitted && (
                <div className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 ${score === result.quiz.length ? "bg-green-50 text-green-800 border border-green-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
                  <div className="flex items-center gap-3">
                    <Trophy size={28} />
                    <div>
                      <p className="font-bold text-lg">Bạn đạt {score}/{result.quiz.length} điểm!</p>
                    </div>
                  </div>
                  {score < result.quiz.length && (
                    <button 
                      onClick={async () => {
                        const wrongQuestions = result.quiz.filter((q: any, i: number) => {
                          const correctAns = q.answer;
                          const userAns = answers[i] !== undefined ? q.options[answers[i]] : null;
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
                        alert("Đã thêm các từ bạn làm sai vào Flashcard để ôn tập!");
                      }}
                      className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold text-xs shadow-sm border border-blue-100 hover:bg-blue-50 transition"
                    >
                      Lưu câu sai vào Flashcards
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-5">
                {result.quiz.map((q: any, i: number) => {
                  return (
                    <div key={i} className="p-4 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition">
                      <div className="flex items-start gap-2 mb-3">
                        <span className="bg-blue-100 text-blue-700 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold">{i + 1}</span>
                        <div>
                           <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase mr-2">{q.type}</span>
                           <p className="font-bold text-gray-800 inline leading-relaxed">{q.question}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                        {q.options.map((opt: string, oi: number) => {
                          const isSelected = answers[i] === oi;
                          let cls = "border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer";
                          let icon = null;
                          if (submitted) {
                            if (opt === q.answer) { cls = "border-green-400 bg-green-50 ring-4 ring-green-100"; icon = <CheckCircle2 size={18} className="text-green-500" />; }
                            else if (isSelected) { cls = "border-red-400 bg-red-50"; icon = <XCircle size={18} className="text-red-500" />; }
                            else cls = "border-gray-50 opacity-40 grayscale";
                          } else if (isSelected) cls = "border-blue-500 bg-blue-50 shadow-sm";

                          return (
                            <div key={oi} onClick={() => !submitted && setAnswers(prev => ({ ...prev, [i]: oi }))} className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${cls}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">{opt}</span>
                              </div>
                              {icon}
                            </div>
                          )
                        })}
                      </div>
                      {submitted && q.explanation && (
                        <div className="mt-3 ml-9 p-3 bg-indigo-50/50 rounded-xl text-xs text-indigo-700 border-l-4 border-indigo-400">
                          <p className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5" /> <strong>AI Explanation:</strong></p>
                          <p className="mt-1 ml-6">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {!submitted && Object.keys(answers).length > 0 && (
                <div className="mt-8 text-center">
                  <button onClick={() => {
                    let s = 0;
                    result.quiz.forEach((q: any, i: number) => {
                      if (answers[i] !== undefined && q.options[answers[i]] === q.answer) s++;
                    });
                    setScore(s);
                    setSubmitted(true);
                  }} className="btn-primary px-10 py-3 rounded-2xl shadow-xl shadow-blue-200 hover:shadow-2xl transition transform active:scale-95 text-lg font-black">Nộp bài & Chấm điểm</button>
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
                        alert(`Đã thêm "${selectedWordInfo.word}" vào flashcards!`);
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
