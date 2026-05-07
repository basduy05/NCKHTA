"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  AlertCircle, ArrowRight, Award, BarChart3, BookMarked, BookOpen, BookText, 
  Bookmark, Brain, BrainCircuit, Check, CheckCircle2, ChevronDown, ChevronUp, 
  ClipboardList, Download, Edit, Edit3, ExternalLink, Eye, FileText, Filter, 
  GraduationCap, Headphones, LayoutDashboard, Layers, Lightbulb, Mic, Network, 
  PlayCircle, Plus, Search, Sparkles, Star, Terminal, Trash2, Trophy, Upload, 
  UserMinus, UserPlus, Users, Volume2, X, XCircle
} from "lucide-react";
import { ALL_WORDS_DATABASE, WordDetail, getPosColor, POS_MAP } from "../../components/DictionaryData";
import { MOCK_PRACTICE_TESTS } from "../../components/MockPracticeData";
import { AIToolsTab } from "./AIToolsTab";
import { GrammarTab } from "./GrammarTab";
import { IpaTab } from "./IpaTab";
import { PracticeTab } from "./PracticeTab";
import { useNotification } from "../../context/NotificationContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

// Local auth fetch helpers removed in favor of AuthContext.authFetch

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const { user, token, isInitialized, refreshUser, authFetch } = useAuth();
  const router = useRouter();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedWordInfo, setSelectedWordInfo] = useState<WordDetail | null>(null);
  const { showAlert, showConfirm } = useNotification();

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
          showAlert(`Không tìm thấy từ "${word}" trong từ điển.`, 'error');
        }
      } catch (err) {
        showAlert(`Không tìm thấy từ "${word}" và lỗi kết nối API.`, 'error');
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
            {activeTab === "practice" && "Luyện thi IELTS/TOEIC"}
            {activeTab === "ipa" && "Luyện phát âm IPA"}
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
        <div className="fixed inset-0 !mt-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
        <div className="fixed inset-0 !mt-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
      {activeTab === "ai-tools" && <AIToolsTab authFetch={authFetch} user={user} API_URL={API_URL} setShowCreditModal={setShowCreditModal} handleTextareaDoubleClick={handleTextareaDoubleClick} />}
      {activeTab === "grammar" && <GrammarTab authFetch={authFetch} API_URL={API_URL} />}
      {activeTab === "practice" && <PracticeTab authFetch={authFetch} API_URL={API_URL} />}
      {activeTab === "ipa" && <IpaTab authFetch={authFetch} API_URL={API_URL} />}
    </div>
  );
}

function TeacherDashboard() {
  return <TeacherDashboardContent />;
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
  const { showAlert, showConfirm } = useNotification();
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
    if (!formName.trim()) return showAlert("Vui lòng nhập tên lớp", 'warning');
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
        showAlert("Lỗi khi lưu lớp học", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Save error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi lưu lớp học", 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("Xoá lớp này sẽ xoá toàn bộ bài học, bài tập và danh sách học sinh!");
    if (!confirmed) return;
    console.log("[DEBUG] Starting delete operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes/${id}`, { method: "DELETE" });
      if (res.ok) {
        console.log(`[DEBUG] Delete successful in ${Date.now() - startTime}ms`);
        fetchClasses();
      } else {
        console.error(`[DEBUG] Delete failed with status ${res.status}: ${await res.text()}`);
        showAlert("Lỗi khi xoá lớp học", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Delete error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi xoá lớp học", 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Lớp học của tôi</h2>
          <p className="text-gray-400 font-medium mt-1">{classes.length} lớp đang quản lý</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormName(""); }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-black shadow-lg shadow-indigo-200 transition-all active:scale-95">
          <Plus size={20} /> Tạo lớp mới
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-black text-xl text-gray-900 mb-6">{editId ? "Sửa lớp học" : "Tạo lớp học mới"}</h3>
          <div className="flex gap-3">
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Tên lớp học (ví dụ: Lớp Anh Văn A1 — 2024)"
              className="flex-1 border-2 border-gray-100 focus:border-indigo-400 rounded-2xl p-4 outline-none font-bold text-gray-700 transition-all shadow-sm" />
            <button onClick={handleSave} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black flex items-center gap-2 shadow-sm transition-all active:scale-95">
              <Check size={18} /> Lưu
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-16 text-center">
          <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} className="text-indigo-400" />
          </div>
          <h3 className="font-black text-gray-400 text-xl">Chưa có lớp học nào</h3>
          <p className="text-gray-400 mt-2 font-medium">Nhấn "Tạo lớp mới" để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c: any, idx: number) => {
            const colors = [
              { bg: "from-indigo-500 to-purple-600", light: "bg-indigo-50", text: "text-indigo-600" },
              { bg: "from-blue-500 to-cyan-600", light: "bg-blue-50", text: "text-blue-600" },
              { bg: "from-emerald-500 to-teal-600", light: "bg-emerald-50", text: "text-emerald-600" },
              { bg: "from-orange-500 to-amber-600", light: "bg-orange-50", text: "text-orange-600" },
              { bg: "from-pink-500 to-rose-600", light: "bg-pink-50", text: "text-pink-600" },
              { bg: "from-violet-500 to-indigo-600", light: "bg-violet-50", text: "text-violet-600" },
            ];
            const color = colors[idx % colors.length];
            return (
              <div key={c.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className={`bg-gradient-to-br ${color.bg} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-6 -mt-6"></div>
                  <div className="flex justify-between items-start">
                    <div className="bg-white/20 p-3 rounded-2xl w-fit">
                      <GraduationCap size={24} />
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setShowForm(true); setEditId(c.id); setFormName(c.name); }}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition"><Edit size={15} /></button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-2 bg-white/20 hover:bg-red-400/50 rounded-xl transition"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <h3 className="font-black text-xl mt-4 leading-tight">{c.name}</h3>
                  <p className="text-white/70 text-sm font-medium mt-1">GV: {c.teacher_name || "Tôi"}</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${color.light} rounded-xl`}>
                        <Users size={16} className={color.text} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg">{c.enrolled_count || 0}</p>
                        <p className="text-xs text-gray-400 font-bold -mt-0.5">Học sinh</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-gray-300 uppercase tracking-widest">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("vi-VN") : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== STUDENTS TAB ====================
function StudentsTab() {
  const { authFetch, token } = useAuth();
  const { showAlert, showConfirm } = useNotification();
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
        showAlert("Lỗi khi thêm học sinh", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Enroll error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi thêm học sinh", 'error');
    }
  };

  const handleRemove = async (studentId: number) => {
    const confirmed = await showConfirm("Xoá học sinh khỏi lớp?");
    if (!selectedClass || !confirmed) return;
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
        showAlert("Lỗi khi xoá học sinh", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Remove error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi xoá học sinh", 'error');
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
  const { showAlert, showConfirm } = useNotification();
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
    if (!formTitle.trim() || !selectedClass) return showAlert("Vui lòng nhập tiêu đề", 'warning');
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
        showAlert("Lỗi khi lưu bài học", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Lesson save error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi lưu bài học", 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("Xoá bài học này?");
    if (!confirmed) return;
    console.log("[DEBUG] Starting lesson delete operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/teacher/lessons/${id}`, { method: "DELETE" });
      if (res.ok) {
        console.log(`[DEBUG] Lesson delete successful in ${Date.now() - startTime}ms`);
        if (selectedClass) fetchLessons(selectedClass);
      } else {
        console.error(`[DEBUG] Lesson delete failed with status ${res.status}: ${await res.text()}`);
        showAlert("Lỗi khi xoá bài học", 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Lesson delete error in ${Date.now() - startTime}ms:`, e);
      showAlert("Lỗi kết nối khi xoá bài học", 'error');
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
          <label className="font-black text-gray-700">Lớp:</label>
          <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value))}
            className="border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-3 outline-none font-bold text-gray-700 min-w-[220px] transition-all">
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={() => { setShowForm(true); setFormTitle(""); setFormDesc(""); setFormDue(""); setFormType("quiz"); setFormQuizText(""); setGeneratedQuiz([]); }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black shadow-lg shadow-indigo-200 transition-all active:scale-95">
          <Plus size={20} /> Tạo bài tập mới
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-xl text-gray-900">Tạo bài tập mới</h3>
            <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Tiêu đề bài tập</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="VD: Grammar Quiz - Unit 5: Present Perfect"
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-bold text-gray-700 transition-all" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Loại bài tập</label>
              <select value={formType} onChange={e => setFormType(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-black text-gray-700 transition-all">
                <option value="quiz">Quiz (Trắc nghiệm)</option>
                <option value="reading">Reading (Đọc hiểu)</option>
                <option value="writing">Writing (Viết bài)</option>
                <option value="speaking">Speaking (Nói)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Hạn nộp bài</label>
              <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)}
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-bold text-gray-700 transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Mô tả (tuỳ chọn)</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} onDoubleClick={handleTextareaDoubleClick}
                placeholder="Hướng dẫn làm bài..." rows={2}
                className="w-full border-2 border-gray-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-medium text-gray-700 transition-all resize-none" />
            </div>
          </div>

          {formType === "quiz" && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <h4 className="font-black text-indigo-700 mb-4 flex items-center gap-2 text-lg"><Sparkles size={20} /> Tạo Quiz bằng AI</h4>
              <textarea value={formQuizText} onChange={e => setFormQuizText(e.target.value)} onDoubleClick={handleTextareaDoubleClick}
                placeholder="Dán đoạn văn tiếng Anh vào đây, AI sẽ tự động tạo câu hỏi trắc nghiệm..." rows={4}
                className="w-full border-2 border-indigo-100 focus:border-indigo-400 rounded-2xl px-5 py-4 outline-none font-medium text-gray-700 transition-all resize-none bg-white" />
              <button onClick={handleGenerateQuiz} disabled={generating}
                className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black flex items-center gap-2 disabled:opacity-50 shadow-sm transition-all active:scale-95">
                <Brain size={18} /> {generating ? "Đang tạo..." : "Tạo Quiz với AI"}
              </button>
            </div>
          )}

          {formType === "reading" && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100">
              <h4 className="font-black text-blue-700 mb-4 flex items-center gap-2 text-lg"><BookOpen size={20} /> Reading từ News API</h4>
              <button onClick={fetchNewsTopics} disabled={newsLoading}
                className="px-5 py-3 bg-white text-blue-600 border-2 border-blue-200 rounded-2xl text-sm font-black hover:bg-blue-50 disabled:opacity-50 transition-all active:scale-95">
                {newsLoading ? "Đang tải..." : "Lấy tin tức mới (The Guardian)"}
              </button>
              {newsTopics.length > 0 && (
                <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">
                  {newsTopics.map((news, idx) => (
                    <div key={idx} onClick={() => setSelectedNews(news)}
                      className={`p-4 border-2 rounded-2xl cursor-pointer text-sm transition-all ${selectedNews?.title === news.title ? "bg-blue-100 border-blue-500" : "bg-white border-blue-100 hover:border-blue-300"}`}>
                      <p className="font-black text-gray-900">{news.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-1">{news.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedNews && (
                <button onClick={handleGenerateReading} disabled={generating}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black flex items-center gap-2 disabled:opacity-50 shadow-sm transition-all active:scale-95">
                  <Brain size={18} /> {generating ? "Đang tạo bài Reading..." : "Tạo bài Reading test"}
                </button>
              )}
            </div>
          )}

          {generatedQuiz.length > 0 && (
            <div className="bg-green-50 p-6 border border-green-100 rounded-2xl">
              <p className="font-black text-green-800 mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} /> Đã tạo {generatedQuiz.length} câu hỏi
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {generatedQuiz.map((q: any, i: number) => (
                  <div key={i} className="bg-white p-4 rounded-2xl text-sm shadow-sm border border-gray-100">
                    {q.type && <span className="inline-block px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] mb-2 font-black uppercase">{q.type}</span>}
                    <p className="font-bold text-gray-900">{i + 1}. {q.question || q.q}</p>
                    <div className="ml-4 mt-2 space-y-1 text-gray-600">
                      {(q.options || []).map((opt: string, j: number) => {
                        const ans = q.correct_answer ?? q.ans;
                        const isCorrect = (typeof ans === "number" && j === ans) || (typeof ans === "string" && opt === ans);
                        return (
                          <p key={j} className={isCorrect ? "text-green-700 font-black flex items-center gap-1.5" : ""}>
                            {isCorrect && <CheckCircle2 size={13} />} {String.fromCharCode(65 + j)}. {opt}
                          </p>
                        );
                      })}
                    </div>
                    {q.explanation && <p className="text-xs text-indigo-600 mt-2 italic bg-indigo-50 p-2 rounded-xl">Giải thích: {q.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="px-6 py-3 font-black text-gray-400 hover:text-gray-900 transition">Hủy</button>
            <button onClick={handleSaveAssignment}
              className="px-8 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 font-black flex items-center gap-2 shadow-sm transition-all active:scale-95">
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
            <h3 className="font-black text-gray-400 text-xl">Chưa có bài tập nào</h3>
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
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase ${typeConf.bg} ${typeConf.color}`}>{typeConf.label}</span>
                      {a.due_date && (
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${isOverdue ? "bg-red-50 text-red-600 border-red-100" : "bg-gray-50 text-gray-500 border-gray-100"}`}>
                          Hạn: {new Date(a.due_date).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-gray-900 text-lg leading-tight">{a.title}</h4>
                    {a.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{a.description}</p>}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-sm font-black text-indigo-600 flex items-center gap-1.5">
                        <Users size={14} /> {a.submissions || 0} bài nộp
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => toggleScores(a.id)}
                    className={`p-2.5 rounded-xl transition-all ${expandedScores === a.id ? "bg-indigo-100 text-indigo-700" : "text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"}`}
                    title="Xem điểm số">
                    <BarChart3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>

              {expandedScores === a.id && (
                <div className="border-t border-gray-100 p-6 bg-gray-50/70">
                  <h5 className="font-black text-gray-700 mb-4 text-sm uppercase tracking-widest">Kết quả học sinh</h5>
                  {scores.length === 0 ? (
                    <p className="text-gray-400 font-medium text-sm">Chưa có học sinh nào nộp bài.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-gray-400 text-xs uppercase tracking-widest border-b border-gray-200">
                            <th className="pb-3 font-black">Học sinh</th>
                            <th className="pb-3 font-black">Điểm</th>
                            <th className="pb-3 font-black">Nộp lúc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {scores.map((s: any) => (
                            <tr key={s.id} className="hover:bg-white transition-colors">
                              <td className="py-3 font-bold text-gray-900">{s.student_name}</td>
                              <td className="py-3">
                                <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl text-xs">{s.score}/{s.max_score}</span>
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


export default function TeacherPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>}>
      <TeacherDashboardContent />
    </Suspense>
  );
}
