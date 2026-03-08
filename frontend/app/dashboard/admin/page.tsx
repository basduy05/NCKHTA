"use client";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Database, Plus, UploadCloud, FileSpreadsheet, Save, Edit, Trash2, GraduationCap, X, Check, BookOpen, BookText, Settings, RefreshCw, Mail, Eye, EyeOff, Sparkles } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {activeTab === 'overview' && 'Tổng quan hệ thống'}
          {activeTab === 'users' && 'Quản lý Người dùng & GV'}
          {activeTab === 'vocab' && 'Kho Từ Vựng Graph'}
          {activeTab === 'classes' && 'Quản lý Lớp Học'}
          {activeTab === 'lessons' && 'Quản lý Bài Học'}
          {activeTab === 'grammar' && 'Kho Ngữ Pháp (AI)'}
          {activeTab === 'settings' && 'Cài đặt hệ thống'}
        </h1>
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'vocab' && <VocabTab />}
      {activeTab === 'classes' && <ClassesTab />}
      {activeTab === 'lessons' && <LessonsTab />}
      {activeTab === 'grammar' && <GrammarTab />}
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
  const [stats, setStats] = useState({ users: 0, vocab: 0, classes: 0, lessons: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/stats`, { signal: AbortSignal.timeout(5000) });
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
  }, []);

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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null);
  const [formUser, setFormUser] = useState({ name: '', email: '', role: 'STUDENT', password: '' });

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  const handleSaveUser = async () => {
    if (!formUser.name || !formUser.email) return alert("Vui lòng điền đủ thông tin!");
    try {
      if (isEditing !== null) {
        await fetch(`${API_URL}/admin/users/${isEditing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formUser)
        });
      } else {
        const res = await fetch(`${API_URL}/admin/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formUser)
        });
        if (!res.ok) {
          const errData = await res.json();
          return alert(errData.detail || "Lỗi tạo người dùng");
        }
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      alert("Có lỗi kết nối tới máy chủ.");
    }
  }

  const handleDeleteUser = async (id) => {
    if (confirm("Bạn có chắc chắn xoá người dùng này?")) {
      await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  }

  const handleEditClick = (u) => {
    setIsEditing(u.id);
    setFormUser({ name: u.name, email: u.email, role: u.role, password: '' });
  }

  const resetForm = () => {
    setIsEditing(null);
    setFormUser({ name: '', email: '', role: 'STUDENT', password: '' });
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
                  <th className="pb-3 font-medium">Hành động</th>
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
                    <td className="py-4 flex gap-2">
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
          <button type="button" onClick={handleSaveUser} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex justify-center items-center">
            {isEditing ? <><Check size={18} className="mr-2" /> Lưu thay đổi</> : 'Tạo tài khoản'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClassesTab() {
  const [classes, setClasses] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formClass, setFormClass] = useState({ name: '', teacher_name: '', students_count: 0 });

  const fetchClasses = async () => {
    try { const res = await fetch(`${API_URL}/admin/classes`); setClasses(await res.json()); } catch { }
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleSave = async () => {
    if (!formClass.name || !formClass.teacher_name) return alert("Điền đủ thông tin!");
    const url = isEditing ? `${API_URL}/admin/classes/${isEditing}` : `${API_URL}/admin/classes`;
    const method = isEditing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formClass) });
    resetForm();
    fetchClasses();
  };

  const handleEdit = (c: any) => {
    setIsEditing(c.id);
    setFormClass({ name: c.name, teacher_name: c.teacher_name, students_count: c.students_count || 0 });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Xoá lớp này?")) {
      await fetch(`${API_URL}/admin/classes/${id}`, { method: 'DELETE' });
      fetchClasses();
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
  const [lessons, setLessons] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [formLesson, setFormLesson] = useState({ class_id: '', title: '', content: '' });
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  const [exerciseType, setExerciseType] = useState('mixed');
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGenerateExercise = async () => {
    if (!file) return alert("Vui lòng đính kèm file trước tiên!");
    setGeneratingAI(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("exercise_type", exerciseType);
      fd.append("num_questions", "5");

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const res = await fetch(`${API_URL}/teacher/file/generate-assignment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
        alert("Tạo bài tập thành công! Kéo xuống để xem nội dung đã được tự động thêm vào.");
      } else alert("Lỗi tạo bài tập AI");
    } catch (e) { alert("Lỗi kết nối"); }
    finally { setGeneratingAI(false); }
  };

  const fetchLessons = async () => {
    try { const res = await fetch(`${API_URL}/admin/lessons`); setLessons(await res.json()); } catch { }
  };
  const fetchClasses = async () => {
    try { const res = await fetch(`${API_URL}/admin/classes`); setClasses(await res.json()); } catch { }
  };

  useEffect(() => { fetchLessons(); fetchClasses(); }, []);

  const handleSave = async () => {
    if (!formLesson.class_id || !formLesson.title) return alert("Hãy chọn lớp và nhập tên bài học");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("class_id", formLesson.class_id);
      fd.append("title", formLesson.title);
      fd.append("content", formLesson.content);
      if (file) fd.append("file", file);
      const url = isEditing ? `${API_URL}/admin/lessons/${isEditing}` : `${API_URL}/admin/lessons`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
      resetForm();
      fetchLessons();
    } catch (err: any) { alert(err.message); }
    finally { setUploading(false); }
  };

  const handleEdit = (l: any) => {
    setIsEditing(l.id);
    setFormLesson({ class_id: String(l.class_id), title: l.title, content: l.content || '' });
    setFile(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Xóa bài học này?")) {
      await fetch(`${API_URL}/admin/lessons/${id}`, { method: 'DELETE' });
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
      const res = await fetch(`${API_URL}/admin/vocab/list?${params}`);
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
      const res = await fetch(`${API_URL}/admin/vocab/import`, { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Upload failed");
      alert(result.message);
      setFile(null);
      fetchWords();
    } catch (err: any) { alert("Lỗi: " + err.message); }
    finally { setUploading(false); }
  };

  const handleDeleteWord = async (word: string) => {
    if (!confirm(`Xoá từ "${word}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/vocab/${encodeURIComponent(word)}`, { method: 'DELETE' });
      if (res.ok) fetchWords();
      else alert('Lỗi xoá từ');
    } catch { alert('Lỗi kết nối'); }
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
    if (!formWord.word) return alert("Nhập từ vựng!");
    setSavingWord(true);
    try {
      const isNew = editingWord === '';
      const url = isNew ? `${API_URL}/admin/vocab` : `${API_URL}/admin/vocab/${encodeURIComponent(editingWord!)}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formWord) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
      setEditingWord(null);
      setFormWord({ word: '', pronunciation: '', meaning: '', level: 'A1', type: 'noun', example: '' });
      fetchWords();
    } catch (err: any) { alert(err.message); }
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
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState<number | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try { const res = await fetch(`${API_URL}/admin/grammar`); setRules(await res.json()); } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSave = async () => {
    if (!name) return alert("Nhập tên cấu trúc ngữ pháp");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      if (file) fd.append("file", file);
      const url = isEditing ? `${API_URL}/admin/grammar/${isEditing}` : `${API_URL}/admin/grammar`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || 'Error');
      resetForm();
      fetchRules();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = (r: any) => {
    setIsEditing(r.id);
    setName(r.name);
    setDescription(r.description || '');
    setFile(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá cấu trúc ngữ pháp này?")) return;
    await fetch(`${API_URL}/admin/grammar/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    setDescription('');
    setFile(null);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center"><BookText className="mr-2 text-teal-600" /> Kho Ngữ Pháp (Grammar Rules)</h2>
        <p className="text-gray-500 text-sm">Quản lý các cấu trúc ngữ pháp để AI sử dụng khi tạo bài tập. Có thể đính kèm file tài liệu.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center"><Plus className="mr-2 text-teal-600" size={18} /> {isEditing ? 'Sửa Cấu Trúc' : 'Thêm Cấu Trúc Mới'}</h3>
            {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
          </div>
          <div className="space-y-4">
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg focus:ring-2 outline-none" placeholder="Tên cấu trúc (VD: Present Perfect)" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded-lg h-24 focus:ring-2 outline-none" placeholder="Mô tả / Công thức..." />
            <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-teal-400 hover:bg-teal-50 transition">
              <input type="file" className="hidden" id="grammar-file" onChange={e => { if (e.target.files) setFile(e.target.files[0]); }} />
              <label htmlFor="grammar-file" className="cursor-pointer text-gray-500 flex flex-col items-center text-sm">
                <UploadCloud size={28} className={file ? "text-teal-600" : ""} />
                <span className="mt-1 font-medium">{file ? file.name : "Đính kèm file (tuỳ chọn)"}</span>
              </label>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
              {saving ? "Đang lưu..." : isEditing ? <><Check size={18} className="inline mr-1" /> Lưu thay đổi</> : "Lưu Cấu Trúc"}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4">Danh sách hiện có</h3>
          {loading ? <p className="text-gray-400 text-sm">Đang tải...</p> : rules.length === 0 ? <p className="text-gray-400 text-sm">Chưa có cấu trúc ngữ pháp nào.</p> : (
            <ul className="space-y-2 max-h-[500px] overflow-y-auto">
              {rules.map((r: any) => (
                <li key={r.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-teal-700">{r.name}</p>
                      {r.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>}
                      {r.file_name && (
                        <a href={`${API_URL}/admin/grammar/${r.id}/file`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 text-xs text-indigo-600 hover:underline">
                          <FileSpreadsheet size={14} className="mr-1" /> {r.file_name}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => handleEdit(r)} className="text-blue-500 bg-blue-50 p-1.5 rounded hover:bg-blue-100"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(r.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16} /></button>
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

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingNeo4j, setTestingNeo4j] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/settings`);
      if (res.ok) setSettings(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Saved ${data.updated_keys?.length || 0} settings. Neo4j: ${data.neo4j_status}`);
        fetchSettings();
      } else {
        alert(data.detail || 'Error saving settings');
      }
    } catch (err) { alert('Server connection error'); }
    finally { setSaving(false); }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings/test-email`, { method: 'POST' });
      const data = await res.json();
      const steps = data.steps ? '\n' + data.steps.join('\n') : '';
      if (data.success) {
        alert(`✅ ${data.message}${steps}`);
      } else {
        alert(`❌ ${data.error || 'Email test failed'}${steps}`);
      }
    } catch { alert('Connection error'); }
    finally { setTestingEmail(false); }
  };

  const handleTestNeo4j = async () => {
    setTestingNeo4j(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings/test-neo4j`, { method: 'POST' });
      const data = await res.json();
      alert(res.ok ? data.message : (data.detail || 'Neo4j connection failed'));
    } catch { alert('Connection error'); }
    finally { setTestingNeo4j(false); }
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
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Settings className="mr-2 text-indigo-600" size={20} /> API Keys (AI)
        </h2>
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
    </div>
  );
}
