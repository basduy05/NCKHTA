"use client";
import React, { useState, useEffect } from "react";
import { BookText, FileText, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Trophy } from "lucide-react";
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
    setAnswers({});
    setQuestions([]);
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
          <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">AI đang tạo bài tập cho bạn, vui lòng đợi giây lát...</p>
          </div>
        ) : (
            <div className="space-y-6">
                {questions.map((q, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="font-bold text-gray-800 mb-4">Câu {i+1}: {q.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options?.map((opt: string, idx: number) => (
                                <button key={idx} 
                                    onClick={() => !submitted && setAnswers({...answers, [i]: opt})}
                                    className={`p-3 rounded-lg border text-left transition-all ${answers[i] === opt ? 'bg-blue-50 border-blue-400 font-medium text-blue-800' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        {submitted && (
                            <div className={`mt-4 p-4 rounded-xl shadow-sm border ${String(answers[i] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                <p className="font-bold flex items-center">
                                    {String(answers[i] || "").toLowerCase().trim() === String(q.answer || "").toLowerCase().trim() ? <><CheckCircle2 className="mr-2" size={18} /> Chính xác!</> : `Sai rồi! Đáp án đúng: ${q.answer}`}
                                </p>
                                <p className="text-sm mt-2 opacity-90">{q.explanation_vn}</p>
                            </div>
                        )}
                    </div>
                ))}
                {!submitted ? (
                    <button onClick={submitPractice} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-colors py-3.5 rounded-xl font-bold text-lg">Nộp bài</button>
                ) : (
                    <div className="bg-blue-600 text-white p-8 rounded-2xl text-center shadow-lg">
                        <Trophy size={48} className="mx-auto mb-4 text-emerald-300" />
                        <h3 className="text-3xl font-extrabold mb-2">Kết quả: {score}/{questions.length}</h3>
                        <p className="mb-6 opacity-90">Bạn đã hoàn thành bài luyện tập ngữ pháp với AI!</p>
                        <button onClick={() => setPracticing(false)} className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm">Quay lại Kho ngữ pháp</button>
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
