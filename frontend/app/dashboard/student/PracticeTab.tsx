"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Award, Mic, Trophy, Sparkles, CheckCircle2, X, Layers, Bookmark, Volume2, Clock, History, Eye, ChevronRight, BarChart3, FileText, Headphones, PenTool, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { MOCK_PRACTICE_TESTS } from "../../components/MockPracticeData";

interface PracticeTabProps {
  API_URL: string;
  setShowCreditModal: (s: boolean) => void;
}

const TOEIC_PARTS = [
  { value: "", label: "Toàn bộ", icon: "📋" },
  { value: "Part 1", label: "Part 1 - Photographs", icon: "🖼️", type: "listening" },
  { value: "Part 2", label: "Part 2 - Q&A", icon: "❓", type: "listening" },
  { value: "Part 3", label: "Part 3 - Conversations", icon: "💬", type: "listening" },
  { value: "Part 4", label: "Part 4 - Talks", icon: "🎙️", type: "listening" },
  { value: "Part 5", label: "Part 5 - Incomplete Sentences", icon: "✏️", type: "reading" },
  { value: "Part 6", label: "Part 6 - Text Completion", icon: "📝", type: "reading" },
  { value: "Part 7", label: "Part 7 - Reading Comprehension", icon: "📖", type: "reading" },
];

export default function PracticeTab({ API_URL, setShowCreditModal }: PracticeTabProps) {
  const { user, authFetch, refreshUser } = useAuth();
  const { showAlert } = useNotification();
  const [testType, setTestType] = useState("TOEIC");
  const [skill, setSkill] = useState("reading");
  const [loading, setLoading] = useState(false);
  const [practice, setPractice] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [source, setSource] = useState<"ai" | "official">("ai");
  
  // TOEIC Part selector
  const [toeicPart, setToeicPart] = useState("");
  
  // Exam History
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reviewExam, setReviewExam] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Timer
  const [examStartTime, setExamStartTime] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  
  // Writing Tasks (IELTS Task 1/2)
  const [activeWritingTask, setActiveWritingTask] = useState(0);
  const [writingTexts, setWritingTexts] = useState<Record<number, string>>({});

  // Defensive rendering helpers to prevent "Objects are not valid as a React child"
  const renderValue = (val: any): React.ReactNode => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string" || typeof val === "number") return val;
    if (Array.isArray(val)) return val.map(v => renderValue(v)).join(", ");
    if (typeof val === "object") {
      return Object.entries(val)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${renderValue(v)}`)
        .join(" | ");
    }
    return String(val);
  };

  const stringifyValue = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return val.map((item) => stringifyValue(item)).filter(Boolean).join(", ");
    if (typeof val === "object") {
      const preferredKeys = [
        "text",
        "content",
        "value",
        "label",
        "name",
        "title",
        "prompt",
        "question",
        "transcript",
        "passage",
        "description",
        "meaning_vn",
        "meaning_en",
      ];
      for (const key of preferredKeys) {
        if (key in val) {
          const preferred = stringifyValue(val[key]);
          if (preferred) return preferred;
        }
      }
      return Object.entries(val)
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${stringifyValue(v)}`)
        .join(" | ");
    }
    return String(val);
  };

  const toStringArray = (val: any): string[] => {
    if (Array.isArray(val)) {
      return val.map((item) => stringifyValue(item).trim()).filter(Boolean);
    }
    const single = stringifyValue(val).trim();
    return single ? [single] : [];
  };

  const getOptionsArray = (q: any): any[] => {
    if (!q || !q.options) return [];
    if (Array.isArray(q.options)) return q.options;
    if (typeof q.options === 'object' && q.options !== null) {
      // Handle {A: "...", B: "..."} format
      return Object.values(q.options);
    }
    return [];
  };

  const normalizeQuestion = (question: any, index: number) => {
    if (!question || typeof question !== "object") return null;

    const optionSource =
      question.options ??
      question.choices ??
      question.answers ??
      question.selections ??
      question.answer_options ??
      question.answer_choices ??
      question.answerChoices ??
      question.candidates ??
      question.variants;

    let options: string[] = [];
    if (Array.isArray(optionSource)) {
      options = optionSource.map((item) => stringifyValue(item).trim()).filter(Boolean);
    } else if (optionSource && typeof optionSource === "object") {
      options = Object.entries(optionSource)
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .map(([, value]) => stringifyValue(value).trim())
        .filter(Boolean);
    }

    const correctSource =
      question.correct_answer ??
      question.correctAnswer ??
      question.correct_option ??
      question.correctOption ??
      question.correct_text ??
      question.correctText ??
      question.correct_choice ??
      question.correctChoice ??
      question.answer ??
      question.ans ??
      question.solution ??
      question.best_answer ??
      question.correct;

    let correctAnswer = correctSource;
    if (typeof correctSource === "number") {
      correctAnswer = correctSource;
    } else if (typeof correctSource === "string" && /^\d+$/.test(correctSource.trim())) {
      correctAnswer = Number.parseInt(correctSource.trim(), 10);
    } else {
      correctAnswer = stringifyValue(correctSource).trim();
    }

    const normalized = {
      ...question,
      number: Number(question.number ?? question.no ?? question.index ?? question.id) || index + 1,
      question: stringifyValue(
        question.question ??
        question.q ??
        question.prompt ??
        question.question_text ??
        question.text ??
        question.instruction ??
        question.stem ??
        question.query ??
        question.content ??
        question.ask ??
        question.sentence ??
        question.blank_sentence
      ).trim(),
      options,
      correct_answer: correctAnswer,
      type: stringifyValue(question.type ?? question.question_type ?? question.kind).trim(),
      explanation_vn: stringifyValue(
        question.explanation_vn ??
        question.explanation ??
        question.explanation_vi ??
        question.rationale_vn ??
        question.rationale ??
        question.feedback_vn ??
        question.feedback
      ).trim(),
    };

    if (!normalized.question && normalized.options.length === 0) return null;
    return normalized;
  };

  const normalizeEvaluationCriteria = (criteria: any) => {
    if (!Array.isArray(criteria)) return [];

    return criteria
      .map((item: any, index: number) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return {
            criterion: stringifyValue(item.criterion || item.name || item.title || item.aspect || `Criterion ${index + 1}`),
            description_vn: stringifyValue(
              item.description_vn ||
              item.description ||
              item.feedback_vn ||
              item.feedback ||
              item.detail ||
              item.notes ||
              item.criterion ||
              item.name ||
              item.title
            ),
          };
        }

        const text = stringifyValue(item).trim();
        if (!text) return null;
        return {
          criterion: `Criterion ${index + 1}`,
          description_vn: text,
        };
      })
      .filter(Boolean);
  };

  const normalizeUsefulVocabulary = (items: any) => {
    if (!Array.isArray(items)) return [];

    return items
      .map((item: any) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return {
            ...item,
            phrase: stringifyValue(item.phrase || item.word || item.term || item.vocabulary || item.text).trim(),
            meaning_vn: stringifyValue(item.meaning_vn || item.meaning || item.definition_vn || item.translation).trim(),
          };
        }

        const phrase = stringifyValue(item).trim();
        return phrase ? { phrase, meaning_vn: "" } : null;
      })
      .filter((item: any) => item?.phrase);
  };

  const extractPracticeQuestionData = (payload: any) => {
    const sectionPassages: string[] = [];
    const sectionInstructions: string[] = [];
    const rawQuestions: any[] = [];

    const addUniqueText = (bucket: string[], value: any) => {
      const text = stringifyValue(value).trim();
      if (text && !bucket.includes(text)) bucket.push(text);
    };

    const collectQuestions = (entry: any, meta?: { passage?: string; instructions?: string }) => {
      if (!entry) return;

      if (Array.isArray(entry)) {
        entry.forEach((item) => collectQuestions(item, meta));
        return;
      }

      if (typeof entry !== "object") return;

      const nestedQuestions = Array.isArray(entry.questions)
        ? entry.questions
        : Array.isArray(entry.items)
        ? entry.items
        : Array.isArray(entry.exercises)
        ? entry.exercises
        : Array.isArray(entry.quiz)
        ? entry.quiz
        : Array.isArray(entry.sub_questions)
        ? entry.sub_questions
        : Array.isArray(entry.question_groups)
        ? entry.question_groups
        : Array.isArray(entry.questionGroups)
        ? entry.questionGroups
        : [];

      const entryPassage = stringifyValue(
        entry.passage ??
        entry.transcript ??
        entry.text ??
        entry.article ??
        entry.content ??
        entry.prompt
      ).trim();
      const entryInstructions = stringifyValue(
        entry.instructions ??
        entry.description ??
        entry.intro ??
        entry.note
      ).trim();

      const nextMeta = {
        passage: entryPassage || meta?.passage || "",
        instructions: entryInstructions || meta?.instructions || "",
      };

      if (entryPassage) addUniqueText(sectionPassages, entryPassage);
      if (entryInstructions) addUniqueText(sectionInstructions, entryInstructions);

      if (nestedQuestions.length) {
        nestedQuestions.forEach((item: any) => collectQuestions(item, nextMeta));
        return;
      }

      const looksLikeQuestion =
        "question" in entry ||
        "q" in entry ||
        "prompt" in entry ||
        "question_text" in entry ||
        "text" in entry ||
        "instruction" in entry ||
        "stem" in entry ||
        "options" in entry ||
        "choices" in entry ||
        "answers" in entry ||
        "answer_choices" in entry ||
        "answerChoices" in entry ||
        "candidates" in entry ||
        "sentence" in entry ||
        "blank_sentence" in entry ||
        "variants" in entry;

      if (!looksLikeQuestion) return;

      rawQuestions.push({
        ...entry,
        passage: entry.passage ?? nextMeta.passage,
        instructions: entry.instructions ?? nextMeta.instructions,
      });
    };

    [
      payload.questions,
      payload.quiz,
      payload.items,
      payload.exercises,
      payload.sections,
      payload.question_groups,
      payload.questionGroups,
      payload.parts,
    ].forEach((source) => collectQuestions(source));

    return {
      rawQuestions,
      sectionPassages,
      sectionInstructions,
    };
  };

  const normalizePracticePayload = (payload: any) => {
    if (!payload || typeof payload !== "object") return payload;

    const effectiveSkill = String(payload.skill || skill || "").toLowerCase();
    const effectiveTestType = stringifyValue(payload.test_type || testType).trim() || testType;

    if (effectiveSkill !== "writing") {
      const { rawQuestions, sectionPassages, sectionInstructions } = extractPracticeQuestionData(payload);

      const normalizedQuestions = rawQuestions
        .map((question: any, index: number) => normalizeQuestion(question, index))
        .filter(Boolean);

      const fallbackPassage = sectionPassages.join("\n\n").trim();
      const fallbackInstructions = sectionInstructions.join(" ").trim();

      const normalized = {
        ...payload,
        test_type: effectiveTestType,
        skill: effectiveSkill || skill,
        title: stringifyValue(
          payload.title ||
          payload.topic ||
          payload.section_title ||
          payload.part ||
          `${effectiveTestType} ${effectiveSkill || skill} Practice`
        ).trim(),
        part: stringifyValue(payload.part || toeicPart || "").trim(),
        passage: stringifyValue(
          payload.passage ??
          payload.transcript ??
          payload.text ??
          payload.article ??
          payload.topic ??
          payload.prompt ??
          fallbackPassage
        ).trim(),
        instructions: stringifyValue(payload.instructions ?? payload.description ?? payload.intro ?? fallbackInstructions).trim(),
        tips_vn: toStringArray(payload.tips_vn ?? payload.tips ?? payload.exam_tips),
        questions: normalizedQuestions,
        sub_questions: toStringArray(payload.sub_questions ?? payload.prompts ?? payload.follow_up_questions),
        prompts: toStringArray(payload.prompts ?? payload.sub_questions ?? payload.follow_up_questions),
        useful_vocabulary: normalizeUsefulVocabulary(payload.useful_vocabulary ?? payload.vocabulary ?? payload.key_vocabulary),
        evaluation_criteria: normalizeEvaluationCriteria(payload.evaluation_criteria ?? payload.scoring_criteria),
        model_answer: stringifyValue(payload.model_answer ?? payload.sample_answer ?? payload.reference_answer).trim(),
        topic: stringifyValue(payload.topic ?? payload.passage ?? payload.prompt ?? payload.title).trim(),
        description: stringifyValue(payload.description ?? payload.instructions ?? payload.part).trim(),
      };

      if (effectiveSkill === "speaking") {
        return {
          ...normalized,
          topic: normalized.topic || normalized.title,
          passage: normalized.passage || normalized.topic,
          description: normalized.description || normalized.instructions || `${effectiveTestType} speaking practice`,
          sub_questions: normalized.sub_questions.length
            ? normalized.sub_questions
            : normalizedQuestions.map((question: any) => question.question).filter(Boolean),
        };
      }

      return normalized;
    }

    const writingTasks = Array.isArray(payload.writing_tasks)
      ? payload.writing_tasks
          .filter((task: any) => task && typeof task === "object")
          .map((task: any, index: number) => {
            const scoringCriteria = Array.isArray(task.scoring_criteria)
              ? task.scoring_criteria.filter(Boolean)
              : task.scoring_criteria
              ? [task.scoring_criteria]
              : [];

            return {
              ...task,
              task_number: Number(task.task_number) || index + 1,
              title:
                typeof task.title === "string" && task.title.trim()
                  ? task.title.trim()
                  : `Task ${index + 1}`,
              prompt: typeof task.prompt === "string" ? task.prompt.trim() : "",
              time_limit_minutes: Number(task.time_limit_minutes) || (index === 0 ? 20 : 40),
              min_words: Number(task.min_words) || (index === 0 ? 150 : 250),
              scoring_criteria: scoringCriteria,
            };
          })
          .filter((task: any) => task.prompt)
      : [];

    if (!writingTasks.length) return payload;

    const firstTask = writingTasks[0];
    const payloadCriteria = Array.isArray(payload.scoring_criteria) ? payload.scoring_criteria.filter(Boolean) : [];

    return {
      ...payload,
      title: payload.title || `${payload.test_type || testType} Writing Practice`,
      part: payload.part || firstTask.title || "essay",
      prompt:
        typeof payload.prompt === "string" && payload.prompt.trim()
          ? payload.prompt.trim()
          : firstTask.prompt,
      passage:
        typeof payload.passage === "string" && payload.passage.trim()
          ? payload.passage.trim()
          : firstTask.prompt,
      scoring_criteria: payloadCriteria.length ? payloadCriteria : firstTask.scoring_criteria,
      writing_tasks: writingTasks,
    };
  };

  // --- STATES FOR FULL SKILLS ---
  const [writingText, setWritingText] = useState("");
  const [evalResult, setEvalResult] = useState<any>(null);
  const [speakingStage, setSpeakingStage] = useState<"idle" | "prep" | "speaking" | "result">("idle");
  const [timer, setTimer] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const writingTasks = Array.isArray(practice?.writing_tasks) ? practice.writing_tasks : [];
  const currentWritingTask = writingTasks[activeWritingTask] || null;
  const currentWritingPrompt = currentWritingTask?.prompt || practice?.prompt || practice?.passage || "";
  const currentWritingCriteria =
    Array.isArray(currentWritingTask?.scoring_criteria) && currentWritingTask.scoring_criteria.length
      ? currentWritingTask.scoring_criteria
      : Array.isArray(practice?.scoring_criteria)
      ? practice.scoring_criteria
      : [];
  const currentWritingText = writingTasks.length ? (writingTexts[activeWritingTask] ?? writingText) : writingText;
  const currentWritingWordCount = currentWritingText.trim() ? currentWritingText.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!writingTasks.length && activeWritingTask !== 0) {
      setActiveWritingTask(0);
      return;
    }
    if (writingTasks.length && activeWritingTask > writingTasks.length - 1) {
      setActiveWritingTask(0);
    }
  }, [writingTasks.length, activeWritingTask]);

  useEffect(() => {
    if (skill !== "writing" || !writingTasks.length) return;
    const nextText = writingTexts[activeWritingTask] ?? "";
    if (nextText !== writingText) {
      setWritingText(nextText);
    }
  }, [skill, writingTasks.length, activeWritingTask, writingTexts, writingText]);

  // --- EXAM HISTORY ---
  const fetchExamHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await authFetch(`${API_URL}/student/exams`);
      if (res.ok) setExamHistory(await res.json());
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }, [authFetch, API_URL]);

  useEffect(() => { fetchExamHistory(); }, [fetchExamHistory]);

  const loadExamReview = async (examId: number) => {
    try {
      const res = await authFetch(`${API_URL}/student/exams/${examId}`);
      if (res.ok) {
        const data = await res.json();
        setReviewExam(data);
        setShowHistory(false);
      }
    } catch (e) { console.error(e); }
  };

  const saveExam = async (examData: any, userAnswers: any, sc: number, maxSc: number, fb?: any) => {
    try {
      const timeSpent = examStartTime ? Math.floor((Date.now() - examStartTime) / 1000) : 0;
      await authFetch(`${API_URL}/student/exams/save`, {
        method: "POST",
        body: JSON.stringify({
          test_type: testType, title: examData?.title || `${testType} ${skill}`,
          exam_data: examData, score: sc, max_score: maxSc, completed: true,
          user_answers: userAnswers, feedback: fb || null, skill, time_spent: timeSpent,
        })
      });
      refreshUser();
      fetchExamHistory();
    } catch (e) { console.error("Save exam error:", e); }
  };


  const generatePractice = async () => {
    if (source === "official") {
      const baseMatches = MOCK_PRACTICE_TESTS.filter((t: any) => t.test_type === testType && t.skill === skill);
      const toeicPartMatches =
        testType === "TOEIC" && toeicPart
          ? baseMatches.filter((t: any) => stringifyValue(t.part || t.title).toLowerCase().includes(toeicPart.toLowerCase()))
          : baseMatches;
      const selectedMock = testType === "TOEIC" && toeicPart ? toeicPartMatches[0] : baseMatches[0];

      if (selectedMock) {
        setPractice(normalizePracticePayload(selectedMock));
        setAnswers({});
        setSubmitted(false);
        setScore(0);
      } else {
        showAlert("Hiện chưa có bài thi mẫu cho sự kết hợp này. Vui lòng thử AI Generator.", 'warning');
      }
      return;
    }

    if (user && user.credits_ai !== undefined && user.credits_ai <= 0) {
      setShowCreditModal(true);
      return;
    }

    setLoading(true);
    setPractice({ status: "generating", questions: [] });
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setEvalResult(null);
    setWritingText("");
    setWritingTexts({});
    setActiveWritingTask(0);
    setSpeakingStage("idle");
    setTimer(0);
    setPointsEarned(0);
    setReviewExam(null);
    setExamStartTime(Date.now());

    try {
      // Always use practice/generate for TOEIC/IELTS
      const finalEndpoint = "/student/practice/generate";

      const bodyPayload: any = { test_type: testType, skill };
      if (testType === "TOEIC" && toeicPart) bodyPayload.part = toeicPart;

      const res = await authFetch(`${API_URL}${finalEndpoint}`, {
        method: "POST",
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        let detail = "";
        try {
          const responseText = await res.text();
          detail = responseText;
          try {
            const parsed = JSON.parse(responseText);
            detail = parsed?.detail || parsed?.error || responseText;
          } catch {}
        } catch {}

        if (res.status === 504) throw new Error("PRACTICE_TIMEOUT");
        if (res.status === 502 || res.status === 503) throw new Error("AI_UNAVAILABLE");
        if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
        throw new Error(detail || `REQUEST_FAILED_${res.status}`);
      }

      const jsonData = await res.json();
      refreshUser();

      const normalizedPractice = normalizePracticePayload(jsonData);
      const requiresQuestions = skill === "reading" || skill === "listening" || (testType === "TOEIC" && !!toeicPart);

      if (requiresQuestions && (!normalizedPractice?.questions || normalizedPractice.questions.length === 0)) {
        throw new Error("INVALID_PRACTICE_PAYLOAD");
      }

      setPractice(normalizedPractice);
    } catch (e: any) {
      const message =
        e?.message === "PRACTICE_TIMEOUT"
          ? "Tao de AI bi timeout. Thu lai sau it phut hoac chon dang de nhe hon."
          : e?.message === "AI_UNAVAILABLE"
          ? "Dich vu AI tam thoi khong san sang. Thu lai sau."
          : e?.message === "INSUFFICIENT_CREDITS"
          ? "Ban khong du AI credits de tao bai luyen tap."
          : e?.message === "INVALID_PRACTICE_PAYLOAD"
          ? "AI tra ve de thi chua dung dinh dang cho giao dien hien tai. Thu tao lai de khac."
          : "Loi khi tao bai luyen tap";
      showAlert(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWritingSubmit = async () => {
    const textToEvaluate = currentWritingText.trim();
    const wordCount = textToEvaluate ? textToEvaluate.split(/\s+/).length : 0;

    if (wordCount < 50) {
      showAlert("Bai viet qua ngan. Vui long viet it nhat 50 tu.", 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/student/writing/evaluate`, {
        method: "POST",
        body: JSON.stringify({
          text: textToEvaluate,
          task_type: currentWritingTask?.title || practice?.part || "essay",
          target_test: testType,
        })
      });

      if (!res.ok) {
        let detail = "";
        try {
          const responseText = await res.text();
          detail = responseText;
          try {
            const parsed = JSON.parse(responseText);
            detail = parsed?.detail || parsed?.error || responseText;
          } catch {}
        } catch {}

        if (res.status === 504) throw new Error("WRITING_TIMEOUT");
        if (res.status === 502 || res.status === 503) throw new Error("AI_UNAVAILABLE");
        if (res.status === 402) {
          setShowCreditModal(true);
          throw new Error("INSUFFICIENT_CREDITS");
        }
        throw new Error(detail || `WRITING_EVAL_FAILED_${res.status}`);
      }

      const evalData = await res.json();
      if (!evalData || typeof evalData !== "object" || evalData.error) {
        throw new Error(evalData?.detail || evalData?.error || "WRITING_EVAL_FAILED");
      }

      setEvalResult(evalData);
      setSubmitted(true);

      const numericBand = Number.parseFloat(String(evalData.overall_band || 0)) || 0;
      const pts = Math.round((numericBand / 9) * 100);
      setPointsEarned(pts);

      const savedWritingTexts = writingTasks.length
        ? { ...writingTexts, [activeWritingTask]: textToEvaluate }
        : { 0: textToEvaluate };

      await saveExam(
        practice,
        {
          writing_text: textToEvaluate,
          writing_texts: savedWritingTexts,
          active_task: currentWritingTask?.task_number || 1,
          prompt: currentWritingPrompt,
        },
        Math.round(numericBand * 10),
        90,
        evalData
      );
    } catch (e: any) {
      const message =
        e?.message === "WRITING_TIMEOUT"
          ? "Cham bai AI bi timeout. Thu lai sau it phut."
          : e?.message === "AI_UNAVAILABLE"
          ? "Dich vu cham bai tam thoi khong san sang. Thu lai sau."
          : e?.message === "INSUFFICIENT_CREDITS"
          ? "Ban khong du AI credits de cham bai viet."
          : "Loi khi cham diem bai viet";
      showAlert(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitWriting = async () => {
    return handleWritingSubmit();
  };

  // Timer logic for Speaking
  React.useEffect(() => {
    let interval: any;
    if (timer > 0) {
        interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0 && speakingStage === "prep") {
        setSpeakingStage("speaking");
        setTimer(60); // 1 minute to speak
    } else if (timer === 0 && speakingStage === "speaking") {
        setSpeakingStage("result");
    }
    return () => clearInterval(interval);
  }, [timer, speakingStage]);

  const isCorrectAnswer = (q: any, selectedIdx: number | undefined | null) => {
    if (selectedIdx === undefined || selectedIdx === null) return false;
    const selectedText = q.options?.[selectedIdx];
    const correctVal = q.correct_answer ?? q.ans ?? q.answer;
    
    // 1. Check by index directly
    if (selectedIdx === correctVal) return true;
    
    // 2. Check by text match (case-insensitive)
    if (selectedText && correctVal) {
        const s1 = String(selectedText).toLowerCase().trim();
        const s2 = String(correctVal).toLowerCase().trim();
        if (s1 === s2) return true;
    }
    
    // 3. Check by letter (A, B, C, D)
    const letter = String.fromCharCode(65 + selectedIdx);
    if (correctVal && String(correctVal).toUpperCase() === letter) return true;
    
    return false;
  };

  const submitAnswers = async () => {
    if (Object.keys(answers).length === 0) {
      showAlert("Vui lòng trả lời ít nhất một câu hỏi!", 'warning');
      return;
    }
    let correct = 0;
    const totalQ = practice.questions?.length || 1;
    practice.questions?.forEach((q: any, idx: number) => {
      if (isCorrectAnswer(q, answers[idx])) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    const pts = Math.round((correct / totalQ) * 100);
    setPointsEarned(pts);
    await saveExam(practice, answers, correct, totalQ);
  };

  return (
    <div className="space-y-6">
      {/* ── REVIEW MODE ──────────────────── */}
      {reviewExam ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-3xl p-8 text-white flex items-center justify-between shadow-xl shadow-indigo-200">
            <div className="flex items-center gap-5">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md"><Eye size={28} /></div>
              <div>
                <h3 className="font-black text-2xl tracking-tight">Xem lại bài thi</h3>
                <p className="text-white/80 font-bold uppercase text-xs tracking-widest mt-1">
                  {renderValue(reviewExam.title)} • {renderValue(reviewExam.test_type)} {renderValue(reviewExam.skill)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
               <div className="text-right">
                  <p className="text-xs font-black uppercase text-white/60 tracking-widest">Điểm số</p>
                  <p className="text-2xl font-black">{renderValue(reviewExam.score)}/{renderValue(reviewExam.max_score)}</p>
               </div>
               <button onClick={() => setReviewExam(null)} className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-2xl font-black text-sm transition shadow-lg">✕ THOÁT</button>
            </div>
          </div>
          
          {reviewExam.exam_data?.passage && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm whitespace-pre-wrap leading-relaxed text-gray-700">
              <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-blue-500" /> Bài đọc / Transcript
              </h4>
              <div className="text-lg text-slate-600">{renderValue(reviewExam.exam_data.passage)}</div>
            </div>
          )}
          
          <div className="space-y-6">
            {reviewExam.exam_data?.questions?.map((q: any, idx: number) => {
              const userAns = reviewExam.user_answers?.[idx];
              const isCorrect = isCorrectAnswer(q, userAns);
              const options = getOptionsArray(q);
              return (
                <div key={idx} className={`rounded-[2rem] p-8 border-2 transition-all ${isCorrect ? 'border-green-100 bg-green-50/20' : 'border-red-100 bg-red-50/20'}`}>
                  <p className="font-black text-lg mb-6 text-slate-800 flex items-start gap-4">
                    <span className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{idx + 1}</span>
                    {renderValue(q.question || q.q)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {options.map((opt: any, oIdx: number) => {
                      const isOptCorrect = isCorrectAnswer(q, oIdx);
                      const isUserChoice = userAns === oIdx;
                      return (
                        <div key={oIdx} className={`p-4 rounded-2xl border-2 text-sm font-bold flex items-center gap-3 transition-all ${isOptCorrect ? 'border-green-500 bg-white text-green-700 shadow-md shadow-green-100' : isUserChoice ? 'border-red-500 bg-white text-red-700 shadow-md shadow-red-100' : 'border-gray-50 bg-gray-50/50 text-slate-500'}`}>
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${isOptCorrect ? 'bg-green-500 text-white' : isUserChoice ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-slate-400'}`}>{String.fromCharCode(65 + oIdx)}</span>
                          {renderValue(opt)}
                          {isOptCorrect && <CheckCircle2 size={18} className="ml-auto text-green-500" />}
                          {isUserChoice && !isOptCorrect && <X size={18} className="ml-auto text-red-500" />}
                        </div>
                      );
                    })}
                  </div>
                  {(q.explanation_vn || q.explanation) && <div className="text-sm font-medium text-blue-700 bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex gap-3 italic">
                    <Sparkles size={18} className="shrink-0 text-blue-500" />
                    {renderValue(q.explanation_vn || q.explanation)}
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[2.5rem] p-10 border border-indigo-50 shadow-2xl shadow-indigo-500/5 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Award className="text-white" size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Trung tâm luyện thi</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Nâng cấp kỹ năng • Chinh phục mục tiêu</p>
                  </div>
                </div>
                <button onClick={() => { setShowHistory(!showHistory); setPractice(null); }} className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all border-2 ${showHistory ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-100'}`}>
                  <History size={18} /> {showHistory ? "QUAY LẠI" : "LỊCH SỬ"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4 grid grid-cols-2 gap-2">
                    <div className="relative">
                      <p className="absolute -top-2.5 left-4 px-2 bg-white text-[10px] font-black text-indigo-400 uppercase tracking-widest z-20">Chứng chỉ</p>
                      <select value={testType} onChange={e => { setTestType(e.target.value); setToeicPart(""); }} className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 outline-none text-slate-900 font-black text-sm appearance-none focus:border-indigo-300 transition-all">
                        <option value="TOEIC text-slate-900">🎯 TOEIC</option>
                        <option value="IELTS">📘 IELTS</option>
                        <option value="GENERAL">🌍 Giao tiếp</option>
                      </select>
                    </div>
                    <div className="relative">
                      <p className="absolute -top-2.5 left-4 px-2 bg-white text-[10px] font-black text-blue-400 uppercase tracking-widest z-20">Nguồn đề</p>
                      <select value={source} onChange={e => setSource(e.target.value as any)} className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 outline-none text-slate-900 font-black text-sm appearance-none focus:border-blue-300 transition-all">
                        <option value="ai">AI Gen ✨</option>
                        <option value="official">Mock DB 📚</option>
                      </select>
                    </div>
                </div>

                <div className="md:col-span-6">
                  {testType === "TOEIC" ? (
                     <div className="bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100 flex gap-2">
                        <p className="hidden md:flex items-center px-4 font-black text-[10px] text-indigo-400 uppercase tracking-widest border-r border-indigo-100 mr-2">TOEIC PARTS</p>
                        <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                            {TOEIC_PARTS.slice(1).map(p => (
                              <button key={p.value} onClick={() => { setToeicPart(p.value); setSkill(p.type || 'reading'); }} className={`shrink-0 h-10 px-4 rounded-xl text-[10px] font-black transition-all ${toeicPart === p.value ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105' : 'bg-white text-indigo-400 border border-indigo-100 hover:bg-indigo-50'}`}>
                                 {p.value}
                              </button>
                            ))}
                        </div>
                     </div>
                  ) : (
                    <div className="flex gap-2">
                      {[
                        { val: "reading", label: "Reading", icon: <FileText size={18} /> },
                        { val: "listening", label: "Listening", icon: <Headphones size={18} /> },
                        { val: "writing", label: "Writing", icon: <PenTool size={18} /> },
                        { val: "speaking", label: "Speaking", icon: <Mic size={18} /> },
                      ].map(s => (
                        <button key={s.val} onClick={() => setSkill(s.val)} className={`flex-1 h-14 flex flex-col items-center justify-center rounded-2xl border-2 transition-all ${skill === s.val ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-indigo-200'}`}>
                          {s.icon} <span className="text-[10px] font-black uppercase mt-1 leading-none">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                   <button onClick={generatePractice} disabled={loading} className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl disabled:opacity-50 font-black shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-sm tracking-widest">
                      {loading ? "ĐANG TẠO..." : "🚀 BẮT ĐẦU"}
                   </button>
                </div>
              </div>

              {testType === "TOEIC" && (
                <div className="mt-4 flex flex-wrap gap-3 items-center">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mr-2">Hoặc kỹ năng riêng:</p>
                   {['writing', 'speaking'].map(s => (
                     <button key={s} onClick={() => { setSkill(s); setToeicPart(""); }} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${toeicPart === "" && skill === s ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-white hover:border-indigo-100'}`}>
                        TOEIC {s}
                     </button>
                   ))}
                </div>
              )}
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
          </div>

      {/* ── EXAM HISTORY PANEL (LIGHT) ───── */}
      {showHistory && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-black text-xl text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><History size={20} /></div>
              Lịch sử làm bài ({examHistory.length})
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
               <span>TOP 50 GẦN NHẤT</span>
            </div>
          </div>
          {historyLoading ? (
            <div className="p-20 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div><p className="text-slate-400 font-bold text-xs mt-4 tracking-widest">ĐANG TẢI DỮ LIỆU...</p></div>
          ) : examHistory.length === 0 ? (
            <div className="p-20 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-5 text-slate-200"><History size={40} /></div>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Chưa có bài thi nào</p>
               <button onClick={() => setShowHistory(false)} className="mt-6 text-indigo-600 font-black text-xs hover:underline">LUYỆN TẬP NGAY →</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {examHistory.map((exam: any) => (
                <div key={exam.id} className="p-6 hover:bg-slate-50/50 transition flex items-center justify-between group cursor-pointer" onClick={() => loadExamReview(exam.id)}>
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110 ${exam.score >= exam.max_score * 0.8 ? 'bg-green-100 text-green-700' : exam.score >= exam.max_score * 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      <span className="text-[10px] leading-none mb-1 uppercase opacity-60">SCORE</span>
                      {exam.max_score > 0 ? Math.round((exam.score / exam.max_score) * 100) : 0}%
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-lg leading-tight mb-1">{renderValue(exam.title || `${exam.test_type} ${exam.skill || ''}`)}</p>
                      <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">{exam.test_type}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12} /> {new Date(exam.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions</p>
                       <p className="text-sm font-black text-slate-700">{exam.score}/{exam.max_score}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                       <ChevronRight size={20} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="relative">
             <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-100 border-t-indigo-600 shadow-xl shadow-indigo-100"></div>
             <Sparkles className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={32} />
          </div>
          <div className="text-center">
            <p className="text-slate-900 font-black text-xl mb-1 tracking-tight">AI đang chuẩn bị đề thi...</p>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Vui lòng đợi trong giây lát</p>
          </div>
        </div>
      )}


      {practice && (skill === "reading" || skill === "listening" || (testType === "TOEIC" && toeicPart)) && !loading && !submitted && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-indigo-50 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
          <div className="p-10 border-b border-indigo-50 bg-indigo-50/20">
             <div className="flex items-center gap-4 mb-4">
                <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest leading-none">{testType} {toeicPart || skill}</div>
                <div className="text-slate-400 font-bold text-xs flex items-center gap-1"><Clock size={14} /> {practice.questions?.length || 0} Questions</div>
             </div>
             <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{renderValue(practice.title || "Luyện tập tổng hợp")}</h3>
          </div>

             {practice.instructions && (
               <p className="px-10 pt-4 text-sm font-bold text-slate-500 leading-relaxed max-w-4xl">{renderValue(practice.instructions)}</p>
             )}

          <div className="p-10">
            {practice.passage && (
              <div className="bg-slate-50/50 p-8 rounded-[2rem] mb-10 border border-slate-100 whitespace-pre-wrap leading-relaxed text-slate-700 text-lg shadow-inner">
                <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                  <FileText size={18} className="text-indigo-500" /> Nội dung bài đọc / Transcript:
                </h4>
                {renderValue(practice.passage)}
              </div>
            )}

            {practice.tips_vn?.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2">
                {practice.tips_vn.map((tip: string, index: number) => (
                  <span key={index} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">
                    {renderValue(tip)}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-8">
              {practice.questions?.map((q: any, idx: number) => {
                const options = getOptionsArray(q);
                return (
                  <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-8 hover:border-indigo-200 transition-all group">
                    <p className="font-black text-xl mb-6 text-slate-800 flex items-start gap-4">
                      <span className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">{idx + 1}</span>
                      {renderValue(q.question || q.q)}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-14">
                      {options.map((opt: any, oIdx: number) => (
                        <label key={oIdx} className={`relative flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${answers[idx] === oIdx ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 bg-slate-50/30 hover:border-indigo-100 hover:bg-white'}`}>
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            checked={answers[idx] === oIdx}
                            onChange={() => setAnswers({...answers, [idx]: oIdx})}
                            className="hidden"
                          />
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${answers[idx] === oIdx ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <span className={`text-sm font-bold ${answers[idx] === oIdx ? 'text-indigo-900' : 'text-slate-500'}`}>{renderValue(opt)}</span>
                          {answers[idx] === oIdx && <div className="ml-auto w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200"></div>}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {!submitted && (
                <div className="pt-10 flex justify-center">
                  <button onClick={submitAnswers} className="bg-slate-900 text-white py-6 px-16 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all">NỘP BÀI ✨</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {practice && skill === "speaking" && !loading && !submitted && (
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-purple-500/5 border border-purple-50 p-12 text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex p-6 bg-purple-50 text-purple-600 rounded-[2rem] mb-8 shadow-inner border border-purple-100">
                <Mic size={56} className={speakingStage === "speaking" ? "animate-pulse" : ""} />
            </div>
            <h3 className="font-black text-4xl mb-4 text-slate-900 tracking-tight">{renderValue(practice.topic || practice.passage || practice.title)}</h3>
            <p className="text-slate-400 mb-12 text-xl font-medium leading-relaxed max-w-2xl mx-auto">{renderValue(practice.description || practice.instructions || practice.part)}</p>

            {speakingStage === "idle" && (
                <button 
                  onClick={() => { setSpeakingStage("prep"); setTimer(60); }}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-16 py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                    BẮT ĐẦU CHUẨN BỊ (60s)
                </button>
            )}

            {(speakingStage === "prep" || speakingStage === "speaking") && (
                <div className="space-y-10 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center">
                        <div className={`text-8xl font-black mb-4 ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                        </div>
                        <div className="px-6 py-2 bg-slate-100 rounded-full text-xs font-black uppercase tracking-widest text-slate-400">
                            {speakingStage === "prep" ? "Thời gian chuẩn bị" : "BẮT ĐẦU NÓI..."}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
                            <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-widest">
                                <Sparkles size={18} className="text-amber-500" /> Gợi ý triển khai:
                            </h4>
                            <ul className="space-y-4">
                                {(practice.sub_questions || practice.prompts)?.map((p: string, i: number) => (
                                    <li key={i} className="flex items-start gap-4 text-slate-600 font-bold text-sm leading-relaxed">
                                        <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 shrink-0 shadow-sm" />
                                        {renderValue(p)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100">
                            <h4 className="font-black text-indigo-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-widest">
                                <Bookmark size={18} className="text-indigo-500" /> Từ vựng nên dùng:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {practice.useful_vocabulary?.map((v: any, i: number) => (
                                    <div key={i} className="group relative">
                                      <span className="px-4 py-2.5 bg-white border border-indigo-100 rounded-2xl text-[11px] font-black text-indigo-700 shadow-sm hover:bg-indigo-600 hover:text-white transition-all pointer-default">
                                          {renderValue(v.phrase || v)}
                                      </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {speakingStage === "result" && (
                <div className="space-y-10 animate-in fade-in duration-500 text-left">
                    <div className="bg-green-50/50 p-10 rounded-[3rem] border border-green-100 relative overflow-hidden">
                        <h4 className="font-black text-green-800 mb-6 flex items-center gap-3 text-xs uppercase tracking-widest">
                            <CheckCircle2 size={24} /> Bài mẫu tham khảo:
                        </h4>
                        <p className="text-green-900 leading-relaxed italic text-xl font-medium relative z-10">&ldquo;{renderValue(practice.model_answer)}&rdquo;</p>
                        <Sparkles className="absolute -right-10 -bottom-10 text-green-100 w-48 h-48 opacity-50" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-widest text-amber-500">Lời khuyên từ AI</h4>
                            <ul className="space-y-4">
                                {practice.tips_vn?.map((tip: string, i: number) => (
                                    <li key={i} className="flex items-start gap-4 text-sm text-slate-600 font-bold leading-relaxed">
                                        <span className="text-amber-500 text-xl shrink-0">💡</span> {renderValue(tip)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                             <h4 className="font-black text-slate-900 mb-6 flex items-center gap-3 text-xs uppercase tracking-widest text-blue-500">Tiêu chí đánh giá</h4>
                             <div className="space-y-5">
                                {practice.evaluation_criteria?.map((c: any, i: number) => (
                                    <div key={i} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                        <p className="font-black text-[10px] text-indigo-600 uppercase tracking-widest leading-none mb-2">{renderValue(c.criterion)}</p>
                                        <p className="text-sm text-slate-500 font-bold">{renderValue(c.description_vn)}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
          <Sparkles className="absolute -right-12 -top-12 text-purple-50 w-64 h-64" />
        </div>
      )}

      {practice && skill === "writing" && !loading && !submitted && (
        <div className="bg-white rounded-[3rem] shadow-2xl border border-blue-50 p-12 max-w-5xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><PenTool size={32} /></div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{renderValue(practice.title || "Luyện viết cùng AI")}</h3>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">{testType} Writing Section</p>
            </div>
          </div>
          
          {writingTasks.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {writingTasks.map((task: any, index: number) => {
                const isActive = activeWritingTask === index;
                return (
                  <button
                    key={`${task.task_number}-${index}`}
                    type="button"
                    onClick={() => setActiveWritingTask(index)}
                    className={`text-left rounded-[2rem] border-2 p-5 transition-all ${
                      isActive
                        ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-100"
                        : "border-slate-100 bg-white hover:border-blue-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-blue-600" : "text-slate-400"}`}>
                        Task {renderValue(task.task_number || index + 1)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {renderValue(task.min_words || 0)}+ words
                      </span>
                    </div>
                    <p className={`font-black text-base leading-tight ${isActive ? "text-slate-900" : "text-slate-700"}`}>
                      {renderValue(task.title || `Task ${index + 1}`)}
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-2">
                      {renderValue(task.time_limit_minutes || 0)} min
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-10">
            <h4 className="font-black text-slate-400 mb-4 uppercase text-[10px] tracking-widest flex items-center gap-2">
               <Sparkles size={14} className="text-amber-500" /> Đề bài / Nhiệm vụ:
            </h4>
            <p className="text-slate-800 font-bold text-xl leading-relaxed italic">&ldquo;{renderValue(currentWritingPrompt)}&rdquo;</p>
            {currentWritingTask && (
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-[11px] font-black text-slate-500">
                  {renderValue(currentWritingTask.min_words)}+ words
                </span>
                <span className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-[11px] font-black text-slate-500">
                  {renderValue(currentWritingTask.time_limit_minutes)} min
                </span>
                {currentWritingCriteria.map((criterion: any, index: number) => (
                  <span key={index} className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-[11px] font-bold text-slate-500">
                    {renderValue(criterion)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <textarea 
              className="w-full h-96 p-8 border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 transition-all font-serif text-xl leading-relaxed bg-white shadow-inner"
              placeholder="Bắt đầu viết bài của bạn tại đây..."
              value={currentWritingText}
              onChange={(e) => {
                const nextText = e.target.value;
                setWritingText(nextText);
                if (writingTasks.length) {
                  setWritingTexts((prev) => ({ ...prev, [activeWritingTask]: nextText }));
                }
              }}
            />
            <div className="absolute bottom-6 right-8 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
               Số từ: {currentWritingWordCount}
            </div>
          </div>
          
          <div className="mt-10 flex flex-col items-center gap-3">
            <button 
              onClick={submitWriting}
              disabled={!currentWritingPrompt || currentWritingWordCount < 20}
              className="bg-blue-600 text-white py-5 px-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
            >
              NỘP BÀI CHẤM ĐIỂM AI ✨
            </button>
            {currentWritingTask?.min_words ? (
              <p className="text-xs font-bold text-slate-400">
                Khuyen nghi toi thieu {renderValue(currentWritingTask.min_words)} tu cho bai nay.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {submitted && !loading && (
        <div className="max-w-5xl mx-auto animate-in zoom-in-95 duration-500">
          {skill === "writing" && evalResult ? (
            <div className="space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full border border-blue-500/30 text-[10px] font-black uppercase tracking-widest mb-6">Writing Analysis</div>
                    <h3 className="text-4xl font-black mb-4">Kết Quả Đánh Giá</h3>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">Phân tích chi tiết dựa trên chuẩn {testType}.</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-44 h-44 rounded-full border-[10px] border-blue-500/30 flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl">
                      <span className="text-[10px] font-black text-blue-300 uppercase">Overall</span>
                      <span className="text-7xl font-black">{renderValue(evalResult.overall_band)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                  <h4 className="font-black text-slate-900 mb-8 uppercase text-xs tracking-widest flex items-center gap-3">
                    <BarChart3 className="text-indigo-500" /> Tiêu chí chi tiết
                  </h4>
                  <div className="space-y-8">
                    {Object.entries(evalResult.criteria || {}).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-black text-slate-600 capitalize text-xs tracking-tight">{key.replace('_', ' ')}</span>
                          <span className="font-black text-indigo-600">{renderValue(value.score)}/9</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(value.score / 9) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-bold leading-relaxed">{renderValue(value.feedback_vn)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-8">
                   <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                      <h4 className="font-black text-green-600 mb-6 uppercase text-xs tracking-widest flex items-center gap-3"><CheckCircle2 /> Điểm mạnh</h4>
                      <ul className="space-y-4">
                        {evalResult.strengths?.map((s: string, i: number) => (
                           <li key={i} className="flex items-start gap-4 text-slate-600 font-bold text-sm">
                             <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" /> {renderValue(s)}
                           </li>
                        ))}
                      </ul>
                   </div>
                   <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-200">
                      <h4 className="font-black mb-6 uppercase text-xs tracking-widest flex items-center gap-3"><Sparkles /> Cần cải thiện</h4>
                      <ul className="space-y-4">
                        {evalResult.improvements?.map((im: string, i: number) => (
                           <li key={i} className="text-sm font-bold opacity-90 border-l-2 border-white/30 pl-4">{renderValue(im)}</li>
                        ))}
                      </ul>
                   </div>
                </div>
              </div>

              <div className="pt-12 text-center">
                 <button onClick={() => { setPractice(null); setSubmitted(false); setEvalResult(null); }} className="bg-slate-900 text-white px-12 py-5 rounded-[2rem] font-black text-lg shadow-xl">LUYỆN TẬP BÀI KHÁC</button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[4rem] p-16 text-center text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/20">
                  <Trophy size={64} className="text-yellow-400 animate-bounce" />
                </div>
                <h3 className="text-5xl font-black mb-4 tracking-tighter">Hoàn Thành!</h3>
                <div className="text-7xl font-black mb-4">{score}/{practice?.questions?.length || 0}</div>
                <p className="text-xl font-medium text-blue-100 mb-10 max-w-md mx-auto">Chúc mừng bạn đã hoàn thành bài luyện tập. Hãy tiếp tục để đạt kết quả cao hơn!</p>
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  <button onClick={() => { setPractice(null); setSubmitted(false); setAnswers({}); }} className="bg-white text-indigo-600 px-12 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:scale-105 transition-all">LUYỆN TẬP TIẾP</button>
                  <button onClick={() => setShowHistory(true)} className="bg-indigo-500/30 text-white border border-white/20 px-10 py-5 rounded-[2rem] font-black text-lg">XEM LỊCH SỬ</button>
                </div>
              </div>
              <Sparkles className="absolute -right-20 -bottom-20 w-96 h-96 text-white/10" />
            </div>
          )}
        </div>
      )}

      {!practice && !loading && !showHistory && (
        <div className="bg-white rounded-[3rem] p-24 border border-slate-100 text-center shadow-xl shadow-slate-100/50">
          <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-slate-200">
             <Layers size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Sẵn sàng để luyện tập?</h3>
          <p className="text-slate-400 font-bold max-w-sm mx-auto mb-10">Chọn chứng chỉ và kỹ năng bạn muốn cải thiện, sau đó nhấn nút "Bắt đầu" để AI chuẩn bị đề thi cho bạn.</p>
          <div className="inline-flex items-center gap-4 p-2 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Hệ thống AI đã sẵn sàng</span>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
