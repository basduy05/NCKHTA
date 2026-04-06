"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  Search, X, AlertCircle, Volume2, Bookmark, CheckCircle2, 
  Star, Network, ArrowRight 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { 
  ALL_WORDS_DATABASE, getPosColor, POS_MAP 
} from "../../components/DictionaryData";

interface DictionaryTabProps {
  API_URL: string;
}

export default function DictionaryTab({ API_URL }: DictionaryTabProps) {
  const { authFetch } = useAuth();
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("dictionaryHistory");
        if (stored) setHistory(JSON.parse(stored));
      }
    } catch (e) { }
  }, []);

  const lookup = async () => {
    const trimmedWord = word.trim();
    if (!trimmedWord) return;

    const localWord = trimmedWord.toLowerCase();
    const localData = ALL_WORDS_DATABASE[localWord] || 
                      ALL_WORDS_DATABASE[localWord.replace(/s$/, '')] || 
                      ALL_WORDS_DATABASE[localWord.replace(/es$/, '')];

    if (localData) {
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
        body: JSON.stringify({ word: trimmedWord }),
        signal: controller.signal
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Lookup failed");
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
              if (now - lastUpdate > 150) {
                setResult({ ...finalData });
                lastUpdate = now;
              }
            } catch (e) {
              console.warn("[DEBUG] Error parsing chunk:", line, e);
            }
          }
        }
      }
      setResult({ ...finalData });

      if (buffer.trim()) {
        try {
          let rawJson = buffer.trim();
          if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
          if (rawJson !== "[DONE]") {
            const chunkData = JSON.parse(rawJson);
            if (chunkData.status === "result" && chunkData.is_saved !== undefined) setSaved(chunkData.is_saved);
            finalData = { ...finalData, ...chunkData };
            setResult({ ...finalData });
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
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition text-lg"
              placeholder="Nhập từ tiếng Anh cần tra (vd: accomplish, serendipity, ...)"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
            />
            {word && (
              <button
                onClick={() => setWord("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <button
            onClick={lookup}
            disabled={loading || !word.trim()}
            className="btn-primary py-3.5 px-8 rounded-xl flex items-center gap-2 shadow-md disabled:opacity-50 transition text-lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 justify-center items-center h-5">
                  <div className="w-1 h-3 bg-yellow-300 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1 h-4 bg-yellow-300 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-3 bg-yellow-300 animate-bounce"></div>
                </div>
              </div>
            ) : (
              <Search size={20} />
            )}
            <span>{loading ? "Đang xử lý..." : "Tra từ"}</span>
          </button>

          {loading && (
            <button
              onClick={cancelLookup}
              className="px-6 py-3.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition font-medium"
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Gần đây:</span>
          {history.slice(0, 10).map((h, i) => (
            <button key={i} onClick={() => { setWord(h); }} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition">
              {h}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 text-sm underline hover:text-red-600"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-extrabold mb-1">{result.word}</h2>
                <div className="flex items-center gap-4 mt-2">
                  {result.phonetic_uk && (
                    <button onClick={() => speak(result.word, "en-GB")} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
                      <Volume2 size={16} /> <span className="text-sm">UK</span> <span className="font-mono text-sm">{result.phonetic_uk}</span>
                    </button>
                  )}
                  {result.phonetic_us && (
                    <button onClick={() => speak(result.word, "en-US")} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">
                      <Volume2 size={16} /> <span className="text-sm">US</span> <span className="font-mono text-sm">{result.phonetic_us}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.level && (
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">{result.level}</span>
                )}
                {result._source && (
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${result._source === "database" ? "bg-green-400/30 text-green-100" :
                    result._source === "graph" ? "bg-cyan-400/30 text-cyan-100" : "bg-amber-400/30 text-amber-100"
                    }`}>
                    {result._source === "database" ? "Từ Database (không tốn AI)" :
                      result._source === "graph" ? "⚡ Từ Knowledge Graph" : "AI tra cứu"}
                  </span>
                )}
                <button
                  onClick={saveWord}
                  disabled={saving || saved}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition font-medium ${saved ? "bg-green-500 text-white" : "bg-white text-blue-600 hover:bg-blue-50"}`}
                >
                  {saved ? <><CheckCircle2 size={16} /> Đã lưu</> : saving ? "Đang lưu..." : <><Bookmark size={16} /> Lưu từ</>}
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
                    <span className={`${colors.bg} ${colors.text} px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${colors.border} shadow-sm`}>
                      {POS_MAP[(m.pos || result.pos)?.toLowerCase()] || (m.pos || result.pos)}
                    </span>
                    {i === 0 ? (
                      <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-md shadow-indigo-100 flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> Nghĩa chính
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/50">
                        Tham khảo #{i}
                      </span>
                    )}
                    {m.register && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-yellow-200 italic">{m.register}</span>
                    )}
                  </div>
                <p className="text-gray-900 font-medium text-lg">{m.definition_en}</p>
                <p className="text-blue-700 font-medium mt-1">{m.definition_vn}</p>

                {m.examples?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {m.examples.map((ex: string, j: number) => (
                      <div key={j} className="flex items-start gap-2">
                        <ArrowRight size={14} className="text-gray-400 mt-1 shrink-0" />
                        <p className="text-gray-600 italic">{ex}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-6 mt-3 text-sm">
                  {Array.isArray(m.synonyms) && m.synonyms.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Đồng nghĩa: </span>
                      {m.synonyms.map((s: string, k: number) => (
                        <button key={k} onClick={() => setWord(s)} className="text-green-600 hover:underline mr-2">{s}</button>
                      ))}
                    </div>
                  )}
                  {Array.isArray(m.antonyms) && m.antonyms.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-xs uppercase font-semibold">Trái nghĩa: </span>
                      {m.antonyms.map((a: string, k: number) => (
                        <button key={k} onClick={() => setWord(a)} className="text-red-500 hover:underline mr-2">{a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
              {Array.isArray(result.word_family) && result.word_family.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-purple-700 mb-2">Họ từ (Word Family)</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.word_family.map((w: string, i: number) => (
                      <button key={i} onClick={() => setWord(w)} className="bg-white text-purple-700 text-sm px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-100 transition">{w}</button>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(result.collocations) && result.collocations.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-orange-700 mb-2">Kết hợp từ (Collocations)</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.collocations.map((c: string, i: number) => (
                      <span key={i} className="bg-white text-orange-700 text-sm px-2.5 py-1 rounded-lg border border-orange-200">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(result.idioms) && result.idioms.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-green-700 mb-2">Thành ngữ (Idioms)</h4>
                  <div className="space-y-3">
                    {result.idioms.map((idm: any, i: number) => {
                      const isString = typeof idm === "string";
                      const idiomText = isString ? idm.split(":")[0]?.trim() : idm.idiom;
                      const idiomMeaning = isString ? idm.split(":")[1]?.trim() : idm.meaning_vn;
                      return (
                        <div key={i} className="bg-white p-3 rounded-lg border border-green-200">
                          <p className="font-bold text-green-800 text-sm">{idiomText}</p>
                          <p className="text-green-600 text-xs mt-1">{idiomMeaning}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {Array.isArray(result.graph_connections) && result.graph_connections.length > 0 && (
                <div className="bg-cyan-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-cyan-700 mb-2 flex items-center gap-1"><Network size={14} /> Đồ thị tri thức</h4>
                  <div className="space-y-1">
                    {result.graph_connections.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg border border-cyan-100">
                        <span className="text-cyan-600 font-mono text-xs bg-cyan-100 px-1.5 rounded min-w-[50px] text-center">{c.relation}</span>
                        <button onClick={() => setWord(c.word)} className="text-cyan-800 hover:underline font-medium">{c.word}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.wikipedia && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    Wikipedia
                  </h4>
                  {result.wikipedia.thumbnail && (
                    <img src={result.wikipedia.thumbnail} alt={result.wikipedia.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                  )}
                  {result.wikipedia.title && (
                    <p className="font-bold text-blue-800 text-sm">{result.wikipedia.title}</p>
                  )}
                  {result.wikipedia.description && (
                    <p className="text-blue-600 text-xs mt-1">{result.wikipedia.description}</p>
                  )}
                  {result.wikipedia.extract && (
                    <p className="text-blue-700 text-xs mt-2 line-clamp-4">{result.wikipedia.extract}</p>
                  )}
                  {result.wikipedia.url && (
                    <a href={result.wikipedia.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                      Đọc thêm trên Wikipedia →
                    </a>
                  )}
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
    </div>
  );
}
