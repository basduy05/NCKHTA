"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Globe, RefreshCw, ChevronDown, Sparkles, User, Bot, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChatContext } from "../context/ChatContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  dictionary:  "Tra từ điển",
  vocabulary:  "Từ vựng",
  grammar:     "Ngữ pháp",
  practice:    "Luyện thi",
  ipa:         "Phát âm IPA",
  classes:     "Lớp học",
  "ai-tools":  "Công cụ AI",
  scores:      "Kết quả",
  roadmap:     "Lộ trình",
  assignments: "Bài tập",
  general:     "Tổng quát",
};

// ── Trigger button (exported for layout.tsx) ─────────────────────────────────
export function ChatTriggerButton() {
  const { openChat, isChatOpen } = useChatContext();
  if (isChatOpen) return null;
  return (
    <button
      onClick={() => openChat()}
      className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-300/40 hover:shadow-xl hover:shadow-indigo-400/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
      title="Mở AI Trợ lý"
    >
      <MessageCircle size={24} />
    </button>
  );
}

// ── Main chatbot panel ───────────────────────────────────────────────────────
export default function AIChatbot() {
  const { authFetch } = useAuth();
  const { currentFeature, contextData, isChatOpen, pendingMessage, closeChat } = useChatContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isChatOpen, isMinimized]);

  useEffect(() => {
    if (pendingMessage) setInput(pendingMessage);
  }, [pendingMessage]);

  useEffect(() => {
    if (!isChatOpen) return;
    authFetch(`${API_URL}/chat/suggestions/${currentFeature}`)
      .then(r => r.json())
      .then(data => {
        let qs: string[] = data.suggestions ?? [];
        if (currentFeature === "dictionary" && contextData?.word)
          qs = qs.map(q => q.replace("từ này", `"${contextData.word}"`));
        else if (currentFeature === "vocabulary" && contextData?.word)
          qs = qs.map(q => q.replace("từ này", `"${contextData.word}"`));
        else if (currentFeature === "grammar" && contextData?.rule)
          qs = qs.map(q => q.replace("quy tắc này", `"${contextData.rule}"`));
        setSuggestions(qs.slice(0, 5));
      })
      .catch(() => setSuggestions([]));
  }, [isChatOpen, currentFeature, contextData?.word]);

  const clearHistory = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setInput("");
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const assistantMsg: ChatMessage = { role: "assistant", content: "", isStreaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const history = messages
      .filter(m => !m.isStreaming)
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await authFetch(`${API_URL}/chat/send`, {
        method: "POST",
        body: JSON.stringify({ message: trimmed, feature: currentFeature, context_data: contextData ?? undefined, history, language }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const raw = line.startsWith("data: ") ? line.slice(6) : line.trim();
          if (!raw) continue;
          try {
            const chunk = JSON.parse(raw);
            if (chunk.text) {
              accumulated += chunk.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated, isStreaming: !chunk.done };
                return updated;
              });
            }
            if (chunk.done) break;
          } catch {}
        }
      }

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { ...last, isStreaming: false };
        return updated;
      });
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: language === "vi" ? "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại." : "Sorry, an error occurred. Please try again.",
          isStreaming: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, messages, currentFeature, contextData, language, authFetch]);

  if (!isChatOpen) return null;

  const featureLabel = FEATURE_LABELS[currentFeature] ?? currentFeature;

  return (
    <div
      className={`fixed z-[110] flex flex-col bg-white rounded-2xl border border-gray-200 shadow-2xl transition-all duration-300 overflow-hidden
        bottom-4 right-4 sm:bottom-6 sm:right-6
        ${isMinimized ? "w-56 sm:w-64 h-14" : "w-[calc(100vw-32px)] sm:w-[390px] h-[520px] sm:h-[580px]"}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight">AI Trợ lý EAM</p>
            {!isMinimized && (
              <p className="text-[11px] text-indigo-200 leading-tight truncate">
                {featureLabel}{contextData?.word ? ` · "${contextData.word}"` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isMinimized && (
            <button
              onClick={() => setLanguage(l => l === "vi" ? "en" : "vi")}
              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition flex items-center gap-1"
              title="Chuyển ngôn ngữ"
            >
              <Globe size={11} /> {language.toUpperCase()}
            </button>
          )}
          {!isMinimized && messages.length > 0 && (
            <button onClick={clearHistory} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition" title="Xóa lịch sử">
              <RefreshCw size={13} />
            </button>
          )}
          <button onClick={() => setIsMinimized(m => !m)} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition">
            <ChevronDown size={15} className={`transition-transform ${isMinimized ? "rotate-180" : ""}`} />
          </button>
          <button onClick={closeChat} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition">
            <X size={15} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ── Suggestions ── */}
          {suggestions.length > 0 && (
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Câu hỏi gợi ý</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={isLoading}
                    title={q}
                    className="flex-shrink-0 text-[11px] px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full border border-indigo-100 transition font-medium whitespace-nowrap disabled:opacity-50 max-w-[160px] truncate"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Bot size={28} className="text-indigo-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Xin chào! Tôi là AI Trợ lý EAM</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Hỏi tôi bất cứ điều gì về tiếng Anh hoặc chọn câu gợi ý ở trên.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 ${msg.role === "user" ? "bg-indigo-600" : "bg-gray-100"}`}>
                  {msg.role === "user"
                    ? <User size={12} className="text-white" />
                    : <Sparkles size={11} className="text-indigo-500" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[76%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  <MarkdownText text={msg.content} />
                  {msg.isStreaming && (
                    <span className="inline-flex gap-0.5 ml-1 align-middle">
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input ── */}
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={language === "vi" ? "Hỏi về tiếng Anh... (Enter gửi)" : "Ask about English... (Enter to send)"}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-700 placeholder-gray-400 max-h-20 leading-relaxed"
                style={{ minHeight: "22px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={14} className="text-white" />
                }
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Shift+Enter xuống dòng · AI có thể mắc lỗi
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Minimal markdown renderer ────────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <React.Fragment key={li}>
            {parts.map((part, pi) => {
              if (part.startsWith("**") && part.endsWith("**"))
                return <strong key={pi}>{part.slice(2, -2)}</strong>;
              if (part.startsWith("`") && part.endsWith("`"))
                return <code key={pi} className="bg-black/10 px-1 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
              return <span key={pi}>{part}</span>;
            })}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
}
