"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  Users, BookOpen, Plus, Edit, Trash2, GraduationCap, X, Check,
  FileText, Upload, Download, ClipboardList, Sparkles, Brain,
  BarChart3, UserPlus, UserMinus, ChevronDown, ChevronUp, Eye,
  Search, Volume2, ArrowRight, Bookmark, Network, Terminal, AlertCircle
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

function getAuthHeader(token: string | null) {
  return { Authorization: `Bearer ${token}` };
}

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { user, token, isInitialized } = useAuth();
  const router = useRouter();

  // Auth check
  useEffect(() => {
    if (!isInitialized) return;
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.role || "").toString().toLowerCase();
    if (role !== "teacher") {
      router.replace("/dashboard");
    }
  }, [isInitialized, token, user, router]);

  if (!isInitialized || !token || !user) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {activeTab === "overview" && "Tổng quan"}
          {activeTab === "classes" && "Lớp học của tôi"}
          {activeTab === "students" && "Quản lý Học sinh"}
          {activeTab === "lessons" && "Quản lý Bài học"}
          {activeTab === "assignments" && "Bài tập & Kiểm tra"}
          {activeTab === "ai-tools" && "Công cụ AI"}
        </h1>
      </div>

      {activeTab === "overview" && <OverviewTab token={token} />}
      {activeTab === "classes" && <ClassesTab token={token} />}
      {activeTab === "students" && <StudentsTab token={token} />}
      {activeTab === "lessons" && <LessonsTab token={token} />}
      {activeTab === "assignments" && <AssignmentsTab token={token} />}
      {activeTab === "ai-tools" && <AIToolsTab token={token} />}
    </div>
  );
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<div className="text-indigo-600 font-medium">Đang tải...</div>}>
      <TeacherDashboardContent />
    </Suspense>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab({ token }: { token: string | null }) {
  const [stats, setStats] = useState({ classes: 0, students: 0, lessons: 0, assignments: 0, teacher_name: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/teacher/stats`, { headers: getAuthHeader(token) });
        if (res.ok) setStats(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const cards = [
    { label: "Lớp học", value: stats.classes, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Học sinh", value: stats.students, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Bài học", value: stats.lessons, icon: BookOpen, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Bài tập", value: stats.assignments, icon: ClipboardList, color: "text-green-600", bg: "bg-green-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <h2 className="text-2xl font-bold mb-1">Xin chào, {stats.teacher_name || "Giáo viên"}! 👋</h2>
        <p className="text-purple-100">Chào mừng bạn quay trở lại hệ thống iEdu.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cards.map((c, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center">
            <div className={`p-4 rounded-2xl ${c.bg} mr-4`}><c.icon className={c.color} size={28} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">{c.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{loading ? "..." : c.value}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== CLASSES TAB ====================
function ClassesTab({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_URL}/teacher/my-classes`, { headers: getAuthHeader(token) });
      if (res.ok) setClasses(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchClasses(); }, [token]);

  const handleSave = async () => {
    if (!formName.trim()) return alert("Vui lòng nhập tên lớp");
    const formData = new FormData();
    formData.append("name", formName);
    const url = editId ? `${API_URL}/teacher/my-classes/${editId}` : `${API_URL}/teacher/my-classes`;
    const method = editId ? "PUT" : "POST";
    await fetch(url, { method, headers: getAuthHeader(token), body: formData });
    setShowForm(false); setEditId(null); setFormName("");
    fetchClasses();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá lớp này sẽ xoá toàn bộ bài học, bài tập và danh sách học sinh!")) return;
    await fetch(`${API_URL}/teacher/my-classes/${id}`, { method: "DELETE", headers: getAuthHeader(token) });
    fetchClasses();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-500">{classes.length} lớp học</p>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormName(""); }}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus size={18} /> Tạo lớp mới
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4">{editId ? "Sửa lớp học" : "Tạo lớp mới"}</h3>
          <div className="flex gap-3">
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Tên lớp học"
              className="flex-1 border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1">
              <Check size={16} /> Lưu
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {loading ? <p>Đang tải...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c: any) => (
            <div key={c.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{c.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">GV: {c.teacher_name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setShowForm(true); setEditId(c.id); setFormName(c.name); }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Users size={14} /> {c.enrolled_count || 0} học sinh</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== STUDENTS TAB ====================
function StudentsTab({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/teacher/my-classes`, { headers: getAuthHeader(token) });
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
          if (data.length > 0) setSelectedClass(data[0].id);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const fetchStudents = async (classId: number) => {
    try {
      const res = await fetch(`${API_URL}/teacher/my-classes/${classId}/students`, { headers: getAuthHeader(token) });
      if (res.ok) setStudents(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAvailable = async (classId: number) => {
    try {
      const res = await fetch(`${API_URL}/teacher/available-students?class_id=${classId}`, { headers: getAuthHeader(token) });
      if (res.ok) setAvailableStudents(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    }
  }, [selectedClass, token]);

  const handleEnroll = async (studentId: number) => {
    if (!selectedClass) return;
    const formData = new FormData();
    formData.append("student_id", String(studentId));
    await fetch(`${API_URL}/teacher/my-classes/${selectedClass}/enroll`, {
      method: "POST", headers: getAuthHeader(token), body: formData
    });
    fetchStudents(selectedClass);
    fetchAvailable(selectedClass);
  };

  const handleRemove = async (studentId: number) => {
    if (!selectedClass || !confirm("Xoá học sinh khỏi lớp?")) return;
    await fetch(`${API_URL}/teacher/my-classes/${selectedClass}/students/${studentId}`, {
      method: "DELETE", headers: getAuthHeader(token)
    });
    fetchStudents(selectedClass);
  };

  const openEnrollModal = () => {
    if (!selectedClass) return;
    fetchAvailable(selectedClass);
    setShowEnroll(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="font-medium text-gray-700">Lớp:</label>
        <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value))}
          className="border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]">
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={openEnrollModal}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
          <UserPlus size={18} /> Thêm học sinh
        </button>
      </div>

      {/* Enroll modal */}
      {showEnroll && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Thêm học sinh vào lớp</h3>
            <button onClick={() => setShowEnroll(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          {availableStudents.length === 0 ? (
            <p className="text-gray-500 text-sm">Không có học sinh nào khả dụng (tất cả đã trong lớp hoặc chưa có tài khoản STUDENT).</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {availableStudents.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.email}</p>
                  </div>
                  <button onClick={() => handleEnroll(s.id)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1">
                    <UserPlus size={14} /> Thêm
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">Danh sách học sinh ({students.length})</h3>
        {students.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có học sinh nào trong lớp. Nhấn "Thêm học sinh" để bắt đầu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-sm">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">Họ tên</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Ngày tham gia</th>
                  <th className="pb-3 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {students.map((s: any, i: number) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 text-gray-400">{i + 1}</td>
                    <td className="py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 text-gray-500">{s.email}</td>
                    <td className="py-3 text-gray-500">{s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString("vi-VN") : "-"}</td>
                    <td className="py-3">
                      <button onClick={() => handleRemove(s.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xoá khỏi lớp">
                        <UserMinus size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== LESSONS TAB ====================
function LessonsTab({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/teacher/my-classes`, { headers: getAuthHeader(token) });
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
          if (data.length > 0) setSelectedClass(data[0].id);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const fetchLessons = async (classId: number) => {
    try {
      const res = await fetch(`${API_URL}/teacher/my-classes/${classId}/lessons`, { headers: getAuthHeader(token) });
      if (res.ok) setLessons(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedClass) fetchLessons(selectedClass);
  }, [selectedClass, token]);

  const handleSave = async () => {
    if (!formTitle.trim() || !selectedClass) return alert("Vui lòng nhập tiêu đề");
    const formData = new FormData();
    formData.append("title", formTitle);
    formData.append("content", formContent);
    if (formFile) formData.append("file", formFile);

    const url = editId
      ? `${API_URL}/teacher/lessons/${editId}`
      : `${API_URL}/teacher/my-classes/${selectedClass}/lessons`;
    await fetch(url, { method: editId ? "PUT" : "POST", headers: getAuthHeader(token), body: formData });
    resetForm();
    fetchLessons(selectedClass!);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá bài học này?")) return;
    await fetch(`${API_URL}/teacher/lessons/${id}`, { method: "DELETE", headers: getAuthHeader(token) });
    if (selectedClass) fetchLessons(selectedClass);
  };

  const resetForm = () => {
    setShowForm(false); setEditId(null);
    setFormTitle(""); setFormContent(""); setFormFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="font-medium text-gray-700">Lớp:</label>
        <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value))}
          className="border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]">
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormTitle(""); setFormContent(""); setFormFile(null); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
          <Plus size={18} /> Thêm bài học
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">{editId ? "Sửa bài học" : "Tạo bài học mới"}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Tiêu đề bài học"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
            <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Nội dung bài học (tuỳ chọn)" rows={4}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200">
                <Upload size={16} /> {formFile ? formFile.name : "Đính kèm file"}
                <input type="file" className="hidden" onChange={e => setFormFile(e.target.files?.[0] || null)} />
              </label>
              <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                <Check size={16} /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">Danh sách bài học ({lessons.length})</h3>
        {lessons.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có bài học nào. Nhấn "Thêm bài học" để bắt đầu.</p>
        ) : (
          <div className="space-y-3">
            {lessons.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg"><BookOpen size={18} className="text-indigo-600" /></div>
                  <div>
                    <p className="font-medium text-gray-900">{l.title}</p>
                    {l.content && <p className="text-sm text-gray-500 line-clamp-1">{l.content}</p>}
                    {l.file_name && (
                      <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <FileText size={12} /> {l.file_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {l.file_name && (
                    <a href={`${API_URL}/teacher/lessons/${l.id}/file`} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Download size={16} /></a>
                  )}
                  <button onClick={() => { setShowForm(true); setEditId(l.id); setFormTitle(l.title); setFormContent(l.content || ""); setFormFile(null); }}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(l.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== ASSIGNMENTS TAB ====================
function AssignmentsTab({ token }: { token: string | null }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formQuizText, setFormQuizText] = useState("");
  const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedScores, setExpandedScores] = useState<number | null>(null);
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/teacher/my-classes`, { headers: getAuthHeader(token) });
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
      const res = await fetch(`${API_URL}/teacher/my-classes/${classId}/assignments`, { headers: getAuthHeader(token) });
      if (res.ok) setAssignments(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedClass) fetchAssignments(selectedClass);
  }, [selectedClass, token]);

  const handleGenerateQuiz = async () => {
    if (!formQuizText.trim()) return alert("Vui lòng nhập nội dung để AI tạo quiz");
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append("text", formQuizText);
      formData.append("num_questions", "5");
      const res = await fetch(`${API_URL}/teacher/generate-quiz`, {
        method: "POST", headers: getAuthHeader(token), body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedQuiz(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); alert("Lỗi khi tạo quiz"); }
    finally { setGenerating(false); }
  };

  const handleSaveAssignment = async () => {
    if (!formTitle.trim() || !selectedClass) return alert("Vui lòng nhập tiêu đề");
    const body = {
      class_id: selectedClass,
      title: formTitle,
      description: formDesc,
      quiz_data: generatedQuiz.length > 0 ? JSON.stringify(generatedQuiz) : "",
      due_date: formDue
    };
    await fetch(`${API_URL}/teacher/assignments`, {
      method: "POST",
      headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setShowForm(false); setFormTitle(""); setFormDesc(""); setFormDue(""); setFormQuizText(""); setGeneratedQuiz([]);
    fetchAssignments(selectedClass!);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá bài tập này?")) return;
    await fetch(`${API_URL}/teacher/assignments/${id}`, { method: "DELETE", headers: getAuthHeader(token) });
    if (selectedClass) fetchAssignments(selectedClass);
  };

  const toggleScores = async (assignmentId: number) => {
    if (expandedScores === assignmentId) { setExpandedScores(null); return; }
    try {
      const res = await fetch(`${API_URL}/teacher/assignments/${assignmentId}/scores`, { headers: getAuthHeader(token) });
      if (res.ok) setScores(await res.json());
    } catch (e) { console.error(e); }
    setExpandedScores(assignmentId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="font-medium text-gray-700">Lớp:</label>
        <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value))}
          className="border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]">
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => { setShowForm(true); setFormTitle(""); setFormDesc(""); setFormDue(""); setFormQuizText(""); setGeneratedQuiz([]); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
          <Plus size={18} /> Tạo bài tập
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Tạo bài tập mới</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Tiêu đề bài tập"
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Mô tả (tuỳ chọn)" rows={2}
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
          <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)}
            className="border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />

          {/* AI Quiz Generator */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-indigo-100">
            <h4 className="font-bold text-indigo-700 mb-2 flex items-center gap-2"><Sparkles size={18} /> Tạo Quiz bằng AI</h4>
            <textarea value={formQuizText} onChange={e => setFormQuizText(e.target.value)}
              placeholder="Dán đoạn văn tiếng Anh vào đây, AI sẽ tự động tạo câu hỏi trắc nghiệm..." rows={4}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white" />
            <button onClick={handleGenerateQuiz} disabled={generating}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
              <Brain size={16} /> {generating ? "Đang tạo..." : "Tạo Quiz"}
            </button>
            {generatedQuiz.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-green-700 font-medium">Đã tạo {generatedQuiz.length} câu hỏi</p>
                {generatedQuiz.map((q: any, i: number) => (
                  <div key={i} className="bg-white p-3 rounded-lg text-sm">
                    <p className="font-medium">{i + 1}. {q.question || q.q}</p>
                    <div className="ml-4 mt-1 text-gray-600">
                      {(q.options || []).map((opt: string, j: number) => (
                        <p key={j} className={j === (q.correct_answer ?? q.ans) ? "text-green-700 font-medium" : ""}>
                          {String.fromCharCode(65 + j)}. {opt}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSaveAssignment}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Check size={16} /> Lưu bài tập
          </button>
        </div>
      )}

      {/* Assignments list */}
      <div className="space-y-3">
        {assignments.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
            Chưa có bài tập nào. Nhấn "Tạo bài tập" để bắt đầu.
          </div>
        ) : assignments.map((a: any) => (
          <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><ClipboardList size={18} className="text-green-600" /></div>
                <div>
                  <p className="font-bold text-gray-900">{a.title}</p>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    {a.description && <span>{a.description}</span>}
                    {a.due_date && <span>Hạn: {new Date(a.due_date).toLocaleDateString("vi-VN")}</span>}
                    <span>{a.submissions || 0} bài nộp</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleScores(a.id)}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Xem điểm">
                  <BarChart3 size={16} />
                </button>
                <button onClick={() => handleDelete(a.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
            {expandedScores === a.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                {scores.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có học sinh nào nộp bài.</p>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="pb-2 font-medium">Học sinh</th>
                        <th className="pb-2 font-medium">Điểm</th>
                        <th className="pb-2 font-medium">Nộp lúc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((s: any) => (
                        <tr key={s.id} className="border-t border-gray-100">
                          <td className="py-2">{s.student_name}</td>
                          <td className="py-2 font-bold text-indigo-600">{s.score}/{s.max_score}</td>
                          <td className="py-2 text-gray-500">{new Date(s.submitted_at).toLocaleString("vi-VN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== AI TOOLS TAB ====================
function AIToolsTab({ token }: { token: string | null }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [loading, setLoading] = useState(false);
  const [vocabResult, setVocabResult] = useState<any[]>([]);
  const [quizResult, setQuizResult] = useState<any[]>([]);
  const [activeAI, setActiveAI] = useState<"vocab" | "quiz" | "dict" | "graph">("vocab");

  // Dictionary state
  const [dictWord, setDictWord] = useState("");
  const [dictResult, setDictResult] = useState<any>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup AbortController on unmount or when search changes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Knowledge graph state
  const [graphData, setGraphData] = useState<any>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphTopic, setGraphTopic] = useState("all");

  const handleExtractVocab = async () => {
    if (!text.trim()) return;
    setLoading(true); setVocabResult([]);
    try {
      const formData = new FormData();
      formData.append("text", text);
      const res = await fetch(`${API_URL}/teacher/generate-vocab`, {
        method: "POST", headers: getAuthHeader(token), body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setVocabResult(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); alert("Lỗi khi trích xuất từ vựng"); }
    finally { setLoading(false); }
  };

  const handleGenerateQuiz = async () => {
    if (!text.trim()) return;
    setLoading(true); setQuizResult([]);
    try {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("num_questions", "5");
      const res = await fetch(`${API_URL}/teacher/generate-quiz`, {
        method: "POST", headers: getAuthHeader(token), body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setQuizResult(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); alert("Lỗi khi tạo quiz"); }
    finally { setLoading(false); }
  };

  const handleFileProcess = async () => {
    if (!file) return;
    setLoading(true); setVocabResult([]); setQuizResult([]);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append("file", file);
      formData.append("num_questions", "5");
      formData.append("exercise_type", "mixed");

      const res = await fetch(`${API_URL}/teacher/file/generate-assignment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // Form data, drop content type
        body: formData
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.result || json;
        if (data.vocabulary) setVocabResult(data.vocabulary);
        if (data.quiz) setQuizResult(data.quiz);
      }
    } catch (e) { console.error(e); alert("Lỗi khi phân tích tệp"); }
    finally { setLoading(false); }
  };

  const handleDictLookup = async () => {
    if (!dictWord.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setDictLoading(true);
    setDictResult(null);
    setDictError(null);

    // Add temporary thinking state
    setDictResult({ status: "thinking", word: dictWord.trim(), meanings: [], elapsed: 0 });

    try {
      const res = await fetch(`${API_URL}/teacher/dictionary/lookup`, {
        method: "POST",
        headers: { ...getAuthHeader(token), "Content-Type": "application/json" },
        body: JSON.stringify({ word: dictWord.trim() }),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Lỗi tra từ điển");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let finalData: any = { word: dictWord.trim(), meanings: [] };

      while (reader && !done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() && line.startsWith("data: ")) {
              try {
                const rawJson = line.replace("data: ", "");
                if (rawJson === "[DONE]") continue;
                const chunkData = JSON.parse(rawJson);
                finalData = { ...finalData, ...chunkData };
                setDictResult({ ...finalData });
              } catch (e) { }
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
      setDictError(e.message || "Lỗi kết nối");
      setDictResult(null);
    } finally {
      setDictLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelDictLookup = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setDictLoading(false);
      setDictResult(null);
    }
  };

  const handleLoadGraph = async () => {
    setGraphLoading(true); setGraphData(null);
    try {
      const res = await fetch(`${API_URL}/teacher/knowledge-graph?topic=${encodeURIComponent(graphTopic)}`, {
        headers: getAuthHeader(token)
      });
      if (res.ok) setGraphData(await res.json());
    } catch (e) { console.error(e); }
    finally { setGraphLoading(false); }
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
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles size={24} /> Công cụ AI cho Giáo viên</h2>
        <p className="text-amber-100 mt-1">Trích xuất từ vựng, tạo quiz, tra từ điển, và xem đồ thị tri thức.</p>
      </div>

      {/* Tool tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "vocab", label: "Trích xuất & Quiz", icon: BookOpen, color: "purple" },
          { id: "dict", label: "Tra từ điển", icon: Search, color: "blue" },
          { id: "graph", label: "Đồ thị tri thức", icon: Network, color: "cyan" },
        ].map((tab) => {
          const colors: Record<string, string> = { purple: "bg-purple-600", blue: "bg-blue-600", cyan: "bg-cyan-600" };
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAI(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${activeAI === tab.id ? `${colors[tab.color]} text-white shadow-md` : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Vocab/Quiz tool */}
      {(activeAI === "vocab" || activeAI === "quiz") && (
        <>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            {/* Input Type Tabs */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setInputMode("text")} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${inputMode === "text" ? "bg-indigo-100 text-indigo-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                Nhập văn bản
              </button>
              <button onClick={() => setInputMode("file")} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${inputMode === "file" ? "bg-indigo-100 text-indigo-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
                Tải tệp lên
              </button>
            </div>

            {inputMode === "text" ? (
              <div>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
                  placeholder="Dán đoạn văn, bài báo, hoặc nội dung bài học tiếng Anh vào đây..."
                  className="w-full border rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-700" />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setActiveAI("vocab"); handleExtractVocab(); }} disabled={loading || !text.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50">
                    <BookOpen size={18} /> {loading && activeAI === "vocab" ? "Đang xử lý..." : "Trích xuất Từ vựng"}
                  </button>
                  <button onClick={() => { setActiveAI("quiz"); handleGenerateQuiz(); }} disabled={loading || !text.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50">
                    <Brain size={18} /> {loading && activeAI === "quiz" ? "Đang tạo..." : "Tạo Quiz"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl p-8 flex flex-col items-center justify-center relative cursor-pointer hover:bg-indigo-50 transition min-h-[160px]">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
                  }} accept=".txt,.pdf,.docx" />
                  <Upload size={32} className="text-indigo-400 mb-2" />
                  <p className="font-bold text-gray-700">{file ? file.name : "Kéo thả hoặc nhấn để chọn tệp"}</p>
                  <p className="text-sm text-gray-500 mt-1">Hỗ trợ .txt, .pdf, .docx</p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => { setActiveAI("vocab"); handleFileProcess(); }} disabled={loading || !file}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md disabled:opacity-50 transition">
                    <Sparkles size={18} /> {loading ? "Đang xử lý..." : "Phân tích Tệp (Tạo cả Từ vựng & Quiz)"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vocabulary results */}
          {vocabResult.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-purple-600" /> Từ vựng trích xuất ({vocabResult.length} từ)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="pb-3 font-medium">Từ</th>
                      <th className="pb-3 font-medium">Phiên âm</th>
                      <th className="pb-3 font-medium">Loại từ</th>
                      <th className="pb-3 font-medium">Nghĩa tiếng Việt</th>
                      <th className="pb-3 font-medium">Nghĩa tiếng Anh</th>
                      <th className="pb-3 font-medium">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vocabResult.map((w: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 font-bold text-indigo-700">
                          <div className="flex items-center gap-1">
                            {w.word}
                            <button onClick={() => speak(w.word)} className="text-gray-400 hover:text-blue-600"><Volume2 size={14} /></button>
                          </div>
                        </td>
                        <td className="py-3 text-gray-500 font-mono text-xs">{w.phonetic || w.phon || ""}</td>
                        <td className="py-3"><span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{w.pos || w.part_of_speech || w.type || ""}</span></td>
                        <td className="py-3 font-medium">{w.meaning_vn || w.vietnamese_meaning || w.meaning || ""}</td>
                        <td className="py-3 text-gray-600">{w.meaning_en || w.english_definition || w.definition || ""}</td>
                        <td className="py-3"><span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">{w.level || ""}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quiz results */}
          {quizResult.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Brain size={20} className="text-green-600" /> Quiz đã tạo ({quizResult.length} câu)
              </h3>
              <div className="space-y-3">
                {quizResult.map((q: any, i: number) => {
                  const correctAns = q.correct_answer || q.answer || "";
                  return (
                    <div key={i} className="bg-gray-50 p-4 rounded-xl">
                      <p className="font-medium text-gray-900">{i + 1}. {q.question || q.q}</p>
                      <div className="ml-4 mt-2 space-y-1">
                        {(q.options || []).map((opt: string, j: number) => {
                          const isCorrect = opt === correctAns || j === q.ans;
                          return (
                            <p key={j} className={`text-sm ${isCorrect ? "text-green-700 font-bold" : "text-gray-600"}`}>
                              {String.fromCharCode(65 + j)}. {opt} {isCorrect ? " ✓" : ""}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Dictionary tool */}
      {activeAI === "dict" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
                  placeholder="Nhập từ tiếng Anh cần tra..."
                  value={dictWord}
                  onChange={(e) => setDictWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDictLookup()}
                />
              </div>
              <button onClick={handleDictLookup} disabled={dictLoading || !dictWord.trim()}
                className="btn-primary py-3 px-6 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {dictLoading ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelDictLookup(); }}
                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs transition mr-1"
                    >
                      Huỷ
                    </button>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Đang tra...</span>
                  </div>
                ) : <><Search size={18} /> Tra từ</>}
              </button>
            </div>
          </div>

          {/* Error message */}
          {dictError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-medium">{dictError}</p>
                <button 
                  onClick={() => setDictError(null)} 
                  className="text-red-500 text-sm underline hover:text-red-600"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {dictResult && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Word header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
              {/* Thinking indicator - simplified without blur overlay */}
                {dictResult.status === "thinking" && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-600/80 to-transparent p-4 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span className="text-white text-sm font-medium">AI đang tra cứu...</span>
                    </div>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-extrabold mb-1">{dictResult.word}</h2>
                    <div className="flex items-center gap-4 mt-2">
                      {dictResult.phonetic_uk && (
                        <button onClick={() => {
                          if (dictResult.audio_url) {
                            new Audio(dictResult.audio_url).play().catch(() => { });
                          } else if (typeof window !== "undefined" && window.speechSynthesis) {
                            const u = new SpeechSynthesisUtterance(dictResult.word); u.lang = "en-GB"; window.speechSynthesis.speak(u);
                          }
                        }} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
                          <Volume2 size={16} /> <span className="text-sm">UK</span> <span className="font-mono text-sm">{dictResult.phonetic_uk}</span>
                        </button>
                      )}
                      {dictResult.phonetic_us && (
                        <button onClick={() => {
                          if (dictResult.audio_url) {
                            new Audio(dictResult.audio_url).play().catch(() => { });
                          } else if (typeof window !== "undefined" && window.speechSynthesis) {
                            const u = new SpeechSynthesisUtterance(dictResult.word); u.lang = "en-US"; window.speechSynthesis.speak(u);
                          }
                        }} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
                          <Volume2 size={16} /> <span className="text-sm">US</span> <span className="font-mono text-sm">{dictResult.phonetic_us}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dictResult.level && (
                      <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">{dictResult.level}</span>
                    )}
                    {dictResult._source && (
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${dictResult._source === "database" ? "bg-green-400/30 text-green-100" :
                        dictResult._source === "graph" ? "bg-cyan-400/30 text-cyan-100" : "bg-amber-400/30 text-amber-100"
                        }`}>
                        {dictResult._source === "database" ? "💾 Từ Database (không tốn AI)" :
                          dictResult._source === "graph" ? "⚡ Từ Knowledge Graph" : "🤖 AI tra cứu"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Meanings */}
              <div className="p-6 space-y-6">
                {dictResult.meanings?.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-500">{dictResult.meanings.length} nghĩa được tìm thấy</span>
                  </div>
                )}
                {dictResult.meanings?.map((m: any, i: number) => (
                  <div key={i} className="border-l-4 border-blue-400 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-lg text-sm font-bold">{m.pos || dictResult.pos}</span>
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
                            <button key={k} onClick={() => setDictWord(s)} className="text-green-600 hover:underline mr-2">{s}</button>
                          ))}
                        </div>
                      )}
                      {m.antonyms?.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-xs uppercase font-semibold">Trái nghĩa: </span>
                          {m.antonyms.map((a: string, k: number) => (
                            <button key={k} onClick={() => setDictWord(a)} className="text-red-500 hover:underline mr-2">{a}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Word family, collocations, idioms, graph connections */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  {dictResult.word_family?.length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-purple-700 mb-2">Họ từ (Word Family)</h4>
                      <div className="flex flex-wrap gap-2">
                        {dictResult.word_family.map((w: string, i: number) => (
                          <button key={i} onClick={() => setDictWord(w)} className="bg-white text-purple-700 text-sm px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-100 transition">{w}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {dictResult.collocations?.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-orange-700 mb-2">Kết hợp từ (Collocations)</h4>
                      <div className="flex flex-wrap gap-2">
                        {dictResult.collocations.map((c: string, i: number) => (
                          <span key={i} className="bg-white text-orange-700 text-sm px-2.5 py-1 rounded-lg border border-orange-200">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dictResult.idioms?.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-green-700 mb-2">Thành ngữ (Idioms)</h4>
                      <div className="space-y-3">
                        {dictResult.idioms.map((idm: any, i: number) => {
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
                  {dictResult.graph_connections?.length > 0 && (
                    <div className="bg-cyan-50 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-cyan-700 mb-2 flex items-center gap-1"><Network size={14} /> Đồ thị tri thức</h4>
                      <div className="space-y-1">
                        {dictResult.graph_connections.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg border border-cyan-100">
                            <span className="text-cyan-600 font-mono text-xs bg-cyan-100 px-1.5 rounded min-w-[50px] text-center">{c.relation}</span>
                            <button onClick={() => setDictWord(c.word)} className="text-cyan-800 hover:underline font-medium">{c.word}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sources */}
                {dictResult.sources?.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                      Nguồn tham chiếu: {dictResult.sources.join(" • ")}
                      {dictResult._from_cache && " (cached)"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knowledge Graph */}
      {activeAI === "graph" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <input
                type="text"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 outline-none"
                placeholder="Chủ đề (để trống = tất cả)..."
                value={graphTopic}
                onChange={(e) => setGraphTopic(e.target.value || "all")}
              />
              <button onClick={handleLoadGraph} disabled={graphLoading}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50">
                <Network size={18} /> {graphLoading ? "Đang tải..." : "Tải đồ thị"}
              </button>
            </div>
          </div>

          {graphData && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Network size={20} className="text-cyan-600" />
                Đồ thị tri thức ({graphData.nodes?.length || 0} nodes, {graphData.links?.length || 0} links)
              </h3>
              {graphData.nodes?.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Chưa có dữ liệu trong đồ thị. Tra từ điển hoặc phân tích văn bản để xây dựng đồ thị.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {graphData.nodes?.map((n: any, i: number) => (
                    <div key={i} className={`p-3 rounded-xl border ${n.type === "Level" ? "bg-yellow-50 border-yellow-200" : "bg-cyan-50 border-cyan-200"}`}>
                      <p className="font-bold text-gray-900">{n.label}</p>
                      {n.meaning_vn && <p className="text-sm text-gray-600">{n.meaning_vn}</p>}
                      <div className="flex gap-1 mt-1">
                        {n.type && <span className="text-xs bg-white px-1.5 py-0.5 rounded text-gray-500">{n.type}</span>}
                        {n.level && <span className="text-xs bg-white px-1.5 py-0.5 rounded text-blue-600 font-bold">{n.level}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {graphData.links?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-600 mb-2">Quan hệ:</h4>
                  <div className="flex flex-wrap gap-2">
                    {graphData.links.map((l: any, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-lg">
                        {l.source} <span className="text-cyan-600 font-bold">{l.type}</span> {l.target}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
