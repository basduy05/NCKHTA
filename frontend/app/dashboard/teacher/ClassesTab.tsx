"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import {
  Plus, Check, X, GraduationCap, Users, Edit, Trash2, BarChart3, AlertCircle, Trophy
} from "lucide-react";

interface ClassesTabProps {
  API_URL?: string;
}

export function ClassesTab({ API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com" }: ClassesTabProps) {
  const { authFetch, token } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");

  // Analytics report modal state
  const [analyticsClassId, setAnalyticsClassId] = useState<number | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchClasses = async () => {
    try {
      const res = await authFetch(`${API_URL}/teacher/my-classes`);
      if (res.ok) setClasses(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchClasses(); }, []);

  const openAnalytics = async (classId: number) => {
    setAnalyticsClassId(classId);
    setAnalyticsData(null);
    setLoadingAnalytics(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/analytics/class/${classId}`);
      if (res.ok) {
        setAnalyticsData(await res.json());
      } else {
        showAlert("Không thể tải báo cáo phân tích lớp", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Lỗi kết nối khi tải phân tích", "error");
    } finally {
      setLoadingAnalytics(false);
    }
  };

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
          <h2 className="text-2xl font-semibold text-gray-900">Lớp học của tôi</h2>
          <p className="text-gray-400 font-medium mt-1">{classes.length} lớp đang quản lý</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormName(""); }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] font-semibold shadow-lg shadow-blue-200 transition-all active:scale-95">
          <Plus size={20} /> Tạo lớp mới
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
          <h3 className="font-semibold text-xl text-gray-900 mb-6">{editId ? "Sửa lớp học" : "Tạo lớp học mới"}</h3>
          <div className="flex gap-3">
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Tên lớp học (ví dụ: Lớp Anh Văn A1 — 2024)"
              className="flex-1 border-2 border-gray-100 focus:border-indigo-400 rounded-2xl p-4 outline-none font-bold text-gray-700 transition-all shadow-sm" />
            <button onClick={handleSave} className="px-6 py-3 bg-[var(--brand)] text-white rounded-2xl hover:bg-[var(--brand-dark)] font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95">
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
          <h3 className="font-semibold text-gray-400 text-xl">Chưa có lớp học nào</h3>
          <p className="text-gray-400 mt-2 font-medium">Nhấn "Tạo lớp mới" để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c: any, idx: number) => {
            const colors = [
              { bg: "from-indigo-500 to-purple-600", light: "bg-indigo-50", text: "text-[var(--brand)]" },
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
                  <h3 className="font-semibold text-xl mt-4 leading-tight">{c.name}</h3>
                  <p className="text-white/70 text-sm font-medium mt-1">GV: {c.teacher_name || "Tôi"}</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${color.light} rounded-xl`}>
                        <Users size={16} className={color.text} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">{c.enrolled_count || 0}</p>
                        <p className="text-xs text-gray-400 font-bold -mt-0.5">Học sinh</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("vi-VN") : "—"}
                    </span>
                  </div>

                  {/* Analytics button */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => openAnalytics(c.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      <BarChart3 size={14} /> Báo cáo phân tích
                    </button>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">Analytics</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Class Analytics Modal */}
      {analyticsClassId && (
        <div
          className="fixed inset-0 !mt-0 !m-0 top-0 left-0 right-0 bottom-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Báo cáo Phân tích Lớp: {analyticsData?.class_info?.name || "Đang tải..."}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sĩ số: {analyticsData?.class_info?.total_students || 0} học sinh · Tổng số {analyticsData?.class_info?.total_assignments || 0} bài tập
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnalyticsClassId(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {loadingAnalytics ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                <p className="text-sm text-gray-500 font-medium">Đang tổng hợp dữ liệu học tập của lớp...</p>
              </div>
            ) : analyticsData ? (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600">Tỷ lệ hoàn thành</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{analyticsData.metrics?.completion_rate}%</p>
                    <div className="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, analyticsData.metrics?.completion_rate || 0)}%` }} />
                    </div>
                  </div>

                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-600">Điểm trung bình</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">{analyticsData.metrics?.average_score}%</p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      {analyticsData.metrics?.total_submissions || 0} lượt nộp bài
                    </p>
                  </div>

                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700">Học sinh cần chú ý</p>
                    <p className="text-2xl font-bold text-amber-900 mt-1">{analyticsData.metrics?.at_risk_count}</p>
                    <p className="text-[11px] text-amber-700 mt-1">Nguy cơ tụt lại</p>
                  </div>

                  <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                    <p className="text-xs font-semibold text-purple-600">Học sinh giỏi (≥80%)</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{analyticsData.top_performers?.length || 0}</p>
                    <p className="text-[11px] text-purple-700 mt-1">Điểm số cao nhất</p>
                  </div>
                </div>

                {/* Score Distribution */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Phân bổ phổ điểm</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500">Xuất sắc (≥85%)</span>
                      <p className="text-xl font-bold text-emerald-600">{analyticsData.score_distribution?.excellent || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500">Khá (70-84%)</span>
                      <p className="text-xl font-bold text-blue-600">{analyticsData.score_distribution?.good || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500">Trung bình (50-69%)</span>
                      <p className="text-xl font-bold text-amber-600">{analyticsData.score_distribution?.average || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-500">Cần cố gắng (&lt;50%)</span>
                      <p className="text-xl font-bold text-red-600">{analyticsData.score_distribution?.poor || 0}</p>
                    </div>
                  </div>
                </div>

                {/* At-risk Warning Alert */}
                {analyticsData.at_risk_students?.length > 0 && (
                  <div className="border border-red-200 bg-red-50/60 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                      <AlertCircle size={17} />
                      <span>Danh sách học sinh có nguy cơ cần giáo viên hỗ trợ ({analyticsData.at_risk_students.length})</span>
                    </div>
                    <div className="divide-y divide-red-100 bg-white rounded-xl border border-red-100 overflow-hidden">
                      {analyticsData.at_risk_students.map((st: any) => (
                        <div key={st.id} className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-bold text-gray-900">{st.name}</span>
                            <span className="text-gray-400 ml-2">({st.email})</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {st.risk_reasons?.map((reason: string, rIdx: number) => (
                              <span key={rIdx} className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold text-[10px]">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Performers */}
                {analyticsData.top_performers?.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy size={14} className="text-yellow-500" />
                      Học sinh xuất sắc dẫn đầu
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {analyticsData.top_performers.map((tp: any, i: number) => (
                        <div key={tp.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600">Top #{i + 1}</span>
                            <p className="font-bold text-gray-900 text-xs truncate">{tp.name}</p>
                          </div>
                          <span className="text-sm font-extrabold text-emerald-600">{tp.avg_percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassesTab;
