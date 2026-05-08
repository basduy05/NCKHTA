"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  BookText, Plus, Trash2, Edit, Save, X, Bold, Italic, Underline,
  Heading1, Heading2, List, ListOrdered, FileText, Upload, AlertCircle, CheckCircle2,
  Sparkles, RefreshCw, ClipboardPaste, ListChecks, Loader2, Eye
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface GrammarTabProps {
  authFetch: any;
  API_URL: string;
}

export function GrammarTab({ authFetch, API_URL }: GrammarTabProps) {
  const { showAlert } = useNotification();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLevel, setSelectedLevel] = useState("B1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Parse modal state
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseTab, setParseTab] = useState<"ai" | "local">("ai");
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [localParsedQuestions, setLocalParsedQuestions] = useState<any[]>([]);
  const [localParseError, setLocalParseError] = useState<string | null>(null);
  const [localParsing, setLocalParsing] = useState(false);
  const [selectedSaveRuleId, setSelectedSaveRuleId] = useState<string>("");
  const [savingQuizzes, setSavingQuizzes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Markdown-to-HTML parser helper
  const parseMarkdown = (text: string) => {
    if (!text) return "";
    
    // Check if it's already HTML (contains common tags)
    if (/<[a-z][\s\S]*>/i.test(text)) return text;
    
    // Simple Markdown to HTML conversion
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
      const res = await authFetch(`${API_URL}/teacher/grammar`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const openAddModal = () => {
    setEditingRule(null);
    setFormName("");
    setSelectedLevel("B1");
    setSelectedFile(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setIsModalOpen(true);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setSelectedLevel(rule.level || "B1");
    setSelectedFile(null);
    setIsModalOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = rule.description || "";
    }, 50);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormName("");
    setSelectedLevel("B1");
    setSelectedFile(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
  };

  const handleEditorCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleAIGenerate = async () => {
    if (!formName) return alert("Nhập tên cấu trúc ngữ pháp trước!");
    setIsGeneratingAI(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/grammar/ai-generate`, {
        method: "POST",
        body: JSON.stringify({ topic: formName })
      });
      if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "AI failed to respond");
      }
      const data = await res.json();
      
      // Robust data extraction
      let description = "";
      if (typeof data === 'string') {
          description = data;
      } else if (data && typeof data === 'object') {
          description = data.description || data.content || (data.name && JSON.stringify(data)) || "AI không trả về nội dung mô tả.";
      }

      if (description && description !== "{}") {
          if (editorRef.current) {
              editorRef.current.innerHTML = parseMarkdown(description);
              if (data.name && (!formName || formName === "")) setFormName(data.name);
          }
      } else {
          throw new Error("AI trả về dữ liệu rỗng. Vui lòng thử lại.");
      }
    } catch (err: any) {
      console.error("[AI GENERATE ERROR]", err);
      alert(`Lỗi AI: ${err.message || "Không thể tạo nội dung"}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    setIsSubmitting(true);
    const description = editorRef.current?.innerHTML || "";
    const formData = new FormData();
    formData.append("name", formName);
    formData.append("description", description);
    formData.append("level", selectedLevel);
    if (selectedFile) {
        formData.append("file", selectedFile);
    }

    try {
        const method = editingRule ? "PUT" : "POST";
        const url = editingRule ? `${API_URL}/teacher/grammar/${editingRule.id}` : `${API_URL}/teacher/grammar`;
        
        const res = await authFetch(url, {
            method,
            body: formData
        });

        if (res.ok) {
            closeModal();
            fetchRules();
        } else {
            const err = await res.json();
            alert(err.detail || "Có lỗi xảy ra khi lưu.");
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối server.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá quy tắc này không?")) return;

    try {
        const res = await authFetch(`${API_URL}/teacher/grammar/${id}`, {
            method: "DELETE"
        });
        if (res.ok) {
            setRules(rules.filter(r => r.id !== id));
        }
    } catch (err) {
        console.error(err);
    }
  };

  const closeParseModal = () => {
    if (parsing || localParsing) return;
    setShowParseModal(false);
    setParseError(null);
    setLocalParseError(null);
    setLocalParsedQuestions([]);
    setSavedSuccess(false);
    setParseText("");
  };

  const handleAIParse = async () => {
    if (!parseText.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await authFetch(`${API_URL}/teacher/grammar/parse-text`, {
        method: "POST",
        body: JSON.stringify({ text: parseText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Lỗi ${res.status}`);
      }
      const data = await res.json();
      const rawQ = Array.isArray(data) ? data : (data.questions || []);
      const validQ = (Array.isArray(rawQ) ? rawQ : []).filter((q: any) => q && (q.question || q.q));
      if (validQ.length === 0) throw new Error("Không tìm thấy câu hỏi nào trong văn bản.");
      setLocalParsedQuestions(validQ);
      setParseText("");
      setSavedSuccess(false);
    } catch (e: any) {
      setParseError(e.message || "Lỗi khi phân tích văn bản");
    } finally {
      setParsing(false);
    }
  };

  const handleLocalParse = async () => {
    if (!parseText.trim()) return;
    setLocalParsing(true);
    setLocalParseError(null);
    setLocalParsedQuestions([]);
    setSavedSuccess(false);
    try {
      const res = await authFetch(`${API_URL}/teacher/grammar/parse-text-local`, {
        method: "POST",
        body: JSON.stringify({ text: parseText }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Lỗi ${res.status}`);
      }
      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error("Không tìm thấy câu hỏi nào. Kiểm tra định dạng văn bản.");
      }
      setLocalParsedQuestions(data.questions);
    } catch (e: any) {
      setLocalParseError(e.message || "Lỗi phân tích");
    } finally {
      setLocalParsing(false);
    }
  };

  const saveLocalQuizzes = async () => {
    if (!selectedSaveRuleId || localParsedQuestions.length === 0) return;
    setSavingQuizzes(true);
    try {
      const res = await authFetch(`${API_URL}/teacher/grammar/quizzes/save`, {
        method: "POST",
        body: JSON.stringify({ rule_id: parseInt(selectedSaveRuleId), questions: localParsedQuestions }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Lỗi lưu bài tập");
      }
      const data = await res.json();
      setSavedSuccess(true);
      showAlert(`Đã lưu ${data.saved} câu hỏi vào chủ đề!`, "success");
      fetchRules();
    } catch (e: any) {
      showAlert(e.message || "Lỗi khi lưu bài tập", "error");
    } finally {
      setSavingQuizzes(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:px-8 flex-1 w-full md:w-auto">
          <div className="flex items-center gap-4">
            <div className="bg-teal-50 p-3 rounded-2xl">
              <BookText className="text-teal-600" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 leading-none">Kho Ngữ Pháp</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium italic">Quản lý các cấu trúc và tài liệu học tập.</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={() => { setShowParseModal(true); setParseTab("ai"); setLocalParsedQuestions([]); setSavedSuccess(false); }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-4 rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95 justify-center"
          >
            <ClipboardPaste size={20} />
            Phân tích đề thi
          </button>
          <button
            onClick={openAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-5 rounded-xl shadow-sm transition-all flex items-center gap-3 active:scale-95 justify-center"
          >
            <Plus size={24} />
            Soạn thảo Ngữ pháp
          </button>
        </div>
      </div>

      {/* Rules List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
           Array(4).fill(0).map((_, i) => (
             <div key={i} className="bg-white h-48 rounded-[var(--r-xl)] border border-gray-100 shadow-sm animate-pulse"></div>
           ))
        ) : rules.length === 0 ? (
          <div className="col-span-full bg-white p-16 rounded-[var(--r-xl)] border border-dashed border-gray-300 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookText size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">Chưa có tài liệu nào</h3>
            <p className="text-gray-400 mt-2">Nhấn "Soạn thảo Ngữ pháp" để bắt đầu tạo bài học.</p>
          </div>
        ) : rules.map((r: any) => (
          <div key={r.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 mb-2">{r.level || "B1"}</span>
                  <h4 className="font-semibold text-xl text-teal-800 leading-tight">{r.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openEditModal(r)}
                    className="p-3 bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition shadow-sm"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(r.id)}
                    className="p-3 bg-gray-50 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition shadow-sm"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div 
                className="text-gray-600 text-base leading-relaxed line-clamp-3 mb-6 rich-text max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(r.description) }}
              />

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                   {new Date(r.created_at).toLocaleDateString('vi-VN')}
                </span>
                
                {r.file_name && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-soft)] text-[var(--brand)] rounded-xl font-bold text-sm">
                    <FileText size={14} />
                    <span className="truncate max-w-[120px]">{r.file_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Compose Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 !mt-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-500">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-teal-600 p-2 rounded-2xl shadow-lg shadow-teal-200">
                  <Edit className="text-white" size={24} />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingRule ? "Sửa Ngữ pháp" : "Tạo Ngữ pháp mới"}
                </h3>
              </div>
              <button 
                onClick={closeModal}
                className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-gray-900 transition-colors shadow-sm"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-8 space-y-8">
                 {/* Rule Name Field */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-1">Cấp độ CEFR</label>
                    <select
                      value={selectedLevel}
                      onChange={e => setSelectedLevel(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-500 rounded-xl p-4 outline-none transition-all font-semibold text-gray-700 shadow-sm"
                    >
                      <option value="Pre-A1">Pre-A1 — Beginner</option>
                      <option value="A1">A1 — Elementary</option>
                      <option value="A2">A2 — Pre-Intermediate</option>
                      <option value="B1">B1 — Intermediate</option>
                      <option value="B2">B2 — Upper-Intermediate</option>
                      <option value="C1">C1 — Advanced</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-1">Tên cấu trúc / Chủ đề</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Ví dụ: Thì hiện tại đơn (Present Simple)"
                        className="flex-1 bg-gray-50 border-2 border-gray-200 focus:border-teal-500 focus:bg-white rounded-xl p-5 outline-none transition-all font-bold text-xl shadow-sm"
                      />
                      <button 
                        onClick={handleAIGenerate} 
                        disabled={isGeneratingAI} 
                        className="px-6 py-4 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-dark)] disabled:opacity-50 transition-all font-semibold flex items-center gap-2 shadow-sm whitespace-nowrap"
                      >
                         {isGeneratingAI ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />} 
                         AI Tạo Mô tả
                      </button>
                    </div>
                </div>

                {/* Rich Text Editor Field */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-1">Mô tả chi tiết & Cấu trúc</label>
                    
                    <div className="border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-teal-500 transition-all bg-white shadow-sm">
                        {/* High-Contrast Toolbar */}
                        <div className="bg-white border-b-4 border-teal-500 p-4 flex flex-wrap gap-3 items-center sticky top-0 z-20 shadow-md">
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
                                <span className="text-[10px] font-semibold uppercase text-gray-400">Font:</span>
                                <select 
                                    onChange={(e) => handleEditorCommand('fontName', e.target.value)}
                                    className="bg-white border-2 border-gray-100 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-teal-400 transition"
                                >
                                    <option value="Inter, sans-serif">Sans (Mặc định)</option>
                                    <option value="'Roboto Slab', serif">Serif (Trang trọng)</option>
                                    <option value="'Fira Code', monospace">Mono (Kỹ thuật)</option>
                                </select>
                            </div>
                        </div>

                        {/* Editor Content area */}
                        <div 
                          ref={editorRef}
                          contentEditable 
                          className="min-h-[400px] p-8 outline-none rich-text max-w-none bg-white font-medium text-lg leading-relaxed"
                          spellCheck={false}
                        />
                    </div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest px-2">Bôi đen văn bản để áp dụng định dạng.</p>
                </div>

                {/* File Upload Section */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-1">Đính kèm tài liệu (Tùy chọn)</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <label className="cursor-pointer flex-1 w-full bg-[var(--brand-soft)] border-2 border-dashed border-[var(--line)] hover:border-[var(--brand)] rounded-[var(--r-xl)] p-6 flex flex-col items-center gap-2 transition-all group">
                            <Upload className="text-indigo-500 group-hover:-translate-y-1 transition" size={28} />
                            <span className="font-semibold text-indigo-700">Chọn tệp tin (PDF, DOCX, Image)</span>
                            <span className="text-xs text-[var(--brand)] font-bold uppercase tracking-tighter italic">Dung lượng tối đa 10MB</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </label>
                        {selectedFile && (
                            <div className="bg-green-50 border border-green-200 p-6 rounded-[var(--r-xl)] flex items-center gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-right-4">
                                <CheckCircle2 className="text-green-500" size={32} />
                                <div>
                                    <p className="font-semibold text-green-800 text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                                    <button onClick={() => setSelectedFile(null)} className="text-green-600 text-xs font-semibold hover:underline">Hủy tệp này</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
               <button 
                onClick={closeModal}
                className="px-8 py-4 font-semibold text-gray-400 hover:text-gray-900 transition hover:bg-white rounded-xl"
               >
                 Hủy bỏ
               </button>
               <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !formName}
                className="px-10 py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2"
               >
                 {isSubmitting ? "Đang lưu..." : (
                   <>
                     <Save size={20} />
                     {editingRule ? "Cập nhật tài liệu" : "Đăng văn bản"}
                   </>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Parse Modal ── */}
      {showParseModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeParseModal} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-[var(--sh-lg)] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-2xl"><ClipboardPaste size={22} className="text-orange-600" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Phân tích đề thi</h3>
                  <p className="text-xs text-gray-400 font-bold">Trích xuất câu hỏi & đáp án từ văn bản</p>
                </div>
              </div>
              <button onClick={closeParseModal} disabled={parsing || localParsing}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition disabled:opacity-40">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
              <button onClick={() => { setParseTab("ai"); setLocalParsedQuestions([]); }}
                className={`pb-3 pt-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${parseTab === "ai" ? "border-teal-500 text-teal-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                <Sparkles size={15} /> AI Phân tích <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">3 credits</span>
              </button>
              <button onClick={() => { setParseTab("local"); setLocalParsedQuestions([]); setSavedSuccess(false); }}
                className={`pb-3 pt-4 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${parseTab === "local" ? "border-orange-500 text-orange-700" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
                <ListChecks size={15} /> Phân tích thông minh <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Miễn phí</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {parseTab === "ai" ? (
                <>
                  {localParsedQuestions.length === 0 ? (
                    <>
                      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-sm text-teal-700 font-medium">
                        <p className="font-semibold mb-1">Cách sử dụng:</p>
                        <ul className="space-y-1 text-xs opacity-80">
                          <li>• Copy đoạn văn bản từ file PDF/Word chứa câu hỏi trắc nghiệm</li>
                          <li>• Dán vào ô bên dưới và nhấn <strong>Phân tích</strong></li>
                          <li>• AI sẽ tự động nhận biết câu hỏi, đáp án A/B/C/D và đáp án đúng</li>
                          <li>• Tốn <strong>3 AI credits</strong> mỗi lần phân tích</li>
                        </ul>
                      </div>
                      <textarea
                        value={parseText}
                        onChange={e => setParseText(e.target.value)}
                        placeholder={"Dán văn bản đề thi vào đây...\n\nVí dụ:\n1. She _____ (go) to school every day.\nA. goes   B. go   C. went   D. going\n\nAnswer key: 1-A"}
                        disabled={parsing}
                        rows={10}
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-teal-400 rounded-2xl p-4 outline-none text-sm font-mono text-gray-700 resize-y transition-all disabled:opacity-60"
                      />
                      {parseError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">
                          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                          <p className="font-medium">{parseError}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{parseText.length} / 12,000 ký tự</span>
                        <span className="font-bold text-teal-600">3 credits</span>
                      </div>
                    </>
                  ) : (
                    <ParsedResultsView
                      questions={localParsedQuestions}
                      rules={rules}
                      selectedSaveRuleId={selectedSaveRuleId}
                      setSelectedSaveRuleId={setSelectedSaveRuleId}
                      savingQuizzes={savingQuizzes}
                      savedSuccess={savedSuccess}
                      onSave={saveLocalQuizzes}
                      onReset={() => { setLocalParsedQuestions([]); setSavedSuccess(false); }}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-orange-700 font-medium">
                    <p className="font-semibold mb-1">Phân tích thông minh — không cần AI:</p>
                    <ul className="space-y-1 text-xs opacity-80">
                      <li>• Hệ thống tự nhận diện câu hỏi theo số thứ tự (1. 2. 3. ...)</li>
                      <li>• Tự phát hiện đáp án A. B. C. D. và đáp án đúng</li>
                      <li>• Hỗ trợ bảng đáp án ở cuối (ví dụ: 1-A, 2-C, 3-B)</li>
                      <li>• <strong>Miễn phí, không tốn AI credits</strong></li>
                      <li>• Giáo viên có thể <strong>lưu bài tập vào chủ đề</strong> để học sinh luyện tập</li>
                    </ul>
                  </div>

                  {localParsedQuestions.length === 0 ? (
                    <>
                      <textarea
                        value={parseText}
                        onChange={e => setParseText(e.target.value)}
                        placeholder={"Dán văn bản đề thi vào đây...\n\nVí dụ:\n1. She _____ to school every day.\nA. goes\nB. go\nC. went\nD. going\n\nAnswer key: 1-A, 2-C"}
                        disabled={localParsing}
                        rows={10}
                        className="w-full bg-gray-50 border-2 border-gray-200 focus:border-orange-400 rounded-2xl p-4 outline-none text-sm font-mono text-gray-700 resize-y transition-all disabled:opacity-60"
                      />
                      {localParseError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-700">
                          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                          <p className="font-medium">{localParseError}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{parseText.length} / 20,000 ký tự</span>
                        <span className="font-bold text-green-600">Miễn phí</span>
                      </div>
                    </>
                  ) : (
                    <ParsedResultsView
                      questions={localParsedQuestions}
                      rules={rules}
                      selectedSaveRuleId={selectedSaveRuleId}
                      setSelectedSaveRuleId={setSelectedSaveRuleId}
                      savingQuizzes={savingQuizzes}
                      savedSuccess={savedSuccess}
                      onSave={saveLocalQuizzes}
                      onReset={() => { setLocalParsedQuestions([]); setSavedSuccess(false); }}
                    />
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex-shrink-0 flex gap-3">
              {localParsedQuestions.length > 0 ? (
                <button onClick={closeParseModal}
                  className="flex-1 py-3 rounded-2xl font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">
                  Đóng
                </button>
              ) : parseTab === "ai" ? (
                <>
                  <button onClick={closeParseModal} disabled={parsing}
                    className="flex-1 py-3 rounded-2xl font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40">
                    Hủy
                  </button>
                  <button onClick={handleAIParse} disabled={parsing || !parseText.trim()}
                    className="flex-1 sm:flex-none sm:px-10 py-3 rounded-2xl font-semibold text-white bg-teal-600 hover:bg-teal-700 transition flex items-center justify-center gap-2 shadow-lg shadow-teal-200 disabled:opacity-40 disabled:shadow-none">
                    {parsing ? <><Loader2 size={18} className="animate-spin" /> Đang phân tích...</> : <><Sparkles size={18} /> Phân tích ngay</>}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={closeParseModal} disabled={localParsing}
                    className="flex-1 py-3 rounded-2xl font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-40">
                    Hủy
                  </button>
                  <button onClick={handleLocalParse} disabled={localParsing || !parseText.trim()}
                    className="flex-1 sm:flex-none sm:px-10 py-3 rounded-2xl font-semibold text-white bg-orange-500 hover:bg-orange-600 transition flex items-center justify-center gap-2 shadow-lg shadow-orange-200 disabled:opacity-40 disabled:shadow-none">
                    {localParsing ? <><Loader2 size={18} className="animate-spin" /> Đang phân tích...</> : <><ListChecks size={18} /> Phân tích ngay</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Parsed questions results view (reused for AI and local tabs)
function ParsedResultsView({ questions, rules, selectedSaveRuleId, setSelectedSaveRuleId, savingQuizzes, savedSuccess, onSave, onReset }: {
  questions: any[];
  rules: any[];
  selectedSaveRuleId: string;
  setSelectedSaveRuleId: (v: string) => void;
  savingQuizzes: boolean;
  savedSuccess: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-gray-900 flex items-center gap-2">
          <Eye size={16} className="text-teal-600" /> Kết quả: {questions.length} câu hỏi
        </p>
        <button onClick={onReset} className="text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <X size={12} /> Nhập lại
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {questions.map((q: any, i: number) => (
          <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="font-semibold text-gray-900 text-sm mb-2">{i + 1}. {q.question}</p>
            {q.options && q.options.length > 0 && (
              <div className="grid grid-cols-2 gap-1 mb-2">
                {q.options.map((opt: string, j: number) => (
                  <span key={j} className={`text-xs px-2 py-1 rounded-lg font-bold ${opt === q.answer ? "bg-green-100 text-green-700 border border-green-200" : "bg-white text-gray-500 border border-gray-100"}`}>
                    {opt === q.answer && "✓ "}{opt}
                  </span>
                ))}
              </div>
            )}
            {q.answer && <p className="text-xs font-semibold text-teal-600">Đáp án: {q.answer}</p>}
          </div>
        ))}
      </div>

      {!savedSuccess ? (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2">
            <Save size={15} /> Lưu vào chủ đề ngữ pháp
          </p>
          <div className="flex gap-3">
            <select value={selectedSaveRuleId} onChange={e => setSelectedSaveRuleId(e.target.value)}
              className="flex-1 bg-white border-2 border-blue-200 rounded-xl px-3 py-2 outline-none font-bold text-gray-700 text-sm focus:border-blue-400">
              <option value="">-- Chọn chủ đề --</option>
              {rules.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name} ({r.level || "B1"})</option>
              ))}
            </select>
            <button onClick={onSave} disabled={!selectedSaveRuleId || savingQuizzes}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-40 flex items-center gap-2 flex-shrink-0">
              {savingQuizzes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Lưu
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-2 text-green-700 font-semibold text-sm">
          <CheckCircle2 size={18} /> Đã lưu thành công vào chủ đề!
        </div>
      )}
    </>
  );
}

// Sub-component for Toolbar Buttons
function EditorToolbarButton({ onClick, icon, tooltip, label }: { onClick: () => void, icon: React.ReactNode, tooltip: string, label?: string }) {
    return (
        <button 
            type="button"
            onMouseDown={(e) => { 
                e.preventDefault(); // Prevents losing focus on the editor
                onClick(); 
            }}
            className="px-3 py-2 bg-white hover:bg-teal-50 text-gray-900 border-2 border-gray-100 hover:border-teal-400 rounded-xl transition shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 min-w-[50px] justify-center"
            title={tooltip}
        >
            {icon}
            {label && <span className="text-[10px] font-semibold uppercase tracking-widest hidden sm:inline">{label}</span>}
        </button>
    );
}
