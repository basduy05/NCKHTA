"use client";
import React, { useState } from "react";
import { 
  Award, Mic, Trophy 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MOCK_PRACTICE_TESTS } from "../../components/MockPracticeData";

interface PracticeTabProps {
  API_URL: string;
  setShowCreditModal: (s: boolean) => void;
}

export default function PracticeTab({ API_URL, setShowCreditModal }: PracticeTabProps) {
  const { user, authFetch, refreshUser } = useAuth();
  const [testType, setTestType] = useState("TOEIC");
  const [skill, setSkill] = useState("reading");
  const [loading, setLoading] = useState(false);
  const [practice, setPractice] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [source, setSource] = useState<"ai" | "official">("ai");
  const [streamingText, setStreamingText] = useState("");

  const generatePractice = async () => {
    if (source === "official") {
      const filtered = MOCK_PRACTICE_TESTS.filter(t => t.test_type === testType && t.skill === skill);
      if (filtered.length > 0) {
        setPractice(filtered[0]);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
      } else {
        alert("Hiện chưa có bài thi mẫu cho sự kết hợp này. Vui lòng thử AI Generator.");
      }
      return;
    }

    if (user && user.credits_ai !== undefined && user.credits_ai <= 0) {
      setShowCreditModal(true);
      return;
    }

    setLoading(true);
    setStreamingText("");
    setPractice({ status: "generating", questions: [] });
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    try {
      const endpoint =
        skill === "reading" ? "/student/reading/generate" :
          skill === "writing" ? "/student/writing/evaluate" :
            skill === "speaking" ? "/student/speaking/topic" :
              "/student/practice/generate";

      const body = skill === "reading" ? { level: "B1" } :
        skill === "speaking" ? { level: "B1", topic_type: "general" } :
          { test_type: testType, skill };

      if (skill === "writing") {
        alert("Vui lòng sử dụng tính năng nộp bài viết (chưa implement trong demo này)");
        setLoading(false);
        return;
      }

      const res = await authFetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error("API Error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let finalData: any = { questions: [] };

      while (reader && !done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          buffer += chunkStr;
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            let rawJson = line.trim();
            if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
            if (rawJson === "[DONE]" || !rawJson) continue;

            try {
              const chunkData = JSON.parse(rawJson);
              if (chunkData.status === "generating") {
                setStreamingText(prev => (prev + (chunkData.chunk || "")).slice(-500));
              } else if (chunkData.status === "success" || !chunkData.status) {
                finalData = { ...finalData, ...chunkData };
              }
            } catch (e) { }
          }
        }
      }
      refreshUser();
      setPractice(finalData);
    } catch (e) {
      alert("Lỗi khi tạo bài luyện tập");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = () => {
    if (Object.keys(answers).length === 0) {
      alert("Vui lòng trả lời ít nhất một câu hỏi!");
      return;
    }
    let correct = 0;
    practice.questions?.forEach((q: any, idx: number) => {
      if (answers[idx] === q.correct_answer || answers[idx] === q.ans) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Award className="text-purple-500" /> Tự luyện thi
            </h2>
            <p className="text-gray-500 text-sm">chọn chứng chỉ và kỹ năng để hệ thống sinh đề thi mẫu cho bạn</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={source} onChange={e => setSource(e.target.value as any)} className="border border-indigo-200 rounded-lg px-3 py-2 outline-none bg-indigo-50 text-indigo-700 font-bold">
              <option value="ai">AI Generator ✨</option>
              <option value="official">Bài thi mẫu 📚</option>
            </select>
            <select value={testType} onChange={e => setTestType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 outline-none bg-gray-50">
              <option value="TOEIC">TOEIC</option>
              <option value="IELTS">IELTS</option>
              <option value="GENERAL">Tiếng Anh Giao tiếp</option>
            </select>
            <select value={skill} onChange={e => setSkill(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 outline-none bg-gray-50">
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>
            <button onClick={generatePractice} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:opacity-50 font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition">
              {loading ? "Đang tạo..." : (source === "official" ? "Xem bài thi" : "Tạo bài với AI")}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-2xl overflow-hidden relative group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <h3 className="text-emerald-500 font-mono text-xs font-bold uppercase tracking-widest">AI Terminal Output</h3>
            </div>
            <span className="text-slate-500 font-mono text-[10px] animate-pulse">RECEPTION: CHUNKING...</span>
          </div>
          <div className="font-mono text-sm text-slate-300 h-32 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none z-10"></div>
            <p className="whitespace-pre-wrap break-all opacity-80 leading-relaxed">
              {streamingText || "Establishing secure connection to Lexicon LLM...\nWaiting for first data chunk..."}
            </p>
          </div>
          <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-600 font-mono uppercase">Lexicon-V4-Stream ⚡</div>
        </div>
      )}

      {practice && skill === "reading" && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-bold mb-4">{practice.title || "Bài đọc hiểu"}</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-6 whitespace-pre-wrap leading-relaxed">
            {practice.passage}
          </div>

          <h4 className="font-bold text-lg mb-4">Câu hỏi:</h4>
          <div className="space-y-6">
            {practice.questions?.map((q: any, idx: number) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4">
                <p className="font-bold mb-3">{idx + 1}. {q.question || q.q}</p>
                <div className="space-y-2 pl-4">
                  {q.options?.map((opt: string, oIdx: number) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q-${idx}`}
                        id={`q-${idx}-${oIdx}`}
                        checked={answers[idx] === oIdx}
                        onChange={() => setAnswers({...answers, [idx]: oIdx})}
                        disabled={submitted}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor={`q-${idx}-${oIdx}`} className={submitted ? (oIdx === q.correct_answer || oIdx === q.ans ? "text-green-700 font-medium" : answers[idx] === oIdx ? "text-red-700" : "") : ""}>
                        {opt}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {practice && skill === "speaking" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="inline-block p-4 bg-purple-100 text-purple-700 rounded-full mb-4">
            <Mic size={48} />
          </div>
          <h3 className="font-bold text-2xl mb-2">{practice.topic || practice.title || "Chủ đề Speaking"}</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">{practice.description || practice.instructions || "Hãy nói về chủ đề này trong vòng 2 phút."}</p>

          <div className="bg-gray-50 p-4 rounded-xl max-w-2xl mx-auto text-left mb-6">
            <h4 className="font-bold text-gray-800 mb-2">Gợi ý trả lời:</h4>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              {practice.prompts?.map((p: string, i: number) => <li key={i}>{p}</li>)}
            </ul>
          </div>

          <button className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 mx-auto hover:bg-red-100 transition">
            <Mic size={20} /> Bắt đầu ghi âm (Giả lập)
          </button>
        </div>
      )}

      {practice && (skill === "listening" || (skill !== "reading" && skill !== "speaking")) && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900">{practice.title || `${testType} ${skill.toUpperCase()} Practice`}</h3>
              {skill === "listening" && (
                  <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full border border-amber-100 text-sm font-bold animate-pulse">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      AUDIO GENERATING...
                  </div>
              )}
          </div>
          
          {practice.passage && (
            <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-100 italic text-gray-700 leading-relaxed shadow-inner">
              {practice.passage}
            </div>
          )}

          <div className="space-y-8">
            {practice.questions?.map((q: any, idx: number) => (
              <div key={idx} className={`rounded-2xl p-6 transition-all duration-300 border-2 ${submitted ? (answers[idx] === q.correct_answer ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30') : 'border-gray-50 hover:border-blue-100 bg-white shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 shadow-lg">
                        {idx + 1}
                    </div>
                    <div className="flex-1">
                        <p className="font-extrabold text-lg text-slate-800 mb-6 leading-snug">{q.question || q.q}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options?.map((opt: string, oIdx: number) => {
                            const optChar = String.fromCharCode(65 + oIdx);
                            const isCorrect = optChar === q.correct_answer || opt === q.correct_answer || oIdx === q.ans;
                            const isSelected = answers[idx] === oIdx;
                            
                            let btnCls = "border-gray-100 bg-white hover:border-blue-400 hover:bg-blue-50";
                            if (submitted) {
                                if (isCorrect) btnCls = "border-green-500 bg-green-100 text-green-800 ring-4 ring-green-500/10";
                                else if (isSelected) btnCls = "border-red-500 bg-red-100 text-red-800";
                                else btnCls = "opacity-40 border-gray-100";
                            } else if (isSelected) {
                                btnCls = "border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10";
                            }

                            return (
                                <button key={oIdx} 
                                    disabled={submitted}
                                    onClick={() => setAnswers({...answers, [idx]: oIdx})}
                                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 group ${btnCls}`}
                                >
                                    <span className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700'}`}>
                                        {optChar}
                                    </span>
                                    <span className="font-bold">{opt}</span>
                                </button>
                            );
                        })}
                        </div>

                        {submitted && (
                            <div className={`mt-6 p-4 rounded-xl border ${answers[idx] === q.correct_answer ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                <p className="font-black flex items-center gap-2 mb-1">
                                    {answers[idx] === q.correct_answer ? '✨ CHÍNH XÁC!' : '❌ CHƯA ĐÚNG!'}
                                </p>
                                <p className="text-sm leading-relaxed opacity-90">{q.explanation || "Giải thích đang được AI cập nhật..."}</p>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            ))}
          </div>
          
          {!submitted && practice.questions?.length > 0 && (
              <button 
                  onClick={() => {
                        let s = 0;
                        practice.questions.forEach((q: any, i: number) => {
                            const optChar = String.fromCharCode(65 + answers[i]);
                            if (optChar === q.correct_answer || answers[i] === q.ans || practice.questions[i].options[answers[i]] === q.correct_answer) s++;
                        });
                        setScore(s);
                        setSubmitted(true);
                  }}
                  className="w-full mt-10 bg-slate-900 text-white py-5 rounded-2xl font-black text-xl shadow-2xl hover:bg-black transition-all transform active:scale-95"
              >
                  NỘP BÀI VÀ XEM KẾT QUẢ
              </button>
          )}

          {submitted && (
              <div className="mt-12 bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[2rem] text-center text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                      <Trophy size={64} className="mx-auto mb-4 text-yellow-300 animate-bounce" />
                      <h3 className="text-3xl font-black mb-2">Kết quả: {score}/{practice.questions?.length}</h3>
                      <p className="text-blue-100 mb-8 font-medium">Tuyệt vời! Bạn đang tiến bộ rất nhanh.</p>
                      <button onClick={() => setPractice(null)} className="bg-white text-blue-600 px-10 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all">Luyện tập bài khác</button>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              </div>
          )}
        </div>
      )}

      {practice && skill === "writing" && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-black mb-6 text-slate-800 border-b pb-4 flex items-center gap-3">
                <Award className="text-blue-600" /> Writing Task: {practice.title || "Essay Preparation"}
            </h3>
            
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
                <h4 className="font-black text-blue-800 mb-3 uppercase tracking-wider text-xs">Prompt / Question</h4>
                <p className="text-slate-700 font-medium leading-relaxed italic">{practice.passage || practice.prompt || "Please write an essay discussed in the context below."}</p>
            </div>

            <textarea 
                className="w-full h-80 p-6 border-2 border-gray-100 rounded-3xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-serif text-lg leading-relaxed shadow-inner bg-gray-50/30"
                placeholder="Start writing your essay here... (Word count will be analyzed by AI)"
            />
            
            <div className="mt-8 flex justify-between items-center text-sm font-bold text-gray-400">
                <div className="flex gap-4">
                    <span>Words: 0</span>
                    <span>Estimated Score: N/A</span>
                </div>
                <button className="btn-primary px-8 py-3 rounded-xl shadow-xl hover:shadow-2xl transition transform active:scale-95">
                    Nộp bài chấm điểm AI
                </button>
            </div>
        </div>
      )}

      {!practice && !loading && (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Award size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Chọn loại bài luyện tập</h3>
          <p className="text-gray-500">Chọn chứng chỉ và kỹ năng ở trên để bắt đầu luyện tập.</p>
        </div>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <Trophy size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-green-800 mb-2">Kết quả: {score}/{practice?.questions?.length || 0}</h3>
          <p className="text-green-600 mb-4">
            {score === (practice?.questions?.length || 0) ? "Xuất sắc! 🎉" :
             score >= (practice?.questions?.length || 0) * 0.8 ? "Tốt! 👍" :
             score >= (practice?.questions?.length || 0) * 0.6 ? "Khá! 👌" : "Cần luyện tập thêm! 💪"}
          </p>
          <button onClick={() => { setPractice(null); setAnswers({}); setSubmitted(false); setScore(0); }} className="btn-primary px-6 py-2 rounded-lg">
            Làm bài khác
          </button>
        </div>
      )}

      {!submitted && practice && skill === "reading" && practice.questions?.length > 0 && (
        <div className="text-center pt-4">
          <button onClick={submitAnswers} disabled={Object.keys(answers).length === 0} className="btn-primary px-8 py-3 rounded-lg text-lg disabled:opacity-50">
            Nộp bài & Xem kết quả
          </button>
        </div>
      )}
    </div>
  );
}
