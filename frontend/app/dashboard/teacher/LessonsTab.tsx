"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { Plus, X, Upload, Check, BookOpen, FileText, Download, Edit, Trash2 } from "lucide-react";

interface LessonsTabProps {
  API_URL?: string;
  handleTextareaDoubleClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
}

export function LessonsTab({
  API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com",
  handleTextareaDoubleClick
}: LessonsTabProps) {
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
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-sm font-semibold text-gray-500 shrink-0">Lớp:</label>
          <select value={selectedClass || ""} onChange={e => setSelectedClass(Number(e.target.value))}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none bg-white">
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormTitle(""); setFormContent(""); setFormFile(null); }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-dark)] font-semibold text-sm transition">
          <Plus size={16} /> Thêm bài học
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{editId ? "Chỉnh sửa bài học" : "Tạo bài học mới"}</h3>
            <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tiêu đề</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Nhập tiêu đề bài học..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nội dung (tuỳ chọn)</label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                onDoubleClick={handleTextareaDoubleClick}
                placeholder="Nhập nội dung bài học... (click đúp vào từ để tra từ điển)" rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl cursor-pointer hover:bg-gray-100 text-sm font-medium transition">
                <Upload size={15} /> {formFile ? formFile.name : "Đính kèm file"}
                <input type="file" className="hidden" onChange={e => setFormFile(e.target.files?.[0] || null)} />
              </label>
              <button onClick={handleSave} className="ml-auto px-6 py-2 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-dark)] font-semibold text-sm flex items-center gap-1.5 transition">
                <Check size={15} /> Lưu bài học
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--brand)]" /> Danh sách bài học
          </h3>
          <span className="text-sm text-gray-400 font-medium">{lessons.length} bài học</span>
        </div>
        {lessons.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <BookOpen size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Chưa có bài học nào. Nhấn "Thêm bài học" để bắt đầu.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lessons.map((l: any) => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition group">
                <div className="p-2 bg-indigo-50 rounded-xl flex-shrink-0">
                  <BookOpen size={16} className="text-[var(--brand)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{l.title}</p>
                  {l.content && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{l.content}</p>}
                  {l.file_name && (
                    <span className="text-xs text-[var(--brand)] flex items-center gap-1 mt-1">
                      <FileText size={11} /> {l.file_name}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  {l.file_name && (
                    <a href={`${API_URL}/teacher/lessons/${l.id}/file`} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"><Download size={15} /></a>
                  )}
                  <button onClick={() => { setShowForm(true); setEditId(l.id); setFormTitle(l.title); setFormContent(l.content || ""); setFormFile(null); }}
                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition"><Edit size={15} /></button>
                  <button onClick={() => handleDelete(l.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LessonsTab;
