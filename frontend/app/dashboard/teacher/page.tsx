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
import { ALL_WORDS_DATABASE, simulateSyllabify, WordDetail, getPosColor, POS_MAP } from "../../components/DictionaryData";
import { MOCK_PRACTICE_TESTS } from "../../components/MockPracticeData";

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
      {activeTab === "practice" && <PracticeTab setShowCreditModal={setShowCreditModal} />}
      {activeTab === "ipa" && <IpaTab />}
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
    if (!selectedNews) return alert("Vui lòng chọn một bài báo");
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
        alert("Đã tạo bài tập Reading thành công!");
      } else {
        alert("Lỗi khi tạo bài tập Reading");
      }
    } catch(e) { console.error(e); alert("Lỗi kết nối"); }
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
            <option value="reading">Reading (Đọc hiểu - News API)</option>
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
          </div>
          )}

          {/* Render Reading options if formType is reading */}
          {formType === "reading" && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
              <h4 className="font-bold text-indigo-700 mb-2 flex items-center gap-2">Nguồn bài báo (Reading Comprehension)</h4>
              <div className="flex gap-2 mb-2">
                <button onClick={fetchNewsTopics} disabled={newsLoading} className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm hover:bg-indigo-50 disabled:opacity-50">
                  {newsLoading ? "Đang tải..." : "Tải tin tức mới nhất (The Guardian)"}
                </button>
              </div>
              {newsTopics.length > 0 && (
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {newsTopics.map((news, idx) => (
                    <div key={idx} onClick={() => setSelectedNews(news)} className={`p-2 border rounded cursor-pointer text-sm ${selectedNews?.title === news.title ? 'bg-indigo-100 border-indigo-500' : 'bg-white hover:bg-gray-50'}`}>
                      <p className="font-bold">{news.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{news.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedNews && (
                 <button onClick={handleGenerateReading} disabled={generating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 mt-2">
                  <Brain size={16} /> {generating ? "Đang tạo IELTS Reading test..." : "Tạo bài Reading test"}
                </button>
              )}
            </div>
          )}

          {generatedQuiz.length > 0 && (
            <div className="mt-4 space-y-2 bg-green-50 p-4 border border-green-100 rounded-xl">
              <p className="text-sm text-green-700 font-bold">Đã tạo {generatedQuiz.length} câu hỏi / bài tập</p>
              {generatedQuiz.map((q: any, i: number) => (
                <div key={i} className="bg-white p-3 rounded-lg text-sm shadow-sm border border-gray-100">
                  {q.type && <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs mb-1 font-medium select-none">{q.type}</span>}
                  <p className="font-medium text-gray-900">{i + 1}. {q.question || q.q}</p>
                  <div className="ml-4 mt-1 space-y-1 text-gray-700">
                    {(q.options || []).map((opt: string, j: number) => {
                      const ans = q.correct_answer ?? q.ans;
                      const isCorrect = (typeof ans === 'number' && j === ans) || (typeof ans === 'string' && opt.includes(ans) && !['True', 'False', 'Not Given'].includes(opt)) || (typeof ans === 'string' && opt === ans);
                      return (
                        <p key={j} className={isCorrect ? "text-green-700 font-bold flex items-center gap-1" : ""}>
                          {isCorrect && <CheckCircle2 size={14}/>} {String.fromCharCode(65 + j)}. {opt}
                        </p>
                      );
                    })}
                  </div>
                  {q.explanation && <p className="text-xs text-indigo-600 mt-2 italic bg-indigo-50 p-2 rounded">Giải thích: {q.explanation}</p>}
                </div>
              ))}
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
  
  // Flashcard & Recall Quiz states
  const [flippedWord, setFlippedWord] = useState<number | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [recallAnswers, setRecallAnswers] = useState<Record<number, string>>({});
  const [recallSubmitted, setRecallSubmitted] = useState(false);
  const [showRecallQuiz, setShowRecallQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

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
    setLoading(true); setVocabResult([]); setQuizResult([]); setFlippedWord(null); setCurrentCardIdx(0); setRecallSubmitted(false); setRecallAnswers({}); setQuizSubmitted(false); setQuizAnswers({}); setQuizScore(0);
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
    setLoading(true); setQuizResult([]); setCurrentQuizIdx(0); setQuizSubmitted(false); setQuizAnswers({}); setQuizScore(0);
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
    setLoading(true); setVocabResult([]); setQuizResult([]); setCurrentQuizIdx(0); setFlippedWord(null); setRecallSubmitted(false); setRecallAnswers({}); setQuizSubmitted(false); setQuizAnswers({}); setQuizScore(0);
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
            
            <div className="flex gap-3">
              <button 
                onClick={() => inputMode === "text" ? handleExtractVocab() : handleFileProcess()}
                disabled={loading || (inputMode === "text" ? !text.trim() : !file)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
              >
                <Layers size={18} /> Extract Vocab
              </button>
              <button 
                onClick={() => handleGenerateQuiz()}
                disabled={loading || !text.trim() || inputMode === "file"}
                className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-rose-600 transition-all shadow-xl shadow-rose-200 disabled:opacity-30 hover:scale-[1.02] active:scale-95"
              >
                <Brain size={18} /> Generate Quiz
              </button>
            </div>
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

      {activeAI === "vocab" && vocabResult.length > 0 && (
        <section className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <BrainCircuit className="text-indigo-600" size={24} />
                Flashcard Slider
              </h3>
              <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl border border-indigo-100 font-bold text-xs">
                Card {currentCardIdx + 1} of {vocabResult.length}
              </div>
            </div>

            <div className="max-w-xl mx-auto relative group">
              <button 
                onClick={() => { setCurrentCardIdx(prev => Math.max(0, prev - 1)); setFlippedWord(null); }}
                disabled={currentCardIdx === 0}
                className="absolute -left-16 top-1/2 -track-y-1/2 w-12 h-12 bg-white rounded-2xl border border-gray-100 shadow-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0 z-20"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <ChevronUp className="-rotate-90" size={24} />
              </button>
              <button 
                onClick={() => { setCurrentCardIdx(prev => Math.min(vocabResult.length - 1, prev + 1)); setFlippedWord(null); }}
                disabled={currentCardIdx === vocabResult.length - 1}
                className="absolute -right-16 top-1/2 -track-y-1/2 w-12 h-12 bg-white rounded-2xl border border-gray-100 shadow-xl flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0 z-20"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <ChevronDown className="-rotate-90" size={24} />
              </button>

              <div className="perspective-1000 h-[450px]">
                {vocabResult.map((w: any, idx: number) => {
                  if (idx !== currentCardIdx) return null;
                  return (
                    <div 
                      key={idx}
                      onClick={() => setFlippedWord(flippedWord === idx ? null : idx)}
                      className={`relative w-full h-full transition-all duration-700 preserve-3d cursor-pointer ${flippedWord === idx ? 'rotate-y-180' : ''}`}
                    >
                      {/* Front side */}
                      <div className="absolute inset-0 backface-hidden bg-white border border-indigo-50 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-10 transition-all hover:border-indigo-200">
                        <div className="absolute top-8 left-10">
                          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">{w.level || 'B2'}</span>
                        </div>
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-indigo-50/50">
                          <Sparkles className="text-indigo-600" size={32} />
                        </div>
                        <h4 className="text-5xl font-black text-indigo-900 mb-2 tracking-tight line-clamp-1">{w.word}</h4>
                        <div className="flex gap-1 mb-4">
                          {simulateSyllabify(w.word).map((s: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-100">{s}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-lg mb-8">
                           <Volume2 size={24} className="text-indigo-400" />
                           <span>{w.phonetic || w.phon || "/.../"}</span>
                        </div>
                        {w.pos && <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl uppercase border border-purple-100/50">{w.pos}</span>}
                      </div>
                      
                      {/* Back side */}
                      <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-10 rotate-y-180 text-white text-center">
                        <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-6">Translation</span>
                        <h4 className="text-4xl font-black mb-4 text-indigo-50">{w.meaning_vn || w.meaning}</h4>
                        {w.meaning_en && <p className="text-indigo-100 text-lg mb-8 leading-relaxed italic line-clamp-3">"{w.meaning_en}"</p>}
                        {w.example && (
                          <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm mt-4">
                            <p className="text-white text-lg italic leading-relaxed line-clamp-3">&ldquo;{w.example}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-8 flex justify-center gap-4">
                 <button 
                   onClick={(e) => { e.stopPropagation(); speak(vocabResult[currentCardIdx].word); }}
                   className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition transform hover:scale-105 active:scale-95"
                 >
                   <Volume2 size={24} /> Pronounce
                 </button>
                 <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const w = vocabResult[currentCardIdx];
                    try {
                      const res = await authFetch(`${API_URL}/student/vocabulary/save`, {
                        method: "POST",
                        body: JSON.stringify({ word: w.word, phonetic: w.phonetic || w.phon || "", pos: w.pos || "", meaning_en: w.meaning_en || "", meaning_vn: w.meaning_vn || w.meaning, example: w.example, level: w.level || 'B2', source: "ai-extraction" })
                      });
                      if (res.ok) alert(`Đã lưu "${w.word}" vào kho từ vựng!`);
                    } catch { }
                  }}
                  className="w-16 h-16 bg-white border border-gray-100 text-emerald-500 rounded-2xl flex items-center justify-center hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 active:scale-95"
                 >
                   <Bookmark size={28} />
                 </button>
              </div>
            </div>
          </div>

          {/* Syllable Breakdown Section */}
          <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <BookText size={24} className="text-indigo-600" />
              Syllable & Pronunciation Guide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vocabResult.map((w: any, idx: number) => {
                const syllables = simulateSyllabify(w.word);
                return (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between gap-4 shadow-sm group hover:border-indigo-200 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{w.pos || "Vocab"}</span>
                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg">{w.level || "B2"}</span>
                      </div>
                      <h4 className="text-xl font-black text-slate-800 tracking-tight">{w.word}</h4>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {syllables.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100/50">{s}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => speak(w.word)} className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                      <Volume2 size={24} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recall Quiz Section */}
          <div className="bg-indigo-900 p-8 rounded-[3rem] shadow-2xl shadow-indigo-200 text-white overflow-hidden relative">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Brain size={28} className="text-indigo-300" />
                  Recall Master Challenge
                </h3>
                <p className="text-indigo-200 font-medium text-sm mt-1">Kiểm tra khả năng ghi nhớ nghĩa của các từ vừa trích xuất.</p>
              </div>
              <button 
                onClick={() => { setShowRecallQuiz(!showRecallQuiz); setRecallAnswers({}); setRecallSubmitted(false); }}
                className="bg-white text-indigo-900 px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                {showRecallQuiz ? <><X size={18} /> Close Quiz</> : <><PlayCircle size={18} /> Start Recall Quiz</>}
              </button>
            </div>

            {showRecallQuiz && (
              <div className="space-y-4 animate-in slide-in-from-top-6 duration-500 relative z-10">
                {vocabResult.map((w: any, idx: number) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-white/15">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1 block">Meaning</span>
                      <h4 className="text-xl font-black text-white">{w.meaning_vn || w.meaning}</h4>
                    </div>
                    <div className="flex-[1.5] relative">
                      <input 
                        type="text"
                        className={`w-full bg-white/5 border-2 px-6 py-3 rounded-2xl outline-none transition-all font-black text-lg ${
                          recallSubmitted 
                            ? (recallAnswers[idx]?.toLowerCase().trim() === w.word.toLowerCase().trim() ? "border-emerald-400 text-emerald-300" : "border-rose-400 text-rose-300")
                            : "border-white/10 focus:border-indigo-400 text-white focus:bg-white/10"
                        }`}
                        placeholder="Type the English word..."
                        value={recallAnswers[idx] || ""}
                        onChange={(e) => setRecallAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                        disabled={recallSubmitted}
                      />
                      {recallSubmitted && recallAnswers[idx]?.toLowerCase().trim() !== w.word.toLowerCase().trim() && (
                        <p className="text-xs text-emerald-400 font-bold mt-2 flex items-center gap-1.5 bg-emerald-400/10 px-3 py-1 rounded-lg w-fit">
                          <CheckCircle2 size={12} /> Correct answer: {w.word}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {!recallSubmitted && Object.keys(recallAnswers).length > 0 && (
                  <div className="text-center mt-8">
                    <button 
                      onClick={() => setRecallSubmitted(true)}
                      className="bg-indigo-400 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-500/50 hover:bg-indigo-300 transition-all hover:scale-105 active:scale-95"
                    >
                      Finish & Check Progress
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl -ml-24 -mb-24"></div>
          </div>
        </section>
      )}

      {/* Practice Quiz Result */}
      {activeAI === "vocab" && quizResult.length > 0 && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 border-t border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <BrainCircuit className="text-rose-500" size={24} />
              Interactive AI Practice
            </h3>
            {quizSubmitted && (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 font-bold flex items-center gap-2 animate-in zoom-in-95 duration-300">
                <Trophy size={18} /> Score: {quizScore}/{quizResult.length}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-rose-50 p-8 shadow-2xl shadow-rose-100/20 relative overflow-hidden min-h-[500px]">
             {/* Progress Bar */}
             <div className="mb-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {currentQuizIdx + 1} of {quizResult.length}</span>
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{Math.round(((currentQuizIdx + 1) / quizResult.length) * 100)}% Progress</span>
                </div>
                <div className="h-3 w-full bg-slate-50 rounded-full p-0.5 border border-slate-100 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-indigo-600 rounded-full transition-all duration-700 shadow-sm" 
                    style={{ width: `${((currentQuizIdx + 1) / quizResult.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Question Content */}
              <div className="flex flex-col items-center">
                 <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-rose-50/50">
                    <Lightbulb className="text-rose-500" size={32} />
                 </div>
                 <h4 className="text-2xl font-black text-gray-900 mb-10 max-w-2xl leading-tight text-center">
                    {quizResult[currentQuizIdx].question || quizResult[currentQuizIdx].q}
                 </h4>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                    {(quizResult[currentQuizIdx].options || []).map((opt: string, i: number) => {
                      const isSelected = quizAnswers[currentQuizIdx] === i;
                      const correctAnsIdx = typeof quizResult[currentQuizIdx].ans === 'number' ? quizResult[currentQuizIdx].ans : (quizResult[currentQuizIdx].options?.findIndex((o: string) => o === (quizResult[currentQuizIdx].correct_answer || quizResult[currentQuizIdx].answer)) ?? -1);
                      const isCorrect = i === correctAnsIdx;
                      
                      let btnClass = "bg-slate-50 border-transparent text-slate-600 hover:border-indigo-200 hover:bg-white";
                      if (isSelected) btnClass = "bg-indigo-50 border-indigo-500 text-indigo-900 ring-4 ring-indigo-50/50";
                      
                      if (quizSubmitted) {
                        if (isCorrect) btnClass = "bg-emerald-50 border-emerald-500 text-emerald-900";
                        else if (isSelected) btnClass = "bg-rose-50 border-rose-500 text-rose-900";
                        else btnClass = "bg-slate-50 border-transparent text-slate-400 opacity-60";
                      }

                      return (
                        <button 
                          key={i}
                          onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [currentQuizIdx]: i }))}
                          className={`p-6 rounded-[1.5rem] border-2 transition-all font-bold text-left flex items-center justify-between group h-full ${btnClass}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                              isSelected ? 'bg-indigo-500 text-white' : (quizSubmitted && isCorrect ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200 group-hover:border-indigo-600 group-hover:text-indigo-600')
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="text-lg">{opt}</span>
                          </div>
                          {quizSubmitted && isCorrect && <CheckCircle2 className="text-emerald-600" size={20} />}
                          {quizSubmitted && isSelected && !isCorrect && <XCircle className="text-rose-600" size={20} />}
                        </button>
                      );
                    })}
                 </div>

                 <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-3xl mt-12 pt-8 border-t border-slate-50 gap-4">
                    <button 
                      onClick={() => setCurrentQuizIdx(prev => Math.max(0, prev - 1))}
                      disabled={currentQuizIdx === 0}
                      className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-30 flex items-center gap-2"
                    >
                      <ChevronUp className="-rotate-90" size={18} /> Previous
                    </button>
                    
                    {!quizSubmitted ? (
                      <div className="flex gap-3">
                         {currentQuizIdx === quizResult.length - 1 ? (
                           <button 
                             onClick={() => {
                               let s = 0;
                               quizResult.forEach((q, idx) => {
                                 const correctIdx = typeof q.ans === 'number' ? q.ans : (q.options?.findIndex((o: any) => o === (q.correct_answer || q.answer)) ?? -1);
                                 if (quizAnswers[idx] === correctIdx) s++;
                               });
                               setQuizScore(s);
                               setQuizSubmitted(true);
                             }}
                             disabled={Object.keys(quizAnswers).length < quizResult.length}
                             className="bg-emerald-600 text-white px-8 py-4 rounded-[1.25rem] font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-40"
                           >
                             Submit & Finalize
                           </button>
                         ) : (
                           <button 
                             onClick={() => setCurrentQuizIdx(prev => Math.min(quizResult.length - 1, prev + 1))}
                             className="bg-indigo-600 text-white px-8 py-4 rounded-[1.25rem] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                           >
                             Next Question
                           </button>
                         )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          setQuizScore(0);
                          setCurrentQuizIdx(0);
                        }}
                        className="bg-slate-900 text-white px-10 py-4 rounded-[1.25rem] font-black hover:bg-black transition-all shadow-xl shadow-slate-200"
                      >
                        Try Again
                      </button>
                    )}
                 </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-50 rounded-full -ml-12 -mb-12"></div>
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
                {Array.isArray(dictResult.meanings) && dictResult.meanings.map((m: any, i: number) => {
                  const colors = getPosColor(m.pos || dictResult.pos);
                  return (
                    <div key={i} className={`border-l-4 ${colors.accent} pl-5 py-1 relative hover:bg-slate-50 transition-colors rounded-r-xl`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`${colors.bg} ${colors.text} px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${colors.border} shadow-sm`}>
                          {POS_MAP[(m.pos || dictResult.pos)?.toLowerCase()] || (m.pos || dictResult.pos)}
                        </span>
                        {i === 0 ? (
                          <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-md shadow-indigo-100 flex items-center gap-1">
                            <Star size={10} fill="currentColor" /> Nghĩa chính
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/50">
                            Tham khảo #{i}
                          </span>
                        )}
                        {m.register && (
                          <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-yellow-200 italic">{m.register}</span>
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
                  );
                })}

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

// ==================== NEW: IPA DATA & TAB ====================
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
  const { authFetch, refreshUser } = useAuth();
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
  const { user, authFetch, refreshUser } = useAuth();
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
              }
            } catch (e) { }
          }
        }
      }
      refreshUser();
      setPractice(finalData);
    } catch (e) {
      alert("Lỗi khi kết nối AI");
    } finally {
      setLoading(false);
    }
  };

  const submitTest = () => {
    let s = 0;
    practice.questions.forEach((q: any, idx: number) => {
      if (answers[idx] === q.correct_answer || answers[idx] === q.ans) s++;
    });
    setScore(s);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <GraduationCap className="text-indigo-600" /> Hệ thống luyện thi thông minh
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Loại chứng chỉ</label>
            <select value={testType} onChange={e => setTestType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="TOEIC">TOEIC</option>
              <option value="IELTS">IELTS</option>
              <option value="BTEC">BTEC English</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Kỹ năng</label>
            <select value={skill} onChange={e => setSkill(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="reading">Reading</option>
              <option value="grammar">Grammar & Vocab</option>
              <option value="listening" disabled>Listening (Coming Soon)</option>
              <option value="speaking">Speaking Topics</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nguồn đề</label>
            <select value={source} onChange={e => setSource(e.target.value as any)} className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="ai">AI Generator (Recommended)</option>
              <option value="official">Đề mẫu chính thức</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generatePractice} disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50">
              {loading ? "Đang chuẩn bị..." : "Bắt đầu luyện tập"}
            </button>
          </div>
        </div>

        {practice && practice.status !== "generating" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-t border-gray-100 pt-8">
              <h3 className="text-2xl font-black text-gray-900 mb-2">{practice.title || `${testType} Practice: ${skill}`}</h3>
              {practice.description && <p className="text-gray-500 mb-8">{practice.description}</p>}
              
              {practice.passage && (
                <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100 italic text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {practice.passage}
                </div>
              )}

              <div className="space-y-8">
                {practice.questions?.map((q: any, idx: number) => (
                  <div key={idx} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                    <p className="font-bold text-lg mb-4 text-gray-800">{idx + 1}. {q.question || q.q}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(q.options || []).map((opt: string, oi: number) => (
                        <button 
                          key={oi}
                          onClick={() => !submitted && setAnswers({...answers, [idx]: oi})}
                          className={`p-4 rounded-xl border-2 text-left transition-all font-medium ${
                            answers[idx] === oi 
                              ? (submitted ? (oi === (q.correct_answer || q.ans) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : 'bg-indigo-50 border-indigo-500 text-indigo-700')
                              : (submitted && oi === (q.correct_answer || q.ans) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-transparent hover:border-gray-200 text-gray-600')
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!submitted ? (
                <div className="mt-12 text-center">
                  <button onClick={submitTest} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition transform active:scale-95">
                    Nộp bài & Xem điểm
                  </button>
                </div>
              ) : (
                <div className="mt-12 bg-indigo-900 text-white p-8 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h4 className="text-xl font-bold mb-2 text-indigo-200">Kết quả của bạn</h4>
                    <div className="text-6xl font-black mb-4">{score}/{practice.questions?.length}</div>
                    <p className="text-indigo-200 mb-6">Bạn đã hoàn thành bài luyện tập {testType} {skill}.</p>
                    <button onClick={() => { setPractice(null); setAnswers({}); setSubmitted(false); }} className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition">
                      Làm bài khác
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
