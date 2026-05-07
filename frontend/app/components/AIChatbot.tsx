"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bot, X, Send, Globe, RefreshCw, ChevronDown, Sparkles, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChatContext } from "../context/ChatContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  dictionary: "Tra từ điển",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  practice: "Luyện thi",
  ipa: "Phát âm IPA",
  classes: "Lớp học",
  "ai-tools": "Công cụ AI",
  scores: "Kết quả",
  roadmap: "Lộ trình",
  assignments: "Bài tập",
  general: "Tổng quát",
};

export default function AIChatbot() {
  const { authFetch } = useAuth();
  const { currentFeature, contextData, isChatOpen, pendingMessage, closeChat } =
    useChatContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isChatOpen, isMinimized]);

  // Pre-fill pending message
  useEffect(() => {
    if (pendingMessage) setInput(pendingMessage);
  }, [pendingMessage]);

  // Fetch suggestions when feature or context changes
  useEffect(() => {
    if (!isChatOpen) return;
    setSuggestionsLoading(true);
    authFetch(`${API_URL}/chat/suggestions/${currentFeature}`)
      .then((r) => r.json())
      .then((data) => {
        let qs: string[] = data.suggestions ?? [];
        // Personalise suggestions when viewing a specific word
        if (currentFeature === "dictionary" && contextData?.word) {
          qs = qs.map((q) => q.replace("từ này", `"${contextData.word}"`));
        } else if (currentFeature === "vocabulary" && contextData?.word) {
          qs = qs.map((q) => q.replace("từ này", `"${contextData.word}"`));
        } else if (currentFeature === "grammar" && contextData?.rule) {
          qs = qs.map((q) => q.replace("quy tắc này", `"${contextData.rule}"`));
        }
        setSuggestions(qs.slice(0, 5));
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [isChatOpen, currentFeature, contextData?.word]);

  const clearHistory = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setInput("");
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsLoading(true);

      // Abort any previous stream
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const history = messages
        .filter((m) => !m.isStreaming)
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const res = await authFetch(`${API_URL}/chat/send`, {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            feature: currentFeature,
            context_data: contextData ?? undefined,
            history,
            language,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

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
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: accumulated,
                    isStreaming: !chunk.done,
                  };
                  return updated;
                });
              }
              if (chunk.done) break;
            } catch {}
          }
        }

        // Mark stream done
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, isStreaming: false };
          }
          return updated;
        });
      } catch (e: any) {
        if (e.name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              language === "vi"
                ? "❌ Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại."
                : "❌ Sorry, an error occurred. Please try again.",
            isStreaming: false,
          };
          return updated;
        });
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, messages, currentFeature, contextData, language, authFetch]
  );

  if (!isChatOpen) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 z-[110] flex flex-col shadow-2xl rounded-3xl border border-gray-200 bg-white transition-all duration-300 ${
        isMinimized ? "h-[60px] w-[220px]" : "w-[380px] h-[560px]"
      }`}
      style={{ boxShadow: "0 8px 40px rgba(99,102,241,0.18)" }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-3xl text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={16} className="text-yellow-300" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">AI Trợ lý EAM</p>
            {!isMinimized && (
              <p className="text-[10px] text-indigo-200 leading-tight">
                {FEATURE_LABELS[currentFeature] ?? currentFeature}
                {contextData?.word ? ` · "${contextData.word}"` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language toggle */}
          {!isMinimized && (
            <button
              onClick={() => setLanguage((l) => (l === "vi" ? "en" : "vi"))}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition text-xs font-bold"
              title="Chuyển ngôn ngữ"
            >
              <Globe size={12} />
              {language.toUpperCase()}
            </button>
          )}
          {/* Clear history */}
          {!isMinimized && messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition"
              title="Xóa lịch sử"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {/* Minimize */}
          <button
            onClick={() => setIsMinimized((m) => !m)}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            <ChevronDown
              size={15}
              className={`transition-transform ${isMinimized ? "rotate-180" : ""}`}
            />
          </button>
          {/* Close */}
          <button
            onClick={closeChat}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* ── Suggested questions ── */}
          {suggestions.length > 0 && (
            <div className="px-3 pt-2.5 pb-1 border-b border-gray-100 flex-shrink-0">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
                Câu hỏi gợi ý
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={isLoading}
                    className="flex-shrink-0 text-[11px] px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-100 transition font-medium whitespace-nowrap disabled:opacity-50 max-w-[160px] truncate"
                    title={q}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                  <Bot size={32} className="text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Xin chào! Tôi là AI Trợ lý EAM</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Hỏi tôi bất cứ điều gì về tiếng Anh hoặc bấm câu gợi ý bên trên.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-indigo-600"
                      : "bg-gradient-to-br from-violet-500 to-indigo-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User size={13} className="text-white" />
                  ) : (
                    <Sparkles size={12} className="text-white" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm"
                  }`}
                >
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
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={
                  language === "vi"
                    ? "Hỏi tôi về tiếng Anh... (Enter để gửi)"
                    : "Ask me anything about English... (Enter to send)"
                }
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-700 placeholder-gray-400 max-h-[80px] leading-relaxed"
                style={{ minHeight: "24px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center transition"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} className="text-white" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Shift+Enter xuống dòng · AI có thể mắc lỗi, hãy kiểm chứng thông tin quan trọng.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Lightweight markdown renderer ────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  if (!text) return null;

  // Process bold, code, and newlines
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <React.Fragment key={li}>
            {parts.map((part, pi) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={pi}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith("`") && part.endsWith("`")) {
                return (
                  <code
                    key={pi}
                    className="bg-black/10 text-indigo-900 px-1 rounded text-[11px] font-mono"
                  >
                    {part.slice(1, -1)}
                  </code>
                );
              }
              return <span key={pi}>{part}</span>;
            })}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
}
