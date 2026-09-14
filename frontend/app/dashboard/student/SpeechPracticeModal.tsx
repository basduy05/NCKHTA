"use client";
import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Volume2, X, Sparkles, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

interface SpeechPracticeModalProps {
  targetText: string;
  targetIpa?: string;
  API_URL: string;
  onClose: () => void;
}

export default function SpeechPracticeModal({
  targetText,
  targetIpa,
  API_URL,
  onClose,
}: SpeechPracticeModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<any>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const playTargetAudio = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(targetText);
      u.lang = "en-US";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  const startRecording = async () => {
    try {
      setResult(null);
      setAudioBlob(null);
      setRecordSeconds(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        await analyzeAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Vui lòng cấp quyền truy cập microphone trong trình duyệt để luyện phát âm.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const analyzeAudioBlob = async (blob: Blob) => {
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append("audio_file", blob, "recording.webm");
      formData.append("expected_text", targetText);

      const res = await fetch(`${API_URL}/speech/analyze`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (err) {
      console.error("Speech analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Luyện phát âm AI
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Phrase */}
        <div className="text-center p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-100">
              {targetText}
            </h2>
            <button
              onClick={playTargetAudio}
              className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:scale-105 transition text-indigo-600 dark:text-indigo-400"
              title="Nghe giọng mẫu"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          {targetIpa && (
            <p className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
              /{targetIpa}/
            </p>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 hover:bg-rose-700 transition animate-pulse"
            >
              <Square className="w-8 h-8" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={analyzing}
              className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition disabled:opacity-50"
            >
              <Mic className="w-9 h-9" />
            </button>
          )}

          <p className="text-xs font-semibold text-gray-500">
            {isRecording
              ? `Đang ghi âm (${recordSeconds}s)... Nhấn để hoàn tất`
              : analyzing
              ? "AI đang chấm điểm phát âm..."
              : "Nhấn vào micro và đọc to rõ ràng"}
          </p>
        </div>

        {/* Results */}
        {analyzing && (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-medium">Đang đối chiếu âm vị & chấm điểm...</span>
          </div>
        )}

        {result && !analyzing && (
          <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in">
            {/* Score & Feedback */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-xs text-gray-400 font-semibold block">Độ chính xác</span>
                <span
                  className={`text-3xl font-black ${
                    result.score >= 80
                      ? "text-emerald-600"
                      : result.score >= 60
                      ? "text-amber-500"
                      : "text-rose-600"
                  }`}
                >
                  {result.score}%
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 max-w-[240px] text-right font-medium leading-relaxed">
                {result.feedback}
              </p>
            </div>

            {/* Word by word breakdown */}
            {result.word_analysis && result.word_analysis.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-500 block">
                  Chi tiết từng từ:
                </span>
                <div className="flex flex-wrap gap-2">
                  {result.word_analysis.map((w: any, idx: number) => (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                        w.status === "correct"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                          : w.status === "near"
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300"
                      }`}
                    >
                      {w.status === "correct" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {w.status === "near" && <AlertTriangle className="w-3.5 h-3.5" />}
                      {w.status === "incorrect" && <XCircle className="w-3.5 h-3.5" />}
                      <span>{w.word}</span>
                      {w.spoken && w.spoken !== w.word && (
                        <span className="opacity-70 text-[10px]">({w.spoken})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
