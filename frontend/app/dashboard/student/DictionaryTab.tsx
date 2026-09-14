"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Search, X, AlertCircle, Volume2, Bookmark, CheckCircle2,
  Star, Network, ArrowRight, RefreshCw, Sparkles, ExternalLink,
  Clock, Trash2
} from "lucide-react";
import { Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useChatContext } from "../../context/ChatContext";
import {
  ALL_WORDS_DATABASE, getPosColor, POS_MAP
} from "../../components/DictionaryData";
import KnowledgeGraph from "./KnowledgeGraph";

interface DictionaryTabProps {
  API_URL: string;
}

export default function DictionaryTab({ API_URL }: DictionaryTabProps) {
  const { authFetch } = useAuth();
  const { updateChatContext } = useChatContext();
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"lookup" | "graph">("lookup");
  const [targetGraphWord, setTargetGraphWord] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await authFetch(`${API_URL}/student/dictionary/history`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const words = data.map((item: any) => item.word);
          setHistory(words);
          if (typeof window !== "undefined") {
            localStorage.setItem("dictionaryHistory", JSON.stringify(words));
          }
          return;
        }
      }
    } catch (e) {}

    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("dictionaryHistory");
        if (stored) setHistory(JSON.parse(stored));
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchHistory();
  }, [API_URL]);

  const deleteHistoryItem = async (e: React.MouseEvent, targetWord: string) => {
    e.stopPropagation();
    try {
      await authFetch(`${API_URL}/student/dictionary/history/${encodeURIComponent(targetWord)}`, {
        method: "DELETE"
      });
    } catch (err) {}
    setHistory(prev => {
      const next = prev.filter(w => w !== targetWord);
      if (typeof window !== "undefined") localStorage.setItem("dictionaryHistory", JSON.stringify(next));
      return next;
    });
  };

  const clearAllHistory = async () => {
    try {
      await authFetch(`${API_URL}/student/dictionary/history`, { method: "DELETE" });
    } catch (err) {}
    setHistory([]);
    if (typeof window !== "undefined") localStorage.removeItem("dictionaryHistory");
  };

  const lookup = async (forceAI: boolean = false, wordOverride?: string) => {
    const trimmedWord = (wordOverride ?? word).trim();
    if (!trimmedWord) return;

    const localWord = trimmedWord.toLowerCase();
    const localData = ALL_WORDS_DATABASE[localWord] ||
                      ALL_WORDS_DATABASE[localWord.replace(/s$/, '')] ||
                      ALL_WORDS_DATABASE[localWord.replace(/es$/, '')];

    if (!forceAI && localData) {
      setResult({
        ...localData,
        status: "result",
        _source: "database",
        meanings: [{
          pos: localData.type,
          definition_en: localData.engMeaning,
          definition_vn: localData.translation,
          examples: [localData.example]
        }],
        phonetic_uk: localData.phonetic,
      });
      setLoading(false);
      updateChatContext("dictionary", {
        word: localWord,
        pos: localData.type || "",
        meaning_vn: localData.translation || "",
        meaning_en: localData.engMeaning || "",
        level: localData.level || "",
      });
      setHistory(prev => {
        const next = [localWord, ...prev.filter(w => w !== localWord)].slice(0, 10);
        if (typeof window !== "undefined") localStorage.setItem("dictionaryHistory", JSON.stringify(next));
        return next;
      });
      return;
    }

    setLoading(true);
    setResult({ status: "thinking", word: trimmedWord, meanings: [], elapsed: 0 });
    setSaved(false);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await authFetch(`${API_URL}/student/dictionary/lookup`, {
        method: "POST",
        body: JSON.stringify({ word: trimmedWord, force_ai: forceAI }),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Lookup failed");
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        const fullResult = {
          ...json,
          status: "result",
        };
        setResult(fullResult);
        if (json.is_saved !== undefined) setSaved(json.is_saved);
        if (fullResult.word) {
          const firstMeaning = fullResult.meanings?.[0] ?? {};
          updateChatContext("dictionary", {
            word: fullResult.word,
            pos: fullResult.pos || firstMeaning.pos || "",
            meaning_vn: firstMeaning.definition_vn || "",
            meaning_en: firstMeaning.definition_en || "",
            level: fullResult.level || "",
          });
        }
        setHistory(prev => {
          const next = [localWord, ...prev.filter(w => w !== localWord)].slice(0, 10);
          if (typeof window !== "undefined") localStorage.setItem("dictionaryHistory", JSON.stringify(next));
          return next;
        });
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let finalData: any = { word: trimmedWord, meanings: [] };

      let lastUpdate = Date.now();
      while (reader && !done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            let rawJson = line.trim();
            if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
            if (rawJson === "[DONE]" || !rawJson) continue;

            try {
              const chunkData = JSON.parse(rawJson);
              if (chunkData.status === "result" && chunkData.is_saved !== undefined) setSaved(chunkData.is_saved);

              finalData = { ...finalData, ...chunkData };

              const now = Date.now();
              if (chunkData.is_preview || now - lastUpdate > 80 || chunkData.status === "result") {
                setResult({ ...finalData });
                lastUpdate = now;
              }
            } catch (e) {
              console.warn("[DEBUG] Error parsing chunk:", line, e);
            }
          }
        }
      }
      setResult({ ...finalData, status: "result" });

      // Update chatbot context with the looked-up word
      if (finalData.word) {
        const firstMeaning = finalData.meanings?.[0] ?? {};
        updateChatContext("dictionary", {
          word: finalData.word,
          pos: finalData.pos || firstMeaning.pos || "",
          meaning_vn: firstMeaning.definition_vn || "",
          meaning_en: firstMeaning.definition_en || "",
          level: finalData.level || "",
        });
      }

      if (buffer.trim()) {
        try {
          let rawJson = buffer.trim();
          if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
          if (rawJson !== "[DONE]") {
            const chunkData = JSON.parse(rawJson);
            if (chunkData.status === "result" && chunkData.is_saved !== undefined) setSaved(chunkData.is_saved);
            finalData = { ...finalData, ...chunkData };
            setResult({ ...finalData, status: "result" });
          }
        } catch (e) {
          console.warn("[DEBUG] Error parsing final buffer:", buffer, e);
        }
      }

      if (finalData.is_saved !== undefined) {
        setSaved(finalData.is_saved);
      }

      setHistory(prev => {
        const next = [trimmedWord.toLowerCase(), ...prev.filter(w => w !== trimmedWord.toLowerCase())].slice(0, 10);
        if (typeof window !== "undefined") localStorage.setItem("dictionaryHistory", JSON.stringify(next));
        return next;
      });
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message || "Lỗi khi tra từ điển");
      setResult(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelLookup = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setResult(null);
    }
  };

  const reLookup = async () => {
    if (!result?.word) return;
    const currentWord = result.word;

    setResult(null);
    setError(null);
    setSaved(false);
    setWord(currentWord);

    // Clear backend cache (best effort, don't block)
    try {
      await authFetch(`${API_URL}/student/dictionary/cache/${encodeURIComponent(currentWord)}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Cache clear failed:", e);
    }

    // Pass word directly to avoid stale closure
    await lookup(true, currentWord);
  };

  const saveWord = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const firstMeaning = result.meanings?.[0] || {};
      const res = await authFetch(`${API_URL}/student/vocabulary/save`, {
        method: "POST",
        body: JSON.stringify({
          word: result.word,
          phonetic: result.phonetic_uk || result.phonetic_us || "",
          pos: result.pos || firstMeaning.pos || "",
          meaning_en: firstMeaning.definition_en || "",
          meaning_vn: firstMeaning.definition_vn || "",
          example: firstMeaning.examples?.[0] || "",
          level: result.level || "B1",
          source: "dictionary",
        }),
      });
      if (res.ok) setSaved(true);
    } catch { }
    finally { setSaving(false); }
  };

  const speak = (text: string, lang: string = "en-GB") => {
    if (result && result.audio_url && result.word.toLowerCase() === text.toLowerCase()) {
      const audio = new Audio(result.audio_url);
      audio.play().catch(e => console.error("Audio playback error:", e));
      return;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };


  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setViewMode("lookup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
            viewMode === "lookup"
              ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
          }`}
        >
          <Search size={15} />
          Tra từ điển
        </button>
        <button
          onClick={() => {
            if (result?.word) setTargetGraphWord(result.word);
            setViewMode("graph");
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition ${
            viewMode === "graph"
              ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
          }`}
        >
          <Network size={15} />
          Bản đồ Tri thức (Knowledge Graph)
        </button>
      </div>

      {viewMode === "graph" ? (
        <KnowledgeGraph
          API_URL={API_URL}
          targetWord={targetGraphWord || (result?.word ? result.word : undefined)}
          activeLookupResult={result}
          onWordClick={(clickedWord) => {
            setWord(clickedWord);
            setViewMode("lookup");
            lookup(false, clickedWord);
          }}
        />
      ) : (
        <>
      <div className="app-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input
              type="text"
              className="w-full pl-10 sm:pl-11 pr-10 py-2.5 sm:py-3 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl text-[var(--ink-1)] focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-[var(--brand)] outline-none transition text-sm sm:text-base"
              placeholder="Nhập từ tiếng Anh cần tra..."
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
            {word && (
              <button
                onClick={() => setWord("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink-1)]"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              intent="brand"
              onClick={() => lookup(false)}
              disabled={loading || !word.trim()}
              loading={loading}
              iconLeft={!loading ? <Search size={16} /> : undefined}
            >
              <span className="hidden sm:inline">{loading ? "Đang xử lý..." : "Tra từ"}</span>
              <span className="sm:hidden">{loading ? "..." : "Tra"}</span>
            </Button>
            {loading && (
              <Button intent="wrong" size="sm" onClick={cancelLookup}>Hủy</Button>
            )}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-slate-50/80 dark:bg-gray-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-xs text-[var(--ink-3)] shrink-0 font-medium">
            <Clock size={13} className="text-blue-500" />
            <span>Đã tra:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {history.slice(0, 12).map((h, i) => (
              <div
                key={i}
                className="group flex items-center bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-xs text-slate-700 dark:text-gray-300 rounded-lg shadow-2xs hover:border-blue-300 hover:text-blue-600 transition overflow-hidden"
              >
                <button
                  onClick={() => { setWord(h); lookup(false, h); }}
                  className="px-2.5 py-1 font-medium hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition cursor-pointer"
                >
                  {h}
                </button>
                <button
                  onClick={(e) => deleteHistoryItem(e, h)}
                  title="Xóa khỏi lịch sử"
                  className="px-1.5 py-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition border-l border-slate-100 dark:border-gray-700"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={clearAllHistory}
            className="text-[11px] text-slate-400 hover:text-rose-500 transition flex items-center gap-1 shrink-0 ml-auto"
            title="Xóa toàn bộ lịch sử"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">Xóa tất cả</span>
          </button>
        </div>
      )}
      {error && (
        <div className="app-card p-4 flex items-center gap-3 border-l-4 border-[var(--danger)]">
          <AlertCircle size={18} className="text-[var(--danger)] shrink-0" />
          <div>
            <p className="text-sm text-[var(--ink-1)] font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-[var(--danger)] underline mt-0.5">
              Đóng
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="app-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {result.status === "thinking" && (!result.meanings || result.meanings.length === 0) && (
            <>
              <div className="absolute top-0 left-0 w-full h-[2px] z-50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]"></div>
              </div>
              {result.queue && (result.queue.waiting > 0 || result.queue.active > 1) && (
                <div className="absolute top-2 right-4 z-50 bg-black/10 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1.5 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                  Hàng đợi: {result.queue.active}/7 {result.queue.waiting > 0 && `(Chờ: ${result.queue.waiting})`}
                </div>
              )}
            </>
          )}

          {result.error && result.error.includes("API key") && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-700 mb-2">Lỗi API Key</h3>
              <p className="text-red-600 mb-4">{result.error}</p>
              <p className="text-sm text-gray-600">Vui lòng liên hệ admin để cập nhật API key mới.</p>
            </div>
          )}
          <div className="bg-[var(--brand)] p-4 sm:p-5 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-[28px] font-bold mb-1 tracking-tight break-words">{result.word}</h2>
                <div className="flex items-center gap-2 sm:gap-4 mt-2 flex-wrap">
                  {result.phonetic_uk && (
                    <button onClick={() => speak(result.word, "en-GB")} className="flex items-center gap-1 sm:gap-1.5 bg-white/20 hover:bg-white/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition text-sm">
                      <Volume2 size={14} /> <span>UK</span> <span className="font-mono">{result.phonetic_uk}</span>
                    </button>
                  )}
                  {result.phonetic_us && (
                    <button onClick={() => speak(result.word, "en-US")} className="flex items-center gap-1 sm:gap-1.5 bg-white/20 hover:bg-white/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition text-sm">
                      <Volume2 size={14} /> <span>US</span> <span className="font-mono">{result.phonetic_us}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                {result.level && (
                  <span className="bg-white/20 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold">{result.level}</span>
                )}
                {result._source && (
                  <span className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold hidden sm:inline ${result._source === "database" ? "bg-green-400/30 text-green-100" :
                    result._source === "graph" ? "bg-cyan-400/30 text-cyan-100" : "bg-amber-400/30 text-amber-100"
                    }`}>
                    {result._source === "database" ? "Database" :
                      result._source === "graph" ? "⚡ Graph" : "AI"}
                  </span>
                )}
                {!loading && result.status !== "thinking" && (
                  <button
                    onClick={reLookup}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition font-medium bg-white/20 hover:bg-white/30 text-white border border-white/20 text-sm"
                    title="Xoá cache và tra cứu lại bằng AI"
                  >
                    <RefreshCw size={14} /> <span className="hidden sm:inline">Tra lại</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (result?.word) setTargetGraphWord(result.word);
                    setViewMode("graph");
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition font-medium bg-white/20 hover:bg-white/30 text-white border border-white/20 text-sm"
                  title="Xem từ này và các liên kết trên Bản đồ Tri thức"
                >
                  <Network size={14} /> <span className="hidden sm:inline">Bản đồ</span>
                </button>
                <button
                  onClick={saveWord}
                  disabled={saving || saved}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition font-medium text-sm ${saved ? "bg-green-500 text-white" : "bg-white text-blue-600 hover:bg-blue-50"}`}
                >
                  {saved ? <><CheckCircle2 size={15} /> <span className="hidden sm:inline">Đã lưu</span></> : saving ? "..." : <><Bookmark size={15} /> <span className="hidden sm:inline">Lưu từ</span></>}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {Array.isArray(result.meanings) && result.meanings.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-500">{result.meanings.length} nghĩa được tìm thấy</span>
              </div>
            )}
            {Array.isArray(result.meanings) && result.meanings.map((m: any, i: number) => {
              const colors = getPosColor(m.pos || result.pos);
              return (
                <div key={i} className={`border-l-4 ${colors.accent} pl-5 py-1 relative hover:bg-gray-50/50 transition-colors rounded-r-xl`}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`${colors.bg} ${colors.text} px-2.5 py-1 rounded-lg text-xs font-semibold uppercase border ${colors.border} shadow-sm`}>
                      {POS_MAP[(m.pos || result.pos)?.toLowerCase()] || (m.pos || result.pos)}
                    </span>
                    {i === 0 ? (
                      <span className="bg-[var(--brand)] text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> Nghĩa chính
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/50">
                        Tham khảo #{i}
                      </span>
                    )}
                    {m.register && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-yellow-200 italic">{m.register}</span>
                    )}
                  </div>
                <p className="text-gray-900 font-medium text-lg">{m.definition_en}</p>
                <p className="text-blue-700 font-medium mt-1">{m.definition_vn}</p>

                {m.examples?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {m.examples.map((ex: string, j: number) => (
                      <div key={j} className="flex items-start gap-2 group/ex">
                        <ArrowRight size={14} className="text-gray-400 mt-1 shrink-0" />
                        <p className="text-gray-600 italic flex-1">{ex}</p>
                        <button
                          onClick={() => speak(ex, "en-US")}
                          title="Phát âm câu ví dụ (Web Speech API)"
                          className="opacity-0 group-hover/ex:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded transition shrink-0"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-6 mt-3 text-sm">
                  {Array.isArray(m.synonyms) && m.synonyms.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Đồng nghĩa: </span>
                      {m.synonyms.map((s: string, k: number) => (
                        <button key={k} onClick={() => { setWord(s); lookup(false, s); }} className="text-green-600 hover:underline mr-2">{s}</button>
                      ))}
                    </div>
                  )}
                  {Array.isArray(m.antonyms) && m.antonyms.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Trái nghĩa: </span>
                      {m.antonyms.map((a: string, k: number) => (
                        <button key={k} onClick={() => { setWord(a); lookup(false, a); }} className="text-red-500 hover:underline mr-2">{a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

            {/* Vocabulary Expansion & Contextual Connections */}
            <div className="pt-5 border-t border-gray-100 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" />
                  Mở rộng từ vựng & Ngữ cảnh ứng dụng
                </h4>

                {/* Direct shortcut to full Knowledge Graph view */}
                <button
                  onClick={() => {
                    if (result?.word) setTargetGraphWord(result.word);
                    setViewMode("graph");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition border border-blue-200/80"
                >
                  <Network size={13} />
                  <span>Xem trên Bản đồ Tri thức</span>
                </button>
              </div>

              {/* Word Family & Connected Concepts */}
              {Array.isArray(result.word_family) && result.word_family.length > 0 && (
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Họ từ vựng (Word Family):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.word_family.map((w: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => { setWord(w); lookup(false, w); }}
                        className="bg-white text-purple-700 hover:text-purple-800 hover:bg-purple-50 text-xs px-2.5 py-1 rounded-lg border border-purple-200/80 transition font-medium shadow-xs"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Collocations & Common Phrases */}
              {Array.isArray(result.collocations) && result.collocations.length > 0 && (
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Cụm từ thường đi kèm (Collocations):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.collocations.map((c: string, i: number) => (
                      <span
                        key={i}
                        className="bg-white text-slate-700 text-xs px-2.5 py-1 rounded-lg border border-slate-200 font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Idioms */}
              {Array.isArray(result.idioms) && result.idioms.length > 0 && (
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-700 block mb-2">
                    Thành ngữ phổ biến (Idioms):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {result.idioms.map((idm: any, i: number) => {
                      const isString = typeof idm === "string";
                      const idiomText = isString ? idm.split(":")[0]?.trim() : idm.idiom;
                      const idiomMeaning = isString ? idm.split(":")[1]?.trim() : idm.meaning_vn;
                      return (
                        <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                          <p className="font-semibold text-slate-900">{idiomText}</p>
                          {idiomMeaning && <p className="text-slate-600 mt-0.5">{idiomMeaning}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Semantic Graph Connections Preview */}
              {Array.isArray(result.graph_connections) && result.graph_connections.length > 0 && (
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      Từ vựng có liên quan trong mạng lưới:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.graph_connections.map((c: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => { setWord(c.word); lookup(false, c.word); }}
                        className="inline-flex items-center gap-1.5 bg-white text-slate-800 hover:text-blue-700 hover:bg-blue-50 text-xs px-2.5 py-1 rounded-lg border border-slate-200 transition font-medium"
                      >
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                          {c.relation}
                        </span>
                        <span>{c.word}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wikipedia Reference */}
              {result.wikipedia && (
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Bách khoa toàn thư
                        </span>
                        <h5 className="font-bold text-slate-900 text-xs">{result.wikipedia.title}</h5>
                      </div>
                      {result.wikipedia.description && (
                        <p className="text-xs text-slate-500 mb-1">{result.wikipedia.description}</p>
                      )}
                      {result.wikipedia.extract && (
                        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{result.wikipedia.extract}</p>
                      )}
                    </div>
                    {result.wikipedia.url && (
                      <a
                        href={result.wikipedia.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline shrink-0 flex items-center gap-1 self-start font-medium"
                      >
                        <span>Wikipedia</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {result.sources?.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                  Nguồn tham chiếu: {result.sources.join(" • ")}
                  {result._from_cache && " (cached)"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}

    </div>
  );
}
