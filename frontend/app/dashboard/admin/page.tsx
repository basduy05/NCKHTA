"use client";
import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Database, Plus, UploadCloud, FileSpreadsheet, Save, Edit, Trash2, GraduationCap, X, Check, BookOpen, BookText } from "lucide-react";

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
        </h1>
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'vocab' && <VocabTab />}
      {activeTab === 'classes' && <ClassesTab />}
      {activeTab === 'lessons' && <LessonsTab />}
      {activeTab === 'grammar' && <GrammarTab />}
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
    setFormUser({ name: u.name, email: u.email, role: u.role });
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
  const [lessons, setLessons] = useState([]);
  const [classes, setClasses] = useState([]);
  
  const fetchLessons = async () => {
    const res = await fetch(`${API_URL}/admin/lessons`);
    setLessons(await res.json());
  };

  const fetchClasses = async () => {
    const res = await fetch(`${API_URL}/admin/classes`);
    setClasses(await res.json());
  };

  useEffect(() => { fetchLessons(); fetchClasses(); }, []);

  const [formLesson, setFormLesson] = useState({ class_id: '', title: '', content: '' });

  const handleAddLesson = async () => {
    if(!formLesson.class_id || !formLesson.title) return alert("Hãy chọn lớp và nhập tên bài học");
    await fetch(`${API_URL}/admin/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...formLesson, class_id: parseInt(formLesson.class_id)})
    });
    setFormLesson({ class_id: '', title: '', content: '' });
    fetchLessons();
  };

  const handleDeleteLesson = async (id) => {
    if(confirm("Xóa bài học này?")) {
      await fetch(`${API_URL}/admin/lessons/${id}`, { method: 'DELETE' });
      fetchLessons();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Thêm Bài Học Mới</h2>
        <div className="space-y-3">
          <select 
            value={formLesson.class_id} 
            onChange={e=>setFormLesson({...formLesson, class_id: e.target.value})}
            className="w-full border rounded-lg p-2 bg-white outline-none focus:ring-2"
          >
            <option value="">-- Chọn Lớp --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={formLesson.title} onChange={e=>setFormLesson({...formLesson, title: e.target.value})} placeholder="Tiêu đề bài học" className="w-full border rounded-lg p-2 outline-none focus:ring-2" />
          <textarea value={formLesson.content} onChange={e=>setFormLesson({...formLesson, content: e.target.value})} placeholder="Nội dung tóm tắt..." className="w-full border rounded-lg p-2 outline-none focus:ring-2 h-24" />
          <button onClick={handleAddLesson} className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">+ Thêm Bài Học</button>
        </div>
      </div>

       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-grow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danh sách Bài học</h2>
        <ul className="space-y-3">
          {lessons.length === 0 && <p className="text-gray-400 text-sm">Chưa có bài học nào.</p>}
          {lessons.map((l) => (
            <li key={l.id} className="p-3 border rounded-xl flex justify-between items-center bg-gray-50">
              <div>
                <p className="font-bold text-orange-700">{l.title}</p>
                <p className="text-xs text-gray-500">Lớp: {classes.find(c => c.id === l.class_id)?.name || 'Unknown'}</p>
              </div>
              <button onClick={() => handleDeleteLesson(l.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-100"><Trash2 size={16}/></button>
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
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${API_URL}/admin/vocab/import`, {
        method: "POST",
        body: formData,
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || "Upload failed");
      
      alert(result.message);
      if (result.errors && result.errors.length > 0) {
        console.error("Errors:", result.errors);
        alert(`Warning: ${result.errors.length} items failed. Check console.`);
      }
      setFile(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
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
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Plus className="mr-2 text-indigo-600" /> Thêm Từng Từ Một (Cấu trúc đồ thị)</h2>
        <form className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Từ Tiếng Anh (Node trung tâm)</label><input type="text" className="w-full border rounded-lg p-2 outline-none focus:border-indigo-500" placeholder="Ví dụ: Ecosystem" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Phát âm</label><input type="text" className="w-full border rounded-lg p-2" placeholder="/ˈiːkəʊˌsɪstəm/" /></div>
            <div><label className="block text-sm font-medium mb-1">Độ khó</label><select className="w-full border rounded-lg p-2"><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option><option>C2</option></select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Nghĩa tiếng Việt</label><input type="text" className="w-full border rounded-lg p-2" placeholder="Hệ sinh thái" /></div>
          <button type="button" className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center justify-center"><Save size={18} className="mr-2"/> Nối Node vào Neo4j</button>
        </form>
      </div>
    </div>
  );
}

function GrammarTab() {
  return (
    <div className="animate-in fade-in duration-300">
       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center"><BookText className="mr-2 text-teal-600"/> Kho Ngữ Pháp (Grammar Rules)</h2>
          <p className="text-gray-500">Quản lý các cấu trúc ngữ pháp để AI sử dụng khi tạo bài tập.</p>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <h3 className="font-bold mb-4">Thêm Cấu Trúc Mới</h3>
             <div className="space-y-4">
                <input className="w-full border p-2 rounded-lg" placeholder="Tên cấu trúc (VD: Present Perfect)" />
                <textarea className="w-full border p-2 rounded-lg h-24" placeholder="Mô tả / Công thức..." />
                <button className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700">Lưu Cấu Trúc</button>
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <h3 className="font-bold mb-4">Danh sách hiện có</h3>
             <ul className="space-y-2">
                <li className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between">
                   <span>Present Simple (Hiện tại đơn)</span>
                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                </li>
                <li className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between">
                   <span>Past Perfect (Quá khứ hoàn thành)</span>
                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                </li>
                <li className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between">
                   <span>Conditional Type 1 (Câu điều kiện loại 1)</span>
                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                </li>
             </ul>
          </div>
       </div>
    </div>
  )
}
