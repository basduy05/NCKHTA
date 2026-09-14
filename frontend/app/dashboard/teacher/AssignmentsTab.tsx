"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import {
  BrainCircuit, Plus, X, Trash2, Check, Sparkles, Brain,
  BookOpen, CheckCircle2, ClipboardList, Users, BarChart3
} from "lucide-react";

interface AssignmentsTabProps {
  API_URL?: string;
  handleTextareaDoubleClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
}

export function AssignmentsTab({
  API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com",
  handleTextareaDoubleClick
}: AssignmentsTabProps) {
  const { refreshUser, authFetch, token } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formType, setFormType] = useState("quiz");
  const [formQuizText, setFormQuizText] = useState("");
  const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedScores, setExpandedScores] = useState<number | null>(null);
  const [scores, setScores] = useState<any[]>([]);
  
  // News state
  const [newsTopics, setNewsTopics] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any>(null);

  // Phase 3: Teacher Quiz Builder states (Task 3.8)
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderDesc, setBuilderDesc] = useState("");
  const [builderTimeLimit, setBuilderTimeLimit] = useState(15);
  const [builderDue, setBuilderDue] = useState("");
  const [builderQuestions, setBuilderQuestions] = useState<Array<{
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    points: number;
  }>>([
    { question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", points: 10 }
  ]);
  const [publishingQuiz, setPublishingQuiz] = useState(false);

  const handlePublishQuizBuilder = async () => {
    if (!builderTitle.trim()) return showAlert("Vui lòng nhập tên bài Quiz", "warning");
    if (!selectedClass) return showAlert("Vui lòng chọn lớp học", "warning");
    const validQuestions = builderQuestions.filter(q => q.question.trim() && q.options.some(o => o.trim()));
    if (validQuestions.length === 0) return showAlert("Bài Quiz phải có ít nhất 1 câu hỏi", "warning");

    setPublishingQuiz(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/quiz-builder/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClass,
          title: builderTitle,
          description: builderDesc,
          time_limit_minutes: builderTimeLimit,
          due_date: builderDue,
          questions: validQuestions
        })
      });
      if (res.ok) {
        const data = await res.json();
        showAlert(data.message || "Đã xuất bản bài Quiz thành công!", "success");
        setShowQuizBuilder(false);
        setBuilderTitle("");
        setBuilderDesc("");
        setBuilderQuestions([{ question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", points: 10 }]);
        if (selectedClass) fetchAssignments(selectedClass);
      } else {
        const err = await res.json().catch(() => ({}));
        showAlert(err.detail || "Không thể tạo bài Quiz", "error");
      }
    } catch (e) {
      showAlert("Lỗi kết nối máy chủ", "error");
    } finally {
      setPublishingQuiz(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/teacher/my-classes`);
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
          if (data.length > 0) setSelectedClass(data[0].id);
        }
      } catch (e) { console.error(e); }
    })();
  }, [token]);

  const fetchAssignments = async (classId: number) => {
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes/${classId}/assignments`);
      if (res.ok) setAssignments(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedClass) fetchAssignments(selectedClass);
  }, [selectedClass]);

  const handleGenerateQuiz = async () => {
    if (!formQuizText.trim()) return showAlert("Vui lòng nhập nội dung để AI tạo quiz", 'warning');
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append("text", formQuizText);
      formData.append("num_questions", "5");
      const res = await authFetch(`${API_URL}/teacher/generate-quiz`, {
        method: "POST", body: formData
      });
      if (res.ok) {
        const data = await res.json();
        refreshUser();
        setGeneratedQuiz(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); showAlert("Lỗi khi tạo quiz", 'error'); }
    finally { setGenerating(false); }
  };

  const fetchNewsTopics = async () => {
    setNewsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/news/topics?query=science&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setNewsTopics(data.articles || []);
      }
    } catch(e) { console.error(e); }
    finally { setNewsLoading(false); }
  };

  const handleGenerateReading = async () => {
    if (!selectedNews) return showAlert("Vui lòng chọn một bài báo", 'warning');
    setGenerating(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/news/generate-assignment`, {
        method: "POST", body: JSON.stringify({
          title: selectedNews.title,
          content: selectedNews.content,
          difficulty: "Medium",
          num_questions: 5
        }),
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        refreshUser();
        setGeneratedQuiz(data.questions || []);
        if (data.passage) setFormQuizText(data.passage);
        showAlert("Đã tạo bài tập Reading thành công!", 'success');
      } else {
        showAlert("Lỗi khi tạo bài tập Reading", 'error');
      }
    } catch(e) { console.error(e); showAlert("Lỗi kết nối", 'error'); }
    finally { setGenerating(false); }
  };

  const handleSaveAssignment = async () => {
    if (!formTitle.trim() || !selectedClass) return showAlert("Vui lòng nhập tiêu đề", 'warning');
    console.log("[DEBUG] Starting save assignment operation");
    const startTime = Date.now();
    const body = {
      class_id: selectedClass,
      title: formTitle,
      description: formDesc,
      type: formType,
      quiz_data: formType === "quiz" && generatedQuiz.length > 0 ? JSON.stringify(generatedQuiz) : "",
      due_date: formDue
    };
    try {
      const res = await authFetch(`${API_URL}/teacher/assignments`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (res.ok) {
        console.log(`[DEBUG] Assignment save successful in ${Date.now() - startTime}ms`);
        setShowForm(false); setFormTitle(""); setFormDesc(""); setFormDue(""); setFormType("quiz"); setFormQuizText(""); setGeneratedQuiz([]);
        fetchAssignments(selectedClass!);
      } else {
        console.error(`[DEBUG] Assignment save failed with status ${res.status}: ${await res.text()}`);
        showAlert("Lỗi khi lưu bài tập", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Assignment save error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi lưu bài tập", 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("Xoá bài tập này?");
    if (!confirmed) return;
    console.log("[DEBUG] Starting delete assignment operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/teacher/assignments/${id}`, { method: "DELETE" });
      if (res.ok) {
        console.log(`[DEBUG] Assignment delete successful in ${Date.now() - startTime}ms`);
        if (selectedClass) fetchAssignments(selectedClass);
      } else {
        console.error(`[DEBUG] Assignment delete failed with status ${res.status}: ${await res.text()}`);
        showAlert("Lỗi khi xoá bài tập", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Assignment delete error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi xoá bài tập", 'error');
    }
  };

  const toggleScores = async (assignmentId: number) => {
    if (expandedScores === assignmentId) { setExpandedScores(null); return; }
    try {
      const res = await authFetch(`${API_URL}/teacher/assignments/${assignmentId}/scores`);
      if (res.ok) setScores(await res.json());
    } catch (e) { console.error(e); }
    setExpandedScores(assignmentId);
  };

  const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    quiz:     { label: "Quiz",     color: "text-purple-700", bg: "bg-purple-50 border-purple-100" },
    reading:  { label: "Reading",  color: "text-blue-700",   bg: "bg-blue-50 border-blue-100" },
    writing:  { label: "Writing",  color: "text-orange-700", bg: "bg-orange-50 border-orange-100" },
    speaking: { label: "Speaking", color: "text-green-700",  bg: "bg-green-50 border-green-100" },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="font-semibold text-gray-700">Lớp:</label>
          <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value))}
            className="border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-3 outline-none font-bold text-gray-700 min-w-[220px] transition-all">
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowQuizBuilder(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:opacity-95 font-semibold shadow-lg shadow-purple-100 transition-all active:scale-95"
          >
            <BrainCircuit size={18} /> Soạn đề Quiz (Builder)
          </button>
          <button onClick={() => { setShowForm(true); setFormTitle(""); setFormDesc(""); setFormDue(""); setFormType("quiz"); setFormQuizText(""); setGeneratedQuiz([]); }}
            className="flex items-center gap-2 px-5 py-3 bg-[var(--brand)] text-white rounded-2xl hover:bg-[var(--brand-dark)] font-semibold shadow-lg shadow-blue-200 transition-all active:scale-95">
            <Plus size={18} /> Tạo bài tập mới
          </button>
        </div>
      </div>

      {/* MODAL: TEACHER QUIZ BUILDER (Task 3.8) */}
      {showQuizBuilder && (
        <div className="bg-white p-8 rounded-3xl border-2 border-purple-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <BrainCircuit size={22} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900">Quiz Builder &bull; Soạn đề trắc nghiệm giáo viên</h3>
                <p className="text-xs text-gray-500">Tự do xây dựng ngân hàng câu hỏi tùy chỉnh kèm đáp án và lời giải chi tiết</p>
              </div>
            </div>
            <button onClick={() => setShowQuizBuilder(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Tiêu đề bài Quiz</label>
              <input 
                value={builderTitle} 
                onChange={e => setBuilderTitle(e.target.value)} 
                placeholder="VD: Kiểm tra 15 phút - Câu điều kiện hỗn hợp"
                className="w-full border-2 border-gray-100 focus:border-purple-400 rounded-2xl px-4 py-3 outline-none font-semibold text-gray-800 transition" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Thời gian làm bài (phút)</label>
              <input 
                type="number" 
                value={builderTimeLimit} 
                onChange={e => setBuilderTimeLimit(Number(e.target.value))} 
                min={5} max={120}
                className="w-full border-2 border-gray-100 focus:border-purple-400 rounded-2xl px-4 py-3 outline-none font-semibold text-gray-800 transition" 
              />
            </div>
          </div>

          {/* Question list */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Danh sách câu hỏi ({builderQuestions.length})
              </h4>
              <button
                type="button"
                onClick={() => setBuilderQuestions([
                  ...builderQuestions,
                  { question: "", options: ["", "", "", ""], correct_answer: 0, explanation: "", points: 10 }
                ])}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition"
              >
                <Plus size={14} /> Thêm câu hỏi
              </button>
            </div>

            {builderQuestions.map((q, qIdx) => (
              <div key={qIdx} className="bg-gray-50/80 border border-gray-200 rounded-2xl p-5 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-lg">
                    Câu hỏi #{qIdx + 1}
                  </span>
                  {builderQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBuilderQuestions(builderQuestions.filter((_, idx) => idx !== qIdx))}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Xoá câu này
                    </button>
                  )}
                </div>

                <div>
                  <textarea
                    value={q.question}
                    onChange={e => {
                      const updated = [...builderQuestions];
                      updated[qIdx].question = e.target.value;
                      setBuilderQuestions(updated);
                    }}
                    placeholder={`Nhập nội dung câu hỏi ${qIdx + 1}...`}
                    rows={2}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-800 font-medium outline-none focus:border-purple-400"
                  />
                </div>

                {/* 4 Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                      <input
                        type="radio"
                        name={`correct_${qIdx}`}
                        checked={q.correct_answer === optIdx}
                        onChange={() => {
                          const updated = [...builderQuestions];
                          updated[qIdx].correct_answer = optIdx;
                          setBuilderQuestions(updated);
                        }}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-400">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      <input
                        value={opt}
                        onChange={e => {
                          const updated = [...builderQuestions];
                          updated[qIdx].options[optIdx] = e.target.value;
                          setBuilderQuestions(updated);
                        }}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + optIdx)}`}
                        className="w-full text-xs text-gray-700 outline-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div>
                  <input
                    value={q.explanation}
                    onChange={e => {
                      const updated = [...builderQuestions];
                      updated[qIdx].explanation = e.target.value;
                      setBuilderQuestions(updated);
                    }}
                    placeholder="Giải thích vì sao đáp án đúng (hiển thị khi học sinh nộp bài)..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none focus:border-purple-400"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowQuizBuilder(false)}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
            >
              Huỷ
            </button>
            <button
              onClick={handlePublishQuizBuilder}
              disabled={publishingQuiz}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-200 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Check size={16} />
              {publishingQuiz ? "Đang xuất bản bài..." : "Xuất bản bài Quiz cho lớp"}
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-xl text-gray-900">Tạo bài tập mới</h3>
            <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Tiêu đề bài tập</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="VD: Grammar Quiz - Unit 5: Present Perfect"
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-bold text-gray-700 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Loại bài tập</label>
              <select value={formType} onChange={e => setFormType(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-semibold text-gray-700 transition-all">
                <option value="quiz">Quiz (Trắc nghiệm)</option>
                <option value="reading">Reading (Đọc hiểu)</option>
                <option value="writing">Writing (Viết bài)</option>
                <option value="speaking">Speaking (Nói)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Hạn nộp bài</label>
              <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-bold text-gray-700 transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Mô tả (tuỳ chọn)</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} onDoubleClick={handleTextareaDoubleClick}
                placeholder="Hướng dẫn làm bài..." rows={2}
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-medium text-gray-700 transition-all resize-none" />
            </div>
          </div>

          {formType === "quiz" && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <h4 className="font-semibold text-indigo-700 mb-4 flex items-center gap-2 text-lg"><Sparkles size={20} /> Tạo Quiz bằng AI</h4>
              <textarea value={formQuizText} onChange={e => setFormQuizText(e.target.value)} onDoubleClick={handleTextareaDoubleClick}
                placeholder="Dán đoạn văn tiếng Anh vào đây, AI sẽ tự động tạo câu hỏi trắc nghiệm..." rows={4}
                className="w-full border-2 border-indigo-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-medium text-gray-700 transition-all resize-none bg-white" />
              <button onClick={handleGenerateQuiz} disabled={generating}
                className="mt-4 px-6 py-3 bg-[var(--brand)] text-white rounded-2xl hover:bg-[var(--brand-dark)] font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm transition-all active:scale-95">
                <Brain size={18} /> {generating ? "Đang tạo..." : "Tạo Quiz với AI"}
              </button>
            </div>
          )}

          {formType === "reading" && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100">
              <h4 className="font-semibold text-blue-700 mb-4 flex items-center gap-2 text-lg"><BookOpen size={20} /> Reading từ News API</h4>
              <button onClick={fetchNewsTopics} disabled={newsLoading}
                className="px-5 py-3 bg-white text-blue-600 border-2 border-blue-200 rounded-2xl text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 transition-all active:scale-95">
                {newsLoading ? "Đang tải..." : "Lấy tin tức mới (The Guardian)"}
              </button>
              {newsTopics.length > 0 && (
                <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">
                  {newsTopics.map((news, idx) => (
                    <div key={idx} onClick={() => setSelectedNews(news)}
                      className={`p-4 border-2 rounded-2xl cursor-pointer text-sm transition-all ${selectedNews?.title === news.title ? "bg-blue-100 border-blue-500" : "bg-white border-blue-100 hover:border-blue-300"}`}>
                      <p className="font-semibold text-gray-900">{news.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-1">{news.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedNews && (
                <button onClick={handleGenerateReading} disabled={generating}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold flex items-center gap-2 disabled:opacity-50 shadow-sm transition-all active:scale-95">
                  <Brain size={18} /> {generating ? "Đang tạo bài Reading..." : "Tạo bài Reading test"}
                </button>
              )}
            </div>
          )}

          {generatedQuiz.length > 0 && (
            <div className="bg-green-50 p-6 border border-green-100 rounded-2xl">
              <p className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} /> Đã tạo {generatedQuiz.length} câu hỏi
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {generatedQuiz.map((q: any, i: number) => (
                  <div key={i} className="bg-white p-4 rounded-2xl text-sm shadow-sm border border-gray-100">
                    {q.type && <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] mb-2 font-semibold uppercase">{q.type}</span>}
                    <p className="font-bold text-gray-900">{i + 1}. {q.question || q.q}</p>
                    <div className="ml-4 mt-2 space-y-1 text-gray-600">
                      {(q.options || []).map((opt: string, j: number) => {
                        const ans = q.correct_answer ?? q.ans;
                        const isCorrect = (typeof ans === "number" && j === ans) || (typeof ans === "string" && opt === ans);
                        return (
                          <p key={j} className={isCorrect ? "text-green-700 font-semibold flex items-center gap-1.5" : ""}>
                            {isCorrect && <CheckCircle2 size={13} />} {String.fromCharCode(65 + j)}. {opt}
                          </p>
                        );
                      })}
                    </div>
                    {q.explanation && <p className="text-xs text-[var(--brand)] mt-2 italic bg-indigo-50 p-2 rounded-xl">Giải thích: {q.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="px-6 py-3 font-semibold text-gray-400 hover:text-gray-900 transition">Hủy</button>
            <button onClick={handleSaveAssignment}
              className="px-8 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95">
              <Check size={18} /> Lưu bài tập
            </button>
          </div>
        </div>
      )}

      {/* Assignments list */}
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-dashed border-gray-300 text-center">
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={32} className="text-indigo-400" />
            </div>
            <h3 className="font-semibold text-gray-400 text-xl">Chưa có bài tập nào</h3>
            <p className="text-gray-400 mt-2 font-medium">Nhấn "Tạo bài tập mới" để bắt đầu.</p>
          </div>
        ) : assignments.map((a: any) => {
          const typeConf = TYPE_CONFIG[a.type] || TYPE_CONFIG.quiz;
          const isOverdue = a.due_date && new Date(a.due_date) < new Date();
          return (
            <div key={a.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
              <div className="p-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-2xl border flex-shrink-0 ${typeConf.bg}`}>
                    <ClipboardList size={20} className={typeConf.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase ${typeConf.bg} ${typeConf.color}`}>{typeConf.label}</span>
                      {a.due_date && (
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${isOverdue ? "bg-red-50 text-red-600 border-red-100" : "bg-gray-50 text-gray-500 border-gray-100"}`}>
                          Hạn: {new Date(a.due_date).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-lg leading-tight">{a.title}</h4>
                    {a.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{a.description}</p>}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-sm font-semibold text-[var(--brand)] flex items-center gap-1.5">
                        <Users size={14} /> {a.submissions || 0} bài nộp
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => toggleScores(a.id)}
                    className={`p-2.5 rounded-xl transition-all ${expandedScores === a.id ? "bg-indigo-100 text-indigo-700" : "text-indigo-400 hover:bg-indigo-50 hover:text-[var(--brand)]"}`}
                    title="Xem điểm số">
                    <BarChart3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>

              {expandedScores === a.id && (
                <div className="border-t border-gray-100 p-6 bg-gray-50/70">
                  <h5 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-widest">Kết quả học sinh</h5>
                  {scores.length === 0 ? (
                    <p className="text-gray-400 font-medium text-sm">Chưa có học sinh nào nộp bài.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-gray-400 text-xs uppercase tracking-widest border-b border-gray-200">
                            <th className="pb-3 font-semibold">Học sinh</th>
                            <th className="pb-3 font-semibold">Điểm</th>
                            <th className="pb-3 font-semibold">Nộp lúc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {scores.map((s: any) => (
                            <tr key={s.id} className="hover:bg-white transition-colors">
                              <td className="py-3 font-bold text-gray-900">{s.student_name}</td>
                              <td className="py-3">
                                <span className="font-semibold text-[var(--brand)] bg-indigo-50 px-3 py-1 rounded-xl text-xs">{s.score}/{s.max_score}</span>
                              </td>
                              <td className="py-3 text-gray-400 text-xs">{new Date(s.submitted_at).toLocaleString("vi-VN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AssignmentsTab;
