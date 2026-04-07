"use client";
import { useState, Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Database, Plus, UploadCloud, FileSpreadsheet, Save, Edit, Trash2, GraduationCap, X, Check, Copy, BookOpen, BookText, Settings, RefreshCw, Mail, Eye, EyeOff, Sparkles, ClipboardList, Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, TrendingUp, Network, Activity } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useNotification } from "@/app/context/NotificationContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

// Local auth fetch helpers removed in favor of AuthContext.authFetch

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const router = useRouter();
  const { token, user, isInitialized, authFetch } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    // Require login + admin role for this page
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    const role = (user.role || "").toString().toLowerCase();
    if (role !== "admin") {
      router.replace("/dashboard");
    }
  }, [isInitialized, token, user, router]);

  if (!isInitialized) {
    return <div className="text-indigo-600 font-medium">Đang khởi tạo phiên đăng nhập...</div>;
  }
  if (!token || !user) {
    return <div className="text-indigo-600 font-medium">Đang chuyển hướng...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {activeTab === 'overview' && 'Tổng quan hệ thống'}
          {activeTab === 'users' && 'Quản lý Người dùng & GV'}
          {activeTab === 'vocab' && 'Kho Từ Vựng Graph'}
          {activeTab === 'classes' && 'Quản lý Lớp Học'}
          {activeTab === 'lessons' && 'Quản lý Bài Học'}
          {activeTab === 'assignments' && 'Quản lý Bài tập & Đề thi'}
          {activeTab === 'grammar' && 'Kho Ngữ Pháp (AI)'}
          {activeTab === 'ai_monitoring' && 'Giám sát hiệu năng AI'}
          {activeTab === 'settings' && 'Cài đặt hệ thống'}
        </h1>
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'vocab' && <VocabTab />}
      {activeTab === 'classes' && <ClassesTab />}
      {activeTab === 'lessons' && <LessonsTab />}
      {activeTab === 'assignments' && <AssignmentsTab />}
      {activeTab === 'grammar' && <GrammarTab />}
      {activeTab === 'ai_monitoring' && <AILogsTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="text-indigo-600 font-medium">Đang tải bảng điều khiển...</div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}

function OverviewTab() {
  const { token, isInitialized, authFetch } = useAuth();
  const [stats, setStats] = useState({ users: 0, vocab: 0, classes: 0, lessons: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized || !token) return;

    const fetchStats = async () => {
      try {
        const res = await authFetch(`${API_URL}/admin/stats`);
        if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isInitialized, token]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-300">
      {[
        { label: "Tổng người dùng", value: loading ? "..." : stats.users, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Tổng Lớp học", value: loading ? "..." : stats.classes, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-100" },
        { label: "Tổng Bài học", value: loading ? "..." : stats.lessons, icon: BookOpen, color: "text-orange-600", bg: "bg-orange-100" },
        { label: "Từ vựng (Neo4j)", value: loading ? "..." : stats.vocab, icon: Database, color: "text-indigo-600", bg: "bg-indigo-100" }
      ].map((stat, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center">
          <div className={`p-4 rounded-2xl ${stat.bg} mr-4`}><stat.icon className={stat.color} size={28} /></div>
          <div><p className="text-sm font-medium text-gray-500">{stat.label}</p><h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3></div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { token, isInitialized, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formUser, setFormUser] = useState({ name: "", email: "", role: "STUDENT", password: "", credits_ai: 50, points: 0 });

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await authFetch(`${API_URL}/admin/users`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [bulkCredits, setBulkCredits] = useState(50);
  const [bulkRole, setBulkRole] = useState("STUDENT");
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkUpdate = async () => {
    if (!token) return;
    if (!(await showConfirm(`Cập nhật ${bulkCredits} AI Credits cho TẤT CẢ ${bulkRole}?`))) return;
    setBulkLoading(true);
    try {
      const res = await authFetch(`${API_URL}/admin/bulk-update-credits`, {
        method: "POST",
        body: JSON.stringify({ credits: bulkCredits, role: bulkRole })
      });
      if (res.ok) {
        showAlert("Cập nhật hàng loạt thành công!", 'success');
        fetchUsers();
      } else {
        showAlert("Lỗi khi cập nhật hàng loạt", 'error');
      }
    } catch (err) {
      showAlert("Lỗi kết nối", 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized || !token) return;
    fetchUsers();
  }, [isInitialized, token]);

  const handleSaveUser = async () => {
    if (!token) return showAlert("Chưa đăng nhập", 'warning');
    if (!formUser.name || !formUser.email) return showAlert("Vui lòng điền đủ thông tin!", 'warning');
    try {
      if (isEditing !== null) {
        await authFetch(
          `${API_URL}/admin/users/${isEditing}`,
          { method: "PUT", body: JSON.stringify(formUser) }
        );
      } else {
        const res = await authFetch(
          `${API_URL}/admin/users`,
          { method: "POST", body: JSON.stringify(formUser) }
        );
        const payload = await res.json();
        if (!res.ok) return showAlert(payload.detail || "Lỗi tạo người dùng", 'error');
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      showAlert("Có lỗi kết nối tới máy chủ.", 'error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!token) return;
    if (await showConfirm("Bạn có chắc chắn xoá người dùng này?")) {
      await authFetch(`${API_URL}/admin/users/${id}`, { method: "DELETE" });
      fetchUsers();
    }
  };

  const handleEditClick = (u) => {
    setIsEditing(u.id);
    setFormUser({ name: u.name, email: u.email, role: u.role, password: '', credits_ai: u.credits_ai || 0, points: u.points || 0 });
  }

  const resetForm = () => {
    setIsEditing(null);
    setFormUser({ name: '', email: '', role: 'STUDENT', password: '', credits_ai: 50, points: 0 });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Người dùng</h2>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-sm">
                  <th className="pb-3 font-medium">Họ Tên</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Vai trò</th>
                  <th className="pb-3 font-medium">AI Credits</th>
                  <th className="pb-3 font-medium">Điểm (Points)</th>
                  <th className="pb-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-4 font-medium text-gray-900">{u.name}</td>
                    <td className="py-4 text-gray-500">{u.email}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md font-medium text-xs ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'TEACHER' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {u.role === 'TEACHER' ? 'Giáo viên' : u.role === 'ADMIN' ? 'Quản trị' : 'Học sinh'}
                      </span>
                    </td>
                    <td className="py-4 text-gray-700 font-bold">{u.credits_ai || 0}</td>
                    <td className="py-4 text-indigo-600 font-bold">{u.points || 0}</td>
                    <td className="py-4 flex gap-2 justify-end">
                      <button onClick={() => handleEditClick(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex"><Users className="mr-2 text-indigo-600" /> {isEditing ? 'Sửa Người Dùng' : 'Thêm Người Dùng'}</h2>
              {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên hiển thị</label>
                <input type="text" value={formUser.name} onChange={e => setFormUser({ ...formUser, name: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="VD: Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={formUser.email} onChange={e => setFormUser({ ...formUser, email: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="email@domain.com" />
              </div>
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium mb-1">Mật khẩu (Mặc định: 123456)</label>
                  <input type="text" value={formUser.password || ''} onChange={e => setFormUser({ ...formUser, password: e.target.value })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="123456" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Vai trò</label>
                <select value={formUser.role} onChange={e => setFormUser({ ...formUser, role: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none">
                  <option value="STUDENT">Học sinh</option>
                  <option value="TEACHER">Giáo viên</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">AI Credits</label>
                  <input type="number" value={formUser.credits_ai} onChange={e => setFormUser({ ...formUser, credits_ai: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input type="number" value={formUser.points} onChange={e => setFormUser({ ...formUser, points: parseInt(e.target.value) || 0 })} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
                </div>
              </div>
              <button type="button" onClick={handleSaveUser} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex justify-center items-center">
                {isEditing ? <><Check size={18} className="mr-2" /> Lưu thay đổi</> : 'Tạo tài khoản'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit h-auto">
            <h2 className="text-lg font-bold text-gray-900 flex items-center mb-4"><RefreshCw className="mr-2 text-blue-600" /> Cập nhật hàng loạt</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">AI Credits mới</label>
                  <input type="number" value={bulkCredits} onChange={e => setBulkCredits(parseInt(e.target.value) || 0)} className="w-full border rounded-lg p-2 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Vai trò áp dụng</label>
                  <select value={bulkRole} onChange={e => setBulkRole(e.target.value)} className="w-full border rounded-lg p-2 bg-white outline-none">
                    <option value="STUDENT">Tất cả Học sinh</option>
                    <option value="TEACHER">Tất cả Giáo viên</option>
                  </select>
                </div>
              </div>
              <button onClick={handleBulkUpdate} disabled={bulkLoading} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex justify-center items-center">
                {bulkLoading ? 'Đang cập nhật...' : <><RefreshCw size={18} className="mr-2" /> Áp dụng ngay</>}
              </button>
            </div>
          </div>
        </div>

    </div>
  );
}

function ClassesTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [classes, setClasses] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formClass, setFormClass] = useState({ name: '', teacher_name: '', students_count: 0 });

  const fetchClasses = async () => {
    if (!token) return;
    try { 
      const res = await authFetch(`${API_URL}/admin/classes`); 
      if (!res.ok) {
        console.error('Fetch classes error:', res.status, await res.text());
        return;
      }
      const data = await res.json(); 
      setClasses(Array.isArray(data) ? data : []); 
    } catch (e) { 
      console.error('Fetch classes exception:', e); 
    }
  };

  useEffect(() => { fetchClasses(); }, [token]);

  const handleSave = async () => {
    if (!formClass.name || !formClass.teacher_name) return showAlert("Điền đủ thông tin!", 'warning');
    if (!token) return showAlert("Vui lòng đăng nhập lại!", 'warning');
    const url = isEditing ? `${API_URL}/admin/classes/${isEditing}` : `${API_URL}/admin/classes`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const res = await authFetch(url, { 
        method, 
        body: JSON.stringify(formClass) 
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Lỗi không xác định' }));
        showAlert(err.detail || 'Lỗi khi lưu', 'error');
        return;
      }
      showAlert('Lưu thành công!', 'success');
    } catch (e) {
      showAlert('Lỗi kết nối: ' + (e as Error).message, 'error');
    }
    resetForm();
    fetchClasses();
  };

  const handleEdit = (c: any) => {
    setIsEditing(c.id);
    setFormClass({ name: c.name, teacher_name: c.teacher_name, students_count: c.students_count || 0 });
  };

  const handleDelete = async (id: number) => {
    if (!token) return showAlert("Vui lòng đăng nhập lại!", 'warning');
    if (!(await showConfirm("Xoá lớp này?"))) return;
    try {
      const res = await authFetch(`${API_URL}/admin/classes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        showAlert('Lỗi khi xóa', 'error');
        return;
      }
      fetchClasses();
    } catch (e) {
      showAlert('Lỗi kết nối', 'error');
    }
  };

  const resetForm = () => { setIsEditing(null); setFormClass({ name: '', teacher_name: '', students_count: 0 }); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'Sửa Lớp Học' : 'Tạo Lớp Học Mới'}</h2>
          {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>
        <div className="space-y-3">
          <input type="text" value={formClass.name} onChange={e => setFormClass({ ...formClass, name: e.target.value })} placeholder="Tên Lớp (VD: IELTS Căn bản)" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <input type="text" value={formClass.teacher_name} onChange={e => setFormClass({ ...formClass, teacher_name: e.target.value })} placeholder="Tên Giáo viên phụ trách" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <input type="number" value={formClass.students_count} onChange={e => setFormClass({ ...formClass, students_count: parseInt(e.target.value) || 0 })} placeholder="Sĩ số" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <button onClick={handleSave} className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            {isEditing ? <><Check size={18} className="inline mr-1" /> Lưu thay đổi</> : '+ Thêm Lớp Này'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Lớp</h2>
        <ul className="space-y-3 max-h-[500px] overflow-y-auto">
          {classes.length === 0 && <p className="text-gray-400 text-sm">Chưa có lớp nào.</p>}
          {classes.map((c: any) => (
            <li key={c.id} className="p-3 border rounded-xl flex justify-between items-center bg-gray-50">
              <div>
                <p className="font-bold text-purple-700">{c.name}</p>
                <p className="text-xs text-gray-500">GV: {c.teacher_name} | Sĩ số: {c.students_count || 0}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(c)} className="text-blue-500 bg-blue-50 p-1.5 rounded hover:bg-blue-100"><Edit size={16} /></button>
                <button onClick={() => handleDelete(c.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LessonsTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [lessons, setLessons] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formLesson, setFormLesson] = useState({ class_id: '', title: '', content: '' });
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  const [exerciseType, setExerciseType] = useState('mixed');
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGenerateExercise = async () => {
    if (!file) return showAlert("Vui lòng đính kèm file trước tiên!", 'warning');
    setGeneratingAI(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("exercise_type", exerciseType);
      fd.append("num_questions", "5");

      const res = await authFetch(`${API_URL}/teacher/file/generate-assignment`, {
        method: "POST",
        body: fd
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.result || json;
        let newContent = formLesson.content + (formLesson.content ? "\n\n" : "") + "--- BÀI TẬP AI TẠO ---\n";
        if (data.vocabulary && data.vocabulary.length > 0) {
          newContent += "* Từ vựng trọng tâm:\n";
          data.vocabulary.forEach((v: any) => { newContent += `- ${v.word} (${v.pos}): ${v.meaning_vn}\n`; });
        }
        if (data.quiz && data.quiz.length > 0) {
          newContent += "\n* Trắc nghiệm:\n";
          data.quiz.forEach((q: any, i: number) => {
            newContent += `Câu ${i + 1}: ${q.question || q.q}\n`;
            (q.options || []).forEach((opt: string, j: number) => {
              newContent += `  ${String.fromCharCode(65 + j)}. ${opt}\n`;
            });
            const correctIdx = q.correct_answer ?? q.ans;
            if (correctIdx !== undefined) newContent += `=> Đáp án: ${String.fromCharCode(65 + correctIdx)}\n\n`;
          });
        }
        setFormLesson({ ...formLesson, content: newContent });
        showAlert("Tạo bài tập thành công! Kéo xuống để xem nội dung đã được tự động thêm vào.", 'success');
      } else showAlert("Lỗi tạo bài tập AI", 'error');
    } catch (e) { showAlert("Lỗi kết nối", 'error'); }
    finally { setGeneratingAI(false); }
  };

  const fetchLessons = async () => {
    try { const res = await authFetch(`${API_URL}/admin/lessons`); if (!res.ok) throw new Error(`API error ${res.status}`); const data = await res.json(); setLessons(Array.isArray(data) ? data : []); } catch { }
  };
  const fetchClasses = async () => {
    try { const res = await authFetch(`${API_URL}/admin/classes`); if (!res.ok) throw new Error(`API error ${res.status}`); const data = await res.json(); setClasses(Array.isArray(data) ? data : []); } catch { }
  };

  useEffect(() => { fetchLessons(); fetchClasses(); }, []);

  const handleSave = async () => {
    if (!formLesson.class_id || !formLesson.title) return showAlert("Hãy chọn lớp và nhập tên bài học", 'warning');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("class_id", formLesson.class_id);
      fd.append("title", formLesson.title);
      fd.append("content", formLesson.content);
      if (file) fd.append("file", file);
      const url = isEditing ? `${API_URL}/admin/lessons/${isEditing}` : `${API_URL}/admin/lessons`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
      resetForm();
      fetchLessons();
    } catch (err: any) { showAlert(err.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleEdit = (l: any) => {
    setIsEditing(l.id);
    setFormLesson({ class_id: String(l.class_id), title: l.title, content: l.content || '' });
    setFile(null);
  };

  const handleDelete = async (id: number) => {
    if (await showConfirm("Xóa bài học này?")) {
      await authFetch(`${API_URL}/admin/lessons/${id}`, { method: 'DELETE' });
      fetchLessons();
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormLesson({ class_id: '', title: '', content: '' });
    setFile(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><BookOpen className="mr-2 text-orange-600" size={20} /> {isEditing ? 'Sửa Bài Học' : 'Thêm Bài Học Mới'}</h2>
          {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>
        <div className="space-y-3">
          <select value={formLesson.class_id} onChange={e => setFormLesson({ ...formLesson, class_id: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
            <option value="">-- Chọn Lớp --</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={formLesson.title} onChange={e => setFormLesson({ ...formLesson, title: e.target.value })} placeholder="Tiêu đề bài học" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <textarea value={formLesson.content} onChange={e => setFormLesson({ ...formLesson, content: e.target.value })} placeholder="Nội dung tóm tắt..." className="w-full border rounded-lg p-2 outline-none focus:ring-2 h-24" />
          <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-orange-400 hover:bg-orange-50 transition">
            <input type="file" className="hidden" id="lesson-file" onChange={e => { if (e.target.files) setFile(e.target.files[0]); }} />
            <label htmlFor="lesson-file" className="cursor-pointer text-gray-500 flex flex-col items-center text-sm">
              <UploadCloud size={28} className={file ? "text-orange-600" : ""} />
              <span className="mt-1 font-medium">{file ? file.name : "Đính kèm file (tuỳ chọn)"}</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select value={exerciseType} onChange={e => setExerciseType(e.target.value)} className="border rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 flex-grow">
              <option value="mixed">Bài tập hỗn hợp cơ bản</option>
              <option value="toeic reading part 5, part 6 format">Bài tập định dạng TOEIC</option>
              <option value="ielts reading short answer format">Bài tập định dạng IELTS</option>
            </select>
            <button onClick={handleGenerateExercise} disabled={generatingAI || !file} className="bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center whitespace-nowrap">
              <Sparkles size={16} className="mr-1" /> {generatingAI ? "Đang tạo..." : "AI Tạo Bài Tập"}
            </button>
          </div>

          <button onClick={handleSave} disabled={uploading} className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition mt-2">
            {uploading ? "Đang lưu..." : isEditing ? <><Check size={18} className="inline mr-1" /> Lưu thay đổi</> : "+ Thêm Bài Học"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Bài học</h2>
        <ul className="space-y-3 max-h-[500px] overflow-y-auto">
          {lessons.length === 0 && <p className="text-gray-400 text-sm">Chưa có bài học nào.</p>}
          {lessons.map((l: any) => (
            <li key={l.id} className="p-3 border rounded-xl bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-orange-700">{l.title}</p>
                  <p className="text-xs text-gray-500">Lớp: {l.class_name || classes.find((c: any) => c.id === l.class_id)?.name || 'N/A'}</p>
                  {l.content && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{l.content}</p>}
                  {l.file_name && (
                    <a href={`${API_URL}/admin/lessons/${l.id}/file`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-xs text-indigo-600 hover:underline">
                      <FileSpreadsheet size={14} className="mr-1" /> {l.file_name}
                    </a>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => handleEdit(l)} className="text-blue-500 bg-blue-50 p-1.5 rounded hover:bg-blue-100"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(l.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function VocabTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [words, setWords] = useState<any[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [loadingWords, setLoadingWords] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Edit / Create single word
  const [editingWord, setEditingWord] = useState<string | null>(null); // null = not editing, '' = creating new
  const [formWord, setFormWord] = useState({ word: '', pronunciation: '', meaning: '', level: 'A1', type: 'noun', example: '' });
  const [savingWord, setSavingWord] = useState(false);

  const fetchWords = async (level = filterLevel, skip = page * PAGE_SIZE, searchQ = search) => {
    setLoadingWords(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
      if (level) params.set('level', level);
      if (searchQ) params.set('search', searchQ);
      const res = await authFetch(`${API_URL}/admin/vocab/list?${params}`);
      const data = await res.json();
      setWords(data.words || []);
      setTotalWords(data.total || 0);
    } catch { setWords([]); setTotalWords(0); }
    finally { setLoadingWords(false); }
  };

  useEffect(() => { fetchWords(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await authFetch(`${API_URL}/admin/vocab/import`, { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Upload failed");
      showAlert(result.message, 'success');
      setFile(null);
      fetchWords();
    } catch (err: any) { showAlert("Lỗi: " + err.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleDeleteWord = async (word: string) => {
    if (!(await showConfirm(`Xoá từ "${word}"?`))) return;
    console.log("[DEBUG] Starting delete word operation");
    const startTime = Date.now();
    try {
      const res = await authFetch(`${API_URL}/admin/vocab/${encodeURIComponent(word)}`, { method: 'DELETE' });
      if (res.ok) {
        console.log(`[DEBUG] Delete word successful in ${Date.now() - startTime}ms`);
        fetchWords();
      } else {
        console.error(`[DEBUG] Delete word failed with status ${res.status}: ${await res.text()}`);
        showAlert('Lỗi xoá từ', 'error');
      }
    } catch (e) {
      console.error(`[DEBUG] Delete word error in ${Date.now() - startTime}ms:`, e);
      showAlert('Lỗi kết nối', 'error');
    }
  };

  const handleFilterChange = (level: string) => {
    setFilterLevel(level);
    setPage(0);
    fetchWords(level, 0, search);
  };

  const handleSearch = () => {
    setPage(0);
    fetchWords(filterLevel, 0, search);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchWords(filterLevel, newPage * PAGE_SIZE, search);
  };

  const handleEditWord = (w: any) => {
    setEditingWord(w.word);
    setFormWord({ word: w.word, pronunciation: w.pronunciation || '', meaning: w.meaning || '', level: w.level || 'A1', type: w.type || 'noun', example: w.example || '' });
  };

  const handleNewWord = () => {
    setEditingWord('');
    setFormWord({ word: '', pronunciation: '', meaning: '', level: 'A1', type: 'noun', example: '' });
  };

  const handleSaveWord = async () => {
    console.log("[DEBUG] Starting save word operation");
    const startTime = Date.now();
    if (!formWord.word) return showAlert("Nhập từ vựng!", 'warning');
    setSavingWord(true);
    try {
      const isNew = editingWord === '';
      const url = isNew ? `${API_URL}/admin/vocab` : `${API_URL}/admin/vocab/${encodeURIComponent(editingWord!)}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await authFetch(url, { method, body: JSON.stringify(formWord) });
      if (!res.ok) {
        const e = await res.json();
        console.error(`[DEBUG] Save word failed with status ${res.status}: ${JSON.stringify(e)}`);
        throw new Error(e.detail || 'Error');
      }
      console.log(`[DEBUG] Save word successful in ${Date.now() - startTime}ms`);
      setEditingWord(null);
      setFormWord({ word: '', pronunciation: '', meaning: '', level: 'A1', type: 'noun', example: '' });
      fetchWords();
    } catch (err: any) {
      console.error(`[DEBUG] Save word error in ${Date.now() - startTime}ms:`, err);
      showAlert(err.message, 'error');
    }
    finally { setSavingWord(false); }
  };

  const totalPages = Math.ceil(totalWords / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Upload + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><FileSpreadsheet className="mr-2 text-indigo-600" /> Nhập Nhanh (CSV)</h2>
          <p className="text-sm text-gray-500 mb-4">Upload file thêm hàng loạt từ vựng vào Neo4j Graph Database.</p>
          <div className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition">
            <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
            <label htmlFor="file-upload" className="cursor-pointer text-gray-500 flex flex-col items-center">
              {file ? <FileSpreadsheet size={40} className="text-indigo-600 mb-2" /> : <UploadCloud size={40} className="mb-2" />}
              <span className="font-medium text-gray-700">{file ? file.name : "Click chọn file .csv"}</span>
            </label>
          </div>
          <button onClick={handleUpload} disabled={!file || uploading} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">{uploading ? "Đang import..." : "Bắt đầu Import"}</button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Database className="mr-2 text-indigo-600" /> Thống kê & Tạo từ</h2>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-indigo-600">{totalWords}</p>
            <p className="text-gray-500 mt-1">từ vựng trong Neo4j</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
              <button key={level} onClick={() => handleFilterChange(level)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${filterLevel === level ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {level || 'Tất cả'}
              </button>
            ))}
          </div>
          <button onClick={handleNewWord} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center">
            <Plus size={18} className="mr-1" /> Thêm từ vựng mới
          </button>
        </div>
      </div>

      {/* Edit / Create Form */}
      {editingWord !== null && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">{editingWord === '' ? 'Thêm Từ Vựng Mới' : `Sửa: ${editingWord}`}</h2>
            <button onClick={() => setEditingWord(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={formWord.word} onChange={e => setFormWord({ ...formWord, word: e.target.value })} placeholder="Từ vựng *" className="border rounded-lg p-2 focus:ring-2 outline-none" />
            <input value={formWord.pronunciation} onChange={e => setFormWord({ ...formWord, pronunciation: e.target.value })} placeholder="Phát âm" className="border rounded-lg p-2 focus:ring-2 outline-none" />
            <input value={formWord.meaning} onChange={e => setFormWord({ ...formWord, meaning: e.target.value })} placeholder="Nghĩa tiếng Việt" className="border rounded-lg p-2 focus:ring-2 outline-none" />
            <select value={formWord.level} onChange={e => setFormWord({ ...formWord, level: e.target.value })} className="border rounded-lg p-2 bg-white outline-none">
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={formWord.type} onChange={e => setFormWord({ ...formWord, type: e.target.value })} className="border rounded-lg p-2 bg-white outline-none">
              {['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrase'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={formWord.example} onChange={e => setFormWord({ ...formWord, example: e.target.value })} placeholder="Ví dụ" className="border rounded-lg p-2 focus:ring-2 outline-none" />
          </div>
          <button onClick={handleSaveWord} disabled={savingWord} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
            {savingWord ? 'Đang lưu...' : <><Check size={18} className="inline mr-1" /> Lưu</>}
          </button>
        </div>
      )}

      {/* Word List with search + pagination */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><Database className="mr-2 text-indigo-600" size={20} /> Danh sách Từ Vựng</h2>
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Tìm từ..." className="border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 w-48" />
            <button onClick={handleSearch} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200">Tìm</button>
            <button onClick={() => fetchWords()} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"><RefreshCw size={14} className="mr-1" /> Làm mới</button>
          </div>
        </div>
        {loadingWords ? <p className="text-gray-400 text-sm py-4">Đang tải từ Neo4j...</p> : words.length === 0 ? <p className="text-gray-400 text-sm py-4">Không có từ vựng nào.</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-3 font-medium">Từ</th>
                    <th className="pb-3 font-medium">Phát âm</th>
                    <th className="pb-3 font-medium">Nghĩa</th>
                    <th className="pb-3 font-medium">Level</th>
                    <th className="pb-3 font-medium">Loại từ</th>
                    <th className="pb-3 font-medium">Ví dụ</th>
                    <th className="pb-3 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((w: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-semibold text-indigo-700">{w.word}</td>
                      <td className="py-3 text-gray-500">{w.pronunciation || '-'}</td>
                      <td className="py-3 text-gray-700">{w.meaning || '-'}</td>
                      <td className="py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{w.level || '-'}</span></td>
                      <td className="py-3 text-gray-500">{w.type || '-'}</td>
                      <td className="py-3 text-gray-500 max-w-[200px] truncate">{w.example || '-'}</td>
                      <td className="py-3 flex gap-1">
                        <button onClick={() => handleEditWord(w)} className="text-blue-400 hover:text-blue-600"><Edit size={15} /></button>
                        <button onClick={() => handleDeleteWord(w.word)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Trang {page + 1} / {totalPages || 1} ({totalWords} từ)</p>
              <div className="flex gap-2">
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 0} className="px-3 py-1 rounded-lg text-sm border disabled:opacity-30 hover:bg-gray-100">Trước</button>
                <button onClick={() => handlePageChange(page + 1)} disabled={page + 1 >= totalPages} className="px-3 py-1 rounded-lg text-sm border disabled:opacity-30 hover:bg-gray-100">Sau</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GrammarTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Formatting Helper
  const handleEditorCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const parseMarkdown = (text: string) => {
    if (!text) return "";
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    return text
      .replace(/###\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h3>$1</h3>')
      .replace(/##\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h2>$1</h2>')
      .replace(/#\s?(.*?)(?=\n|$|###|##|#|\*\*)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/__(.*?)__/g, '<u>$1</u>')
      .replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\|/g, '<span class="mx-2 opacity-30">|</span>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  const fetchRules = async () => {
    setLoading(true);
    try { 
      const res = await authFetch(`${API_URL}/admin/grammar`); 
      if (!res.ok) throw new Error(`API error ${res.status}`); 
      const data = await res.json(); 
      setRules(Array.isArray(data) ? data : []); 
    } catch { }
    finally { setLoading(false); }
  };

  const handleAIGenerate = async () => {
    if (!name) return showAlert("Nhập tên cấu trúc ngữ pháp trước!", 'warning');
    setGeneratingAI(true);
    try {
      const res = await authFetch(`${API_URL}/admin/grammar/ai-generate`, {
        method: "POST",
        body: JSON.stringify({ topic: name })
      });
      if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "AI failed to respond");
      }
      const data = await res.json();
      
      let description = "";
      if (typeof data === 'string') {
          description = data;
      } else if (data && typeof data === 'object') {
          description = data.description || data.content || (data.name && JSON.stringify(data)) || "AI không trả về nội dung mô tả.";
      }

      if (description && description !== "{}") {
          if (editorRef.current) {
              editorRef.current.innerHTML = parseMarkdown(description);
              if (data.name && (!name || name === "")) setName(data.name);
          }
      } else {
          throw new Error("AI trả về dữ liệu rỗng. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("[AI GENERATE ERROR]", err);
      showAlert(`Lỗi AI: ${err.message || "Không thể tạo nội dung"}`, 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSave = async () => {
    if (!name) return showAlert("Nhập tên cấu trúc ngữ pháp", 'warning');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", editorRef.current?.innerHTML || "");
      if (file) fd.append("file", file);
      const url = isEditing ? `${API_URL}/admin/grammar/${isEditing}` : `${API_URL}/admin/grammar`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || 'Error');
      resetForm();
      fetchRules();
      showAlert("Đã lưu thành công!", "success");
    } catch (err: any) { showAlert(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = (r: any) => {
    setIsEditing(r.id);
    setName(r.name);
    setFile(null);
    setTimeout(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = r.description || '';
        }
    }, 50);
  };

  const handleDelete = async (id: number) => {
    if (!(await showConfirm("Xoá cấu trúc ngữ pháp này?"))) return;
    await authFetch(`${API_URL}/admin/grammar/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setFile(null);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-8">
        <div className="flex items-center gap-4">
            <div className="bg-teal-50 p-3 rounded-2xl">
                <BookText className="text-teal-600" size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-900 leading-none">Kho Ngữ Pháp (AI)</h2>
                <p className="text-gray-500 text-sm mt-1 font-medium italic italic">Quản lý cấu trúc ngữ pháp hệ thống.</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Plus className="text-teal-600" size={24} /> 
                {isEditing ? 'Cập nhật Cấu trúc' : 'Soạn thảo Ngữ pháp mới'}
              </h3>
              {isEditing && <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-xl transition"><X size={20} /></button>}
            </div>
            
            <div className="space-y-6">
               <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Tên cấu trúc (VD: Hiện tại tiếp diễn)</label>
                <div className="flex gap-3">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-gray-50 border-2 border-gray-200 focus:border-teal-500 rounded-xl p-4 outline-none transition-all font-bold text-lg" placeholder="Tên cấu trúc..." />
                  <button onClick={handleAIGenerate} disabled={generatingAI} className="px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-black flex items-center gap-2 shadow-sm">
                     {generatingAI ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />} 
                     AI Tạo Mô tả
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Nội dung chi tiết & Cấu trúc</label>
                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-teal-500 transition-all bg-white shadow-sm">
                    {/* Toolbar */}
                    <div className="bg-white border-b-4 border-teal-500 p-4 flex flex-wrap gap-2.5 items-center sticky top-0 z-20 shadow-md">
                        <EditorToolbarButton onClick={() => handleEditorCommand('bold')} icon={<Bold size={20}/>} tooltip="In đậm" label="Bold" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('italic')} icon={<Italic size={20}/>} tooltip="In nghiêng" label="Italic" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('underline')} icon={<Underline size={20}/>} tooltip="Gạch chân" label="Under" />
                        <div className="w-[3px] h-8 bg-gray-200 mx-2"></div>
                        <EditorToolbarButton onClick={() => handleEditorCommand('formatBlock', 'h1')} icon={<Heading1 size={20}/>} tooltip="Tiêu đề 1" label="H1" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('formatBlock', 'h2')} icon={<Heading2 size={20}/>} tooltip="Tiêu đề 2" label="H2" />
                        <div className="w-[3px] h-8 bg-gray-200 mx-2"></div>
                        <EditorToolbarButton onClick={() => handleEditorCommand('insertUnorderedList')} icon={<List size={20}/>} tooltip="Danh sách chấm" label="Bul" />
                        <EditorToolbarButton onClick={() => handleEditorCommand('insertOrderedList')} icon={<ListOrdered size={20}/>} tooltip="Danh sách số" label="Num" />
                        <div className="w-[3px] h-8 bg-gray-200 mx-2"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-gray-400">Font:</span>
                            <select onChange={(e) => handleEditorCommand('fontName', e.target.value)} className="bg-white border-2 border-gray-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-teal-400 transition">
                                <option value="Inter, sans-serif">Sans</option>
                                <option value="'Roboto Slab', serif">Serif</option>
                                <option value="'Fira Code', monospace">Mono</option>
                            </select>
                        </div>
                    </div>
                    {/* Content area */}
                    <div 
                        ref={editorRef}
                        contentEditable 
                        className="min-h-[400px] p-8 outline-none rich-text max-w-none bg-white font-medium text-lg leading-relaxed"
                        spellCheck={false}
                    />
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-teal-400 hover:bg-teal-50/30 transition-all group">
                <input type="file" className="hidden" id="admin-grammar-file" onChange={e => { if (e.target.files) setFile(e.target.files[0]); }} />
                <label htmlFor="admin-grammar-file" className="cursor-pointer text-gray-500 flex flex-col items-center gap-3">
                  <UploadCloud size={40} className={`transition ${file ? "text-teal-600 scale-110" : "group-hover:-translate-y-2"}`} />
                  <span className="font-black text-lg">{file ? file.name : "Đính kèm tài liệu học tập (.pdf, .docx, .png)"}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400 italic">Dung lượng tối đa 10MB</span>
                </label>
              </div>

              <button onClick={handleSave} disabled={saving} className="w-full bg-teal-600 text-white py-5 rounded-xl font-black text-xl hover:bg-teal-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-3">
                {saving ? <RefreshCw className="animate-spin" size={24} /> : isEditing ? <><Save size={24} /> Lưu thay đổi</> : <Plus size={24} />} 
                {saving ? "Đang xử lý..." : isEditing ? "Cập nhật Kho Ngữ Pháp" : "Tạo mới bài Ngữ Pháp"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-fit">
          <h3 className="text-2xl font-black mb-6 flex justify-between items-center">
            Danh sách
            <span className="text-xs bg-gray-100 text-gray-400 px-3 py-1 rounded-full">{rules.length} tài liệu</span>
          </h3>
          {loading ? (
             <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse"></div>)}
             </div>
          ) : rules.length === 0 ? (
            <div className="py-20 text-center">
                <BookText size={64} className="mx-auto text-gray-100 mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest">Trống</p>
            </div>
          ) : (
            <ul className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {rules.map((r: any) => (
                <li key={r.id} className="p-5 bg-gray-50/30 rounded-xl border border-gray-100 hover:border-teal-200 transition-all group">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-black text-teal-900 text-lg group-hover:text-teal-600 transition-colors leading-tight mb-2">{r.name}</p>
                      {r.description && (
                        <div 
                          className="text-xs text-gray-500 font-bold line-clamp-2 leading-relaxed rich-text"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(r.description) }}
                        />
                      )}
                      {r.file_name && (
                        <a href={`${API_URL}/admin/grammar/${r.id}/file`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center mt-3 text-xs text-indigo-600 font-black hover:underline gap-1">
                          <FileSpreadsheet size={14} /> {r.file_name}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(r)} className="text-blue-500 bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(r.id)} className="text-red-500 bg-white p-3 rounded-2xl shadow-sm hover:shadow-md transition"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// Sub-component for Toolbar Buttons
function EditorToolbarButton({ onClick, icon, tooltip, label }: { onClick: () => void, icon: React.ReactNode, tooltip: string, label?: string }) {
    return (
        <button 
            type="button"
            onMouseDown={(e) => { 
                e.preventDefault(); 
                onClick(); 
            }}
            className="px-3 py-2 bg-white hover:bg-teal-50 text-gray-900 border-2 border-gray-100 hover:border-teal-400 rounded-xl transition shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 min-w-[50px] justify-center"
            title={tooltip}
        >
            {icon}
            {label && <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">{label}</span>}
        </button>
    );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingNeo4j, setTestingNeo4j] = useState(false);
  const [testingGeminiModels, setTestingGeminiModels] = useState(false);
  const [geminiModelsOutput, setGeminiModelsOutput] = useState("");
  const [showGeminiModelsModal, setShowGeminiModelsModal] = useState(false);
  const [copiedGeminiModels, setCopiedGeminiModels] = useState(false);
  const [testingCohereModels, setTestingCohereModels] = useState(false);
  const [cohereModelsOutput, setCohereModelsOutput] = useState("");
  const [showCohereModelsModal, setShowCohereModelsModal] = useState(false);
  const [copiedCohereModels, setCopiedCohereModels] = useState(false);
  const { token, authFetch } = useAuth();
  const { showAlert } = useNotification();

  const fetchSettings = async () => {
    try {
      // FIXED: include Bearer token — admin routes require authentication
      const res = await authFetch(`${API_URL}/admin/settings`);
      if (res.ok) {
        setSettings(await res.json());
      } else if (res.status === 401 || res.status === 403) {
        console.error('Settings fetch: unauthorized. Check admin token.');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // FIXED: include Bearer token
      const res = await authFetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(`Đã lưu ${data.updated_keys?.length || 0} cài đặt. Neo4j: ${data.neo4j_status}`, 'success');
        fetchSettings();
      } else {
        showAlert(data.detail || 'Lỗi khi lưu cài đặt', 'error');
      }
    } catch (err) { showAlert('Lỗi kết nối tới server', 'error'); }
    finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      // FIXED: include Bearer token
      const res = await authFetch(`${API_URL}/admin/settings/test-email`, { method: 'POST' });
      const data = await res.json();
      const steps = data.steps ? '\n' + data.steps.join('\n') : '';
      if (data.success) {
        showAlert(`✅ ${data.message}${steps}`, 'success');
      } else {
        showAlert(`❌ ${data.error || 'Email test failed'}${steps}`, 'error');
      }
    } catch { showAlert('Lỗi kết nối', 'error'); }
    finally { setTestingEmail(false); }
  };

  const handleTestNeo4j = async () => {
    setTestingNeo4j(true);
    try {
      // FIXED: include Bearer token
      const res = await authFetch(`${API_URL}/admin/settings/test-neo4j`, { method: 'POST' });
      const data = await res.json();
      showAlert(res.ok ? data.message : (data.detail || 'Neo4j connection failed'), res.ok ? 'success' : 'error');
    } catch { showAlert('Lỗi kết nối', 'error'); }
    finally { setTestingNeo4j(false); }
  };

  const handleListGeminiModels = async () => {
    setTestingGeminiModels(true);
    setCopiedGeminiModels(false);
    try {
      const res = await authFetch(`${API_URL}/admin/settings/gemini-models`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.detail || 'Khong the lay danh sach Gemini models', 'error');
        return;
      }
      setGeminiModelsOutput(data.formatted_output || '');
      setShowGeminiModelsModal(true);
    } catch {
      showAlert('Loi ket noi toi server', 'error');
    } finally {
      setTestingGeminiModels(false);
    }
  };

  const handleCopyGeminiModels = async () => {
    try {
      await navigator.clipboard.writeText(geminiModelsOutput);
      setCopiedGeminiModels(true);
      setTimeout(() => setCopiedGeminiModels(false), 2000);
    } catch {
      showAlert('Khong the copy ket qua', 'error');
    }
  };

  const handleListCohereModels = async () => {
    setTestingCohereModels(true);
    setCopiedCohereModels(false);
    try {
      const res = await authFetch(`${API_URL}/admin/settings/cohere-models`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.detail || 'Khong the lay danh sach Cohere models', 'error');
        return;
      }
      setCohereModelsOutput(data.formatted_output || '');
      setShowCohereModelsModal(true);
    } catch {
      showAlert('Loi ket noi toi server', 'error');
    } finally {
      setTestingCohereModels(false);
    }
  };

  const handleCopyCohereModels = async () => {
    try {
      await navigator.clipboard.writeText(cohereModelsOutput);
      setCopiedCohereModels(true);
      setTimeout(() => setCopiedCohereModels(false), 2000);
    } catch {
      showAlert('Khong the copy ket qua', 'error');
    }
  };

  const toggleShow = (key: string) => setShowPasswords(p => ({ ...p, [key]: !p[key] }));

  const sensitiveKeys = ['GOOGLE_API_KEY', 'OPENAI_API_KEY', 'COHERE_API_KEY', 'NEO4J_PASSWORD', 'SMTP_PASSWORD', 'RESEND_API_KEY', 'BREVO_API_KEY'];

  const renderField = (key: string, label: string, placeholder: string) => {
    const isSensitive = sensitiveKeys.includes(key);
    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          <input
            type={isSensitive && !showPasswords[key] ? "password" : "text"}
            value={settings[key] || ''}
            onChange={e => setSettings({ ...settings, [key]: e.target.value })}
            className="w-full border border-gray-200 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            placeholder={placeholder}
          />
          {isSensitive && (
            <button type="button" onClick={() => toggleShow(key)} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
              {showPasswords[key] ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <p className="text-gray-500">Loading settings...</p>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* AI API Keys */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Settings className="mr-2 text-indigo-600" size={20} /> API Keys (AI)
          </h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleListGeminiModels} disabled={testingGeminiModels} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 flex items-center">
              <Sparkles size={14} className={`mr-1.5 ${testingGeminiModels ? 'animate-pulse' : ''}`} /> {testingGeminiModels ? 'Dang lay Gemini...' : 'List Gemini models'}
            </button>
            <button onClick={handleListCohereModels} disabled={testingCohereModels} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 disabled:opacity-50 flex items-center">
              <Sparkles size={14} className={`mr-1.5 ${testingCohereModels ? 'animate-pulse' : ''}`} /> {testingCohereModels ? 'Dang lay Cohere...' : 'List Cohere models'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderField('GOOGLE_API_KEY', 'Google Gemini API Key', 'AIzaSy...')}
          {renderField('OPENAI_API_KEY', 'OpenAI API Key (optional)', 'sk-...')}
          {renderField('COHERE_API_KEY', 'Cohere API Key (optional)', 'c4-...')}
        </div>
      </div>

      {/* Neo4j */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Database className="mr-2 text-indigo-600" size={20} /> Neo4j Graph Database
          </h2>
          <button onClick={handleTestNeo4j} disabled={testingNeo4j} className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 flex items-center">
            <RefreshCw size={14} className={`mr-1.5 ${testingNeo4j ? 'animate-spin' : ''}`} /> {testingNeo4j ? 'Testing...' : 'Test connection'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('NEO4J_URI', 'Neo4j URI', 'neo4j+s://xxx.databases.neo4j.io')}
          {renderField('NEO4J_USERNAME', 'Username', 'neo4j')}
          {renderField('NEO4J_PASSWORD', 'Password', '***')}
          {renderField('NEO4J_DATABASE', 'Database Name (empty = username)', '')}
        </div>
      </div>

      {/* Email Configuration */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Mail className="mr-2 text-indigo-600" size={20} /> Email Configuration
          </h2>
          <button onClick={handleTestEmail} disabled={testingEmail} className="px-4 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 flex items-center">
            <Mail size={14} className="mr-1.5" /> {testingEmail ? 'Sending...' : 'Send test email'}
          </button>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          <strong>Lưu ý:</strong> Render free tier chặn SMTP (port 587/465). Dùng <strong>Brevo</strong> (300 email/ngày miễn phí, gửi được đến bất kỳ ai).
          Đăng ký tại <a href="https://app.brevo.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">brevo.com</a> → SMTP & API → API Keys.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Provider</label>
            <select
              value={settings['EMAIL_PROVIDER'] || 'auto'}
              onChange={e => setSettings({ ...settings, EMAIL_PROVIDER: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
            >
              <option value="auto">Auto (Brevo → Resend → SMTP)</option>
              <option value="brevo">Brevo (recommended - gửi đến bất kỳ ai)</option>
              <option value="resend">Resend (chỉ gửi đến chủ tài khoản nếu free)</option>
              <option value="smtp">SMTP only (chỉ hoạt động local)</option>
            </select>
          </div>
          {renderField('BREVO_API_KEY', 'Brevo API Key', 'xkeysib-xxxxxxxx')}
          {renderField('RESEND_API_KEY', 'Resend API Key (backup)', 're_xxxxxxxx')}
          {renderField('SENDER_EMAIL', 'Sender Email', 'your@gmail.com')}
          <div className="md:col-span-2"><hr className="border-gray-200" /></div>
          {renderField('SMTP_SERVER', 'SMTP Server', 'smtp.gmail.com')}
          {renderField('SMTP_PORT', 'SMTP Port', '587')}
          {renderField('SMTP_USERNAME', 'SMTP Username', 'your@gmail.com')}
          {renderField('SMTP_PASSWORD', 'SMTP App Password', '***')}
        </div>
      </div>

      {/* Frontend URL */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Settings className="mr-2 text-indigo-600" size={20} /> Frontend URL
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {renderField('FRONTEND_URL', 'Frontend URL (for password reset links)', 'https://your-app.vercel.app')}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg flex items-center">
          <Save size={18} className="mr-2" /> {saving ? 'Saving...' : 'Save all settings'}
        </button>
      </div>

      {showGeminiModelsModal && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowGeminiModelsModal(false)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center">
                <Sparkles size={18} className="mr-2 text-indigo-600" /> Gemini Models
              </h3>
              <button onClick={() => setShowGeminiModelsModal(false)} className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto bg-slate-950 px-6 py-5">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-cyan-100">
                {geminiModelsOutput || 'Khong co du lieu'}
              </pre>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={handleCopyGeminiModels} className={`min-w-[140px] rounded-lg px-4 py-2.5 text-sm font-bold transition ${copiedGeminiModels ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                {copiedGeminiModels ? <><Check size={16} className="mr-2 inline" />Da copy</> : <><Copy size={16} className="mr-2 inline" />Copy ket qua</>}
              </button>
              <button onClick={() => setShowGeminiModelsModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Dong
              </button>
            </div>
          </div>
        </div>
      )}

      {showCohereModelsModal && (
        <div className="fixed inset-0 !mt-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setShowCohereModelsModal(false)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center">
                <Sparkles size={18} className="mr-2 text-emerald-600" /> Cohere Models
              </h3>
              <button onClick={() => setShowCohereModelsModal(false)} className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto bg-slate-950 px-6 py-5">
              <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-emerald-100">
                {cohereModelsOutput || 'Khong co du lieu'}
              </pre>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={handleCopyCohereModels} className={`min-w-[140px] rounded-lg px-4 py-2.5 text-sm font-bold transition ${copiedCohereModels ? 'bg-green-100 text-green-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                {copiedCohereModels ? <><Check size={16} className="mr-2 inline" />Da copy</> : <><Copy size={16} className="mr-2 inline" />Copy ket qua</>}
              </button>
              <button onClick={() => setShowCohereModelsModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Dong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentsTab() {
  const { token, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [form, setForm] = useState({ class_id: '', title: '', description: '', type: 'quiz', due_date: '', skill_type: '', bloom_level: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [assRes, clsRes] = await Promise.all([
        authFetch(`${API_URL}/admin/assignments`),
        authFetch(`${API_URL}/admin/classes`)
      ]);
      if (assRes.ok) setAssignments(await assRes.json());
      if (clsRes.ok) setClasses(await clsRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.class_id || !form.title) return showAlert("Vui lòng nhập tên bài tập và chọn lớp.", 'warning');
    try {
      const res = await authFetch(`${API_URL}/admin/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(form.class_id),
          title: form.title,
          description: form.description,
          type: form.type,
          due_date: form.due_date || "2099-12-31",
          skill_type: form.skill_type || null,
          bloom_level: parseInt(form.bloom_level) || null
        })
      });
      if (res.ok) {
        showAlert("Tạo thành công!", 'success');
        setForm({ class_id: '', title: '', description: '', type: 'quiz', due_date: '', skill_type: '', bloom_level: '' });
        fetchData();
      } else {
        showAlert("Lỗi khi tạo.", 'error');
      }
    } catch (e) { showAlert("Lỗi kết nối", 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!(await showConfirm("Bạn có chắc chắn xoá?"))) return;
    try {
      await authFetch(`${API_URL}/admin/assignments/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { showAlert("Lỗi xoá", 'error'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><ClipboardList className="mr-2 text-indigo-600" size={20} /> Tạo Bài tập / Đề thi</h2>
        <div className="space-y-3">
          <select value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
            <option value="">-- Chọn Lớp --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tên bài tập/đề thi (VD: IELTS Mock Test 1)" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Kỹ năng</label>
              <select value={form.skill_type} onChange={e => setForm({ ...form, skill_type: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
                <option value="">Không phân loại</option>
                <option value="Reading">Reading</option>
                <option value="Listening">Listening</option>
                <option value="Writing">Writing</option>
                <option value="Speaking">Speaking</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mức độ Bloom</label>
              <select value={form.bloom_level} onChange={e => setForm({ ...form, bloom_level: e.target.value })} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
                <option value="">Không xác định</option>
                <option value="1">1. Nhớ (Remember)</option>
                <option value="2">2. Hiểu (Understand)</option>
                <option value="3">3. Áp dụng (Apply)</option>
                <option value="4">4. Phân tích (Analyze)</option>
                <option value="5">5. Đánh giá (Evaluate)</option>
                <option value="6">6. Sáng tạo (Create)</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition mt-2">+ Thêm Bài Tập</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Tổng quát</h2>
        {loading ? <p>Đang tải...</p> : (
          <ul className="space-y-3 max-h-[500px] overflow-y-auto">
            {assignments.map(a => (
              <li key={a.id} className="p-3 border rounded-xl bg-gray-50 flex justify-between items-start">
                <div>
                  <p className="font-bold text-indigo-700">{a.title}</p>
                  <p className="text-xs text-gray-500">Lớp: {a.class_name}</p>
                  <div className="flex gap-2 mt-1">
                    {a.skill_type && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{a.skill_type}</span>}
                    {a.bloom_level && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Bloom Lvl: {a.bloom_level}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AILogsTab() {
  const { token, authFetch } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const PAGE_SIZE = 50;

  const handleCopyFeedback = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [logsRes, statsRes] = await Promise.all([
        authFetch(`${API_URL}/admin/ai-logs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`),
        authFetch(`${API_URL}/admin/ai-stats`)
      ]);
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        setTotal(logsData.total || 0);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Error fetching AI logs/stats:", err);
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh interval (10 seconds)
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [token, page]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tổng yêu cầu</p>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Sparkles size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{total.toLocaleString()}</h3>
          <p className="text-xs text-gray-500 mt-2">Dữ liệu từ lúc triển khai monitoring</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tốc độ TB (Latency)</p>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">
            {stats?.model_performance?.length > 0
              ? Math.round(stats.model_performance.filter(s => s.model !== 'KnowledgeGraph').reduce((acc, s) => acc + s.avg_latency, 0) / Math.max(1, stats.model_performance.filter(s => s.model !== 'KnowledgeGraph').length))
              : 0} ms
          </h3>
          <p className="text-xs text-gray-500 mt-2">Trung bình cộng của tất cả LLM</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Truy vấn Graph</p>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Network size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">
            {stats?.model_performance?.find(s => s.model === 'KnowledgeGraph')?.avg_latency 
                ? Math.round(stats.model_performance.find(s => s.model === 'KnowledgeGraph').avg_latency) 
                : 0} ms
          </h3>
          <p className="text-xs text-gray-500 mt-2">Tốc độ tìm kiếm tri thức (Neo4j)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chất lượng AI</p>
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><GraduationCap size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">
            {stats?.feature_performance?.length > 0
              ? (stats.feature_performance.reduce((acc, f) => acc + (f.avg_score || 0), 0) / stats.feature_performance.filter(f => f.avg_score).length || 0).toFixed(1)
              : 0} / 10
          </h3>
          <p className="text-xs text-gray-500 mt-2">Điểm trung bình từ Giám khảo AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full max-h-[350px] flex flex-col flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center shrink-0"><Database className="mr-2 text-indigo-600" /> Hiệu năng theo Model</h2>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                  <th className="pb-3 pt-2">Model</th>
                  <th className="pb-3 pt-2">Độ khó</th>
                  <th className="pb-3 pt-2">Latency TB</th>
                  <th className="pb-3 pt-2">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {stats?.model_performance?.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition min-h-[40px]">
                    <td className="py-3 font-black text-gray-700">
                      {s.model === 'KnowledgeGraph' ? (
                        <span className="flex items-center text-purple-600"><Network size={14} className="mr-1" /> Knowledge Graph</span>
                      ) : s.model}
                    </td>
                    <td className="py-3 capitalize text-gray-500 font-bold">{s.difficulty || "N/A"}</td>
                    <td className="py-3">
                      <span className={`font-black ${s.avg_latency > 5000 ? 'text-red-500' : s.avg_latency > 2000 ? 'text-orange-500' : 'text-green-500'}`}>
                        {Math.round(s.avg_latency).toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 font-bold text-gray-400">{s.total_requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full max-h-[350px] flex flex-col flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center shrink-0"><Activity className="mr-2 text-indigo-600" /> Hiệu năng theo Tính năng</h2>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                  <th className="pb-3 pt-2">Tính năng</th>
                  <th className="pb-3 pt-2">Latency TB</th>
                  <th className="pb-3 pt-2">Tỷ lệ OK</th>
                  <th className="pb-3 pt-2">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {stats?.feature_performance?.map((f, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition min-h-[40px]">
                    <td className="py-3 font-black text-gray-700">{f.feature}</td>
                    <td className="py-3">
                      <span className={`font-black ${f.avg_latency > 10000 ? 'text-red-500' : f.avg_latency > 3000 ? 'text-orange-500' : 'text-green-500'}`}>
                        {Math.round(f.avg_latency).toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 font-bold">
                       <span className={f.success_count / (f.total_requests || 1) < 0.8 ? 'text-red-500' : 'text-gray-600'}>
                        {Math.round((f.success_count / (f.total_requests || 1)) * 100)}%
                       </span>
                    </td>
                    <td className="py-3 font-bold text-gray-400">{f.total_requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Log Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-2 text-indigo-600" /> Log chi tiết gần đây 
            {refreshing && <span className="ml-3 text-[10px] bg-green-100 text-green-700 font-bold px-2 flex items-center rounded-full animate-pulse transition"><RefreshCw size={10} className="mr-1 animate-spin" /> Live Data</span>}
          </h2>
          <button onClick={() => fetchData(false)} disabled={loading || refreshing} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 border border-indigo-100 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
             <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} /> Làm mới ngay
          </button>
        </div>
        
        <div className="overflow-y-auto overflow-x-auto max-h-[500px] flex-1 custom-scrollbar bg-gray-50/30 rounded-xl border border-gray-50">
          {loading && logs.length === 0 ? (
             <div className="flex items-center justify-center h-48 text-indigo-400">Đang tải dữ liệu...</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse relative min-w-[800px]">
              <thead className="sticky top-0 bg-white shadow-sm z-20 outline outline-1 outline-gray-100">
                <tr className="border-b border-gray-200 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                  <th className="py-3 px-4 w-32">Thời gian</th>
                  <th className="py-3 px-4 w-40">Tính năng</th>
                  <th className="py-3 px-4 w-36">Model</th>
                  <th className="py-3 px-4 w-20 text-center">Referee</th>
                  <th className="py-3 px-4 w-1/3">Feedback</th>
                  <th className="py-3 px-4 w-28">Latency</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 text-[11px] whitespace-nowrap">{l.created_at}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="bg-indigo-50 px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-700 tracking-tight">
                        {l.feature || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-gray-700 text-[11px] truncate max-w-[150px]">{l.model}</td>
                    <td className="py-3 px-4 text-center">
                      {l.eval_score ? (
                        <span className={`px-2.5 py-1 rounded-md font-black text-[10px] ${
                          l.eval_score >= 8 ? 'bg-green-100 text-green-800' : 
                          l.eval_score >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {l.eval_score}/10
                        </span>
                      ) : <span className="text-gray-300 font-bold">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div 
                        className="text-[11px] text-gray-600 line-clamp-2 leading-tight cursor-pointer hover:text-indigo-600 transition-colors" 
                        title="Click to view full feedback"
                        onClick={() => setSelectedFeedback(l.eval_feedback || l.error_message)}
                      >
                        {l.eval_feedback || (l.error_message ? <span className="text-red-500 font-medium cursor-pointer">Error: {l.error_message}</span> : "-")}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-bold text-[11px] ${l.latency_ms > 8000 ? 'text-red-500' : l.latency_ms > 3000 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {l.latency_ms.toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        l.status === 'success' ? 'bg-green-100 text-green-700' : 
                        l.status === 'evaluated' ? 'bg-blue-100 text-blue-700' : 
                        l.status === 'fallback' ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 shrink-0 border-t border-gray-100 pt-4">
          <button 
            disabled={page === 0} 
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Trang trước
          </button>
          <span className="text-sm font-medium text-gray-500 bg-gray-50 px-4 py-1.5 rounded-lg border border-gray-100">
            {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <button 
            disabled={(page + 1) * PAGE_SIZE >= total} 
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Trang sau
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {selectedFeedback && (
        <div className="!m-0 fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" style={{ margin: 0, top: 0, left: 0 }} onClick={() => setSelectedFeedback(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-900 flex items-center">
                <ClipboardList className="mr-2 text-indigo-600" size={20} />
                Chi tiết Feedback
              </h3>
              <button 
                onClick={() => setSelectedFeedback(null)} 
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-sm text-gray-700 whitespace-pre-wrap font-mono custom-scrollbar">
              {selectedFeedback}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => handleCopyFeedback(selectedFeedback)}
                className={`px-5 py-2.5 rounded-lg font-black text-[13px] uppercase tracking-wider flex items-center justify-center min-w-[140px] transition-all duration-300 ${copied ? 'bg-green-100 text-green-700 scale-95' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}
              >
                {copied ? <><Check size={16} className="mr-2" /> Đã Copy</> : <><Copy size={16} className="mr-2" /> Copy Text</>}
              </button>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 font-bold text-[13px] uppercase tracking-wider rounded-lg hover:bg-white hover:border-gray-300 transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
