"use client";
import React, { useState, useEffect } from "react";
import { 
  BookText, Sparkles, CheckCircle2, FileText, ChevronRight, Trophy 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface GrammarTabProps {
  API_URL: string;
}

export default function GrammarTab({ API_URL }: GrammarTabProps) {
  const { authFetch, refreshUser } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [practicing, setPracticing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
      const res = await authFetch(`${API_URL}/${prefix}/grammar`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch { }
    finally { setLoading(false); }
  };

  const toggleRule = (id: number) => {
    setSelectedRules(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const startPractice = async () => {
    if (selectedRules.length === 0) return alert("Chọn ít nhất 1 cấu trúc!");
    setPracticing(true);
    setSubmitted(false);
    setAnswers({});
    try {
      const res = await authFetch(`${API_URL}/student/grammar/practice`, {
        method: "POST",
        body: JSON.stringify({ rule_ids: selectedRules, difficulty })
      });
      if (res.ok) {
        const data = await res.json();
        refreshUser();
        setQuestions(data.questions || []);
      }
    } catch (e) { console.error(e); }
  };

  const submitPractice = () => {
    let s = 0;
    questions.forEach((q, i) => {
        if (answers[i] === q.answer) s++;
    });
    setScore(s);
    setSubmitted(true);
  };

  useEffect(() => { fetchRules(); }, []);

  if (practicing) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Luyện tập Ngữ pháp</h2>
          <button onClick={() => setPracticing(false)} className="text-gray-500 hover:text-red-600">Thoát</button>
        </div>
        {questions.length === 0 ? <p className="text-center py-10">Đang chuẩn bị bài tập với AI...</p> : (
            <div className="space-y-6">
                {questions.map((q, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="font-bold mb-4">Câu {i+1}: {q.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options?.map((opt, idx) => (
                                <button key={idx} 
                                    onClick={() => !submitted && setAnswers({...answers, [i]: opt})}
                                    className={`p-3 rounded-lg border text-left transition ${answers[i] === opt ? 'bg-blue-50 border-blue-400' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        {submitted && (
                            <div className={`mt-4 p-3 rounded-lg ${answers[i] === q.answer ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                <p className="font-bold">{answers[i] === q.answer ? 'Chính xác!' : `Sai rồi! Đáp án đúng: ${q.answer}`}</p>
                                <p className="text-sm mt-1">{q.explanation_vn}</p>
                            </div>
                        )}
                    </div>
                ))}
                {!submitted ? (
                    <button onClick={submitPractice} className="w-full btn-primary py-3 rounded-xl font-bold">Nộp bài</button>
                ) : (
                    <div className="bg-blue-600 text-white p-8 rounded-2xl text-center shadow-lg">
                        <Trophy size={48} className="mx-auto mb-4 text-yellow-300" />
                        <h3 className="text-3xl font-extrabold mb-2">Kết quả: {score}/{questions.length}</h3>
                        <p className="mb-6 opacity-90">Bạn đã hoàn thành bài luyện tập ngữ pháp với AI!</p>
                        <button onClick={() => setPracticing(false)} className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition">Quay lại Kho ngữ pháp</button>
                    </div>
                )}
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center"><BookText className="mr-2 text-teal-600" /> Kho Ngữ Pháp</h2>
            <p className="text-gray-500 text-sm">Chọn cấu trúc để bắt đầu luyện tập thông minh với AI.</p>
        </div>
        <div className="flex items-center gap-3">
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="bg-white border rounded-lg px-3 py-2 outline-none">
                <option value="Easy">Dễ (A1-A2)</option>
                <option value="Medium">Trung bình (B1-B2)</option>
                <option value="Hard">Khó (C1-C2)</option>
            </select>
            <button 
                onClick={startPractice}
                disabled={selectedRules.length === 0}
                className="btn-primary py-2 px-6 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 transition"
            >
                <Sparkles size={18} /> Học với AI
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-4 flex justify-between items-center">
            Danh sách Ngữ pháp
            <span className="text-xs text-gray-400 font-normal">Đã chọn: {selectedRules.length}</span>
        </h3>
        {loading ? <p className="text-gray-400 text-sm">Đang tải...</p> : rules.length === 0 ? <p className="text-gray-400 text-sm">Chưa có tài liệu ngữ pháp nào.</p> : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rules.map((r: any) => {
              const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
              const isSelected = selectedRules.includes(r.id);
              return (
                <li key={r.id} 
                    onClick={() => toggleRule(r.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${isSelected ? 'border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-500/20 translate-y-[-2px]' : 'border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm'}`}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-bold text-lg ${isSelected ? 'text-teal-700' : 'text-gray-800'}`}>{r.name}</h4>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-300'}`}>
                              {isSelected && <CheckCircle2 size={12} />}
                          </div>
                      </div>
                      {r.description && <p className={`text-sm mt-2 line-clamp-3 ${isSelected ? 'text-teal-600' : 'text-gray-500'}`}>{r.description}</p>}
                    </div>
                    {r.file_name && (
                      <div className="mt-4 pt-4 border-t border-gray-200/50 flex justify-between items-center">
                        <a href={`${API_URL}/${prefix}/grammar/${r.id}/file`} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 transition"
                        >
                          <FileText size={14} className="mr-2" />
                          {r.file_name}
                        </a>
                        <ChevronRight size={16} className={isSelected ? 'text-teal-500' : 'text-gray-300'} />
                      </div>
                    )}
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
