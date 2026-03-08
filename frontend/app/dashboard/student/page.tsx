"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen, Sparkles, BrainCircuit, Trophy, PlayCircle, CheckCircle2, XCircle,
  GraduationCap, ClipboardList, BarChart3, FileText, ChevronRight, Clock,
  Award, TrendingUp, Layers, Search, BookMarked, Volume2, Save, Trash2,
  ExternalLink, Star, Filter, X, ArrowRight, Bookmark, Network, Mic, Upload
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

function getAuthHeader(token: string | null) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { user, token } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {activeTab === "overview" && "Tổng quan"}
          {activeTab === "classes" && "Lớp học của tôi"}
          {activeTab === "assignments" && "Bài tập & Kiểm tra"}
          {activeTab === "dictionary" && "Tra từ điển"}
          {activeTab === "vocabulary" && "Từ vựng đã lưu"}
          {activeTab === "ai-tools" && "Học với AI"}
          {activeTab === "scores" && "Kết quả học tập"}
          {activeTab === "ipa" && "Luyện phát âm IPA"}
          {activeTab === "practice" && "Luyện thi & Kỹ năng"}
        </h1>
        <p className="text-sm text-gray-500">Xin chào, <span className="font-semibold text-blue-600">{user?.name}</span></p>
      </div>

      {activeTab === "overview" && <OverviewTab token={token} user={user} />}
      {activeTab === "classes" && <ClassesTab token={token} />}
      {activeTab === "assignments" && <AssignmentsTab token={token} />}
      {activeTab === "dictionary" && <DictionaryTab token={token} />}
      {activeTab === "vocabulary" && <VocabularyTab token={token} />}
      {activeTab === "ai-tools" && <AIToolsTab token={token} />}
      {activeTab === "scores" && <ScoresTab token={token} />}
      {activeTab === "ipa" && <IpaTab token={token} />}
      {activeTab === "practice" && <PracticeTab token={token} />}
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab({ token, user }: { token: string | null; user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/student/stats`, { headers: getAuthHeader(token) });
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  const cards = [
    { label: "Lớp đã tham gia", value: stats?.classes_enrolled ?? 0, icon: GraduationCap, color: "blue" },
    { label: "Bài tập đã giao", value: stats?.assignments_total ?? 0, icon: ClipboardList, color: "purple" },
    { label: "Đã nộp bài", value: stats?.assignments_submitted ?? 0, icon: CheckCircle2, color: "green" },
    { label: "Chưa làm", value: stats?.assignments_pending ?? 0, icon: Clock, color: "orange" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-extrabold mb-2">Chào mừng trở lại, {user?.name}! 🎓</h2>
          <p className="text-blue-100 text-lg">Tiếp tục hành trình học tập thông minh với iEdu.</p>
        </div>
        <div className="absolute right-4 bottom-4 flex items-center gap-3 bg-white/15 backdrop-blur-sm px-5 py-3 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-blue-100 uppercase font-medium">Điểm TB</p>
            <p className="text-2xl font-extrabold flex items-center"><Trophy size={20} className="mr-1 text-yellow-300" />{stats?.average_percent ?? 0}%</p>
          </div>
        </div>
        <BrainCircuit className="absolute -right-8 -bottom-8 text-white/10 w-48 h-48" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const colors: Record<string, string> = {
            blue: "bg-blue-50 text-blue-600",
            purple: "bg-purple-50 text-purple-600",
            green: "bg-green-50 text-green-600",
            orange: "bg-orange-50 text-orange-600",
          };
          return (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className={`w-10 h-10 ${colors[c.color]} rounded-lg flex items-center justify-center mb-3`}>
                <c.icon size={20} />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </div>
          );
        })}
      </div>

      {stats && stats.assignments_submitted > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-blue-600" /> Tổng kết điểm số</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-blue-600">{stats.total_score}/{stats.total_max_score}</p>
              <p className="text-sm text-gray-500 mt-1">Tổng điểm</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-green-600">{stats.average_percent}%</p>
              <p className="text-sm text-gray-500 mt-1">Điểm trung bình</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-purple-600">{stats.assignments_submitted}</p>
              <p className="text-sm text-gray-500 mt-1">Bài đã hoàn thành</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== CLASSES TAB ====================
function ClassesTab({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/student/my-classes`, { headers: getAuthHeader(token) });
        if (res.ok) setClasses(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const loadLessons = async (classId: number) => {
    if (selectedClass === classId) { setSelectedClass(null); return; }
    setSelectedClass(classId);
    setLessonsLoading(true);
    try {
      const res = await fetch(`${API_URL}/student/my-classes/${classId}/lessons`, { headers: getAuthHeader(token) });
      if (res.ok) setLessons(await res.json());
    } catch (e) { console.error(e); }
    finally { setLessonsLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
        <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có lớp học nào</h3>
        <p className="text-gray-500">Bạn chưa được ghi danh vào lớp nào. Hãy liên hệ giáo viên để được thêm vào lớp.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {classes.map((c) => (
        <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div
            onClick={() => loadLessons(c.id)}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{c.name}</h3>
                <p className="text-sm text-gray-500">GV: {c.teacher_name} · {c.lesson_count} bài học · {c.assignment_count} bài tập</p>
              </div>
            </div>
            <ChevronRight size={20} className={`text-gray-400 transition-transform ${selectedClass === c.id ? "rotate-90" : ""}`} />
          </div>

          {selectedClass === c.id && (
            <div className="border-t border-gray-100 px-5 pb-5">
              {lessonsLoading ? (
                <div className="py-6 text-center text-gray-400">Đang tải bài học...</div>
              ) : lessons.length === 0 ? (
                <div className="py-6 text-center text-gray-400">Lớp này chưa có bài học nào</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {lessons.map((l, i) => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{l.title}</p>
                        {l.content && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{l.content}</p>}
                      </div>
                      {l.file_name && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md flex items-center gap-1">
                          <FileText size={12} /> {l.file_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ==================== ASSIGNMENTS TAB ====================
function AssignmentsTab({ token }: { token: string | null }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingQuiz, setTakingQuiz] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API_URL}/student/assignments`, { headers: getAuthHeader(token) });
      if (res.ok) setAssignments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAssignments(); }, [token]);

  const startQuiz = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/student/assignments/${id}`, { headers: getAuthHeader(token) });
      if (res.ok) {
        const data = await res.json();
        setTakingQuiz(data);
        setQuizAnswers({});
        setQuizResult(null);
      }
    } catch (e) { console.error(e); }
  };

  const submitQuiz = async () => {
    if (!takingQuiz) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/student/assignments/${takingQuiz.id}/submit`, {
        method: "POST",
        headers: getAuthHeader(token),
        body: JSON.stringify({ answers: quizAnswers }),
      });
      if (res.ok) {
        const result = await res.json();
        setQuizResult(result);
        fetchAssignments();
      } else {
        const err = await res.json();
        alert(err.detail || "Lỗi khi nộp bài");
      }
    } catch (e) { console.error(e); alert("Lỗi kết nối"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  // Quiz-taking view
  if (takingQuiz) {
    const questions = takingQuiz.quiz_data || [];

    // Show result
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

    // Quiz form
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
                onClick={submitQuiz}
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

  // Assignment list
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

// ==================== AI TOOLS TAB ====================
function AIToolsTab({ token }: { token: string | null }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [flippedWord, setFlippedWord] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const analyze = async (type: "text" | "file") => {
    if (type === "text" && !text) return;
    if (type === "file" && !file) return;

    setLoading(true);
    setResult(null);
    setAnswers({});
    setSubmitted(false);

    try {
      let data;
      if (type === "text") {
        const res = await fetch(`${API_URL}/student/analyze-text`, {
          method: "POST",
          headers: getAuthHeader(token),
          body: JSON.stringify({ text, num_questions: 5 }),
        });
        if (!res.ok) throw new Error("API error");
        data = await res.json();
      } else {
        const formData = new FormData();
        // @ts-ignore
        formData.append("file", file);
        formData.append("num_questions", "5");
        formData.append("exercise_type", "mixed");

        const res = await fetch(`${API_URL}/student/file/upload-analyze`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }, // FormData does not need Content-Type header
          body: formData,
        });
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        data = json.result || json;
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
        return { q: q.question || q.q || "", options: q.options || [], ans: ansIndex };
      }) : [];

      setResult({ words, quiz });
    } catch (e) {
      console.error(e);
      alert("Lỗi khi phân tích nội dung. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (!result?.quiz) return;
    let s = 0;
    result.quiz.forEach((q: any, i: number) => { if (answers[i] === q.ans) s++; });
    setScore(s);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Sparkles size={20} className="text-blue-600" /> Phân tích văn bản với AI
        </h2>
        {/* Tabs for Input Type */}
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
              placeholder="Dán một đoạn văn bản tiếng Anh vào đây để AI trích xuất từ vựng và tạo câu hỏi trắc nghiệm..."
              value={text}
              onChange={(e) => setText(e.target.value)}
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
                          const res = await fetch(`${API_URL}/student/vocabulary/save`, {
                            method: "POST", headers: getAuthHeader(token),
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

          {result.quiz.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Award size={20} className="text-green-600" /> Quiz Thử Thách
              </h3>

              {submitted && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${score === result.quiz.length ? "bg-green-50 text-green-800 border border-green-200" : "bg-yellow-50 text-yellow-800 border border-yellow-200"}`}>
                  <Trophy size={28} />
                  <div>
                    <p className="font-bold text-lg">Bạn đạt {score}/{result.quiz.length} điểm!</p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {result.quiz.map((q: any, i: number) => (
                  <div key={i} className="p-4 border border-gray-100 rounded-xl">
                    <p className="font-bold text-gray-800 mb-3 flex items-start">
                      <span className="bg-blue-100 text-blue-700 w-7 h-7 rounded-lg flex items-center justify-center mr-2 shrink-0 text-sm">{i + 1}</span>
                      {q.q}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                      {q.options.map((opt: string, oi: number) => {
                        const isSelected = answers[i] === oi;
                        let cls = "border-gray-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer";
                        let icon = null;
                        if (submitted) {
                          if (oi === q.ans) { cls = "border-green-400 bg-green-50"; icon = <CheckCircle2 size={18} className="text-green-500" />; }
                          else if (isSelected) { cls = "border-red-400 bg-red-50"; icon = <XCircle size={18} className="text-red-500" />; }
                          else cls = "border-gray-100 opacity-50";
                        } else if (isSelected) cls = "border-blue-500 bg-blue-50";

                        return (
                          <div key={oi} onClick={() => !submitted && setAnswers(prev => ({ ...prev, [i]: oi }))} className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${cls}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-blue-600" : "border-gray-300"}`}>
                                {isSelected && !submitted && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                              </div>
                              <span className="text-sm font-medium text-gray-700">{opt}</span>
                            </div>
                            {icon}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {!submitted && Object.keys(answers).length > 0 && (
                <div className="mt-6 text-center">
                  <button onClick={handleSubmitQuiz} className="btn-primary px-8 py-2.5 rounded-xl shadow-md">Nộp bài & Chấm điểm</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== DICTIONARY TAB ====================
function DictionaryTab({ token }: { token: string | null }) {
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const lookup = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch(`${API_URL}/student/dictionary/lookup`, {
        method: "POST",
        headers: getAuthHeader(token),
        body: JSON.stringify({ word: word.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Lookup failed");
      }
      const data = await res.json();
      setResult(data);
      setHistory(prev => {
        const next = [word.trim().toLowerCase(), ...prev.filter(w => w !== word.trim().toLowerCase())];
        return next.slice(0, 20);
      });
    } catch (e: any) {
      alert(e.message || "Lỗi khi tra từ điển");
    } finally {
      setLoading(false);
    }
  };

  const saveWord = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const firstMeaning = result.meanings?.[0] || {};
      const res = await fetch(`${API_URL}/student/vocabulary/save`, {
        method: "POST",
        headers: getAuthHeader(token),
        body: JSON.stringify({
          word: result.word,
          phonetic: result.phonetic_uk || result.phonetic_us || "",
          pos: result.pos || firstMeaning.pos || "",
          meaning_en: firstMeaning.definition_en || "",
          meaning_vn: firstMeaning.definition_vn || "",
          example: firstMeaning.examples?.[0] || "",
          level: result.level || "B1",
          source: "dictionary",
        }),
      });
      if (res.ok) setSaved(true);
    } catch { }
    finally { setSaving(false); }
  };

  const speak = (text: string, lang: string = "en-GB") => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition text-lg"
              placeholder="Nhập từ tiếng Anh cần tra (vd: accomplish, serendipity, ...)"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
          </div>
          <button
            onClick={lookup}
            disabled={loading || !word.trim()}
            className="btn-primary py-3.5 px-8 rounded-xl flex items-center gap-2 shadow-md disabled:opacity-50 transition text-lg"
          >
            {loading ? (
              <div className="flex items-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> Đang tra...</div>
            ) : (
              <><Search size={20} /> Tra từ</>
            )}
          </button>
        </div>

        {/* Search history */}
        {history.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Gần đây:</span>
            {history.slice(0, 10).map((h, i) => (
              <button key={i} onClick={() => { setWord(h); }} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition">
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Word header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-extrabold mb-1">{result.word}</h2>
                <div className="flex items-center gap-4 mt-2">
                  {result.phonetic_uk && (
                    <button onClick={() => speak(result.word, "en-GB")} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
                      <Volume2 size={16} /> <span className="text-sm">UK</span> <span className="font-mono text-sm">{result.phonetic_uk}</span>
                    </button>
                  )}
                  {result.phonetic_us && (
                    <button onClick={() => speak(result.word, "en-US")} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
                      <Volume2 size={16} /> <span className="text-sm">US</span> <span className="font-mono text-sm">{result.phonetic_us}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.level && (
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">{result.level}</span>
                )}
                {/* Source badge */}
                {result._source && (
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${result._source === "database" ? "bg-green-400/30 text-green-100" :
                    result._source === "graph" ? "bg-cyan-400/30 text-cyan-100" : "bg-amber-400/30 text-amber-100"
                    }`}>
                    {result._source === "database" ? "💾 Từ Database (không tốn AI)" :
                      result._source === "graph" ? "⚡ Từ Knowledge Graph" : "🤖 AI tra cứu"}
                  </span>
                )}
                <button
                  onClick={saveWord}
                  disabled={saving || saved}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition font-medium ${saved ? "bg-green-500 text-white" : "bg-white text-blue-600 hover:bg-blue-50"}`}
                >
                  {saved ? <><CheckCircle2 size={16} /> Đã lưu</> : saving ? "Đang lưu..." : <><Bookmark size={16} /> Lưu từ</>}
                </button>
              </div>
            </div>
          </div>

          {/* Meanings */}
          <div className="p-6 space-y-6">
            {result.meanings?.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-500">{result.meanings.length} nghĩa được tìm thấy</span>
              </div>
            )}
            {result.meanings?.map((m: any, i: number) => (
              <div key={i} className="border-l-4 border-blue-400 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-lg text-sm font-bold">{m.pos || result.pos}</span>
                  <span className="text-xs text-gray-400">Nghĩa {i + 1}</span>
                  {m.register && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-lg text-xs font-medium italic">{m.register}</span>
                  )}
                </div>
                <p className="text-gray-900 font-medium text-lg">{m.definition_en}</p>
                <p className="text-blue-700 font-medium mt-1">{m.definition_vn}</p>

                {m.examples?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {m.examples.map((ex: string, j: number) => (
                      <div key={j} className="flex items-start gap-2">
                        <ArrowRight size={14} className="text-gray-400 mt-1 shrink-0" />
                        <p className="text-gray-600 italic">{ex}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-6 mt-3 text-sm">
                  {m.synonyms?.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Đồng nghĩa: </span>
                      {m.synonyms.map((s: string, k: number) => (
                        <button key={k} onClick={() => setWord(s)} className="text-green-600 hover:underline mr-2">{s}</button>
                      ))}
                    </div>
                  )}
                  {m.antonyms?.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Trái nghĩa: </span>
                      {m.antonyms.map((a: string, k: number) => (
                        <button key={k} onClick={() => setWord(a)} className="text-red-500 hover:underline mr-2">{a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Word family, collocations, graph connections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              {result.word_family?.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-purple-700 mb-2">Họ từ (Word Family)</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.word_family.map((w: string, i: number) => (
                      <button key={i} onClick={() => setWord(w)} className="bg-white text-purple-700 text-sm px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-100 transition">{w}</button>
                    ))}
                  </div>
                </div>
              )}
              {result.collocations?.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-orange-700 mb-2">Kết hợp từ (Collocations)</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.collocations.map((c: string, i: number) => (
                      <span key={i} className="bg-white text-orange-700 text-sm px-2.5 py-1 rounded-lg border border-orange-200">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.graph_connections?.length > 0 && (
                <div className="bg-cyan-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-cyan-700 mb-2 flex items-center gap-1"><Network size={14} /> Đồ thị tri thức</h4>
                  <div className="space-y-1">
                    {result.graph_connections.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-cyan-600 font-mono text-xs bg-cyan-100 px-1.5 rounded">{c.relation}</span>
                        <button onClick={() => setWord(c.word)} className="text-cyan-800 hover:underline">{c.word}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sources */}
            {result.sources?.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  Nguồn tham chiếu: {result.sources.join(" • ")}
                  {result._from_cache && " (cached)"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== VOCABULARY TAB ====================
function VocabularyTab({ token }: { token: string | null }) {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchWords = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (levelFilter) params.set("level", levelFilter);
      const res = await fetch(`${API_URL}/student/vocabulary?${params}`, { headers: getAuthHeader(token) });
      if (res.ok) setWords(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWords(); }, [token, search, levelFilter]);

  const deleteWord = async (id: number) => {
    if (!confirm("Xóa từ này khỏi kho từ vựng?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_URL}/student/vocabulary/${id}`, {
        method: "DELETE", headers: getAuthHeader(token)
      });
      if (res.ok) setWords(prev => prev.filter(w => w.id !== id));
    } catch { }
    finally { setDeleting(null); }
  };

  const speak = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats + filters */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold">
              <BookMarked size={18} className="inline mr-1" /> {words.length} từ đã lưu
            </div>
            {/* Level distribution */}
            <div className="hidden md:flex items-center gap-1">
              {levels.map(l => {
                const count = words.filter(w => w.level === l).length;
                if (count === 0) return null;
                const colors: Record<string, string> = { A1: "bg-green-100 text-green-700", A2: "bg-green-100 text-green-700", B1: "bg-blue-100 text-blue-700", B2: "bg-blue-100 text-blue-700", C1: "bg-purple-100 text-purple-700", C2: "bg-purple-100 text-purple-700" };
                return <span key={l} className={`text-xs px-2 py-0.5 rounded-full font-bold ${colors[l]}`}>{l}: {count}</span>;
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm từ vựng..."
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
            >
              <option value="">Tất cả level</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Word list */}
      {words.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <BookMarked size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">{search || levelFilter ? "Không tìm thấy từ phù hợp" : "Chưa lưu từ vựng nào"}</h3>
          <p className="text-gray-500">Tra từ điển hoặc phân tích văn bản để lưu từ mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {words.map((w) => {
            const levelColors: Record<string, string> = { A1: "bg-green-100 text-green-700", A2: "bg-green-50 text-green-600", B1: "bg-blue-100 text-blue-700", B2: "bg-blue-50 text-blue-600", C1: "bg-purple-100 text-purple-700", C2: "bg-purple-50 text-purple-600" };
            return (
              <div key={w.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-extrabold text-blue-700">{w.word}</h3>
                      <button onClick={() => speak(w.word)} className="text-gray-400 hover:text-blue-600 transition"><Volume2 size={16} /></button>
                      {w.pos && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{w.pos}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${levelColors[w.level] || "bg-gray-100 text-gray-600"}`}>{w.level}</span>
                    </div>
                    {w.phonetic && <p className="text-gray-400 text-sm font-mono mb-1">{w.phonetic}</p>}
                    {w.meaning_vn && <p className="text-gray-800 font-medium">{w.meaning_vn}</p>}
                    {w.meaning_en && <p className="text-gray-500 text-sm mt-0.5">{w.meaning_en}</p>}
                    {w.example && <p className="text-gray-400 text-sm italic mt-1.5 border-l-2 border-gray-200 pl-2">{w.example}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    <span className="text-xs text-gray-400">{w.source}</span>
                    <button
                      onClick={() => deleteWord(w.id)}
                      disabled={deleting === w.id}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition p-1 rounded"
                      title="Xóa từ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-300 mt-2">{new Date(w.created_at).toLocaleDateString("vi-VN")}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== SCORES TAB ====================
function ScoresTab({ token }: { token: string | null }) {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/student/scores`, { headers: getAuthHeader(token) });
        if (res.ok) setScores(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  if (scores.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
        <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-700 mb-2">Chưa có kết quả nào</h3>
        <p className="text-gray-500">Hoàn thành bài tập để xem kết quả tại đây.</p>
      </div>
    );
  }

  const totalScore = scores.reduce((s, r) => s + r.score, 0);
  const totalMax = scores.reduce((s, r) => s + r.max_score, 0);
  const avgPercent = totalMax > 0 ? Math.round(totalScore / totalMax * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-blue-600">{scores.length}</p>
          <p className="text-sm text-gray-500">Bài đã làm</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-green-600">{totalScore}/{totalMax}</p>
          <p className="text-sm text-gray-500">Tổng điểm</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-extrabold text-purple-600">{avgPercent}%</p>
          <p className="text-sm text-gray-500">Trung bình</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Bài tập</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Lớp</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Điểm</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày nộp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {scores.map((s) => {
              const pct = s.max_score > 0 ? Math.round(s.score / s.max_score * 100) : 0;
              return (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4 font-medium text-gray-900">{s.assignment_title}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{s.class_name}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {s.score}/{s.max_score}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-sm text-gray-500">
                    {new Date(s.submitted_at).toLocaleDateString("vi-VN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== NEW: IPA TAB ====================
function IpaTab({ token }: { token: string | null }) {
  const [focus, setFocus] = useState("vowels");
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<any>(null);

  const generateLesson = async () => {
    setLoading(true);
    setLesson(null);
    try {
      const res = await fetch(`${API_URL}/student/ipa/generate`, {
        method: "POST",
        headers: getAuthHeader(token),
        body: JSON.stringify({ focus })
      });
      if (!res.ok) throw new Error("API Error");
      setLesson(await res.json());
    } catch (e) {
      alert("Lỗi khi tạo bài học IPA");
    } finally {
      setLoading(false);
    }
  };

  const speak = (word: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Mic className="text-blue-500" /> Tạo bài học IPA với AI
        </h2>
        <p className="text-gray-500 mb-6 mt-1">Chọn nhóm âm bạn muốn luyện tập, AI sẽ tạo bài học dành riêng cho bạn.</p>

        <div className="flex justify-center gap-4 mb-6">
          <select value={focus} onChange={e => setFocus(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 outline-none focus:border-blue-500">
            <option value="vowels">Nguyên âm (Vowels)</option>
            <option value="consonants">Phụ âm (Consonants)</option>
            <option value="diphthongs">Nguyên âm đôi (Diphthongs)</option>
            <option value="difficult">Âm khó (th, r, l...)</option>
          </select>
          <button onClick={generateLesson} disabled={loading} className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 transition">
            {loading ? "Đang tạo..." : <><Sparkles size={18} /> Tạo bài học</>}
          </button>
        </div>
      </div>

      {lesson && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-2">{lesson.title}</h3>
            <p className="text-blue-800 mb-4">{lesson.introduction}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.sounds?.map((s: any, i: number) => (
                <div key={i} className="bg-white rounded-lg p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-mono text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded">/{s.ipa}/</span>
                  </div>
                  <p className="text-gray-600 mb-4 text-sm">{s.description}</p>

                  <div className="space-y-2">
                    {s.examples?.map((ex: any, j: number) => (
                      <div key={j} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div>
                          <span className="font-bold text-gray-800">{ex.word}</span>
                          <span className="text-gray-500 ml-2 font-mono text-sm">/{ex.transcription}/</span>
                        </div>
                        <button onClick={() => speak(ex.word)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"><Volume2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== NEW: PRACTICE TAB ====================
function PracticeTab({ token }: { token: string | null }) {
  const [testType, setTestType] = useState("TOEIC");
  const [skill, setSkill] = useState("reading");
  const [loading, setLoading] = useState(false);
  const [practice, setPractice] = useState<any>(null);

  const generatePractice = async () => {
    setLoading(true);
    setPractice(null);
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

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: getAuthHeader(token),
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("API Error");
      setPractice(await res.json());
    } catch (e) {
      alert("Lỗi khi tạo bài luyện tập");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Award className="text-purple-500" /> Tự luyện thi & Kỹ năng
          </h2>
          <p className="text-gray-500 text-sm">chọn chứng chỉ và kỹ năng để hệ thống sinh đề thi mẫu cho bạn</p>
        </div>
        <div className="flex items-center gap-3">
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
          <button onClick={generatePractice} disabled={loading} className="btn-primary px-5 py-2 rounded-lg disabled:opacity-50">
            {loading ? "Đang tạo..." : "Tạo bài"}
          </button>
        </div>
      </div>

      {practice && skill === "reading" && (
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
                      <input type="radio" name={`q-${idx}`} id={`q-${idx}-${oIdx}`} className="w-4 h-4 text-blue-600" />
                      <label htmlFor={`q-${idx}-${oIdx}`}>{opt}</label>
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

      {practice && (skill === "listening" || skill === "writing" || !["reading", "speaking"].includes(skill)) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
          Yêu cầu tính năng {skill} đã được mô phỏng. Dữ liệu mock: {JSON.stringify(practice).substring(0, 100)}...
        </div>
      )}
    </div>
  );
}
