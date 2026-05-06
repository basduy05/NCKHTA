"use client";
import React, { useState } from "react";
import { MessageCircleWarning, X, Send, Bug, Lightbulb, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

interface FeedbackButtonProps {
  feature: string; // 'dictionary', 'grammar', 'ipa', 'practice', 'ai-tools', 'vocabulary'
}

export default function FeedbackButton({ feature }: FeedbackButtonProps) {
  const { authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"suggestion" | "bug_report">("suggestion");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const featureLabels: Record<string, string> = {
    dictionary: "Tra từ điển",
    grammar: "Ngữ pháp",
    ipa: "Phát âm IPA",
    practice: "Luyện thi",
    "ai-tools": "Công cụ AI",
    vocabulary: "Từ vựng",
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await authFetch(`${API_URL}/student/feedback`, {
        method: "POST",
        body: JSON.stringify({
          feedback_type: feedbackType,
          feature,
          content: content.trim(),
        }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => {
          setIsOpen(false);
          setSent(false);
          setContent("");
          setFeedbackType("suggestion");
        }, 2000);
      }
    } catch (e) {
      console.error("Feedback error:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3.5 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 hover:scale-105 active:scale-95 transition-all duration-200 group"
        title="Góp ý / Báo lỗi"
      >
        <MessageCircleWarning size={22} className="group-hover:rotate-12 transition-transform" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 !mt-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !sending && setIsOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold">Góp ý & Báo lỗi</h3>
                  <p className="text-amber-100 text-sm mt-1">
                    Chức năng: <span className="font-semibold text-white">{featureLabels[feature] || feature}</span>
                  </p>
                </div>
                <button
                  onClick={() => !sending && setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {sent ? (
              /* Success State */
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-green-500" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Gửi thành công!</h4>
                <p className="text-gray-500">Cảm ơn bạn đã gửi góp ý. Chúng tôi sẽ xem xét sớm nhất.</p>
              </div>
            ) : (
              /* Form */
              <div className="p-6 space-y-5">
                {/* Type Selector */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Loại phản hồi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFeedbackType("suggestion")}
                      className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all font-medium ${
                        feedbackType === "suggestion"
                          ? "border-amber-400 bg-amber-50 text-amber-700 shadow-sm"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Lightbulb size={20} className={feedbackType === "suggestion" ? "text-amber-500" : ""} />
                      Góp ý
                    </button>
                    <button
                      onClick={() => setFeedbackType("bug_report")}
                      className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all font-medium ${
                        feedbackType === "bug_report"
                          ? "border-red-400 bg-red-50 text-red-700 shadow-sm"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Bug size={20} className={feedbackType === "bug_report" ? "text-red-500" : ""} />
                      Báo lỗi
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {feedbackType === "suggestion" ? "Nội dung góp ý" : "Mô tả lỗi gặp phải"}
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      feedbackType === "suggestion"
                        ? "Chia sẻ ý kiến để chúng tôi cải thiện tốt hơn..."
                        : "Mô tả chi tiết lỗi bạn gặp phải (bước thực hiện, kết quả mong đợi, kết quả thực tế)..."
                    }
                    className="w-full border-2 border-gray-200 rounded-xl p-4 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition h-32 resize-none text-gray-700 placeholder-gray-400"
                    maxLength={2000}
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${content.length > 1800 ? "text-red-500" : "text-gray-400"}`}>
                      {content.length}/2000
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={sending || !content.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-amber-200 hover:shadow-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Gửi phản hồi
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
