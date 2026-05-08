"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Flame, ChevronRight, X } from "lucide-react";
import { Button } from "./Button";
import { Progress } from "./Card";
import { Confetti } from "./Confetti";
import { useSound } from "./useSound";

/**
 * Shared quiz form for Practice / Grammar / Vocabulary / IPA.
 * Single question shape — feature-specific tabs adapt their data
 * into TestQuestion[] and let TestForm render + grade.
 *
 * Supports:
 *   - multiple choice (single answer)
 *   - free-text input (case/punctuation-insensitive match)
 *
 * Built-in: progress bar, hearts/lives, streak, sound + animation
 * feedback, end-of-test summary, confetti on completion.
 */

export type TestQuestion =
  | {
      id: string | number;
      type: "choice";
      prompt: React.ReactNode;
      hint?: React.ReactNode;
      choices: { id: string; label: React.ReactNode }[];
      answerId: string;
      explanation?: React.ReactNode;
    }
  | {
      id: string | number;
      type: "input";
      prompt: React.ReactNode;
      hint?: React.ReactNode;
      /** Accepted answers; comparison is case- and punctuation-insensitive. */
      answers: string[];
      placeholder?: string;
      explanation?: React.ReactNode;
    };

export interface TestSummary {
  total: number;
  correct: number;
  wrong: number;
  streakBest: number;
  durationMs: number;
}

interface TestFormProps {
  questions: TestQuestion[];
  title?: string;
  onClose?: () => void;
  onFinish?: (summary: TestSummary) => void;
  /** Lives. 0 = unlimited. Default 0. */
  hearts?: number;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"`()\[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

export function TestForm({
  questions,
  title = "Bài kiểm tra",
  onClose,
  onFinish,
  hearts = 0,
}: TestFormProps) {
  const sfx = useSound();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [livesLeft, setLivesLeft] = useState(hearts);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [shake, setShake] = useState(false);
  const [confettiTick, setConfettiTick] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const total = questions.length;
  const q = questions[idx];
  const progress = useMemo(
    () => (total === 0 ? 0 : ((idx + (submitted ? 1 : 0)) / total) * 100),
    [idx, submitted, total]
  );

  const grade = (): boolean => {
    if (!q) return false;
    if (q.type === "choice") return selected === q.answerId;
    return q.answers.some((a) => normalize(a) === normalize(textInput));
  };

  const handleSubmit = () => {
    if (!q || submitted) return;
    if (q.type === "choice" && !selected) return;
    if (q.type === "input" && !textInput.trim()) return;

    const ok = grade();
    setIsCorrect(ok);
    setSubmitted(true);

    if (ok) {
      sfx.correct();
      const ns = streak + 1;
      setStreak(ns);
      if (ns > streakBest) setStreakBest(ns);
      if (ns >= 3 && ns % 3 === 0) sfx.streak();
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      sfx.wrong();
      setStreak(0);
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      if (hearts > 0) setLivesLeft((h) => Math.max(0, h - 1));
    }
  };

  const handleNext = () => {
    if (!submitted) return;
    if (hearts > 0 && livesLeft <= 0) {
      finish();
      return;
    }
    if (idx + 1 >= total) {
      finish();
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setTextInput("");
    setSubmitted(false);
    setIsCorrect(false);
  };

  const finish = () => {
    setDone(true);
    sfx.finish();
    setConfettiTick((c) => c + 1);
    onFinish?.({
      total,
      correct: stats.correct + (submitted && isCorrect ? 0 : 0),
      wrong: stats.wrong,
      streakBest,
      durationMs: Date.now() - startedAt.current,
    });
  };

  // Keyboard shortcuts: Enter to submit/next, 1-9 to pick choice
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === "Enter") {
        if (submitted) handleNext();
        else handleSubmit();
        return;
      }
      if (q?.type === "choice" && !submitted) {
        const n = parseInt(e.key, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= q.choices.length) {
          setSelected(q.choices[n - 1].id);
          sfx.click();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, submitted, q, idx, sfx]);

  if (!q && !done) {
    return (
      <div className="p-10 text-center text-gray-500">Không có câu hỏi nào.</div>
    );
  }

  if (done) {
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
    return (
      <div className="relative max-w-xl mx-auto p-6">
        <Confetti trigger={confettiTick} />
        <div className="duo-card text-center animate-duo-pop">
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
            Hoàn thành!
          </h2>
          <p className="text-gray-500 mb-6">
            Bạn đã trả lời đúng {stats.correct}/{total} câu
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat label="Chính xác" value={`${accuracy}%`} tone="correct" />
            <Stat label="Streak tốt nhất" value={String(streakBest)} tone="streak" />
            <Stat
              label="Thời gian"
              value={`${Math.round((Date.now() - startedAt.current) / 1000)}s`}
              tone="info"
            />
          </div>
          <div className="flex gap-3 justify-center">
            <Button intent="ghost" onClick={onClose}>
              Đóng
            </Button>
            <Button
              intent="primary"
              onClick={() => {
                setIdx(0);
                setSelected(null);
                setTextInput("");
                setSubmitted(false);
                setIsCorrect(false);
                setStreak(0);
                setStats({ correct: 0, wrong: 0 });
                setLivesLeft(hearts);
                setDone(false);
                startedAt.current = Date.now();
              }}
            >
              Làm lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6">
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-4">
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition"
            aria-label="Đóng"
          >
            <X size={22} />
          </button>
        )}
        <Progress value={progress} className="flex-1" />
        {hearts > 0 && (
          <div className="flex items-center gap-1 text-red-500 font-bold">
            <Heart size={20} fill="currentColor" /> {livesLeft}
          </div>
        )}
        {streak >= 2 && (
          <div className="flex items-center gap-1 text-amber-500 font-bold animate-duo-pop">
            <Flame size={20} fill="currentColor" /> {streak}
          </div>
        )}
      </div>

      {/* Question */}
      <div
        className={`duo-card mb-4 ${shake ? "animate-duo-shake" : ""}`}
      >
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          Câu {idx + 1} / {total} — {title}
        </div>
        <div className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-1">
          {q.prompt}
        </div>
        {q.hint && (
          <div className="text-sm text-gray-500 mt-1">{q.hint}</div>
        )}
      </div>

      {/* Answer area */}
      {q.type === "choice" ? (
        <div className="space-y-3">
          {q.choices.map((c, i) => {
            const isSel = selected === c.id;
            const isAns = c.id === q.answerId;
            const showCorrect = submitted && isAns;
            const showWrong = submitted && isSel && !isAns;
            return (
              <button
                key={c.id}
                disabled={submitted}
                onClick={() => {
                  if (submitted) return;
                  setSelected(c.id);
                  sfx.click();
                }}
                className={[
                  "duo-choice",
                  isSel && !submitted ? "duo-choice--selected" : "",
                  showCorrect ? "duo-choice--correct" : "",
                  showWrong ? "duo-choice--wrong" : "",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg border-2 border-current text-xs font-extrabold">
                    {i + 1}
                  </span>
                  <span>{c.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <input
          autoFocus
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={submitted}
          placeholder={q.placeholder || "Nhập câu trả lời…"}
          className={[
            "w-full rounded-2xl border-2 px-5 py-4 text-lg font-semibold outline-none transition",
            submitted && isCorrect
              ? "border-green-400 bg-green-50 text-green-700"
              : submitted
              ? "border-red-400 bg-red-50 text-red-700"
              : "border-gray-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100",
          ].join(" ")}
        />
      )}

      {/* Feedback banner */}
      {submitted && (
        <div
          className={`mt-5 rounded-2xl border-2 p-4 animate-duo-pop ${
            isCorrect
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          <div
            className={`font-extrabold mb-1 ${
              isCorrect ? "text-green-700" : "text-red-700"
            }`}
          >
            {isCorrect ? "Chính xác! 🎉" : "Chưa đúng 😅"}
          </div>
          {!isCorrect && (
            <div className="text-sm text-gray-700">
              Đáp án đúng:{" "}
              <span className="font-bold">
                {q.type === "choice"
                  ? q.choices.find((c) => c.id === q.answerId)?.label
                  : q.answers[0]}
              </span>
            </div>
          )}
          {q.explanation && (
            <div className="text-sm text-gray-600 mt-1">{q.explanation}</div>
          )}
        </div>
      )}

      {/* Footer button */}
      <div className="mt-6 flex justify-end">
        {!submitted ? (
          <Button
            intent="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={
              q.type === "choice" ? !selected : !textInput.trim()
            }
          >
            Kiểm tra
          </Button>
        ) : (
          <Button
            intent={isCorrect ? "correct" : "info"}
            size="lg"
            onClick={handleNext}
            iconRight={<ChevronRight size={20} />}
          >
            {idx + 1 >= total ? "Hoàn thành" : "Câu tiếp"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "correct" | "streak" | "info";
}) {
  const cls =
    tone === "correct"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "streak"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-sky-50 text-sky-700 border-sky-200";
  return (
    <div className={`rounded-2xl border-2 p-3 ${cls}`}>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider opacity-80">
        {label}
      </div>
    </div>
  );
}
