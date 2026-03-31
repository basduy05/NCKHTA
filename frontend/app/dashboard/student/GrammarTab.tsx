"use client";
import React, { useState, useEffect } from "react";
import { BookText, FileText, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Trophy, X, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

interface GrammarTabProps {
  API_URL: string;
}

export default function GrammarTab({ API_URL }: GrammarTabProps) {
  const { authFetch, refreshUser } = useAuth();
  const { showAlert } = useNotification();
  
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<any | null>(null);

  // Practice State
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [practicing, setPracticing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // New Paginated UI states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);

  // Defensive rendering helper
  const renderValue = (val: any) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
       return Object.entries(val)
         .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
         .join(" | ");
    }
    return String(val);
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
      const res = await authFetch(`${API_URL}/${prefix}/grammar`);
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
    if (selectedRules.length === 0) return showAlert("Chọn ít nhất 1 cấu trúc!", 'warning');
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

  const submitPractice = () => {
    let s = 0;
    questions.forEach((q, i) => {
        const uAns = String(answers[i] || "").toLowerCase().trim();
        const cAns = String(q.answer || "").toLowerCase().trim();
        if (uAns === cAns) s++;
    });
    setScore(s);
    setSubmitted(true);
  };

  if (practicing) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Luyện tập Ngữ pháp</h2>
          <button onClick={() => setPracticing(false)} className="text-gray-500 hover:text-red-600 font-medium">Thoát</button>
        </div>
        {questions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Đang phân tích cấu trúc...</h3>
            <p className="text-gray-500 font-medium text-center max-w-sm">AI đang tổng hợp và tạo bài tập luyện tập chuyên sâu cho bạn. Quá trình này có thể mất tới 10-15 giây.</p>
          </div>
        ) : (
            <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto animate-in fade-in duration-300">
                <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 flex items-center gap-6 border-b border-gray-100">
                    <button onClick={() => setPracticing(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={28} /></button>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-500 rounded-full" 
                          style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
                        />
                    </div>
                    <span className="font-extrabold text-blue-600 text-lg">{currentIdx + 1} / {questions.length}</span>
                </div>

                {!submitted ? (() => {
                    const q = questions[currentIdx];
                    if (!q) return null;
                    return (
                        <div className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col pt-10">
                            
                            <div className="mb-12 text-center">
                              <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl font-bold uppercase tracking-widest text-xs mb-6 shadow-sm border border-blue-100">
                                {q.type === 'FIB' ? 'Điền vào chỗ trống' : q.type === 'TFNG' ? 'Đúng / Sai / Không có' : q.type === 'MATCH' ? 'Ghép nối' : 'Chọn đáp án đúng'}
                              </span>
                              
                              <h2 className="text-3xl md:text-4xl font-black text-gray-800 leading-tight">
                                {q.question}
                              </h2>
                            </div>

                            <div className="w-full max-w-2xl mx-auto space-y-4">
                              {q.options && q.options.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {q.options.map((opt: string, idx: number) => {
                                      const isSelected = answers[currentIdx] === opt;
                                      const isCorrect = opt === q.answer;
                                      
                                      let bgClass = "bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 shadow-sm";
                                      if (questionSubmitted) {
                                        if (isCorrect) bgClass = "bg-green-100 border-green-500 text-green-800 shadow-md scale-[1.02] z-10 ring-4 ring-green-500/20";
                                        else if (isSelected) bgClass = "bg-red-50 border-red-400 text-red-600";
                                        else bgClass = "opacity-40 grayscale border-gray-100";
                                      } else if (isSelected) {
                                        bgClass = "bg-blue-100 border-blue-500 text-blue-800 shadow-md scale-[1.02] ring-4 ring-blue-500/20";
                                      }

                                      return (
                                          <button 
                                              key={idx} 
                                              disabled={questionSubmitted}
                                              onClick={() => setAnswers({...answers, [currentIdx]: opt})}
                                              className={`p-6 md:p-8 rounded-3xl border-2 text-left transition-all duration-300 font-bold text-lg md:text-xl flex items-center gap-4 ${bgClass}`}
                                          >
                                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black flex-shrink-0 ${questionSubmitted && isCorrect ? 'border-green-600 text-green-700 bg-white' : questionSubmitted && isSelected ? 'border-red-500 text-red-600 bg-white' : isSelected ? 'border-blue-600 text-blue-600 bg-white' : 'border-gray-300 text-gray-400'}`}>
                                                 {questionSubmitted && isCorrect ? <CheckCircle2 size={16}/> : questionSubmitted && isSelected ? <X size={16}/> : idx + 1}
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
                                    value={answers[currentIdx] || ""}
                                    onChange={e => setAnswers({ ...answers, [currentIdx]: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !questionSubmitted && answers[currentIdx]) {
                                            setQuestionSubmitted(true);
                                        }
                                    }}
                                    placeholder="Nhập đáp án của bạn..."
                                    className={`w-full text-3xl font-black text-center p-8 border-b-4 rounded-3xl outline-none transition-all shadow-sm ${questionSubmitted ? (answers[currentIdx]?.toLowerCase().trim() === q.answer.toLowerCase() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-300 bg-gray-50 focus:border-blue-500 focus:bg-white focus:shadow-xl"}`}
                                    disabled={questionSubmitted}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex-1"></div>

                            <div className={`fixed bottom-0 left-0 right-0 border-t-2 sm:px-12 p-6 transition-colors duration-300 ${questionSubmitted ? (String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200") : "bg-white border-gray-100"}`}>
                                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
                                    <div className="flex-1 w-full">
                                        {questionSubmitted && (
                                            <div className="flex items-center gap-5 flex-1 w-full animate-in slide-in-from-left-4">
                                                <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? 'bg-white text-green-500' : 'bg-white text-red-500'}`}>
                                                  {String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? <CheckCircle2 size={40} /> : <X size={40} />}
                                                </div>
                                                <div>
                                                  <h3 className={`font-black text-2xl ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "text-green-800" : "text-red-800"}`}>
                                                    {String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "Tuyệt vời!" : "Sai rồi!"}
                                                  </h3>
                                                  <p className={`font-bold mt-1 text-lg ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "text-green-700" : "text-red-700"}`}>
                                                     Đáp án: <span className="underline decoration-4 underline-offset-4">{q.answer}</span>
                                                  </p>
                                                  {q.explanation && <p className="text-sm mt-2 opacity-80 text-gray-800 max-w-xl">{q.explanation}</p>}
                                                </div>
                                             </div>
                                        )}
                                    </div>
                                    <div className="w-full sm:w-auto flex-shrink-0">
                                        {!questionSubmitted ? (
                                            <button 
                                              onClick={() => setQuestionSubmitted(true)} 
                                              disabled={!answers[currentIdx]} 
                                              className="w-full sm:w-auto px-12 py-5 rounded-2xl font-black text-xl text-white bg-blue-500 hover:bg-blue-600 shadow-[0_6px_0_0_#2563ea] active:shadow-[0_0px_0_0_#2563ea] active:translate-y-[6px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-[6px] disabled:bg-gray-300 uppercase tracking-widest"
                                            >Kiểm tra</button>
                                        ) : (
                                            <button 
                                              onClick={() => {
                                                  if (currentIdx < questions.length - 1) {
                                                      setCurrentIdx(currentIdx + 1);
                                                      setQuestionSubmitted(false);
                                                  } else {
                                                      submitPractice();
                                                  }
                                              }} 
                                              className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-xl text-white shadow-[0_6px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[6px] transition-all uppercase tracking-widest ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "bg-green-600" : "bg-red-600"}`}
                                            >{currentIdx < questions.length - 1 ? "Tiếp tục" : "Xem kết quả"} <ArrowRight size={24} className="inline ml-2 -mt-1" /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })() : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
                        <div className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-lg w-full transform animate-in zoom-in-95 duration-500">
                            <Trophy size={80} className="mx-auto mb-6 text-yellow-400 drop-shadow-md" />
                            <h3 className="text-4xl font-extrabold mb-3 text-gray-900">Hoàn thành!</h3>
                            <div className="bg-blue-50 rounded-2xl py-6 my-6 border border-blue-100">
                                <p className="text-blue-500 font-bold uppercase tracking-widest text-sm mb-1">Điểm số của bạn</p>
                                <p className="text-5xl font-black text-blue-600">{score} <span className="text-3xl text-blue-400">/ {questions.length}</span></p>
                            </div>
                            <button onClick={() => setPracticing(false)} className="w-full bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg text-lg">Trở về Trang chủ</button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    );
  }

  if (selectedRule) {
      const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
      return (
          <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <BookText className="mr-3 text-teal-600" /> {selectedRule.name}
                  </h2>
                  <button onClick={() => setSelectedRule(null)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 font-medium bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                      <ChevronLeft size={16} /> Quay lại
                  </button>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm leading-relaxed text-gray-700 whitespace-pre-wrap text-[15px]">
                  {selectedRule.description ? renderValue(selectedRule.description) : <span className="opacity-50">Không có mô tả chi tiết.</span>}
              </div>

              {selectedRule.file_name && (
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm">
                      <div>
                          <h3 className="font-bold text-blue-900 mb-1 flex items-center">
                              <FileText className="mr-2" size={18} /> Tài liệu đính kèm
                          </h3>
                          <p className="text-sm text-blue-700 opacity-90">{selectedRule.file_name}</p>
                      </div>
                      <a 
                          href={`${API_URL}/${prefix}/grammar/${selectedRule.id}/file`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-white text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all duration-300"
                      >
                          Tải xuống
                      </a>
                  </div>
              )}
          </div>
      )
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center"><BookText className="mr-2 text-teal-600" /> Kho Ngữ Pháp</h2>
            <p className="text-gray-500 text-sm">Nhấp vào một cấu trúc để đọc mô tả, hoặc tích chọn để tạo bài luyện tập AI.</p>
        </div>
        <div className="flex items-center gap-3">
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none font-medium focus:ring-2 focus:ring-blue-500 transition-shadow">
                <option value="Easy">Dễ (A1-A2)</option>
                <option value="Medium">Trung bình (B1-B2)</option>
                <option value="Hard">Khó (C1-C2)</option>
            </select>
            <button 
                onClick={startPractice}
                disabled={selectedRules.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                <Sparkles size={18} /> Học với AI
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-6 text-gray-800 flex justify-between items-center">
            Danh sách Ngữ pháp
            <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-500 rounded-full">Đã chọn: {selectedRules.length}</span>
        </h3>
        {loading ? <p className="text-gray-400 text-sm">Đang tải...</p> : rules.length === 0 ? <p className="text-gray-400 text-sm">Chưa có tài liệu ngữ pháp nào.</p> : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rules.map((r: any) => {
              const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
              const isSelected = selectedRules.includes(r.id);
              return (
                <li key={r.id} 
                    onClick={() => setSelectedRule(r)}
                    className={`p-1 rounded-2xl border transition-all duration-300 cursor-pointer ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-blue-300 shadow-sm'}`}
                >
                  <div className="flex items-start p-4">
                    <div className="mr-4 mt-1" onClick={(e) => { e.stopPropagation(); toggleRule(r.id); }}>
                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors cursor-pointer ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white hover:border-blue-400'}`}>
                            {isSelected && <CheckCircle2 size={16} />}
                        </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-lg group-hover:text-blue-700 transition-colors mb-2">{r.name}</h4>
                      {r.description && <p className="text-sm line-clamp-2 text-gray-500 leading-relaxed">{renderValue(r.description)}</p>}
                      
                      <div className="flex justify-between items-center mt-3">
                        {r.file_name ? (
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-flex items-center">
                                <FileText size={12} className="mr-1" /> Có tài liệu đính kèm
                            </span>
                        ) : <span></span>}
                        <span className="text-xs font-medium text-blue-600 hover:text-blue-800 transition flex items-center opacity-0 group-hover:opacity-100">
                            Đọc chi tiết <ChevronRight size={14} className="ml-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
