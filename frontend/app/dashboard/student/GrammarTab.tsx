"use client";
import React, { useState, useEffect } from "react";
import { 
  BookText, FileText, ChevronLeft, ChevronRight, 
  CheckCircle2, Sparkles, Trophy, X, ArrowRight,
  GraduationCap, Layout, BookOpen
} from "lucide-react";
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

  // Paginated UI states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);

  // Markdown-to-HTML parser helper
  const parseMarkdown = (text: string) => {
    if (!text) return "";
    
    // Check if it's already HTML (contains common tags)
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    
    // More robust Markdown to HTML conversion
    return text
      .replace(/###\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h3>$1</h3>')
      .replace(/##\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h2>$1</h2>')
      .replace(/#\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/__(.*?)__/g, '<u>$1</u>') // Support __underline__
      .replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>') // Support 1. list
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\|/g, '<span class="mx-2 opacity-30">|</span>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  // Helper to get clean plain text for card previews
  const stripHtml = (html: string) => {
    if (!html) return "";
    // Remove HTML tags
    let doc = html.replace(/<[^>]+>/g, ' ');
    // Remove Markdown markers # and *
    doc = doc.replace(/[#*`_]/g, '');
    // Clean up multiple spaces
    return doc.replace(/\s+/g, ' ').trim();
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
      <div className="space-y-6 animate-in fade-in duration-300 min-h-[80vh] flex flex-col items-center justify-center">
        {questions.length === 0 ? (
          <div className="bg-white rounded-[40px] p-12 md:p-20 shadow-2xl border border-gray-100 flex flex-col items-center justify-center max-w-2xl w-full text-center">
            <div className="relative mb-10">
                <div className="w-24 h-24 border-[6px] border-teal-100 border-t-teal-600 rounded-full animate-spin"></div>
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-600" size={32} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Đang phân tích cấu trúc...</h3>
            <p className="text-gray-500 font-bold text-lg leading-relaxed">AI đang tổng hợp dữ liệu và thiết kế bài tập cá nhân hóa cho bạn. Đợi chút nhé!</p>
          </div>
        ) : (
            <div className="fixed inset-0 z-[150] flex flex-col bg-white overflow-y-auto animate-in fade-in duration-500">
                <div className="sticky top-0 bg-white/90 backdrop-blur-xl z-10 px-8 py-6 flex items-center gap-8 border-b border-gray-100">
                    <button onClick={() => setPracticing(false)} className="bg-gray-50 p-3 rounded-2xl text-gray-400 hover:text-gray-900 transition-all hover:bg-white hover:shadow-md"><X size={24} /></button>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-400 to-blue-500 transition-all duration-700 rounded-full" 
                          style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
                        />
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
                                {q.type === 'FIB' ? 'Điền vào chỗ trống' : q.type === 'TFNG' ? 'Đúng / Sai / Không có' : q.type === 'MATCH' ? 'Ghép nối' : 'Chọn đáp án đúng'}
                              </span>
                              
                              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-[1.2] max-w-3xl mx-auto">
                                {q.question}
                              </h2>
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
                                          <button 
                                              key={idx} 
                                              disabled={questionSubmitted}
                                              onClick={() => setAnswers({...answers, [currentIdx]: opt})}
                                              className={`p-8 rounded-[32px] border-2 text-left transition-all duration-300 font-black text-lg md:text-xl flex items-center gap-6 ${bgClass}`}
                                          >
                                              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black flex-shrink-0 transition-all ${questionSubmitted && isCorrect ? 'border-green-600 text-green-700 bg-white scale-110' : questionSubmitted && isSelected ? 'border-red-500 text-red-600 bg-white' : isSelected ? 'border-teal-600 text-teal-600 bg-white' : 'border-gray-200 text-gray-400'}`}>
                                                 {questionSubmitted && isCorrect ? <CheckCircle2 size={24}/> : questionSubmitted && isSelected ? <X size={24}/> : String.fromCharCode(65 + idx)}
                                              </div>
                                              <span className="flex-1">{opt}</span>
                                          </button>
                                      );
                                  })}
                                </div>
                              ) : (
                                <div className="relative max-w-xl mx-auto">
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
                                                <div className={`w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xl transform rotate-12 ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? 'bg-white text-green-500' : 'bg-white text-red-500'}`}>
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
                                            <button 
                                              onClick={() => setQuestionSubmitted(true)} 
                                              disabled={!answers[currentIdx]} 
                                              className="w-full sm:w-auto px-16 py-6 rounded-[28px] font-black text-2xl text-white bg-teal-600 hover:bg-teal-700 shadow-[0_8px_0_0_#0d9488] active:shadow-none active:translate-y-[8px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-[8px] disabled:bg-gray-300 uppercase tracking-widest"
                                            >Kiểm tra ngay</button>
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
                                              className={`w-full sm:w-auto px-14 py-6 rounded-[28px] font-black text-2xl text-white shadow-[0_8px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[8px] transition-all uppercase tracking-widest flex items-center justify-center gap-3 ${String(answers[currentIdx] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? "bg-green-600" : "bg-red-600"}`}
                                            >
                                                {currentIdx < questions.length - 1 ? "Tiếp tục" : "Kết thúc"} 
                                                <ArrowRight size={28} />
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
                            <p className="text-gray-400 font-bold mb-10 text-lg uppercase tracking-widest">Bạn đã vượt qua thử thách này</p>
                            
                            <div className="bg-teal-50 rounded-[40px] py-10 my-10 border-2 border-teal-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <p className="text-teal-600 font-black uppercase tracking-[0.3em] text-sm mb-2 relative z-10">Kết quả đạt được</p>
                                <p className="text-7xl font-black text-teal-700 relative z-10 flex items-center justify-center gap-4">
                                    {score} 
                                    <span className="text-4xl text-teal-300">/ {questions.length}</span>
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => setPracticing(false)} 
                                className="w-full bg-gray-900 text-white px-10 py-6 rounded-[32px] font-black hover:bg-black transition-all shadow-xl hover:shadow-gray-200 text-xl active:scale-95"
                            >
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

  if (selectedRule) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
              {/* Detail Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl">
                  <div className="flex items-center gap-6">
                      <div className="bg-teal-50 p-4 rounded-[24px]">
                          <BookOpen className="text-teal-600" size={40} />
                      </div>
                      <div>
                          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                              {selectedRule.name}
                          </h2>
                          <div className="flex items-center gap-4 mt-2">
                             <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Chi tiết cấu trúc</span>
                             <div className="h-1.5 w-1.5 rounded-full bg-teal-400"></div>
                             <span className="text-xs font-black text-gray-400">{new Date(selectedRule.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                      </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRule(null)} 
                    className="group bg-gray-50 hover:bg-gray-900 text-gray-500 hover:text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 transition-all active:scale-95 shadow-sm"
                  >
                      <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
                      Quay lại
                  </button>
              </div>

              {/* Detail Content Area */}
              <div className="bg-white p-10 md:p-16 rounded-[48px] border border-gray-100 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/30 rounded-full blur-[100px] -mr-32 -mt-32 transition-colors group-hover:bg-teal-100/40"></div>
                  
                  <div 
                    className="relative z-10 rich-text max-w-none"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedRule.description) || "<p class='opacity-50 italic font-bold'>Chủ đề này chưa có nội dung mô tả.</p>" }}
                  />
              </div>

              {/* Attachment Display */}
              {selectedRule.file_name && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 md:p-12 rounded-[48px] border-2 border-dashed border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-inner">
                      <div className="flex items-center gap-6">
                          <div className="bg-white p-5 rounded-[28px] shadow-lg text-indigo-500">
                             <FileText size={42} />
                          </div>
                          <div>
                              <h3 className="font-black text-indigo-900 text-2xl mb-2 flex items-center">
                                  Tài liệu học tập đính kèm
                              </h3>
                              <p className="text-lg text-indigo-600 font-bold opacity-80 truncate max-w-xs md:max-w-md">{selectedRule.file_name}</p>
                          </div>
                      </div>
                      <a 
                          href={`${API_URL}/student/grammar/${selectedRule.id}/file`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full md:w-auto bg-white text-indigo-600 hover:bg-gray-900 hover:text-white px-12 py-5 rounded-[28px] font-black shadow-xl hover:shadow-indigo-200 transition-all text-xl active:scale-95 flex items-center justify-center gap-3"
                      >
                          Tải về để học <ArrowRight size={24} />
                      </a>
                  </div>
              )}
          </div>
      )
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* List Header */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8 mb-10 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -ml-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="bg-blue-50 p-4 rounded-[24px]">
                <Layout className="text-blue-600" size={40} />
            </div>
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                   Kho Ngữ Pháp 
                   <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-black uppercase tracking-widest">{rules.length} Chủ đề</span>
                </h2>
                <p className="text-gray-400 font-bold text-lg mt-1 italic leading-tight">Khám phá cấu trúc ngữ pháp và luyện tập với AI.</p>
            </div>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <select 
              value={difficulty} 
              onChange={e => setDifficulty(e.target.value)} 
              className="w-full sm:w-auto bg-gray-50 border-2 border-gray-100 text-gray-700 text-lg rounded-2xl px-6 py-4 outline-none font-black focus:border-blue-500 transition-all shadow-inner"
            >
                <option value="Easy">Cơ bản (A1-A2)</option>
                <option value="Medium">Trung cấp (B1-B2)</option>
                <option value="Hard">Nâng cao (C1-C2)</option>
            </select>
            <button 
                onClick={startPractice}
                disabled={selectedRules.length === 0}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-[28px] flex items-center justify-center gap-3 shadow-xl shadow-blue-100 disabled:opacity-40 disabled:grayscale disabled:shadow-none transition-all active:scale-95 group"
            >
                <Sparkles size={24} className="group-hover:rotate-12 transition-transform" /> 
                Học với AI 
                {selectedRules.length > 0 && <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-xs tracking-tighter">({selectedRules.length})</span>}
            </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-2xl">
        <h3 className="text-2xl font-black mb-10 text-gray-900 flex justify-between items-center tracking-tight">
            Tất cả chủ đề
            <div className="flex items-center gap-3">
                <span className="text-xs font-black px-4 py-2 bg-gray-50 text-gray-400 rounded-full uppercase tracking-widest border border-gray-100">
                    Đã chọn: {selectedRules.length}
                </span>
                {selectedRules.length > 0 && (
                    <button onClick={() => setSelectedRules([])} className="text-xs font-black text-rose-500 hover:underline">Bỏ chọn tất cả</button>
                )}
            </div>
        </h3>

        {loading ? (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-40 bg-gray-50 rounded-[32px] animate-pulse"></div>
              ))}
           </div>
        ) : rules.length === 0 ? (
          <div className="py-20 text-center">
             <BookText size={80} className="mx-auto text-gray-100 mb-6" />
             <p className="text-gray-400 font-bold text-xl uppercase tracking-widest">Kho ngữ pháp đang được cập nhật</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rules.map((r: any) => {
              const isSelected = selectedRules.includes(r.id);
              return (
                <li key={r.id} 
                    onClick={() => setSelectedRule(r)}
                    className={`group relative overflow-hidden p-1 rounded-[36px] transition-all duration-500 cursor-pointer ${isSelected ? 'bg-gradient-to-br from-blue-400 to-blue-600 scale-[1.02] shadow-2xl shadow-blue-200' : 'bg-gray-100 hover:bg-gray-200 shadow-sm'}`}
                >
                  <div className={`flex flex-col h-full bg-white p-8 rounded-[34px] transition-colors ${isSelected ? 'bg-white/95' : 'hover:bg-gray-50/50'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h4 className={`font-black text-2xl tracking-tight leading-tight transition-colors ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{r.name}</h4>
                        </div>
                        <div 
                          className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ml-4 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-gray-200 bg-white group-hover:border-blue-400'}`}
                          onClick={(e) => { e.stopPropagation(); toggleRule(r.id); }}
                        >
                            {isSelected && <CheckCircle2 size={18} />}
                        </div>
                    </div>

                    <div 
                        className="text-gray-500 font-bold line-clamp-2 leading-relaxed mb-6 flex-1 text-sm bg-gray-50/30 rounded-2xl p-4 border border-gray-50 group-hover:border-blue-100 transition-colors"
                    >
                        {stripHtml(r.description) || "Chưa có nội dung mô tả."}
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-3">
                         {r.file_name && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-indigo-100">
                                <FileText size={12} /> FILE
                            </span>
                         )}
                         <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`}>
                          Chi tiết <ChevronRight size={14} />
                      </span>
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

