"use client";
import React, { useEffect, useState } from "react";
import { X, Volume2, Bookmark, Check, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface WordPopupProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  API_URL: string;
}

export default function WordPopup({ word, position, onClose, API_URL }: WordPopupProps) {
  const { authFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const lookup = async () => {
      try {
        setLoading(true);
        setSaved(false);
        const res = await authFetch(`${API_URL}/student/dictionary/lookup?word=${encodeURIComponent(word)}`);
        if (res.ok && isMounted) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Popup lookup error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    lookup();
    return () => {
      isMounted = false;
    };
  }, [word, API_URL]);

  const playAudio = (url?: string) => {
    if (url) {
      new Audio(url).play().catch(() => {});
    } else {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSave = async () => {
    if (saved || saving || !data) return;
    try {
      setSaving(true);
      const primaryMeaning = data.meanings?.[0] || {};
      const payload = {
        word: data.word || word,
        phonetic: data.phonetic || data.phonetic_uk || "",
        audio_url: data.audio_url || "",
        pos: primaryMeaning.partOfSpeech || primaryMeaning.pos || "noun",
        meaning_en: primaryMeaning.definitions?.[0]?.definition || primaryMeaning.definition || "",
        meaning_vn: data.meaning_vn || primaryMeaning.meaning_vn || "",
        example: primaryMeaning.definitions?.[0]?.example || primaryMeaning.example || "",
        level: data.cefr_level || "B1",
        source: "news_reading",
      };

      const res = await authFetch(`${API_URL}/student/vocabulary/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaved(true);
      }
    } catch (err) {
      console.error("Failed to save word:", err);
    } finally {
      setSaving(false);
    }
  };

  // Adjust popup position so it doesn't go off-screen
  const left = Math.min(Math.max(16, position.x - 140), window.innerWidth - 320);
  const top = position.y + 24;

  return (
    <div
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-80 max-w-[90vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">
            {word}
          </h4>
          <button
            onClick={() => playAudio(data?.audio_url)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-600 dark:text-indigo-400 transition"
            title="Nghe phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs">Đang tra từ...</span>
        </div>
      ) : data ? (
        <div className="space-y-3 text-sm">
          {(data.phonetic || data.phonetic_uk) && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
              /{data.phonetic || data.phonetic_uk}/
            </p>
          )}

          {data.meaning_vn && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-0.5">
                Nghĩa tiếng Việt:
              </span>
              <p className="text-gray-800 dark:text-gray-200 font-medium text-xs leading-relaxed">
                {data.meaning_vn}
              </p>
            </div>
          )}

          {data.meanings && data.meanings.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {data.meanings.slice(0, 2).map((m: any, idx: number) => {
                const def = m.definitions?.[0]?.definition || m.definition;
                return (
                  <div key={idx} className="text-xs">
                    <span className="italic font-semibold text-gray-500 mr-1">
                      ({m.partOfSpeech || m.pos || "def"})
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{def}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleSave}
              disabled={saved || saving}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                saved
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              }`}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Đã lưu vào sổ tay
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  Lưu vào sổ tay
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-gray-500">
          Không tìm thấy nghĩa cho từ này.
        </div>
      )}
    </div>
  );
}
