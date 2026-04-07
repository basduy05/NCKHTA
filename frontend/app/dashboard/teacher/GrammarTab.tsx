"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookText, Plus, Trash2, Edit, Save, X, Bold, Italic, Underline,
  Heading1, Heading2, List, ListOrdered, FileText, Upload, AlertCircle, CheckCircle2,
  Sparkles, RefreshCw
} from 'lucide-react';

interface GrammarTabProps {
  authFetch: any;
  API_URL: string;
}

export function GrammarTab({ authFetch, API_URL }: GrammarTabProps) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

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
    setSelectedFile(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setIsModalOpen(true);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setSelectedFile(null);
    setIsModalOpen(true);
    // Timeout to wait for Ref rendering
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = rule.description || "";
      }
    }, 50);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormName("");
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
              <h2 className="text-2xl font-black text-gray-900 leading-none">Kho Ngữ Pháp</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium italic">Quản lý các cấu trúc và tài liệu học tập.</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={openAddModal}
          className="bg-teal-600 hover:bg-teal-700 text-white font-black px-8 py-5 rounded-xl shadow-sm transition-all flex items-center gap-3 active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={24} />
          Soạn thảo Ngữ pháp
        </button>
      </div>

      {/* Rules List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
           Array(4).fill(0).map((_, i) => (
             <div key={i} className="bg-white h-48 rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
           ))
        ) : rules.length === 0 ? (
          <div className="col-span-full bg-white p-16 rounded-3xl border border-dashed border-gray-300 text-center">
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
                <h4 className="font-black text-xl text-teal-800 leading-tight flex-1">{r.name}</h4>
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
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm">
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
                <h3 className="text-2xl font-black text-gray-900">
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
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Tên cấu trúc / Chủ đề</label>
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
                        className="px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-black flex items-center gap-2 shadow-sm whitespace-nowrap"
                      >
                         {isGeneratingAI ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />} 
                         AI Tạo Mô tả
                      </button>
                    </div>
                </div>

                {/* Rich Text Editor Field */}
                <div className="space-y-3">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Mô tả chi tiết & Cấu trúc</label>
                    
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
                                <span className="text-[10px] font-black uppercase text-gray-400">Font:</span>
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
                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest px-2">Bôi đen văn bản để áp dụng định dạng.</p>
                </div>

                {/* File Upload Section */}
                <div className="space-y-3">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Đính kèm tài liệu (Tùy chọn)</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <label className="cursor-pointer flex-1 w-full bg-indigo-50 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-3xl p-6 flex flex-col items-center gap-2 transition-all group">
                            <Upload className="text-indigo-500 group-hover:-translate-y-1 transition" size={28} />
                            <span className="font-black text-indigo-700">Chọn tệp tin (PDF, DOCX, Image)</span>
                            <span className="text-xs text-indigo-400 font-bold uppercase tracking-tighter italic">Dung lượng tối đa 10MB</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </label>
                        {selectedFile && (
                            <div className="bg-green-50 border border-green-200 p-6 rounded-3xl flex items-center gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-right-4">
                                <CheckCircle2 className="text-green-500" size={32} />
                                <div>
                                    <p className="font-black text-green-800 text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                                    <button onClick={() => setSelectedFile(null)} className="text-green-600 text-xs font-black hover:underline">Hủy tệp này</button>
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
                className="px-8 py-4 font-black text-gray-400 hover:text-gray-900 transition hover:bg-white rounded-xl"
               >
                 Hủy bỏ
               </button>
               <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !formName}
                className="px-10 py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2"
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
    </div>
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
            {label && <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{label}</span>}
        </button>
    );
}
