"use client";
import React, { useState } from "react";
import { 
  Award, Mic, Trophy 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { MOCK_PRACTICE_TESTS } from "../../components/MockPracticeData";

interface PracticeTabProps {
  API_URL: string;
  setShowCreditModal: (s: boolean) => void;
}

export default function PracticeTab({ API_URL, setShowCreditModal }: PracticeTabProps) {
  const { user, authFetch, refreshUser } = useAuth();
  const [testType, setTestType] = useState("TOEIC");
  const [skill, setSkill] = useState("reading");
  const [loading, setLoading] = useState(false);
  const [practice, setPractice] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [source, setSource] = useState<"ai" | "official">("ai");

  const generatePractice = async () => {
    if (source === "official") {
      const filtered = MOCK_PRACTICE_TESTS.filter(t => t.test_type === testType && t.skill === skill);
      if (filtered.length > 0) {
        setPractice(filtered[0]);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
      } else {
        alert("Hiện chưa có bài thi mẫu cho sự kết hợp này. Vui lòng thử AI Generator.");
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
    try {
      const endpoint =
        skill === "reading" ? "/student/reading/generate" :
          skill === "writing" ? "/student/writing/evaluate" :
            skill === "speaking" ? "/student/speaking/topic" :
              "/student/practice/generate";

      const body = skill === "reading" ? { level: "B1" } :
        skill === "speaking" ? { level: "B1", topic_type: "general" } :
          { test_type: testType, skill };

      if (skill === "writing") {
        alert("Vui lòng sử dụng tính năng nộp bài viết (chưa implement trong demo này)");
        setLoading(false);
        return;
      }

      const res = await authFetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error("API Error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let finalData: any = { questions: [] };

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
              if (chunkData.status === "success" || !chunkData.status) {
                finalData = { ...finalData, ...chunkData };
              }
            } catch (e) { }
          }
        }
      }
      refreshUser();
      
      if (buffer.trim()) {
          try {
              let rawJson = buffer.trim();
              if (rawJson.startsWith("data: ")) rawJson = rawJson.replace("data: ", "");
              if (rawJson !== "[DONE]") {
                  const chunkData = JSON.parse(rawJson);
                  finalData = { ...finalData, ...chunkData };
              }
          } catch (e) {}
      }

      setPractice(finalData);
    } catch (e) {
      alert("Lỗi khi tạo bài luyện tập");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = () => {
    if (Object.keys(answers).length === 0) {
      alert("Vui lòng trả lời ít nhất một câu hỏi!");
      return;
    }
    let correct = 0;
    practice.questions?.forEach((q: any, idx: number) => {
      if (answers[idx] === q.correct_answer || answers[idx] === q.ans) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Award className="text-purple-500" /> Tự luyện thi
            </h2>
            <p className="text-gray-500 text-sm">chọn chứng chỉ và kỹ năng để hệ thống sinh đề thi mẫu cho bạn</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={source} onChange={e => setSource(e.target.value as any)} className="border border-indigo-200 rounded-lg px-3 py-2 outline-none bg-indigo-50 text-indigo-700 font-bold">
              <option value="ai">AI Generator ✨</option>
              <option value="official">Bài thi mẫu 📚</option>
            </select>
            <select value={testType} onChange={e => setTestType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 outline-none bg-gray-50">
              <option value="TOEIC">TOEIC</option>
              <option value="IELTS">IELTS</option>
              <option value="GENERAL">Tiếng Anh Giao tiếp</option>
            </select>
            <select value={skill} onChange={e => setSkill(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 outline-none bg-gray-50">
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>
            <button onClick={generatePractice} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:opacity-50 font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition">
              {loading ? "Đang tạo..." : (source === "official" ? "Xem bài thi" : "Tạo bài với AI")}
            </button>
          </div>
        </div>
      </div>

      {practice && skill === "reading" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-bold mb-4">{practice.title || "Bài đọc hiểu"}</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-6 whitespace-pre-wrap leading-relaxed">
            {practice.passage}
          </div>

          <h4 className="font-bold text-lg mb-4">Câu hỏi:</h4>
          <div className="space-y-6">
            {practice.questions?.map((q: any, idx: number) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4">
                <p className="font-bold mb-3">{idx + 1}. {q.question || q.q}</p>
                <div className="space-y-2 pl-4">
                  {q.options?.map((opt: string, oIdx: number) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q-${idx}`}
                        id={`q-${idx}-${oIdx}`}
                        checked={answers[idx] === oIdx}
                        onChange={() => setAnswers({...answers, [idx]: oIdx})}
                        disabled={submitted}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label htmlFor={`q-${idx}-${oIdx}`} className={submitted ? (oIdx === q.correct_answer || oIdx === q.ans ? "text-green-700 font-medium" : answers[idx] === oIdx ? "text-red-700" : "") : ""}>
                        {opt}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {practice && skill === "speaking" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <div className="inline-block p-4 bg-purple-100 text-purple-700 rounded-full mb-4">
            <Mic size={48} />
          </div>
          <h3 className="font-bold text-2xl mb-2">{practice.topic || practice.title || "Chủ đề Speaking"}</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">{practice.description || practice.instructions || "Hãy nói về chủ đề này trong vòng 2 phút."}</p>

          <div className="bg-gray-50 p-4 rounded-xl max-w-2xl mx-auto text-left mb-6">
            <h4 className="font-bold text-gray-800 mb-2">Gợi ý trả lời:</h4>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              {practice.prompts?.map((p: string, i: number) => <li key={i}>{p}</li>)}
            </ul>
          </div>

          <button className="bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 mx-auto hover:bg-red-100 transition">
            <Mic size={20} /> Bắt đầu ghi âm (Giả lập)
          </button>
        </div>
      )}

      {practice && (skill === "listening" || skill === "writing" || !["reading", "speaking"].includes(skill)) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
          Yêu cầu tính năng {skill} đã được mô phỏng. Dữ liệu mock: {JSON.stringify(practice).substring(0, 100)}...
        </div>
      )}

      {!practice && !loading && (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Award size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">Chọn loại bài luyện tập</h3>
          <p className="text-gray-500">Chọn chứng chỉ và kỹ năng ở trên để bắt đầu luyện tập.</p>
        </div>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <Trophy size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-green-800 mb-2">Kết quả: {score}/{practice?.questions?.length || 0}</h3>
          <p className="text-green-600 mb-4">
            {score === (practice?.questions?.length || 0) ? "Xuất sắc! 🎉" :
             score >= (practice?.questions?.length || 0) * 0.8 ? "Tốt! 👍" :
             score >= (practice?.questions?.length || 0) * 0.6 ? "Khá! 👌" : "Cần luyện tập thêm! 💪"}
          </p>
          <button onClick={() => { setPractice(null); setAnswers({}); setSubmitted(false); setScore(0); }} className="btn-primary px-6 py-2 rounded-lg">
            Làm bài khác
          </button>
        </div>
      )}

      {!submitted && practice && skill === "reading" && practice.questions?.length > 0 && (
        <div className="text-center pt-4">
          <button onClick={submitAnswers} disabled={Object.keys(answers).length === 0} className="btn-primary px-8 py-3 rounded-lg text-lg disabled:opacity-50">
            Nộp bài & Xem kết quả
          </button>
        </div>
      )}
    </div>
  );
}
