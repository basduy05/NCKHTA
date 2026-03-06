"use client";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Database, Plus, UploadCloud, FileSpreadsheet, Save, Edit, Trash2, GraduationCap, X, Check, BookOpen, BookText, Settings, RefreshCw, Mail, Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
        if(!res.ok) throw new Error("API failed");
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
    if(!formUser.name || !formUser.email) return alert("Vui lòng điền đủ thông tin!");
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
        if(!res.ok) {
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
    if(confirm("Bạn có chắc chắn xoá người dùng này?")) {
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
                      <button onClick={() => handleEditClick(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
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
          {isEditing && <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>}
        </div>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên hiển thị</label>
            <input type="text" value={formUser.name} onChange={e => setFormUser({...formUser, name: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="VD: Nguyễn Văn A" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={formUser.email} onChange={e => setFormUser({...formUser, email: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="email@domain.com" />
          </div>
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium mb-1">Mật khẩu (Mặc định: 123456)</label>
              <input type="text" value={formUser.password || ''} onChange={e => setFormUser({...formUser, password: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 outline-none" placeholder="123456" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Vai trò</label>
            <select value={formUser.role} onChange={e => setFormUser({...formUser, role: e.target.value})} className="w-full border rounded-lg p-2 bg-white outline-none">
              <option value="STUDENT">Học sinh</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="button" onClick={handleSaveUser} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex justify-center items-center">
            {isEditing ? <><Check size={18} className="mr-2"/> Lưu thay đổi</> : 'Tạo tài khoản'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClassesTab() {
  const [classes, setClasses] = useState([]);
  
  const fetchClasses = async () => {
    const res = await fetch(`${API_URL}/admin/classes`);
    setClasses(await res.json());
  };

  useEffect(() => { fetchClasses(); }, []);

  const [formClass, setFormClass] = useState({ name: '', teacher_name: '', students_count: 0 });

  const handleAddClass = async () => {
    if(!formClass.name || !formClass.teacher_name) return;
    await fetch(`${API_URL}/admin/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formClass)
    });
    setFormClass({ name: '', teacher_name: '', students_count: 0 });
    fetchClasses();
  };

  const handleDeleteClass = async (id) => {
    if(confirm("Xoá lớp này?")) {
      await fetch(`${API_URL}/admin/classes/${id}`, { method: 'DELETE' });
      fetchClasses();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Tạo Lớp Học Mới</h2>
        <div className="space-y-3">
          <input type="text" value={formClass.name} onChange={e=>setFormClass({...formClass, name: e.target.value})} placeholder="Tên Lớp (VD: IELTS Căn bản)" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <input type="text" value={formClass.teacher_name} onChange={e=>setFormClass({...formClass, teacher_name: e.target.value})} placeholder="Tên Giáo viên phụ trách" className="w-full border rounded-lg p-2 focus:ring-2 outline-none" />
          <button onClick={handleAddClass} className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">+ Thêm Lớp Này</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Lớp</h2>
        <ul className="space-y-3">
          {classes.length === 0 && <p className="text-gray-400 text-sm">Chưa có lớp nào.</p>}
          {classes.map((c) => (
            <li key={c.id} className="p-3 border rounded-xl flex justify-between items-center bg-gray-50">
              <div>
                <p className="font-bold text-purple-700">{c.name}</p>
                <p className="text-xs text-gray-500">GV: {c.teacher_name}</p>
              </div>
              <button onClick={() => handleDeleteClass(c.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16}/></button>
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

  const fetchLessons = async () => {
    try { const res = await fetch(`${API_URL}/admin/lessons`); setLessons(await res.json()); } catch {}
  };
  const fetchClasses = async () => {
    try { const res = await fetch(`${API_URL}/admin/classes`); setClasses(await res.json()); } catch {}
  };

  useEffect(() => { fetchLessons(); fetchClasses(); }, []);

  const handleAddLesson = async () => {
    if(!formLesson.class_id || !formLesson.title) return alert("Hãy chọn lớp và nhập tên bài học");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("class_id", formLesson.class_id);
      fd.append("title", formLesson.title);
      fd.append("content", formLesson.content);
      if (file) fd.append("file", file);
      const res = await fetch(`${API_URL}/admin/lessons`, { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Error'); }
      setFormLesson({ class_id: '', title: '', content: '' });
      setFile(null);
      fetchLessons();
    } catch (err: any) { alert(err.message); }
    finally { setUploading(false); }
  };

  const handleDeleteLesson = async (id: number) => {
    if(confirm("Xóa bài học này?")) {
      await fetch(`${API_URL}/admin/lessons/${id}`, { method: 'DELETE' });
      fetchLessons();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><BookOpen className="mr-2 text-orange-600" size={20}/> Thêm Bài Học Mới</h2>
        <div className="space-y-3">
          <select value={formLesson.class_id} onChange={e=>setFormLesson({...formLesson, class_id: e.target.value})} className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2">
            <option value="">-- Chọn Lớp --</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={formLesson.title} onChange={e=>setFormLesson({...formLesson, title: e.target.value})} placeholder="Tiêu đề bài học" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <textarea value={formLesson.content} onChange={e=>setFormLesson({...formLesson, content: e.target.value})} placeholder="Nội dung tóm tắt..." className="w-full border rounded-lg p-2 outline-none focus:ring-2 h-24" />
          <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-orange-400 hover:bg-orange-50 transition">
            <input type="file" className="hidden" id="lesson-file" onChange={e => e.target.files && setFile(e.target.files[0])} />
            <label htmlFor="lesson-file" className="cursor-pointer text-gray-500 flex flex-col items-center text-sm">
              <UploadCloud size={28} className={file ? "text-orange-600" : ""} />
              <span className="mt-1 font-medium">{file ? file.name : "Đính kèm file (tuỳ chọn)"}</span>
            </label>
          </div>
          <button onClick={handleAddLesson} disabled={uploading} className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition">
            {uploading ? "Đang tải..." : "+ Thêm Bài Học"}
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
                  <p className="text-xs text-gray-500">Lớp: {classes.find((c: any) => c.id === l.class_id)?.name || 'N/A'}</p>
                  {l.content && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{l.content}</p>}
                  {l.file_name && (
                    <a href={`${API_URL}/admin/lessons/${l.id}/file`} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center mt-2 text-xs text-indigo-600 hover:underline">
                      <FileSpreadsheet size={14} className="mr-1"/> {l.file_name}
                    </a>
                  )}
                </div>
                <button onClick={() => handleDeleteLesson(l.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100 ml-2"><Trash2 size={16}/></button>
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
  const [loadingWords, setLoadingWords] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');

  const fetchWords = async (level = '') => {
    setLoadingWords(true);
    try {
      const url = level ? `${API_URL}/admin/vocab/list?level=${level}&limit=200` : `${API_URL}/admin/vocab/list?limit=200`;
      const res = await fetch(url);
      const data = await res.json();
      setWords(data.words || []);
    } catch { setWords([]); }
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
      if (result.errors?.length > 0) alert(`Cảnh báo: ${result.errors.length} lỗi. Xem console.`);
      setFile(null);
      fetchWords(filterLevel);
    } catch (err: any) { alert("Lỗi: " + err.message); }
    finally { setUploading(false); }
  };

  const handleDeleteWord = async (word: string) => {
    if (!confirm(`Xoá từ "${word}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/vocab/${encodeURIComponent(word)}`, { method: 'DELETE' });
      if (res.ok) fetchWords(filterLevel);
      else alert('Lỗi xoá từ');
    } catch { alert('Lỗi kết nối'); }
  };

  const handleFilterChange = (level: string) => {
    setFilterLevel(level);
    fetchWords(level);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><FileSpreadsheet className="mr-2 text-indigo-600" /> Nhập Nhanh (CSV/Excel)</h2>
          <p className="text-sm text-gray-500 mb-4">Upload file thêm hàng loạt từ vựng vào Neo4j Graph Database.</p>
          <div className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition">
            <input type="file" accept=".csv, .xlsx" className="hidden" id="file-upload" onChange={(e) => e.target.files && setFile(e.target.files[0]) }/>
            <label htmlFor="file-upload" className="cursor-pointer text-gray-500 flex flex-col items-center">
              {file ? <FileSpreadsheet size={40} className="text-indigo-600 mb-2"/> : <UploadCloud size={40} className="mb-2"/>}
              <span className="font-medium text-gray-700">{file ? file.name : "Click chọn file .csv, .xlsx"}</span>
            </label>
          </div>
          <button onClick={handleUpload} disabled={!file || uploading} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">{uploading ? "Đang import..." : "Bắt đầu Import graph"}</button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Database className="mr-2 text-indigo-600" /> Thống kê</h2>
          <div className="text-center py-8">
            <p className="text-4xl font-bold text-indigo-600">{words.length}</p>
            <p className="text-gray-500 mt-1">từ vựng trong Neo4j</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
              <button key={level} onClick={() => handleFilterChange(level)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${filterLevel === level ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {level || 'Tất cả'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Word List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center"><Database className="mr-2 text-indigo-600" size={20}/> Danh sách Từ Vựng trong Neo4j</h2>
          <button onClick={() => fetchWords(filterLevel)} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"><RefreshCw size={14} className="mr-1"/> Làm mới</button>
        </div>
        {loadingWords ? <p className="text-gray-400 text-sm py-4">Đang tải từ Neo4j...</p> : words.length === 0 ? <p className="text-gray-400 text-sm py-4">Chưa có từ vựng nào. Hãy import file CSV.</p> : (
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
                  <th className="pb-3 font-medium w-10"></th>
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
                    <td className="py-3"><button onClick={() => handleDeleteWord(w.word)} className="text-red-400 hover:text-red-600"><Trash2 size={15}/></button></td>
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

function GrammarTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try { const res = await fetch(`${API_URL}/admin/grammar`); setRules(await res.json()); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleAdd = async () => {
    if (!name) return alert("Nhập tên cấu trúc ngữ pháp");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      if (file) fd.append("file", file);
      const res = await fetch(`${API_URL}/admin/grammar`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || 'Error');
      setName(''); setDescription(''); setFile(null);
      fetchRules();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xoá cấu trúc ngữ pháp này?")) return;
    await fetch(`${API_URL}/admin/grammar/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  return (
    <div className="animate-in fade-in duration-300">
       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center"><BookText className="mr-2 text-teal-600"/> Kho Ngữ Pháp (Grammar Rules)</h2>
          <p className="text-gray-500 text-sm">Quản lý các cấu trúc ngữ pháp để AI sử dụng khi tạo bài tập. Có thể đính kèm file tài liệu.</p>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <h3 className="font-bold mb-4 flex items-center"><Plus className="mr-2 text-teal-600" size={18}/> Thêm Cấu Trúc Mới</h3>
             <div className="space-y-4">
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded-lg focus:ring-2 outline-none" placeholder="Tên cấu trúc (VD: Present Perfect)" />
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded-lg h-24 focus:ring-2 outline-none" placeholder="Mô tả / Công thức..." />
                <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-teal-400 hover:bg-teal-50 transition">
                  <input type="file" className="hidden" id="grammar-file" onChange={e => e.target.files && setFile(e.target.files[0])} />
                  <label htmlFor="grammar-file" className="cursor-pointer text-gray-500 flex flex-col items-center text-sm">
                    <UploadCloud size={28} className={file ? "text-teal-600" : ""} />
                    <span className="mt-1 font-medium">{file ? file.name : "Đính kèm file (tuỳ chọn)"}</span>
                  </label>
                </div>
                <button onClick={handleAdd} disabled={saving} className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
                  {saving ? "Đang lưu..." : "Lưu Cấu Trúc"}
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
                               <FileSpreadsheet size={14} className="mr-1"/> {r.file_name}
                             </a>
                           )}
                         </div>
                         <button onClick={() => handleDelete(r.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100 ml-2"><Trash2 size={16}/></button>
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
      alert(res.ok ? data.message : (data.detail || 'Email test failed'));
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

  const toggleShow = (key: string) => setShowPasswords(p => ({...p, [key]: !p[key]}));

  const sensitiveKeys = ['GOOGLE_API_KEY', 'OPENAI_API_KEY', 'NEO4J_PASSWORD', 'SMTP_PASSWORD'];

  const renderField = (key: string, label: string, placeholder: string) => {
    const isSensitive = sensitiveKeys.includes(key);
    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          <input
            type={isSensitive && !showPasswords[key] ? "password" : "text"}
            value={settings[key] || ''}
            onChange={e => setSettings({...settings, [key]: e.target.value})}
            className="w-full border border-gray-200 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            placeholder={placeholder}
          />
          {isSensitive && (
            <button type="button" onClick={() => toggleShow(key)} className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600">
              {showPasswords[key] ? <EyeOff size={18}/> : <Eye size={18}/>}
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
          <Settings className="mr-2 text-indigo-600" size={20}/> API Keys (AI)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('GOOGLE_API_KEY', 'Google Gemini API Key', 'AIzaSy...')}
          {renderField('OPENAI_API_KEY', 'OpenAI API Key (optional)', 'sk-...')}
        </div>
      </div>

      {/* Neo4j */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Database className="mr-2 text-indigo-600" size={20}/> Neo4j Graph Database
          </h2>
          <button onClick={handleTestNeo4j} disabled={testingNeo4j} className="px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 flex items-center">
            <RefreshCw size={14} className={`mr-1.5 ${testingNeo4j ? 'animate-spin' : ''}`}/> {testingNeo4j ? 'Testing...' : 'Test connection'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('NEO4J_URI', 'Neo4j URI', 'neo4j+s://xxx.databases.neo4j.io')}
          {renderField('NEO4J_USERNAME', 'Username', 'neo4j')}
          {renderField('NEO4J_PASSWORD', 'Password', '***')}
          {renderField('NEO4J_DATABASE', 'Database Name (empty = username)', '')}
        </div>
      </div>

      {/* SMTP */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <Mail className="mr-2 text-indigo-600" size={20}/> Email SMTP
          </h2>
          <button onClick={handleTestEmail} disabled={testingEmail} className="px-4 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 flex items-center">
            <Mail size={14} className="mr-1.5"/> {testingEmail ? 'Sending...' : 'Send test email'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('SMTP_SERVER', 'SMTP Server', 'smtp.gmail.com')}
          {renderField('SMTP_PORT', 'SMTP Port', '587')}
          {renderField('SMTP_USERNAME', 'SMTP Username (Email)', 'your@gmail.com')}
          {renderField('SMTP_PASSWORD', 'SMTP Password (App Password)', '***')}
          {renderField('SENDER_EMAIL', 'Sender Email', 'your@gmail.com')}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg flex items-center">
          <Save size={18} className="mr-2"/> {saving ? 'Saving...' : 'Save all settings'}
        </button>
      </div>
    </div>
  );
}
