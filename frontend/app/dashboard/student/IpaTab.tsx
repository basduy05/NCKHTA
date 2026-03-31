"use client";
import React, { useState } from "react";
import { 
  Volume2, Sparkles, Brain, CheckCircle2, X 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const IPA_DATA = {
  vowels: [
    { ipa: "iː", example: "see", transcription: "siː", desc: "Long E" }, { ipa: "ɪ", example: "sit", transcription: "sɪt", desc: "Short I" },
    { ipa: "ʊ", example: "put", transcription: "pʊt", desc: "Short U" }, { ipa: "uː", example: "two", transcription: "tuː", desc: "Long U" },
    { ipa: "e", example: "ten", transcription: "ten", desc: "Short E" }, { ipa: "ə", example: "about", transcription: "əˈbaʊt", desc: "Schwa" },
    { ipa: "ɜː", example: "bird", transcription: "bɜːd", desc: "Long R-colored" }, { ipa: "ɔː", example: "saw", transcription: "sɔː", desc: "Long O" },
    { ipa: "æ", example: "cat", transcription: "kæt", desc: "Short A" }, { ipa: "ʌ", example: "cup", transcription: "kʌp", desc: "Short U" },
    { ipa: "ɑː", example: "arm", transcription: "ɑːm", desc: "Long A" }, { ipa: "ɒ", example: "hot", transcription: "hɒt", desc: "Short O" }
  ],
  diphthongs: [
    { ipa: "ɪə", example: "near", transcription: "nɪə", desc: "Ear" }, { ipa: "eɪ", example: "day", transcription: "deɪ", desc: "A" },
    { ipa: "ʊə", example: "tour", transcription: "tʊə", desc: "Ure" }, { ipa: "ɔɪ", example: "boy", transcription: "bɔɪ", desc: "Oy" },
    { ipa: "əʊ", example: "go", transcription: "gəʊ", desc: "Oh" }, { ipa: "eə", example: "hair", transcription: "heə", desc: "Air" },
    { ipa: "aɪ", example: "my", transcription: "maɪ", desc: "Eye" }, { ipa: "aʊ", example: "how", transcription: "haʊ", desc: "Ow" }
  ],
  consonants: [
    { ipa: "p", example: "pen", transcription: "pen", desc: "Voiceless bilabial" }, { ipa: "b", example: "bad", transcription: "bæd", desc: "Voiced bilabial" },
    { ipa: "t", example: "tea", transcription: "tiː", desc: "Voiceless alveolar" }, { ipa: "d", example: "did", transcription: "dɪd", desc: "Voiced alveolar" },
    { ipa: "tʃ", example: "chain", transcription: "tʃeɪn", desc: "Voiceless affricate" }, { ipa: "dʒ", example: "jam", transcription: "dʒæm", desc: "Voiced affricate" },
    { ipa: "k", example: "cat", transcription: "kæt", desc: "Voiceless velar" }, { ipa: "g", example: "get", transcription: "get", desc: "Voiced velar" },
    { ipa: "f", example: "fall", transcription: "fɔːl", desc: "Voiceless labiodental" }, { ipa: "v", example: "van", transcription: "væn", desc: "Voiced labiodental" },
    { ipa: "θ", example: "thin", transcription: "θɪn", desc: "Voiceless dental" }, { ipa: "ð", example: "this", transcription: "ðɪs", desc: "Voiced dental" },
    { ipa: "s", example: "see", transcription: "siː", desc: "Voiceless alveolar" }, { ipa: "z", example: "zoo", transcription: "zuː", desc: "Voiced alveolar" },
    { ipa: "ʃ", example: "shoe", transcription: "ʃuː", desc: "Voiceless palatal" }, { ipa: "ʒ", example: "vision", transcription: "ˈvɪʒ.ən", desc: "Voiced palatal" },
    { ipa: "m", example: "man", transcription: "mæn", desc: "Bilabial nasal" }, { ipa: "n", example: "now", transcription: "naʊ", desc: "Alveolar nasal" },
    { ipa: "ŋ", example: "sing", transcription: "sɪŋ", desc: "Velar nasal" }, { ipa: "h", example: "hat", transcription: "hæt", desc: "Glottal fricative" },
    { ipa: "l", example: "leg", transcription: "leg", desc: "Lateral approximant" }, { ipa: "r", example: "red", transcription: "red", desc: "Alveolar approximant" },
    { ipa: "w", example: "wet", transcription: "wet", desc: "Labio-velar" }, { ipa: "j", example: "yes", transcription: "jes", desc: "Palatal approximant" }
  ]
};

interface IpaTabProps {
  API_URL: string;
}

export default function IpaTab({ API_URL }: IpaTabProps) {
  const { authFetch, refreshUser } = useAuth();
  const [focus, setFocus] = useState("vowels");
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  
  // Defensive rendering helper
  const renderValue = (val: any) => {
    if (val === null || val === undefined) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
       return Object.entries(val)
         .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
         .join(" | ");
    }
    return String(val);
  };

  const generateLesson = async () => {
    setLoading(true);
    setLesson(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    try {
      const res = await authFetch(`${API_URL}/student/ipa/generate`, {
        method: "POST",
        body: JSON.stringify({ focus })
      });
      if (res.ok) {
        setLesson(await res.json());
        refreshUser();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleQuizSubmit = () => {
    if (!lesson?.quiz) return;
    let s = 0;
    lesson.quiz.forEach((q: any, i: number) => {
      const userAnswerIndex = quizAnswers[i];
      if (userAnswerIndex === undefined) return;

      // The AI returns correct_answer as a string, but we compare against the selected index
      const correctAnswer = q.correct_answer || q.answer;
      const correctIndex = q.options.findIndex((opt: string) => 
        opt.toLowerCase().trim() === String(correctAnswer).toLowerCase().trim()
      );

      if (userAnswerIndex === correctIndex || userAnswerIndex === q.correct_index) {
        s++;
      }
    });
    setQuizScore(s);
    setQuizSubmitted(true);
  };

  const speak = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = 0.8;
        window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Sparkles className="text-blue-600" /> Chọn nhóm âm để luyện tập
        </h3>
        <div className="grid grid-cols-3 gap-3">
            {["vowels", "diphthongs", "consonants"].map(type => (
                <button 
                  key={type}
                  onClick={() => setFocus(type)}
                  className={`py-4 rounded-xl font-black uppercase tracking-widest transition-all ${focus === type ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                >
                    {type === "vowels" ? "Nguyên âm" : type === "diphthongs" ? "Nguyên âm đôi" : "Phụ âm"}
                </button>
            ))}
        </div>
        
        <div className="mt-8 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {(IPA_DATA as any)[focus].map((item: any, i: number) => (
                <button 
                  key={i} 
                  onClick={() => speak(item.example)}
                  className="bg-white border border-gray-100 p-2 rounded-lg hover:border-blue-400 hover:shadow-md transition text-center group"
                >
                    <p className="text-lg font-black text-blue-800 group-hover:scale-110 transition">/{item.ipa}/</p>
                    <p className="text-[10px] text-gray-400 font-bold">{item.example}</p>
                </button>
            ))}
        </div>

        <div className="mt-10 flex justify-center">
            <button 
              onClick={generateLesson}
              disabled={loading}
              className="btn-primary px-10 py-4 rounded-2xl font-black text-lg flex items-center gap-2 shadow-xl shadow-blue-200 hover:scale-105 transition disabled:opacity-50"
            >
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Brain />}
              TẠO BÀI HỌC AI MIỄN PHÍ
            </button>
        </div>
      </div>

      {lesson && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
              <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-blue-300 font-bold uppercase tracking-widest text-xs mb-2">AI Personalized Lesson</p>
                      <h3 className="text-3xl font-black mb-4">Luyện tập âm: /{lesson.target_ipa}/</h3>
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 max-w-2xl">
                          <p className="text-blue-100 leading-relaxed italic mb-4">&ldquo;{renderValue(lesson.description_vn)}&rdquo;</p>
                          <div className="flex items-center gap-4">
                              <button onClick={() => speak(lesson.target_ipa)} className="bg-white text-blue-900 w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition"><Volume2 size={24} /></button>
                              <p className="font-mono text-xl">{lesson.transcription_tip}</p>
                          </div>
                      </div>
                  </div>
                  <Sparkles className="absolute -right-12 -top-12 w-64 h-64 text-white/5 rotate-12" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-500" /> Từ vựng ví dụ</h4>
                    <div className="space-y-3">
                        {lesson.examples?.map((ex: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition border border-transparent hover:border-blue-100">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => speak(ex.word)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm"><Volume2 size={14} /></button>
                                    <div>
                                        <p className="font-black text-gray-900">{ex.word}</p>
                                        <p className="text-xs text-blue-600 font-mono italic">{ex.ipa}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-gray-500">{renderValue(ex.meaning_vn)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-500" /> Câu luyện tập</h4>
                    <div className="space-y-4">
                        {lesson.practice_sentences?.map((item: any, i: number) => {
                            const sentence = typeof item === 'string' ? item : item.sentence;
                            const ipa = typeof item === 'object' ? item.ipa : null;
                            
                            return (
                                <div key={i} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 relative group">
                                    <p className="text-indigo-900 font-medium italic">&ldquo;{sentence}&rdquo;</p>
                                    {ipa && <p className="text-xs text-indigo-400 font-mono mt-1">{ipa}</p>}
                                    <button onClick={() => speak(sentence)} className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition">
                                        <Volume2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
              </div>

              {lesson.quiz && (
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
                      <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                          <Brain className="text-blue-600" /> Kiểm tra kiến thức
                      </h3>
                      <div className="space-y-8">
                          {lesson.quiz.map((q: any, i: number) => (
                              <div key={i} className="space-y-4">
                                  <p className="font-bold text-lg text-gray-800 flex items-start gap-3">
                                      <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0 text-sm">{i+1}</span>
                                      {q.question}
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                                      {q.options.map((opt: string, oi: number) => {
                                           const isSelected = quizAnswers[i] === oi;
                                          const correctAnswer = q.correct_answer || q.answer;
                                          const isCorrect = q.correct_index === oi || 
                                                           (typeof correctAnswer === 'string' && q.options[oi]?.toLowerCase().trim() === correctAnswer.toLowerCase().trim());
                                          
                                          let cls = "border-gray-100 bg-gray-50 hover:border-blue-300";
                                          if (quizSubmitted) {
                                              if (isCorrect) cls = "border-green-500 bg-green-50 text-green-700";
                                              else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
                                              else cls = "opacity-50";
                                          } else if (isSelected) cls = "border-blue-600 bg-blue-50 text-blue-700";

                                          return (
                                              <button 
                                                key={oi}
                                                disabled={quizSubmitted}
                                                onClick={() => setQuizAnswers(prev => ({...prev, [i]: oi}))}
                                                className={`p-4 rounded-xl border-2 text-left font-bold transition-all ${cls}`}
                                              >
                                                  {opt}
                                              </button>
                                          );
                                      })}
                                  </div>
                              </div>
                          ))}
                      </div>

                      {!quizSubmitted ? (
                          <div className="mt-10 text-center">
                              <button 
                                onClick={handleQuizSubmit}
                                disabled={Object.keys(quizAnswers).length < lesson.quiz.length}
                                className="btn-primary px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 disabled:opacity-50"
                              >
                                  NỘP BÀI KIỂM TRA
                              </button>
                          </div>
                      ) : (
                          <div className="mt-10 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                              <div>
                                  <p className="text-blue-900 font-black text-2xl">Hoàn thành! {quizScore}/{lesson.quiz.length} câu đúng</p>
                                  <p className="text-blue-600 font-bold">Bạn nhận được +{quizScore * 10} điểm kinh nghiệm!</p>
                              </div>
                              <button onClick={() => setLesson(null)} className="p-3 hover:bg-blue-100 rounded-full transition"><X /></button>
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}
    </div>
  );
}
