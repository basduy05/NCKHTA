"use client";
import React, { useState, useEffect } from "react";
import { 
  GraduationCap, BookOpen, ChevronRight, FileText, ExternalLink, 
  ExternalLink as LinkIcon 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface ClassesTabProps {
  API_URL: string;
}

export default function ClassesTab({ API_URL }: ClassesTabProps) {
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
  }, [token, authFetch, API_URL]);

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
        <GraduationCap size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-bold text-gray-700">Chưa tham gia lớp học nào</h3>
        <p className="text-gray-500 text-sm">Liên hệ giáo viên để nhận mã tham gia lớp học.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 px-2"><GraduationCap size={18} className="text-blue-600" /> Danh sách lớp</h3>
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => loadLessons(c.id)}
            className={`w-full text-left p-5 rounded-xl border transition-all ${selectedClass === c.id ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200 text-white" : "bg-white border-gray-100 shadow-sm hover:border-blue-300 text-gray-700"}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${selectedClass === c.id ? "text-blue-100" : "text-gray-400"}`}>Lớp của {c.teacher_name}</p>
                <h4 className="font-extrabold text-lg leading-tight">{c.name}</h4>
              </div>
              <ChevronRight size={20} className={selectedClass === c.id ? "text-white" : "text-gray-300"} />
            </div>
            <div className={`mt-4 pt-4 border-t flex items-center gap-4 text-xs ${selectedClass === c.id ? "border-white/20" : "border-gray-50"}`}>
               <span className="flex items-center gap-1"><BookOpen size={12} /> {c.lesson_count || 0} bài học</span>
            </div>
          </button>
        ))}
      </div>

      <div className="lg:col-span-2">
        {!selectedClass ? (
          <div className="bg-blue-50/50 rounded-2xl p-12 text-center border-2 border-dashed border-blue-100">
            <BookOpen size={48} className="mx-auto text-blue-200 mb-4" />
            <p className="text-blue-600 font-medium italic">Chọn một lớp học để xem bài học</p>
          </div>
        ) : lessonsLoading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
        ) : lessons.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-gray-500">Chưa có bài học nào trong lớp này.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 px-2"><BookOpen size={18} className="text-blue-600" /> Bài học & Tài liệu</h3>
            {lessons.map((l) => (
              <div key={l.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-2">{l.title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2">{l.content}</p>
                    
                    {l.file_url && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <a 
                                href={l.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition"
                            >
                                <FileText size={14} /> Xem tài liệu <ExternalLink size={12} />
                            </a>
                        </div>
                    )}
                  </div>
                  {l.created_at && <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(l.created_at).toLocaleDateString('vi-VN')}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
