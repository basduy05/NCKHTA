"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  Users, BookOpen, Plus, Edit, Trash2, GraduationCap, X, Check,
  FileText, Upload, Download, ClipboardList, Sparkles, Brain,
  BarChart3, UserPlus, UserMinus, ChevronDown, ChevronUp, Eye,
  Search, Volume2, ArrowRight, Bookmark, Network, Terminal, AlertCircle, BookText, 
  BrainCircuit, Headphones, Edit3, Lightbulb, Trophy, PlayCircle, Layers, CheckCircle2
} from "lucide-react";
import { ALL_WORDS_DATABASE, WordDetail } from "../../components/DictionaryData";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

// Local auth fetch helpers removed in favor of AuthContext.authFetch

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { user, token, isInitialized, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedWordInfo, setSelectedWordInfo] = useState<WordDetail | null>(null);

  // Proactively refresh user data when entering key tabs
  useEffect(() => {
    if (activeTab === "overview" || activeTab === "ai-tools") {
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
    if (role !== "teacher") {
      router.replace("/dashboard");
    }
  }, [isInitialized, token, user, router]);

  if (!isInitialized || !token || !user) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  }

  const handleTextareaDoubleClick = async (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const textVal = textarea.value;
    
    let left = start;
    while (left > 0 && /\w/.test(textVal[left - 1])) left--;
    let right = start;
    while (right < textVal.length && /\w/.test(textVal[right])) right++;
    
    const word = textVal.substring(left, right).toLowerCase();
    if (!word) return;

    let localData = ALL_WORDS_DATABASE[word] || 
                    ALL_WORDS_DATABASE[word.replace(/s$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/es$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/ing$/, '')] || 
                    ALL_WORDS_DATABASE[word.replace(/ed$/, '')];

    if (localData) {
      setSelectedWordInfo(localData);
    } else {
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
            translation: "Đang tải bản dịch...",
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

  const speak = (text: string, lang: string = "en-US") => {
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
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === "overview" && "Tổng quan"}
            {activeTab === "classes" && "Lớp học của tôi"}
            {activeTab === "students" && "Quản lý Học sinh"}
            {activeTab === "lessons" && "Quản lý Bài học"}
            {activeTab === "assignments" && "Bài tập & Kiểm tra"}
            {activeTab === "ai-tools" && "Công cụ AI Premium"}
            {activeTab === "grammar" && "Kho Ngữ Pháp"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Xin chào, <span className="font-semibold text-indigo-600">{user?.name}</span> (Giáo viên)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl border border-indigo-100 font-bold text-sm shadow-sm">
             <Sparkles size={16} className="text-indigo-500" /> {user?.credits_ai || 0} AI Credits
          </div>
        </div>
      </div>

      {showCreditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">Hết lượt sử dụng AI!</h3>
            <p className="text-gray-600 text-center mb-8">
              Bạn đã sử dụng hết số credits AI trong ngày. Vui lòng quay lại vào ngày mai hoặc nâng cấp gói dịch vụ.
            </p>
            <button 
              onClick={() => setShowCreditModal(false)}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Word Lookup Modal */}
      {selectedWordInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-indigo-50 transform animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
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
                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase">{selectedWordInfo.level || 'N/A'}</span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Loại từ & Nghĩa</span>
                <p className="text-gray-900 font-bold text-lg leading-tight">
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-sm mr-2">{selectedWordInfo.type}</span> 
                  {selectedWordInfo.translation}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Định nghĩa tiếng Anh</span>
                <p className="text-gray-700 text-sm italic leading-relaxed">"{selectedWordInfo.engMeaning}"</p>
              </div>

              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Ví dụ</span>
                <p className="text-gray-700 text-sm leading-relaxed">{selectedWordInfo.example}</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedWordInfo(null)}
                  className="w-full py-3 bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-100 hover:bg-gray-100 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "classes" && <ClassesTab />}
      {activeTab === "students" && <StudentsTab />}
      {activeTab === "lessons" && <LessonsTab handleTextareaDoubleClick={handleTextareaDoubleClick} />}
      {activeTab === "assignments" && <AssignmentsTab handleTextareaDoubleClick={handleTextareaDoubleClick} />}
      {activeTab === "ai-tools" && <AIToolsTab setShowCreditModal={setShowCreditModal} handleTextareaDoubleClick={handleTextareaDoubleClick} />}
      {activeTab === "grammar" && <GrammarTab />}
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
function OverviewTab() {
  const { authFetch, token } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, lessons: 0, assignments: 0, teacher_name: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${API_URL}/teacher/stats`);
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
function ClassesTab() {
  const { authFetch, token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");

  const fetchClasses = async () => {
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes`);
      if (res.ok) setClasses(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchClasses(); }, []);

  const handleSave = async () => {
    console.log("[DEBUG] Starting save operation");
    const startTime = Date.now();
    if (!formName.trim()) return alert("Vui lòng nhập tên lớp");
    const formData = new FormData();
    formData.append("name", formName);
    const url = editId ? `${API_URL}/teacher/my-classes/${editId}` : `${API_URL}/teacher/my-classes`;
    const method = editId ? "PUT" : "POST";
    try {
      const res = await authFetch(url, { method, body: formData });
      if (res.ok) {
        console.log(`[DEBUG] Save successful in ${Date.now() - startTime}ms`);
        setShowForm(false); setEditId(null); setFormName("");
        fetchClasses();
      } else {
        console.error(`[DEBUG] Save failed with status ${res.status}: ${await res.text()}`);
        alert("Lỗi khi lưu lớp học");
      }
    } catch (e) {
      console.error(`[DEBUG] Save error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi lưu lớp học");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá lớp này sẽ xoá toàn bộ bài học, bài tập và danh sách học sinh!")) return;
    console.log("[DEBUG] Starting delete operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes/${id}`, { method: "DELETE" });
      if (res.ok) {
        console.log(`[DEBUG] Delete successful in ${Date.now() - startTime}ms`);
        fetchClasses();
      } else {
        console.error(`[DEBUG] Delete failed with status ${res.status}: ${await res.text()}`);
        alert("Lỗi khi xoá lớp học");
      }
    } catch (e) {
      console.error(`[DEBUG] Delete error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi xoá lớp học");
    }
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
function StudentsTab() {
  const { authFetch, token } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);

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
      finally { setLoading(false); }
    })();
  }, [token]);

  const fetchStudents = async (classId: number) => {
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes/${classId}/students`);
      if (res.ok) setStudents(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAvailable = async (classId: number) => {
    try {
      const res = await authFetch(`${API_URL}/teacher/available-students?class_id=${classId}`);
      if (res.ok) setAvailableStudents(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    }
  }, [selectedClass]);

  const handleEnroll = async (studentId: number) => {
    if (!selectedClass) return;
    console.log("[DEBUG] Starting enroll student operation");
    const startTime = Date.now();
    const formData = new FormData();
    formData.append("student_id", String(studentId));
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes/${selectedClass}/enroll`, {
        method: "POST", body: formData
      });
      if (res.ok) {
        console.log(`[DEBUG] Enroll successful in ${Date.now() - startTime}ms`);
        fetchStudents(selectedClass);
        fetchAvailable(selectedClass);
      } else {
        console.error(`[DEBUG] Enroll failed with status ${res.status}: ${await res.text()}`);
        alert("Lỗi khi thêm học sinh");
      }
    } catch (e) {
      console.error(`[DEBUG] Enroll error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi thêm học sinh");
    }
  };

  const handleRemove = async (studentId: number) => {
    if (!selectedClass || !confirm("Xoá học sinh khỏi lớp?")) return;
    console.log("[DEBUG] Starting remove student operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes/${selectedClass}/students/${studentId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        console.log(`[DEBUG] Remove successful in ${Date.now() - startTime}ms`);
        fetchStudents(selectedClass);
      } else {
        console.error(`[DEBUG] Remove failed with status ${res.status}: ${await res.text()}`);
        alert("Lỗi khi xoá học sinh");
      }
    } catch (e) {
      console.error(`[DEBUG] Remove error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi xoá học sinh");
    }
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
function LessonsTab({ handleTextareaDoubleClick }: { handleTextareaDoubleClick: (e: React.MouseEvent<HTMLTextAreaElement>) => void }) {
  const { authFetch, token } = useAuth();
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
        const res = await authFetch(`${API_URL}/teacher/my-classes`);
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
      const res = await authFetch(`${API_URL}/teacher/my-classes/${classId}/lessons`);
      if (res.ok) setLessons(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedClass) fetchLessons(selectedClass);
  }, [selectedClass]);

  const handleSave = async () => {
    console.log("[DEBUG] Starting lesson save operation");
    const startTime = Date.now();
    if (!formTitle.trim() || !selectedClass) return alert("Vui lòng nhập tiêu đề");
    const formData = new FormData();
    formData.append("title", formTitle);
    formData.append("content", formContent);
    if (formFile) formData.append("file", formFile);

    const url = editId
      ? `${API_URL}/teacher/lessons/${editId}`
      : `${API_URL}/teacher/my-classes/${selectedClass}/lessons`;
    try {
      const res = await authFetch(url, { method: editId ? "PUT" : "POST", body: formData });
      if (res.ok) {
        console.log(`[DEBUG] Lesson save successful in ${Date.now() - startTime}ms`);
        resetForm();
        fetchLessons(selectedClass!);
      } else {
        console.error(`[DEBUG] Lesson save failed with status ${res.status}: ${await res.text()}`);
        alert("Lỗi khi lưu bài học");
      }
    } catch (e) {
      console.error(`[DEBUG] Lesson save error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi lưu bài học");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá bài học này?")) return;
    console.log("[DEBUG] Starting lesson delete operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/teacher/lessons/${id}`, { method: "DELETE" });
      if (res.ok) {
        console.log(`[DEBUG] Lesson delete successful in ${Date.now() - startTime}ms`);
        if (selectedClass) fetchLessons(selectedClass);
      } else {
        console.error(`[DEBUG] Lesson delete failed with status ${res.status}: ${await res.text()}`);
        alert("Lỗi khi xoá bài học");
      }
    } catch (e) {
      console.error(`[DEBUG] Lesson delete error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi xoá bài học");
    }
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
            <textarea 
               value={formContent} 
               onChange={e => setFormContent(e.target.value)} 
               onDoubleClick={handleTextareaDoubleClick}
               placeholder="Nội dung bài học (tuỳ chọn)" rows={4}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
            />
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
function AssignmentsTab({ handleTextareaDoubleClick }: { handleTextareaDoubleClick: (e: React.MouseEvent<HTMLTextAreaElement>) => void }) {
  const { refreshUser, authFetch, token } = useAuth();
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
    if (!formQuizText.trim()) return alert("Vui lòng nhập nội dung để AI tạo quiz");
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
    } catch (e) { console.error(e); alert("Lỗi khi tạo quiz"); }
    finally { setGenerating(false); }
  };

  const handleSaveAssignment = async () => {
    if (!formTitle.trim() || !selectedClass) return alert("Vui lòng nhập tiêu đề");
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
        alert("Lỗi khi lưu bài tập");
      }
    } catch (e) {
      console.error(`[DEBUG] Assignment save error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi lưu bài tập");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá bài tập này?")) return;
    console.log("[DEBUG] Starting delete assignment operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/teacher/assignments/${id}`, { method: "DELETE" });
      if (res.ok) {
        console.log(`[DEBUG] Assignment delete successful in ${Date.now() - startTime}ms`);
        if (selectedClass) fetchAssignments(selectedClass);
      } else {
        console.error(`[DEBUG] Assignment delete failed with status ${res.status}: ${await res.text()}`);
        alert("Lỗi khi xoá bài tập");
      }
    } catch (e) {
      console.error(`[DEBUG] Assignment delete error in ${Date.now() - startTime}ms:`, e);
      alert("Lỗi kết nối khi xoá bài tập");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="font-medium text-gray-700">Lớp:</label>
        <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value))}
          className="border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]">
          {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => { setShowForm(true); setFormTitle(""); setFormDesc(""); setFormDue(""); setFormType("quiz"); setFormQuizText(""); setGeneratedQuiz([]); }}
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
          <textarea 
            value={formDesc} 
            onChange={e => setFormDesc(e.target.value)} 
            onDoubleClick={handleTextareaDoubleClick}
            placeholder="Mô tả (tuỳ chọn)" rows={2}
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
          />
          <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)}
            className="border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <select value={formType} onChange={e => setFormType(e.target.value)}
            className="border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="quiz">Quiz (Trắc nghiệm)</option>
            <option value="writing">Writing (Viết bài)</option>
            <option value="speaking">Speaking (Nói)</option>
          </select>

          {formType === "quiz" && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-indigo-100">
            <h4 className="font-bold text-indigo-700 mb-2 flex items-center gap-2"><Sparkles size={18} /> Tạo Quiz bằng AI</h4>
            <textarea 
              value={formQuizText} 
              onChange={e => setFormQuizText(e.target.value)}
              onDoubleClick={handleTextareaDoubleClick}
              placeholder="Dán đoạn văn tiếng Anh vào đây, AI sẽ tự động tạo câu hỏi trắc nghiệm..." rows={4}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white" 
            />
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
          )}

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
function AIToolsTab({ setShowCreditModal, handleTextareaDoubleClick }: { setShowCreditModal: (show: boolean) => void, handleTextareaDoubleClick: (e: React.MouseEvent<HTMLTextAreaElement>) => void }) {
  const { user, refreshUser, authFetch, token } = useAuth();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "file">("text");
  const [loading, setLoading] = useState(false);
  const [vocabResult, setVocabResult] = useState<any[]>([]);
  const [quizResult, setQuizResult] = useState<any[]>([]);
  const [activeAI, setActiveAI] = useState<"vocab" | "quiz" | "dict" | "graph">("vocab");
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);

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
    if (user && user.credits_ai <= 0) { setShowCreditModal(true); return; }
    setLoading(true); setVocabResult([]);
    try {
      const formData = new FormData();
      formData.append("text", text);
      const res = await authFetch(`${API_URL}/teacher/generate-vocab`, {
        method: "POST", body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setVocabResult(Array.isArray(data) ? data : []);
        refreshUser();
      }
    } catch (e) { console.error(e); alert("Lỗi khi trích xuất từ vựng"); }
    finally { setLoading(false); }
  };

  const handleGenerateQuiz = async () => {
    if (!text.trim()) return;
    if (user && user.credits_ai <= 0) { setShowCreditModal(true); return; }
    setLoading(true); setQuizResult([]); setCurrentQuizIdx(0);
    try {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("num_questions", "5");
      const res = await authFetch(`${API_URL}/teacher/generate-quiz`, {
        method: "POST", body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setQuizResult(Array.isArray(data) ? data : []);
        refreshUser();
      }
    } catch (e) { console.error(e); alert("Lỗi khi tạo quiz"); }
    finally { setLoading(false); }
  };

  const handleFileProcess = async () => {
    if (!file) return;
    if (user && user.credits_ai <= 0) { setShowCreditModal(true); return; }
    setLoading(true); setVocabResult([]); setQuizResult([]); setCurrentQuizIdx(0);
    try {
      const formData = new FormData();
      // @ts-ignore
      formData.append("file", file);
      formData.append("num_questions", "5");
      formData.append("exercise_type", "mixed");

      const res = await authFetch(`${API_URL}/teacher/file/generate-assignment`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.result || json;
        if (data.vocabulary) setVocabResult(data.vocabulary);
        if (data.quiz) setQuizResult(data.quiz);
        refreshUser();
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
      const res = await authFetch(`${API_URL}/teacher/dictionary/lookup`, {
        method: "POST",
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

      if (buffer.trim()) {
        try {
          let rawJson = buffer.trim();
          if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
          if (rawJson !== "[DONE]") {
            const chunkData = JSON.parse(rawJson);
            finalData = { ...finalData, ...chunkData };
            setDictResult({ ...finalData });
          }
        } catch (e) { }
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
      const res = await authFetch(`${API_URL}/teacher/knowledge-graph?topic=${encodeURIComponent(graphTopic)}`);
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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Nâng tầm giảng dạy với AI</h2>
          <p className="text-gray-500 text-sm mt-1">Phân tích văn bản, tạo học liệu và tra cứu đa nền tảng chỉ trong vài giây.</p>
        </div>
      </section>

      {/* Magic AI Input Box */}
      <section className="bg-white rounded-3xl border border-indigo-50 p-6 shadow-xl shadow-indigo-100/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Sparkles className="text-indigo-600" size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-900">Magic AI Input</h2>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">Smart Extraction</span>
        </div>
        
        <div className="space-y-4">
          <div className="relative group">
            {inputMode === "text" ? (
              <textarea 
                className="w-full bg-slate-50 border border-gray-100 rounded-2xl p-6 text-base font-medium placeholder:text-slate-400 min-h-[160px] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all resize-none shadow-inner" 
                placeholder="Dán văn bản tiếng Anh vào đây... Lexicon AI sẽ tự động phân tích và trích xuất từ vựng, tạo flashcards và bài luyện tập thử nghiệm."
                value={text}
                onChange={e => setText(e.target.value)}
                onDoubleClick={handleTextareaDoubleClick}
              />
            ) : (
              <div className="border-4 border-dashed border-indigo-100 bg-slate-50 rounded-2xl p-12 flex flex-col items-center justify-center relative cursor-pointer hover:bg-slate-100 transition min-h-[160px]">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
                }} accept=".txt,.pdf,.docx" />
                <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-4">
                  <Upload size={32} className="text-indigo-400" />
                </div>
                <p className="font-black text-gray-700">{file ? file.name : "Kéo thả hoặc nhấn để chọn tệp học liệu"}</p>
                <p className="text-sm text-slate-400 mt-2">Hỗ trợ định dạng .txt, .pdf, .docx</p>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
                <div className="flex gap-1.5 mb-3">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <p className="text-indigo-700 font-bold text-sm">Lexicon AI đang phân tích...</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex gap-2">
              <button 
                onClick={() => setInputMode("text")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${inputMode === "text" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white text-slate-600 border-gray-100 hover:bg-slate-50"}`}
              >
                Nhập văn bản
              </button>
              <button 
                onClick={() => setInputMode("file")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${inputMode === "file" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" : "bg-white text-slate-600 border-gray-100 hover:bg-slate-50"}`}
              >
                Tải tệp
              </button>
            </div>
            
            <button 
              onClick={() => inputMode === "text" ? handleExtractVocab() : handleFileProcess()}
              disabled={loading || (inputMode === "text" ? !text.trim() : !file)}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95 translate-y-0"
            >
              Analyze & Generate
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Tool Navigation */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "vocab", label: "Dashboard Trích xuất", icon: LayoutDashboard },
          { id: "dict", label: "Từ điển Lexicon", icon: Search },
          { id: "graph", label: "Đồ thị tri thức", icon: Network },
        ].map((tab) => {
          const Icon = tab.id === "vocab" ? BrainCircuit : tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAI(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shrink-0 border ${activeAI === tab.id ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100" : "bg-white text-slate-600 border-gray-100 hover:bg-slate-50"}`}
            >
              <Icon size={18} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Flashcards Result */}
      {activeAI === "vocab" && vocabResult.length > 0 && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Layers className="text-indigo-600" size={24} />
              Premium Flashcards
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{vocabResult.length} words found</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vocabResult.map((w: any, idx: number) => (
              <div 
                key={idx} 
                className="bg-white p-6 rounded-[2rem] border border-indigo-50 shadow-xl shadow-indigo-100/10 hover:shadow-indigo-200/20 transition-all group border-l-8 border-l-indigo-500 hover:-translate-y-1 duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100/50">Level {w.level || 'B2'}</span>
                  <button 
                    onClick={() => speak(w.word)}
                    className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"
                  >
                    <Volume2 size={20} />
                  </button>
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{w.word}</h3>
                <p className="text-xs text-slate-400 font-mono mb-4 tracking-wider">{w.phonetic || w.phon || '/.../'}</p>
                
                <div className="pt-4 border-t border-slate-50 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                    <p className="text-sm text-slate-600 leading-snug font-medium italic">"{w.meaning_en || w.english_definition || w.definition || 'No definition available'}"</p>
                  </div>
                  <p className="text-base text-indigo-700 font-bold ml-3.5">{w.meaning_vn || w.vietnamese_meaning || w.meaning}</p>
                </div>

                <div className="mt-5 flex gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{w.pos || w.part_of_speech || w.type || 'Noun'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Practice Quiz Result */}
      {activeAI === "vocab" && quizResult.length > 0 && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <BrainCircuit className="text-rose-500" size={24} />
              Interactive Practice
            </h3>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-rose-50 p-8 shadow-2xl shadow-rose-100/20 relative overflow-hidden">
             {/* Progress Bar */}
             <div className="mb-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {currentQuizIdx + 1} of {quizResult.length}</span>
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{Math.round(((currentQuizIdx + 1) / quizResult.length) * 100)}% Complete</span>
                </div>
                <div className="h-3 w-full bg-slate-50 rounded-full p-0.5 border border-slate-100 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-indigo-600 rounded-full transition-all duration-700 shadow-sm" 
                    style={{ width: `${((currentQuizIdx + 1) / quizResult.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Question Content */}
              <div className="min-h-[300px] flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
                    <Lightbulb className="text-rose-500" size={32} />
                 </div>
                 <h4 className="text-2xl font-black text-gray-900 mb-8 max-w-2xl leading-tight">
                    {quizResult[currentQuizIdx].question || quizResult[currentQuizIdx].q}
                 </h4>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                    {(quizResult[currentQuizIdx].options || []).map((opt: string, i: number) => {
                      const correctAns = quizResult[currentQuizIdx].correct_answer || quizResult[currentQuizIdx].answer;
                      const isCorrect = opt === correctAns || i === quizResult[currentQuizIdx].ans;
                      return (
                        <button 
                          key={i}
                          className={`p-5 rounded-2xl border-2 transition-all font-bold text-left flex items-center justify-between group ${
                            isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-transparent text-slate-600 hover:border-indigo-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200 group-hover:border-indigo-600 group-hover:text-indigo-600'}`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </div>
                          {isCorrect && <CheckCircle2 className="text-emerald-600" size={20} />}
                        </button>
                      );
                    })}
                 </div>

                 <div className="flex justify-between w-full max-w-3xl mt-12 pt-8 border-t border-slate-50">
                    <button 
                      onClick={() => setCurrentQuizIdx(prev => Math.max(0, prev - 1))}
                      disabled={currentQuizIdx === 0}
                      className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => setCurrentQuizIdx(prev => Math.min(quizResult.length - 1, prev + 1))}
                      disabled={currentQuizIdx === quizResult.length - 1}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-30"
                    >
                      Next Question
                    </button>
                 </div>
              </div>
          </div>
        </section>
      )}

      {/* Dictionary tool */}
      {activeAI === "dict" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-50 shadow-xl shadow-indigo-100/20">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Search className="text-indigo-600" size={24} />
              Lexicon Dictionary
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 group">
                <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-lg font-bold placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-inner"
                  placeholder="Tra cứu từ vựng bất kỳ..."
                  value={dictWord}
                  onChange={(e) => setDictWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDictLookup()}
                />
              </div>
              <button 
                onClick={handleDictLookup} 
                disabled={dictLoading || !dictWord.trim()}
                className="bg-indigo-600 text-white py-4 px-10 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 translate-y-0"
              >
                {dictLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Searching...</span>
                  </div>
                ) : "Tra từ"}
              </button>
            </div>
          </div>

          {/* Error message */}
          {dictError && (
            <div className="bg-rose-50 border border-rose-100 rounded-[1.5rem] p-6 flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <AlertCircle size={28} className="text-rose-500" />
              </div>
              <div>
                <p className="text-rose-900 font-black text-lg">{dictError}</p>
                <p className="text-rose-700 text-sm mt-1">Vui lòng kiểm tra lại từ khóa và thử lại.</p>
              </div>
              <button
                onClick={() => setDictError(null)}
                className="text-rose-600 text-xs font-black uppercase tracking-widest hover:text-rose-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {dictResult && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Word header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
                {/* Thinking indicator - small corner indicator */}
                {dictResult.status === "thinking" && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    <span className="text-white text-xs font-medium">AI tra cứu...</span>
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
                {Array.isArray(dictResult.meanings) && dictResult.meanings.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-500">{dictResult.meanings.length} nghĩa được tìm thấy</span>
                  </div>
                )}
                {Array.isArray(dictResult.meanings) && dictResult.meanings.map((m: any, i: number) => (
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
                      {Array.isArray(m.synonyms) && m.synonyms.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-xs uppercase font-semibold">Đồng nghĩa: </span>
                          {m.synonyms.map((s: string, k: number) => (
                            <button key={k} onClick={() => setDictWord(s)} className="text-green-600 hover:underline mr-2">{s}</button>
                          ))}
                        </div>
                      )}
                      {Array.isArray(m.antonyms) && m.antonyms.length > 0 && (
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
                  {Array.isArray(dictResult.word_family) && dictResult.word_family.length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-purple-700 mb-2">Họ từ (Word Family)</h4>
                      <div className="flex flex-wrap gap-2">
                        {dictResult.word_family.map((w: string, i: number) => (
                          <button key={i} onClick={() => setDictWord(w)} className="bg-white text-purple-700 text-sm px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-100 transition">{w}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(dictResult.collocations) && dictResult.collocations.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-orange-700 mb-2">Kết hợp từ (Collocations)</h4>
                      <div className="flex flex-wrap gap-2">
                        {dictResult.collocations.map((c: string, i: number) => (
                          <span key={i} className="bg-white text-orange-700 text-sm px-2.5 py-1 rounded-lg border border-orange-200">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(dictResult.idioms) && dictResult.idioms.length > 0 && (
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
                  {Array.isArray(dictResult.graph_connections) && dictResult.graph_connections.length > 0 && (
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
                  {dictResult.wikipedia && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        Wikipedia
                      </h4>
                      {dictResult.wikipedia.thumbnail && (
                        <img src={dictResult.wikipedia.thumbnail} alt={dictResult.wikipedia.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                      )}
                      {dictResult.wikipedia.title && (
                        <p className="font-bold text-blue-800 text-sm">{dictResult.wikipedia.title}</p>
                      )}
                      {dictResult.wikipedia.description && (
                        <p className="text-blue-600 text-xs mt-1">{dictResult.wikipedia.description}</p>
                      )}
                      {dictResult.wikipedia.extract && (
                        <p className="text-blue-700 text-xs mt-2 line-clamp-4">{dictResult.wikipedia.extract}</p>
                      )}
                      {dictResult.wikipedia.url && (
                        <a href={dictResult.wikipedia.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                          Đọc thêm trên Wikipedia →
                        </a>
                      )}
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-cyan-50 shadow-xl shadow-cyan-100/20">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <Network className="text-cyan-600" size={24} />
              Knowledge Mapping
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 group">
                <Network size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-cyan-500 transition-colors" />
                <input
                  type="text"
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-lg font-bold placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 focus:border-cyan-400 outline-none transition-all shadow-inner"
                  placeholder="Nhập chủ đề để lọc đồ thị (vd: all, environment...)"
                  value={graphTopic}
                  onChange={(e) => setGraphTopic(e.target.value)}
                />
              </div>
              <button 
                onClick={handleLoadGraph} 
                disabled={graphLoading}
                className="bg-cyan-600 text-white py-4 px-10 rounded-2xl font-black text-lg shadow-xl shadow-cyan-200 hover:bg-cyan-700 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 translate-y-0"
              >
                {graphLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Loading...</span>
                  </div>
                ) : "Tải đồ thị"}
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

// ==================== GRAMMAR TAB ====================
function GrammarTab() {
  const { authFetch, token } = useAuth();
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

  useEffect(() => { fetchRules(); }, []);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center"><BookText className="mr-2 text-teal-600" /> Kho Ngữ Pháp (Grammar Rules)</h2>
        <p className="text-gray-500 text-sm">Học các cấu trúc ngữ pháp và xem các tài liệu do giáo viên chia sẻ.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-4">Danh sách Ngữ pháp</h3>
        {loading ? <p className="text-gray-400 text-sm">Đang tải...</p> : rules.length === 0 ? <p className="text-gray-400 text-sm">Chưa có tài liệu ngữ pháp nào.</p> : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((r: any) => {
              const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
              return (
                <li key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h4 className="font-bold text-lg text-teal-700">{r.name}</h4>
                      {r.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{r.description}</p>}
                    </div>
                    {r.file_name && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <a href={`${API_URL}/${prefix}/grammar/${r.id}/file`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                          {r.file_name}
                        </a>
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
  )
}
