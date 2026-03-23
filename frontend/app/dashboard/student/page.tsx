"use client";
import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen, Sparkles, BrainCircuit, Trophy, PlayCircle, CheckCircle2, XCircle,
  GraduationCap, ClipboardList, BarChart3, FileText, ChevronRight, Clock,
  Award, TrendingUp, Layers, Search, BookMarked, Volume2, Save, Trash2,
  ExternalLink, Star, Filter, X, ArrowRight, Bookmark, Network, Mic, Upload, Brain, Headphones, Edit3, Terminal, AlertCircle, BookText, Lightbulb
} from "lucide-react";
import { ALL_WORDS_DATABASE, simulateSyllabify, WordDetail } from "../../components/DictionaryData";
import { MOCK_PRACTICE_TESTS } from "../../components/MockPracticeData";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

// Local auth fetch helpers removed in favor of AuthContext.authFetch

function StudentDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { user, token, isInitialized, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set([activeTab]));
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Track visited tabs for caching
  useEffect(() => {
    setVisitedTabs(prev => new Set([...prev, activeTab]));
    
    // Proactively refresh user data when entering key tabs to ensure points/credits are up to date
    if (activeTab === "overview" || activeTab === "ranking" || activeTab === "ai-tools") {
      refreshUser();
    }
  }, [activeTab, refreshUser]);

  // Auth check
  useEffect(() => {
    if (!isInitialized) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.role || "").toString().toLowerCase();
    if (role !== "student") {
      router.replace("/dashboard");
    }
  }, [isInitialized, token, user, router]);

  if (!isInitialized || !token || !user) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;
  }

  const renderTab = (tabName: string) => {
    if (!visitedTabs.has(tabName)) return null;
    
    const isHidden = activeTab !== tabName;
    const style = isHidden ? { display: 'none' } : {};

    return (
      <div key={tabName} style={style} className="animate-in fade-in duration-300">
        {tabName === "overview" && <OverviewTab />}
        {tabName === "classes" && <ClassesTab />}
        {tabName === "assignments" && <AssignmentsTab />}
        {tabName === "dictionary" && <DictionaryTab />}
        {tabName === "vocabulary" && <VocabularyTab />}
        {tabName === "ai-tools" && <AIToolsTab setShowCreditModal={setShowCreditModal} />}
        {tabName === "grammar" && <GrammarTab />}
        {tabName === "scores" && <ScoresTab />}
        {tabName === "ipa" && <IpaTab />}
        {tabName === "practice" && <PracticeTab setShowCreditModal={setShowCreditModal} />}
        {tabName === "ranking" && <RankingTab />}
      </div>
    );
  };

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
          {activeTab === "grammar" && "Kho Ngữ Pháp"}
          {activeTab === "scores" && "Kết quả học tập"}
          {activeTab === "ipa" && "Luyện phát âm IPA"}
          {activeTab === "practice" && "Luyện thi"}
          {activeTab === "ranking" && "Bảng xếp hạng toàn cầu"}
        </h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => refreshUser()}
            className="hidden md:flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full border border-yellow-100 font-bold text-sm hover:bg-yellow-100 transition"
          >
             <Trophy size={14} className="text-yellow-500" /> {user?.points || 0} pts
          </button>
          <div className="hidden md:flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 font-bold text-sm">
             <Sparkles size={14} className="text-indigo-500" /> {user?.credits_ai || 0} credits
          </div>
          <p className="text-sm text-gray-500">Xin chào, <span className="font-semibold text-blue-600">{user?.name}</span></p>
        </div>
      </div>

      {showCreditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">Hết lượt sử dụng AI!</h3>
            <p className="text-gray-600 text-center mb-8">
              Bạn đã sử dụng hết số credits AI trong ngày. Vui lòng quay lại vào ngày mai hoặc liên hệ quản trị viên để được cấp thêm.
            </p>
            <button 
              onClick={() => setShowCreditModal(false)}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {["overview", "classes", "assignments", "dictionary", "vocabulary", "ai-tools", "grammar", "scores", "ipa", "practice", "ranking"].map(tab => renderTab(tab))}
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
function OverviewTab() {
  const { token, user, authFetch } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/stats`);
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  const cards = [
    { label: "Lớp học", value: stats?.classes_enrolled ?? 0, icon: GraduationCap, color: "blue" },
    { label: "Bài cần làm", value: stats?.assignments_pending ?? 0, icon: Clock, color: "orange" },
    { label: "Từ vựng", value: stats?.vocab_count ?? 0, icon: BookMarked, color: "indigo" },
    { label: "Cần ôn tập", value: stats?.review_needed ?? 0, icon: Layers, color: "purple" },
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
function ClassesTab() {
  const { token, authFetch } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/my-classes`);
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
      const res = await authFetch(`${API_URL}/student/my-classes/${classId}/lessons`);
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
function AssignmentsTab() {
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

  useEffect(() => { fetchAssignments(); }, [token]);

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
    console.log("[DEBUG] Starting submit assignment operation");
    const startTime = Date.now();
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
        console.log(`[DEBUG] Submit assignment successful in ${Date.now() - startTime}ms`);
        const result = await res.json();
        setQuizResult(result);
        fetchAssignments();
      } else {
        const err = await res.json();
        console.error(`[DEBUG] Submit assignment failed with status ${res.status}: ${JSON.stringify(err)}`);
        alert(err.detail || "Lỗi khi nộp bài");
      }
    } catch (e) {
      console.error(`[DEBUG] Submit assignment error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối");
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  // Assignment-taking view
  if (takingQuiz) {
    const assignmentType = takingQuiz.type || "quiz";

    if (assignmentType === "writing") {
      // Writing assignment
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
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
              <p className="font-bold text-green-800">Bạn đã nộp bài viết rồi!</p>
              <p className="text-green-600 text-lg font-semibold mt-1">Nộp: {new Date(takingQuiz.submitted_at).toLocaleDateString("vi-VN")}</p>
              <button onClick={() => setTakingQuiz(null)} className="mt-4 text-sm text-blue-600 hover:underline">Quay lại</button>
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

    // Quiz assignment
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
function AIToolsTab({ setShowCreditModal }: { setShowCreditModal: (s: boolean) => void }) {
  const { token, user, authFetch, refreshUser } = useAuth();
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
        data = await res.json();
        refreshUser();
      } else {
        const formData = new FormData();
        // @ts-ignore
        formData.append("file", file);
        formData.append("num_questions", "5");
        formData.append("exercise_type", "mixed");

        const res = await authFetch(`${API_URL}/student/file/upload-analyze`, {
          method: "POST",
          // FormData does not need Content-Type header
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
    
    // Find word boundaries
    let left = start;
    while (left > 0 && /\w/.test(textVal[left - 1])) left--;
    let right = start;
    while (right < textVal.length && /\w/.test(textVal[right])) right++;
    
    const word = textVal.substring(left, right).toLowerCase();
    if (!word) return;

    // Direct lookup + common variations as in New.html
    let localData = ALL_WORDS_DATABASE[word] || 
                    ALL_WORDS_DATABASE[word.replace(/s$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/es$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/ing$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/ed$/, '')];

    if (localData) {
      setSelectedWordInfo(localData);
    } else {
      // Fallback to Free Dictionary API
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
            translation: "Đang tải bản dịch...", // We don't have VN translation in public API
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
                        )
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

      {/* Word Lookup Modal */}
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

// ==================== DICTIONARY TAB ====================
function DictionaryTab() {
  const { token, authFetch } = useAuth();
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("dictionaryHistory");
        if (stored) setHistory(JSON.parse(stored));
      }
    } catch (e) { }
  }, []);

  const lookup = async () => {
    const trimmedWord = word.trim();
    if (!trimmedWord) return;

    // Check Local Database First for instant results
    const localWord = trimmedWord.toLowerCase();
    const localData = ALL_WORDS_DATABASE[localWord] || 
                      ALL_WORDS_DATABASE[localWord.replace(/s$/, '')] || 
                      ALL_WORDS_DATABASE[localWord.replace(/es$/, '')];

    if (localData) {
      setResult({
        ...localData,
        status: "result",
        _source: "database", // Mark as local database
        meanings: [{
          pos: localData.type,
          definition_en: localData.engMeaning,
          definition_vn: localData.translation,
          examples: [localData.example]
        }],
        phonetic_uk: localData.phonetic,
      });
      setLoading(false);
      setHistory(prev => {
        const next = [localWord, ...prev.filter(w => w !== localWord)].slice(0, 10);
        if (typeof window !== "undefined") localStorage.setItem("dictionaryHistory", JSON.stringify(next));
        return next;
      });
      return;
    }

    // Reset state early to provide immediate feedback
    setLoading(true);
    setResult({ status: "thinking", word: trimmedWord, meanings: [], elapsed: 0 });
    setSaved(false);
    setError(null);

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await authFetch(`${API_URL}/student/dictionary/lookup`, {
        method: "POST",
        body: JSON.stringify({ word: trimmedWord }),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Lookup failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let finalData: any = { word: trimmedWord, meanings: [] };

      let lastUpdate = Date.now();
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
              if (chunkData.status === "result" && chunkData.is_saved !== undefined) setSaved(chunkData.is_saved);

              finalData = { ...finalData, ...chunkData };

              // Throttle UI updates to every 150ms for a smoother 'streaming' feel without jitters
              const now = Date.now();
              if (now - lastUpdate > 150) {
                setResult({ ...finalData });
                lastUpdate = now;
              }
            } catch (e) {
              console.warn("[DEBUG] Error parsing chunk:", line, e);
            }
          }
        }
      }
      // Final update to ensure last chunks are rendered
      setResult({ ...finalData });

      if (buffer.trim()) {
        try {
          let rawJson = buffer.trim();
          if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
          if (rawJson !== "[DONE]") {
            const chunkData = JSON.parse(rawJson);
            if (chunkData.status === "result" && chunkData.is_saved !== undefined) setSaved(chunkData.is_saved);
            finalData = { ...finalData, ...chunkData };
            setResult({ ...finalData });
          }
        } catch (e) {
          console.warn("[DEBUG] Error parsing final buffer:", buffer, e);
        }
      }

      // Check if the final non-streamed response has is_saved (for database hits)
      if (finalData.is_saved !== undefined) {
        setSaved(finalData.is_saved);
      }

      setHistory(prev => {
        const next = [trimmedWord.toLowerCase(), ...prev.filter(w => w !== trimmedWord.toLowerCase())].slice(0, 10);
        if (typeof window !== "undefined") localStorage.setItem("dictionaryHistory", JSON.stringify(next));
        return next;
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Lookup aborted');
        return;
      }
      setError(e.message || "Lỗi khi tra từ điển");
      setResult(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelLookup = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setResult(null);
    }
  };

  const saveWord = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const firstMeaning = result.meanings?.[0] || {};
      const res = await authFetch(`${API_URL}/student/vocabulary/save`, {
        method: "POST",
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
    // If we have an authentic audio URL from the API/Database, play it instead of Robot voice
    if (result && result.audio_url && result.word.toLowerCase() === text.toLowerCase()) {
      const audio = new Audio(result.audio_url);
      audio.play().catch(e => console.error("Audio playback error:", e));
      return;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
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
              className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition text-lg"
              placeholder="Nhập từ tiếng Anh cần tra (vd: accomplish, serendipity, ...)"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
            {word && (
              <button
                onClick={() => setWord("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={lookup}
            disabled={loading || !word.trim()}
            className="btn-primary py-3.5 px-8 rounded-xl flex items-center gap-2 shadow-md disabled:opacity-50 transition text-lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 justify-center items-center h-5">
                  <div className="w-1 h-3 bg-yellow-300 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1 h-4 bg-yellow-300 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-3 bg-yellow-300 animate-bounce"></div>
                </div>
              </div>
            ) : (
              <Search size={20} />
            )}
            <span>{loading ? "Đang xử lý..." : "Tra từ"}</span>
          </button>

          {loading && (
            <button
              onClick={cancelLookup}
              className="px-6 py-3.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition font-medium"
            >
              Hủy
            </button>
          )}
        </div>
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
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 text-sm underline hover:text-red-600"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Result UI */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {result.status === "thinking" && (!result.meanings || result.meanings.length === 0) && (
            <>
              <div className="absolute top-0 left-0 w-full h-[2px] z-50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]"></div>
              </div>
              {/* Queue status indicator */}
              {result.queue && (result.queue.waiting > 0 || result.queue.active > 1) && (
                <div className="absolute top-2 right-4 z-50 bg-black/10 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1.5 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                  Hàng đợi: {result.queue.active}/7 {result.queue.waiting > 0 && `(Chờ: ${result.queue.waiting})`}
                </div>
              )}
            </>
          )}

          {/* Show error if API failed */}
          {result.error && result.error.includes("API key") && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-700 mb-2">Lỗi API Key</h3>
              <p className="text-red-600 mb-4">{result.error}</p>
              <p className="text-sm text-gray-600">Vui lòng liên hệ admin để cập nhật API key mới.</p>
            </div>
          )}
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
            {Array.isArray(result.meanings) && result.meanings.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-500">{result.meanings.length} nghĩa được tìm thấy</span>
              </div>
            )}
            {Array.isArray(result.meanings) && result.meanings.map((m: any, i: number) => (
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
                  {Array.isArray(m.synonyms) && m.synonyms.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Đồng nghĩa: </span>
                      {m.synonyms.map((s: string, k: number) => (
                        <button key={k} onClick={() => setWord(s)} className="text-green-600 hover:underline mr-2">{s}</button>
                      ))}
                    </div>
                  )}
                  {Array.isArray(m.antonyms) && m.antonyms.length > 0 && (
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

            {/* Word family, collocations, idioms, graph connections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              {Array.isArray(result.word_family) && result.word_family.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-purple-700 mb-2">Họ từ (Word Family)</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.word_family.map((w: string, i: number) => (
                      <button key={i} onClick={() => setWord(w)} className="bg-white text-purple-700 text-sm px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-100 transition">{w}</button>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(result.collocations) && result.collocations.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-orange-700 mb-2">Kết hợp từ (Collocations)</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.collocations.map((c: string, i: number) => (
                      <span key={i} className="bg-white text-orange-700 text-sm px-2.5 py-1 rounded-lg border border-orange-200">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(result.idioms) && result.idioms.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-green-700 mb-2">Thành ngữ (Idioms)</h4>
                  <div className="space-y-3">
                    {result.idioms.map((idm: any, i: number) => {
                      const isString = typeof idm === "string";
                      const idiomText = isString ? idm.split(":")[0]?.trim() : idm.idiom;
                      const idiomMeaning = isString ? idm.split(":")[1]?.trim() : idm.meaning_vn;
                      return (
                        <div key={i} className="bg-white p-3 rounded-lg border border-green-200">
                          <p className="font-bold text-green-800 text-sm">{idiomText}</p>
                          <p className="text-green-600 text-xs mt-1">{idiomMeaning}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {Array.isArray(result.graph_connections) && result.graph_connections.length > 0 && (
                <div className="bg-cyan-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-cyan-700 mb-2 flex items-center gap-1"><Network size={14} /> Đồ thị tri thức</h4>
                  <div className="space-y-1">
                    {result.graph_connections.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg border border-cyan-100">
                        <span className="text-cyan-600 font-mono text-xs bg-cyan-100 px-1.5 rounded min-w-[50px] text-center">{c.relation}</span>
                        <button onClick={() => setWord(c.word)} className="text-cyan-800 hover:underline font-medium">{c.word}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.wikipedia && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    Wikipedia
                  </h4>
                  {result.wikipedia.thumbnail && (
                    <img src={result.wikipedia.thumbnail} alt={result.wikipedia.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                  )}
                  {result.wikipedia.title && (
                    <p className="font-bold text-blue-800 text-sm">{result.wikipedia.title}</p>
                  )}
                  {result.wikipedia.description && (
                    <p className="text-blue-600 text-xs mt-1">{result.wikipedia.description}</p>
                  )}
                  {result.wikipedia.extract && (
                    <p className="text-blue-700 text-xs mt-2 line-clamp-4">{result.wikipedia.extract}</p>
                  )}
                  {result.wikipedia.url && (
                    <a href={result.wikipedia.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                      Đọc thêm trên Wikipedia →
                    </a>
                  )}
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

const VOCAB_CACHE_KEY = "iedu_vocab_cache";

function VocabularyTab() {
  const { token, authFetch, refreshUser } = useAuth();
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // AI Practice states
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [practiceExercises, setPracticeExercises] = useState<any[]>([]);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [practiceResults, setPracticeResults] = useState<any[]>([]);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchWords = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (levelFilter) params.set("level", levelFilter);
      const res = await authFetch(`${API_URL}/student/vocabulary?${params}`);
      if (res.ok) {
        const serverWords = await res.json();
        setWords(serverWords);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, debouncedSearch, levelFilter]);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const deleteWord = async (id: number) => {
    if (!confirm("Xóa từ này khỏi kho từ vựng?")) return;
    setDeleting(id);
    try {
      const res = await authFetch(`${API_URL}/student/vocabulary/${id}`, { method: "DELETE" });
      if (res.ok) setWords(words.filter(w => w.id !== id));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const speak = (text: string, audio_url?: string) => {
    if (audio_url) {
      new Audio(audio_url).play().catch(() => {});
      return;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
    }
  };

  const startRichPractice = async () => {
    setGeneratingPractice(true);
    try {
      const res = await authFetch(`${API_URL}/student/vocabulary/practice`, {
        method: "POST",
        body: JSON.stringify({ word_ids: [] }) // Empty means SR-based
      });
      if (res.ok) {
        const data = await res.json();
        setPracticeExercises(data.questions || []);
        setCurrentExerciseIdx(0);
        setPracticeResults([]);
        setPracticeAnswers({});
        setExerciseSubmitted(false);
        setShowHint(false);
        refreshUser();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Lỗi khi chuẩn bị bài tập");
      }
    } catch (e) { 
        alert("Lỗi kết nối. Vui lòng kiểm tra lại dịch vụ AI."); 
    }
    finally { setGeneratingPractice(false); }
  };

  const submitCurrentExercise = () => {
    const ex = practiceExercises[currentExerciseIdx];
    const ans = practiceAnswers[currentExerciseIdx] || "";
    const isCorrect = ans.toLowerCase().trim() === ex.answer.toLowerCase().trim();
    
    setPracticeResults(prev => [...prev, { word_id: ex.word_id, correct: isCorrect }]);
    setExerciseSubmitted(true);
  };

  const nextExercise = async () => {
    if (currentExerciseIdx < practiceExercises.length - 1) {
      setCurrentExerciseIdx(prev => prev + 1);
      setExerciseSubmitted(false);
      setShowHint(false);
    } else {
      // Completed!
      try {
        await authFetch(`${API_URL}/student/vocabulary/practice/complete`, {
          method: "POST",
          body: JSON.stringify({ results: practiceResults })
        });
        refreshUser();
        alert(`Hoàn thành! Bạn đúng ${practiceResults.filter(r => r.correct).length}/${practiceExercises.length}.`);
        setPracticeExercises([]);
        fetchWords(); // Refresh SR metadata
      } catch (e) { alert("Lỗi khi lưu kết quả"); }
    }
  };

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const currentEx = practiceExercises[currentExerciseIdx];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stats + filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
              <BookMarked size={18} /> {words.length} từ đã lưu
            </div>
            <div className="hidden lg:flex items-center gap-1">
              {levels.map(l => {
                const count = words.filter(w => w.level === l).length;
                if (count === 0) return null;
                return <span key={l} className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">{l}:{count}</span>;
              })}
            </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Tìm từ vựng..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none w-full md:w-48 focus:ring-2 focus:ring-blue-500/20"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={startRichPractice}
            disabled={generatingPractice || words.length === 0}
            className="btn-primary py-2 px-6 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50"
          >
            {generatingPractice ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <PlayCircle size={18} />}
            Luyện tập SR
          </button>
        </div>
      </div>

      {/* Word list with SR Badges */}
      {words.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
          <BookMarked size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-bold text-gray-700">Chưa có từ vựng nào</h3>
          <p className="text-gray-500 text-sm">Tra từ điển để lưu từ mới vào kho.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {words.map((w) => {
            const isDue = w.next_review ? new Date(w.next_review) <= new Date() : true;
            return (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group relative overflow-hidden">
                {isDue && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] px-2 py-0.5 font-bold rounded-bl-lg">CẦN ÔN TẬP</div>}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-blue-800">{w.word}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 font-bold uppercase">{w.pos || 'N/A'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold">{w.level || 'B1'}</span>
                    </div>
                  </div>
                  <button onClick={() => speak(w.word, w.audio_url)} className="p-2 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"><Volume2 size={18} /></button>
                </div>
                
                <p className="text-gray-800 font-medium line-clamp-2 mb-2">{w.meaning_vn}</p>
                {w.example && <p className="text-gray-500 text-xs italic line-clamp-2 border-l-2 border-gray-200 pl-2">{w.example}</p>}
                
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400">
                    <div className="flex gap-2">
                        <span>Đã thuộc: {Math.min(w.review_count || 0, 5)}/5</span>
                        <div className="flex gap-0.5 items-center">
                            {[1,2,3,4,5].map(step => (
                                <div key={step} className={`w-1.5 h-1.5 rounded-full ${step <= (w.review_count || 0) ? 'bg-green-500' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={() => deleteWord(w.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Practice Exercise UI Overlay */}
      {practiceExercises.length > 0 && currentEx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
              <div>
                <p className="text-xs opacity-80 font-bold uppercase tracking-widest mb-1">Cấp độ: {currentEx.level || 'B1'}</p>
                <h3 className="font-extrabold text-xl flex items-center gap-2 underline decoration-blue-400 underline-offset-4 decoration-2">
                  <Brain size={24} /> Câu hỏi {currentExerciseIdx + 1}/{practiceExercises.length}
                </h3>
              </div>
              <button onClick={() => setPracticeExercises([])} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"><X size={24} /></button>
            </div>
            
            <div className="p-8">
              <div className="mb-8">
                <p className="text-gray-400 text-sm font-bold uppercase mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-500" /> AI Instruction
                </p>
                <h4 className="text-2xl font-black text-gray-900 leading-tight mb-4">{currentEx.question}</h4>
                
                {currentEx.type === 'fill_blank' && (
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 italic text-gray-700 border-l-4 border-l-blue-500">
                    "{currentEx.context}"
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {currentEx.options ? (
                  <div className="grid grid-cols-1 gap-3">
                    {currentEx.options.map((opt: string, i: number) => {
                      const isSelected = practiceAnswers[currentExerciseIdx] === opt;
                      const isCorrect = opt === currentEx.answer;
                      let cls = "border-gray-100 bg-gray-50 hover:border-blue-300 hover:shadow-md";
                      if (exerciseSubmitted) {
                        if (isCorrect) cls = "border-green-500 bg-green-50 text-green-700 ring-4 ring-green-500/10";
                        else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
                        else cls = "opacity-40 grayscale";
                      } else if (isSelected) cls = "border-blue-600 bg-blue-50 text-blue-700 ring-4 ring-blue-500/10";

                      return (
                        <button key={i} disabled={exerciseSubmitted}
                          onClick={() => setPracticeAnswers({ ...practiceAnswers, [currentExerciseIdx]: opt })}
                          className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 font-bold text-lg ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      autoFocus type="text"
                      value={practiceAnswers[currentExerciseIdx] || ""}
                      onChange={e => setPracticeAnswers({ ...practiceAnswers, [currentExerciseIdx]: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter' && !exerciseSubmitted) submitCurrentExercise(); }}
                      placeholder="Gõ đáp án của bạn..."
                      className={`w-full text-2xl p-6 border-2 rounded-2xl outline-none transition-all font-bold ${exerciseSubmitted ? (practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-100 bg-gray-50 focus:border-blue-500 focus:bg-white focus:shadow-xl"}`}
                      disabled={exerciseSubmitted}
                    />
                  </div>
                )}

                {showHint && !exerciseSubmitted && (
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-yellow-800 text-sm animate-in slide-in-from-top-2">
                        <strong>Gợi ý từ AI:</strong> {currentEx.hint_vn || "Hãy nghĩ về nghĩa tiếng Việt của từ này."}
                    </div>
                )}
              </div>

              {exerciseSubmitted && (
                <div className={`mt-8 p-5 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 ${practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  <div className={`p-3 rounded-full ${practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? <CheckCircle2 size={32} /> : <X size={32} />}
                  </div>
                  <div>
                    <h5 className="font-black text-lg">{practiceAnswers[currentExerciseIdx]?.toLowerCase().trim() === currentEx.answer.toLowerCase() ? "Tuyệt vời!" : "Chưa chính xác!"}</h5>
                    <p className="font-medium">Đáp án đúng: <span className="underline decoration-2">{currentEx.answer}</span></p>
                    {currentEx.explanation_vn && <p className="text-sm mt-1 opacity-80">{currentEx.explanation_vn}</p>}
                  </div>
                </div>
              )}

              <div className="mt-10 flex justify-between items-center">
                {!exerciseSubmitted ? (
                    <>
                        <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-yellow-600 font-bold flex items-center gap-1 transition">
                            <Lightbulb size={18} /> {showHint ? "Ẩn gợi ý" : "Xem gợi ý"}
                        </button>
                        <button onClick={submitCurrentExercise} disabled={!practiceAnswers[currentExerciseIdx]} className="btn-primary px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition transform active:scale-95 disabled:opacity-50">
                            KIỂM TRA
                        </button>
                    </>
                ) : (
                  <button onClick={nextExercise} className="ml-auto bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-lg flex items-center gap-2 hover:bg-black transition shadow-xl transform active:scale-95">
                    {currentExerciseIdx < practiceExercises.length - 1 ? "TIẾP THEO" : "HOÀN THÀNH"} <ArrowRight size={24} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SCORES TAB ====================
function ScoresTab() {
  const { token, authFetch } = useAuth();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/scores`);
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
const IPA_DATA = {
  vowels: [
    { ipa: "iː", example: "see", transcription: "siː", desc: "Long E" }, { ipa: "ɪ", example: "sit", transcription: "sɪt", desc: "Short I" },
    { ipa: "ʊ", example: "put", transcription: "pʊt", desc: "Short U" }, { ipa: "uː", example: "two", transcription: "tuː", desc: "Long U" },
    { ipa: "e", example: "ten", transcription: "ten", desc: "Short E" }, { ipa: "ə", example: "about", transcription: "əˈbaʊt", desc: "Schwa" },
    { ipa: "ɜː", example: "bird", transcription: "bɜːd", desc: "Long R-colored" }, { ipa: "ɔː", example: "saw", transcription: "sɔː", desc: "Long O" },
    { ipa: "æ", example: "cat", transcription: "kæt", desc: "Short A" }, { ipa: "ʌ", example: "cup", transcription: "kʌp", desc: "Short U" },
    { ipa: "ɑː", example: "arm", transcription: "ɑːm", desc: "Long A" }, { ipa: "ɒ", example: "hot", transcription: "hɒt", desc: "Short O" }
  ],
  diphthongs: [
    { ipa: "ɪə", example: "near", transcription: "nɪə", desc: "Ear" }, { ipa: "eɪ", example: "day", transcription: "deɪ", desc: "A" },
    { ipa: "ʊə", example: "tour", transcription: "tʊə", desc: "Ure" }, { ipa: "ɔɪ", example: "boy", transcription: "bɔɪ", desc: "Oy" },
    { ipa: "əʊ", example: "go", transcription: "gəʊ", desc: "Oh" }, { ipa: "eə", example: "hair", transcription: "heə", desc: "Air" },
    { ipa: "aɪ", example: "my", transcription: "maɪ", desc: "Eye" }, { ipa: "aʊ", example: "how", transcription: "haʊ", desc: "Ow" }
  ],
  consonants: [
    { ipa: "p", example: "pen", transcription: "pen", desc: "Voiceless bilabial" }, { ipa: "b", example: "bad", transcription: "bæd", desc: "Voiced bilabial" },
    { ipa: "t", example: "tea", transcription: "tiː", desc: "Voiceless alveolar" }, { ipa: "d", example: "did", transcription: "dɪd", desc: "Voiced alveolar" },
    { ipa: "tʃ", example: "chain", transcription: "tʃeɪn", desc: "Voiceless affricate" }, { ipa: "dʒ", example: "jam", transcription: "dʒæm", desc: "Voiced affricate" },
    { ipa: "k", example: "cat", transcription: "kæt", desc: "Voiceless velar" }, { ipa: "g", example: "get", transcription: "get", desc: "Voiced velar" },
    { ipa: "f", example: "fall", transcription: "fɔːl", desc: "Voiceless labiodental" }, { ipa: "v", example: "van", transcription: "væn", desc: "Voiced labiodental" },
    { ipa: "θ", example: "thin", transcription: "θɪn", desc: "Voiceless dental" }, { ipa: "ð", example: "this", transcription: "ðɪs", desc: "Voiced dental" },
    { ipa: "s", example: "see", transcription: "siː", desc: "Voiceless alveolar" }, { ipa: "z", example: "zoo", transcription: "zuː", desc: "Voiced alveolar" },
    { ipa: "ʃ", example: "shoe", transcription: "ʃuː", desc: "Voiceless palatal" }, { ipa: "ʒ", example: "vision", transcription: "ˈvɪʒ.ən", desc: "Voiced palatal" },
    { ipa: "m", example: "man", transcription: "mæn", desc: "Bilabial nasal" }, { ipa: "n", example: "now", transcription: "naʊ", desc: "Alveolar nasal" },
    { ipa: "ŋ", example: "sing", transcription: "sɪŋ", desc: "Velar nasal" }, { ipa: "h", example: "hat", transcription: "hæt", desc: "Glottal fricative" },
    { ipa: "l", example: "leg", transcription: "leg", desc: "Lateral approximant" }, { ipa: "r", example: "red", transcription: "red", desc: "Alveolar approximant" },
    { ipa: "w", example: "wet", transcription: "wet", desc: "Labio-velar" }, { ipa: "j", example: "yes", transcription: "jes", desc: "Palatal approximant" }
  ]
};

function IpaTab() {
  const { token, authFetch, refreshUser } = useAuth();
  const [focus, setFocus] = useState("vowels");
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const generateLesson = async () => {
    setLoading(true);
    setLesson(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    try {
      const res = await authFetch(`${API_URL}/student/ipa/generate`, {
        method: "POST",
        body: JSON.stringify({ focus })
      });
      
      if (!res.ok) throw new Error("API Error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let finalData: any = {};

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
      setLesson(finalData);
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

  const submitQuiz = () => {
    if (Object.keys(quizAnswers).length === 0) {
      alert("Vui lòng trả lời ít nhất một câu hỏi!");
      return;
    }
    let correct = 0;
    lesson.quiz?.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.correct_answer || quizAnswers[idx] === q.ans) correct++;
    });
    setQuizScore(correct);
    setQuizSubmitted(true);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <BookOpen className="text-blue-500" /> Bảng phiên âm quốc tế (44 âm IPA)
        </h2>

        {/* Vowels */}
        <h3 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">Nguyên âm (Vowels)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {IPA_DATA.vowels.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm hover:border-blue-300 hover:bg-blue-50 transition text-center cursor-pointer group" onClick={() => speak(s.example)}>
              <div className="text-3xl font-mono text-blue-600 font-bold mb-2">/{s.ipa}/</div>
              <div className="font-bold text-gray-800">{s.example} <span className="text-xs text-gray-500 font-normal">/{s.transcription}/</span></div>
              <button className="mt-2 opacity-0 group-hover:opacity-100 transition"><Volume2 size={16} className="text-blue-500 mx-auto" /></button>
            </div>
          ))}
        </div>

        {/* Diphthongs */}
        <h3 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-purple-500 pl-3">Nguyên âm đôi (Diphthongs)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {IPA_DATA.diphthongs.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm hover:border-purple-300 hover:bg-purple-50 transition text-center cursor-pointer group" onClick={() => speak(s.example)}>
              <div className="text-3xl font-mono text-purple-600 font-bold mb-2">/{s.ipa}/</div>
              <div className="font-bold text-gray-800">{s.example} <span className="text-xs text-gray-500 font-normal">/{s.transcription}/</span></div>
              <button className="mt-2 opacity-0 group-hover:opacity-100 transition"><Volume2 size={16} className="text-purple-500 mx-auto" /></button>
            </div>
          ))}
        </div>

        {/* Consonants */}
        <h3 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-green-500 pl-3">Phụ âm (Consonants)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {IPA_DATA.consonants.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm hover:border-green-300 hover:bg-green-50 transition text-center cursor-pointer group" onClick={() => speak(s.example)}>
              <div className="text-3xl font-mono text-green-600 font-bold mb-2">/{s.ipa}/</div>
              <div className="font-bold text-gray-800">{s.example} <span className="text-xs text-gray-500 font-normal">/{s.transcription}/</span></div>
              <button className="mt-2 opacity-0 group-hover:opacity-100 transition"><Volume2 size={16} className="text-green-500 mx-auto" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: AI EXERCISE GENERATION */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 shadow-sm text-center">
        <h2 className="text-xl font-bold text-indigo-900 mb-2 flex items-center justify-center gap-2">
          <Brain className="text-indigo-500" /> Trợ lý AI tạo bài tập Luyện Âm
        </h2>
        <p className="text-indigo-700 mb-6 mt-1">Chọn nhóm âm, AI sẽ cá nhân hoá các cặp từ dễ nhầm lẫn và trắc nghiệm thực hành cho riêng bạn.</p>

        <div className="flex justify-center gap-4">
          <select value={focus} onChange={e => setFocus(e.target.value)} className="border border-indigo-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-gray-700 bg-white">
            <option value="vowels">Luyện Nguyên âm</option>
            <option value="consonants">Luyện Phụ âm</option>
            <option value="diphthongs">Luyện Nguyên âm đôi</option>
            <option value="difficult">Luyện các âm khó (th, r, l...)</option>
          </select>
          <button onClick={generateLesson} disabled={loading} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition shadow-md">
            {loading ? "Đang soạn bài..." : <><Sparkles size={18} /> Sinh bài tập AI</>}
          </button>
        </div>
      </div>

      {/* AI EXERCISE RESULTS */}
      {lesson && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900">{lesson.lesson_title || "Bài luyện tập phát âm"}</h3>
            <p className="text-gray-500 max-w-2xl mx-auto mt-2">{lesson.introduction}</p>
          </div>

          {/* Minimal Pairs */}
          {lesson.minimal_pairs && lesson.minimal_pairs.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Headphones className="mr-2 text-blue-500" size={20} /> Phân biệt cặp từ dễ nhầm lẫn (Minimal Pairs)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lesson.minimal_pairs.map((mp: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-center flex-1 cursor-pointer group" onClick={() => speak(mp.word1)}>
                      <div className="font-bold text-lg text-gray-900 group-hover:text-blue-600">{mp.word1}</div>
                      <div className="font-mono text-sm text-gray-500 mb-1">/{mp.ipa1}/</div>
                      <Volume2 size={14} className="mx-auto text-blue-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <div className="font-extrabold text-blue-400 px-4">VS</div>
                    <div className="text-center flex-1 cursor-pointer group" onClick={() => speak(mp.word2)}>
                      <div className="font-bold text-lg text-gray-900 group-hover:text-red-600">{mp.word2}</div>
                      <div className="font-mono text-sm text-gray-500 mb-1">/{mp.ipa2}/</div>
                      <Volume2 size={14} className="mx-auto text-red-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Practice Sentences */}
          {lesson.practice_sentences && lesson.practice_sentences.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Mic className="mr-2 text-green-500" size={20} /> Luyện đọc câu (Speaking Practice)</h4>
              <div className="space-y-3">
                {lesson.practice_sentences.map((sent: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-green-50/50 transition cursor-pointer flex items-center justify-between" onClick={() => speak(sent.sentence)}>
                    <div>
                      <p className="font-bold text-gray-900 mb-1 text-lg">{sent.sentence}</p>
                      <p className="font-mono text-sm text-gray-500">/{sent.ipa}/</p>
                    </div>
                    <Volume2 size={24} className="text-green-500 min-w-[24px]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz */}
          {lesson.quiz && lesson.quiz.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Edit3 className="mr-2 text-purple-500" size={20} /> Trắc nghiệm kiểm tra</h4>
              <div className="space-y-4">
                {lesson.quiz.map((q: any, idx: number) => (
                  <div key={idx} className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="font-bold text-gray-900 mb-3">{idx + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                          <input
                            type="radio"
                            name={`quiz-${idx}`}
                            id={`q-${idx}-${oIdx}`}
                            checked={quizAnswers[idx] === oIdx}
                            onChange={() => setQuizAnswers({...quizAnswers, [idx]: oIdx})}
                            disabled={quizSubmitted}
                            className="w-4 h-4 text-purple-600"
                          />
                          <label htmlFor={`q-${idx}-${oIdx}`} className={quizSubmitted ? (oIdx === q.correct_answer || oIdx === q.ans ? "text-green-700 font-medium" : quizAnswers[idx] === oIdx ? "text-red-700" : "") : "text-sm font-medium"}>
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {!quizSubmitted && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={submitQuiz}
                      className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2 mx-auto"
                    >
                      <CheckCircle2 size={20} /> Nộp bài kiểm tra
                    </button>
                  </div>
                )}

                {quizSubmitted && (
                  <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200 text-center">
                    <div className="text-2xl font-bold text-green-700 mb-2">
                      Điểm: {quizScore}/{lesson.quiz?.length || 0}
                    </div>
                    <p className="text-green-600">
                      {quizScore === lesson.quiz?.length ? "Xuất sắc! 🎉" :
                        quizScore >= (lesson.quiz?.length || 0) * 0.8 ? "Tốt! 👍" :
                        quizScore >= (lesson.quiz?.length || 0) * 0.6 ? "Khá! 👌" : "Cần luyện tập thêm! 💪"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== NEW: PRACTICE TAB ====================
function PracticeTab({ setShowCreditModal }: { setShowCreditModal: (s: boolean) => void }) {
  const { token, user, authFetch, refreshUser } = useAuth();
  const [testType, setTestType] = useState("TOEIC");
  const [skill, setSkill] = useState("reading");
  const [loading, setLoading] = useState(false);
  const [practice, setPractice] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [source, setSource] = useState<"ai" | "official">("ai");

  const generatePractice = async () => {
    if (source === "official") {
      // Use mock data
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
              } else if (chunkData.chunk) {
                // Partial update for visual feedback if needed
              }
            } catch (e) { }
          }
        }
      }
      refreshUser();
      
      // Handle the last bit of buffer
      if (buffer.trim()) {
          try {
              let rawJson = buffer.trim();
              if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
              if (rawJson !== "[DONE]") {
                  const chunkData = JSON.parse(rawJson);
                  finalData = { ...finalData, ...chunkData };
              }
          } catch (e) {}
      }

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

      {practice && (skill === "listening" || skill === "writing" || !["reading", "speaking"].includes(skill)) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
          Yêu cầu tính năng {skill} đã được mô phỏng. Dữ liệu mock: {JSON.stringify(practice).substring(0, 100)}...
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

// ==================== GRAMMAR TAB ====================
function GrammarTab() {
  const { token, authFetch, refreshUser } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [practicing, setPracticing] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

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

// ==================== RANKING TAB ====================
function RankingTab() {
  const { token, authFetch } = useAuth();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/student/ranking`);
        if (res.ok) setRanking(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-in fade-in zoom-in-95 duration-300">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Trophy className="text-yellow-500" /> Bảng xếp hạng toàn cầu</h2>
      <div className="space-y-3">
        {ranking.map((r, i) => (
          <div key={i} className={`flex items-center justify-between p-4 rounded-xl border ${i === 0 ? 'bg-yellow-50 border-yellow-200' : i === 1 ? 'bg-gray-50 border-gray-200' : i === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-50'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {i + 1}
              </div>
              <p className="font-bold text-gray-800">{r.name}</p>
            </div>
            <p className="font-extrabold text-blue-600">{r.points} pts</p>
          </div>
        ))}
      </div>
    </div>
  );
}
