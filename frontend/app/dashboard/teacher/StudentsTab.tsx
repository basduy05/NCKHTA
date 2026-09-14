"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { UserPlus, UserMinus, Users, X } from "lucide-react";

interface StudentsTabProps {
  API_URL?: string;
}

export function StudentsTab({ API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com" }: StudentsTabProps) {
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
        <button onClick={openEnrollModal}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-dark)] font-semibold text-sm transition">
          <UserPlus size={16} /> Thêm học sinh
        </button>
      </div>

      {/* Enroll panel */}
      {showEnroll && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Thêm học sinh vào lớp</h3>
            <button onClick={() => setShowEnroll(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"><X size={16} /></button>
          </div>
          {availableStudents.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Users size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-500 text-sm">Không có học sinh khả dụng (tất cả đã trong lớp).</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {availableStudents.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </div>
                  </div>
                  <button onClick={() => handleEnroll(s.id)}
                    className="px-3 py-1.5 bg-[var(--brand)] text-white text-xs rounded-lg hover:bg-[var(--brand-dark)] flex items-center gap-1 font-semibold transition">
                    <UserPlus size={13} /> Thêm
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users size={16} className="text-[var(--brand)]" /> Danh sách học sinh
          </h3>
          <span className="text-sm text-gray-400 font-medium">{students.length} học sinh</span>
        </div>
        {students.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Chưa có học sinh nào. Nhấn "Thêm học sinh" để bắt đầu.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
                <span className="text-sm text-gray-400 w-6 text-center">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                <span className="text-xs text-gray-400 hidden md:block">
                  {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString("vi-VN") : "—"}
                </span>
                <button onClick={() => handleRemove(s.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Xoá khỏi lớp">
                  <UserMinus size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentsTab;
