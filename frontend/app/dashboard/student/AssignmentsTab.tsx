"use client";
import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Clock, CheckCircle2, Trophy, ChevronRight, Sparkles 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface AssignmentsTabProps {
  API_URL: string;
}

export default function AssignmentsTab({ API_URL }: AssignmentsTabProps) {
  const { token, authFetch } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingQuiz, setTakingQuiz] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  const fetchAssignments = async () => {
    try {
      const res = await authFetch(`${API_URL}/student/assignments`);
      if (res.ok) setAssignments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAssignments(); }, [token, authFetch, API_URL]);

  const startQuiz = async (id: number) => {
    try {
      const res = await authFetch(`${API_URL}/student/assignments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTakingQuiz(data);
        setQuizAnswers({});
        setQuizResult(null);
      }
    } catch (e) { console.error(e); }
  };

  const submitAssignment = async () => {
    if (!takingQuiz) return;
    setSubmitting(true);
    try {
      const assignmentType = takingQuiz.type || "quiz";
      let body;
      if (assignmentType === "quiz") {
        body = { answers: quizAnswers };
      } else if (assignmentType === "writing") {
        body = { text: quizAnswers["text"] || "" };
      } else {
        alert("Unsupported assignment type");
        setSubmitting(false);
        return;
      }
      const res = await authFetch(`${API_URL}/student/assignments/${takingQuiz.id}/submit`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const result = await res.json();
        setQuizResult(result);
        fetchAssignments();
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi khi nộp bài");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  if (takingQuiz) {
    const assignmentType = takingQuiz.type || "quiz";

    if (assignmentType === "writing") {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{takingQuiz.title}</h2>
              <p className="text-sm text-gray-500">{takingQuiz.class_name}</p>
              {takingQuiz.description && <p className="text-sm text-gray-600 mt-2">{takingQuiz.description}</p>}
            </div>
            <button onClick={() => setTakingQuiz(null)} className="text-sm text-gray-500 hover:text-red-600 transition">Hủy bỏ</button>
          </div>

          {takingQuiz.submitted ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
                <p className="font-bold text-green-800">Bạn đã nộp bài viết rồi!</p>
                <p className="text-green-600 text-lg font-semibold mt-1">Điểm AI chấm: {takingQuiz.score}/{takingQuiz.max_score}</p>
                <p className="text-sm text-green-700 mt-1">Nộp lúc: {new Date(takingQuiz.submitted_at).toLocaleDateString("vi-VN")}</p>
                <button onClick={() => setTakingQuiz(null)} className="mt-4 text-sm text-blue-600 hover:underline">Quay lại danh sách</button>
              </div>
              
              {takingQuiz.evaluation && (
                 <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><Sparkles className="text-indigo-500" size={20}/> Đánh giá từ AI</h3>
                    <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-900 leading-relaxed">
                      <p className="font-bold mb-1">Nhận xét chung:</p>
                      {takingQuiz.evaluation.feedback_summary}
                    </div>
                    
                    {takingQuiz.evaluation.criteria_scores && (
                      <div>
                        <p className="font-bold text-gray-800 mb-2">Điểm thành phần:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(takingQuiz.evaluation.criteria_scores).map(([k, v]) => (
                            <div key={k} className="bg-gray-50 p-2 rounded flex justify-between text-sm">
                              <span className="text-gray-600">{k}</span>
                              <span className="font-bold text-indigo-700">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {takingQuiz.evaluation.detailed_feedback?.map((section: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                        <p className={`font-bold mb-2 ${section.category?.includes('Strengths') ? 'text-green-700' : section.category?.includes('Weaknesses') ? 'text-red-700' : 'text-blue-700'}`}>{section.category}</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                          {section.points?.map((pt: string, pidx: number) => <li key={pidx}>{pt}</li>)}
                        </ul>
                      </div>
                    ))}

                    {takingQuiz.evaluation.corrected_version && (
                      <div>
                        <p className="font-bold text-gray-800 mb-2 mt-4">Bản sửa mẫu từ AI:</p>
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm text-gray-800 whitespace-pre-wrap font-serif leading-relaxed">
                          {takingQuiz.evaluation.corrected_version}
                        </div>
                      </div>
                    )}
                 </div>
              )}
              
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                 <h3 className="font-bold text-gray-900 mb-2">Bài viết của bạn</h3>
                 <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-serif leading-relaxed">
                   {takingQuiz.submission_text || "(Không có nội dung)"}
                 </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Viết bài của bạn</h3>
                <textarea
                  value={quizAnswers["text"] || ""}
                  onChange={e => setQuizAnswers(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Nhập bài viết của bạn ở đây..."
                  rows={10}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="text-center pt-4">
                <button
                  onClick={() => submitAssignment()}
                  disabled={!quizAnswers["text"]?.trim()}
                  className="btn-primary px-10 py-3 rounded-xl text-lg shadow-md hover:shadow-lg disabled:opacity-50 transition"
                >
                  Nộp bài viết
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    const questions = takingQuiz.quiz_data || [];

    if (quizResult) {
      return (
        <div className="space-y-6">
          <div className={`p-6 rounded-xl text-center ${quizResult.percent >= 80 ? "bg-green-50 border border-green-200" : quizResult.percent >= 50 ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"}`}>
            <Trophy size={48} className={`mx-auto mb-3 ${quizResult.percent >= 80 ? "text-green-500" : quizResult.percent >= 50 ? "text-yellow-500" : "text-red-500"}`} />
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Kết quả: {quizResult.score}/{quizResult.max_score}</h2>
            <p className="text-lg font-semibold">{quizResult.percent}%</p>
          </div>
          <div className="space-y-4">
            {quizResult.details.map((d: any, i: number) => (
              <div key={i} className={`p-4 rounded-xl border-2 ${d.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <p className="font-bold text-gray-800 mb-2"><span className="text-sm bg-gray-200 rounded-lg px-2 py-0.5 mr-2">Câu {i + 1}</span>{d.question}</p>
                <div className="flex gap-4 text-sm">
                  <p>Bạn chọn: <span className={d.is_correct ? "text-green-700 font-bold" : "text-red-700 font-bold"}>{d.student_answer || "(không chọn)"}</span></p>
                  {!d.is_correct && <p>Đáp án đúng: <span className="text-green-700 font-bold">{d.correct_answer}</span></p>}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setTakingQuiz(null); setQuizResult(null); }} className="btn-primary px-6 py-2 rounded-xl">
            Quay lại danh sách
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{takingQuiz.title}</h2>
            <p className="text-sm text-gray-500">{takingQuiz.class_name} · {questions.length} câu hỏi</p>
          </div>
          <button onClick={() => setTakingQuiz(null)} className="text-sm text-gray-500 hover:text-red-600 transition">Hủy bỏ</button>
        </div>

        {takingQuiz.submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
            <p className="font-bold text-green-800">Bạn đã nộp bài này rồi!</p>
            <p className="text-green-600 text-lg font-semibold mt-1">Điểm: {takingQuiz.score}/{takingQuiz.max_score}</p>
            <button onClick={() => setTakingQuiz(null)} className="mt-4 text-sm text-blue-600 hover:underline">Quay lại</button>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {questions.map((q: any, i: number) => {
                const opts = q.options || [];
                return (
                  <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <p className="font-bold text-gray-800 mb-4 flex items-start">
                      <span className="bg-blue-100 text-blue-700 w-7 h-7 rounded-lg flex items-center justify-center mr-3 shrink-0 text-sm">{i + 1}</span>
                      {q.question || q.q}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10">
                      {opts.map((opt: string, oi: number) => {
                        const isSelected = quizAnswers[String(i)] === opt;
                        return (
                          <div
                            key={oi}
                            onClick={() => setQuizAnswers(prev => ({ ...prev, [String(i)]: opt }))}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-100 hover:border-blue-300 hover:bg-blue-50/50"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-blue-600" : "border-gray-300"}`}>
                                {isSelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                              </div>
                              <span className="text-gray-700 font-medium">{opt}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center pt-4">
              <button
                onClick={submitAssignment}
                disabled={submitting || Object.keys(quizAnswers).length === 0}
                className="btn-primary px-10 py-3 rounded-xl text-lg shadow-md hover:shadow-lg disabled:opacity-50 transition"
              >
                {submitting ? "Đang nộp bài..." : "Nộp bài & Xem kết quả"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const pending = assignments.filter(a => !a.submitted_at);
  const completed = assignments.filter(a => a.submitted_at);

  return (
    <div className="space-y-6">
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có bài tập nào</h3>
          <p className="text-gray-500">Giáo viên chưa giao bài tập cho các lớp bạn tham gia.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Clock size={18} className="text-orange-500" /> Chưa làm ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map((a) => (
                  <div key={a.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
                    <div>
                        <h4 className="font-bold text-gray-900">{a.title}</h4>
                        <p className="text-sm text-gray-500">{a.class_name}{a.due_date ? ` · Hạn: ${a.due_date}` : ""}</p>
                        {a.description && <p className="text-sm text-gray-400 mt-1">{a.description}</p>}
                    </div>
                    <button onClick={() => startQuiz(a.id)} className="btn-primary px-5 py-2 rounded-lg text-sm flex items-center gap-1 shrink-0">
                      Làm bài <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-500" /> Đã hoàn thành ({completed.length})</h3>
              <div className="space-y-3">
                {completed.map((a) => (
                  <div key={a.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">{a.title}</h4>
                      <p className="text-sm text-gray-500">{a.class_name} · Nộp: {new Date(a.submitted_at).toLocaleDateString("vi-VN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-green-600">{a.score}/{a.max_score}</p>
                      <p className="text-xs text-gray-400">{a.max_score > 0 ? Math.round(a.score / a.max_score * 100) : 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
