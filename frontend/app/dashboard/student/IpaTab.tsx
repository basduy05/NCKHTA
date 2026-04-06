"use client";
import React, { useState } from "react";
import { 
  Volume2, Sparkles, Brain, CheckCircle2, X, Info
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

const SentenceWithBlank = ({ 
  sentence, 
  correctAnswer, 
  onCorrect 
}: { 
  sentence: string, 
  correctAnswer: string, 
  onCorrect: () => void 
}) => {
  const [userInput, setUserInput] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const checkAnswer = (val: string) => {
    setUserInput(val);
    const cleanUser = val.toLowerCase().trim();
    const cleanAnswer = correctAnswer.toLowerCase().trim();
    
    if (cleanUser === cleanAnswer) {
      setIsCorrect(true);
      onCorrect();
    } else if (cleanUser.length >= cleanAnswer.length) {
      setIsCorrect(false);
    } else {
      setIsCorrect(null);
    }
  };

  const parts = sentence.split("[blank]");
  
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3 leading-loose text-lg py-2">
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          <span className="text-gray-800 font-medium">{part}</span>
          {index < parts.length - 1 && (
            <input
              type="text"
              value={userInput}
              onChange={(e) => checkAnswer(e.target.value)}
              placeholder="..."
              className={`
                min-w-[80px] max-w-[150px] px-3 py-1 rounded-lg border-2 outline-none transition-all font-bold text-center
                ${isCorrect === true ? "border-green-500 bg-green-50 text-green-700" : 
                  isCorrect === false ? "border-red-400 bg-red-50 text-red-700 animate-pulse" : 
                  "border-blue-200 bg-blue-50/30 text-blue-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"}
              `}
              style={{ width: `${Math.max(correctAnswer.length + 2, 6)}ch` }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default function IpaTab({ API_URL }: IpaTabProps) {
  const { authFetch, refreshUser } = useAuth();
  const [focus, setFocus] = useState("vowels");
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<any>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [practiceResults, setPracticeResults] = useState<Record<number, boolean>>({});

  const generateLesson = async () => {
    setLoading(true);
    setLesson(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setPracticeResults({});
    try {
      const res = await authFetch(`${API_URL}/student/ipa/generate`, {
        method: "POST",
        body: JSON.stringify({ focus })
      });
      if (res.ok) {
        setLesson(await res.json());
        refreshUser();
      }
    } catch (e) {
      console.error("Generate Lesson failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    if (!lesson?.quiz) return;
    let s = 0;
    lesson.quiz.forEach((q: any, i: number) => {
      const userAnswerIndex = quizAnswers[i];
      if (userAnswerIndex === undefined) return;
      const correctAnswer = q.correct_answer || q.answer;
      const correctIndex = q.options.findIndex((opt: any) => 
        String(opt || "").toLowerCase().trim() === String(correctAnswer || "").toLowerCase().trim()
      );
      if (userAnswerIndex === correctIndex || Number(userAnswerIndex) === Number(q.correct_index)) {
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

  const renderValue = (val: any) => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
       return Object.entries(val)
         .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
         .join(" | ");
    }
    return String(val);
  };

  return (
    <div className="space-y-8 pb-12 w-full">
      <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="relative z-10">
          <h3 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 mb-6 flex items-center gap-3">
              <Sparkles className="text-blue-600" /> IPA Master Dashboard
          </h3>
          <p className="text-gray-500 font-medium mb-8">Select a phoneme group to generate a personalized AI pronunciation lesson.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["vowels", "diphthongs", "consonants"].map(type => (
                  <button 
                    key={type}
                    onClick={() => setFocus(type)}
                    className={`py-6 rounded-2xl font-black uppercase tracking-widest transition-all border-2 
                      ${focus === type 
                        ? "bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-200 scale-[1.02]" 
                        : "bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-white"}`}
                  >
                      {type === "vowels" ? "Vowels" : type === "diphthongs" ? "Diphthongs" : "Consonants"}
                  </button>
              ))}
          </div>
          
          <div className="mt-12 flex flex-wrap gap-3">
              {(IPA_DATA as any)[focus].map((item: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => speak(item.example)}
                    className="bg-white border border-gray-100 px-4 py-3 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:scale-105 transition-all text-center group"
                  >
                      <p className="text-xl font-black text-blue-800 group-hover:text-blue-600">/{item.ipa}/</p>
                      <p className="text-[12px] text-gray-400 font-bold uppercase">{item.example}</p>
                  </button>
              ))}
          </div>

          <div className="mt-12 flex justify-center">
              <button 
                onClick={generateLesson}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 px-16 py-6 rounded-[2.5rem] font-black text-2xl text-white flex items-center gap-4 shadow-3xl shadow-blue-200 hover:shadow-blue-300 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/30 border-t-white" /> : <Brain size={32} />}
                GENERATE WITH AI
              </button>
          </div>
        </div>
      </section>

      {lesson && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
              <header className="bg-gradient-to-br from-indigo-950 to-blue-900 rounded-[3rem] p-12 text-white shadow-3xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                      <button 
                        onClick={() => speak(lesson.target_ipa)} 
                        className="bg-white/10 backdrop-blur-md border border-white/20 w-32 h-32 rounded-[2.5rem] flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all shrink-0 shadow-2xl"
                      >
                        <Volume2 size={48} className="text-blue-200" />
                      </button>
                      <div>
                          <div className="inline-flex items-center gap-2 px-6 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm font-black uppercase tracking-tighter text-blue-300 mb-6 italic">
                             <Sparkles size={16} /> Personalized content for your level
                          </div>
                          <h2 className="text-6xl font-black mb-4">Target: <span className="text-blue-400 italic">/{lesson.target_ipa}/</span></h2>
                          <p className="text-2xl text-blue-100/80 font-medium leading-relaxed max-w-2xl">{renderValue(lesson.description_vn)}</p>
                      </div>
                  </div>
                  <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl group hover:shadow-2xl transition-all h-full">
                      <h4 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-inner"><CheckCircle2 size={32} /></div>
                        Core Vocabulary
                      </h4>
                      <div className="space-y-4">
                          {lesson.examples?.map((ex: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-6 bg-gray-50/50 rounded-3xl hover:bg-blue-50/50 transition-all border-2 border-transparent hover:border-blue-100 group/item">
                                  <div className="flex items-center gap-6">
                                      <button onClick={() => speak(ex.word)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 group-hover/item:scale-110 transition-all"><Volume2 size={24} /></button>
                                      <div>
                                          <p className="text-2xl font-black text-gray-900 uppercase tracking-tight">{ex.word}</p>
                                          <p className="text-md text-blue-500 font-black font-mono">/{ex.ipa}/</p>
                                      </div>
                                  </div>
                                  <p className="text-lg font-black text-gray-400 uppercase">{renderValue(ex.meaning_vn)}</p>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl group hover:shadow-2xl transition-all h-full">
                      <h4 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner"><Info size={32} /></div>
                        Interactive Use
                      </h4>
                      <div className="space-y-6">
                        {lesson.practice_sentences?.map((item: any, i: number) => {
                            const sentence = typeof item === 'string' ? item : (item.sentence || item.text);
                            const answer = typeof item === 'object' ? (item.answer || item.focus_word) : "";
                            
                            return (
                                <div key={i} className="p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-100 space-y-4">
                                    {sentence.includes("[blank]") ? (
                                      <SentenceWithBlank 
                                        sentence={sentence} 
                                        correctAnswer={answer} 
                                        onCorrect={() => setPracticeResults(p => ({...p, [i]: true}))}
                                      />
                                    ) : (
                                      <p className="text-2xl font-bold text-gray-800 leading-tight italic">"{sentence}"</p>
                                    )}
                                    <div className="flex justify-end">
                                      <button onClick={() => speak(sentence.replace("[blank]", answer))} className="text-indigo-600 hover:scale-110 transition-all p-3 bg-white rounded-2xl shadow-sm border border-indigo-50">
                                          <Volume2 size={24} />
                                      </button>
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                  </div>
              </div>

              {lesson.quiz && (
                  <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-3xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                      <h3 className="text-4xl font-black text-gray-900 mb-12 flex items-center gap-5">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center text-blue-700 shadow-inner"><Brain size={36} /></div>
                          Phonetic Challenge Quiz
                      </h3>
                      <div className="space-y-16">
                          {lesson.quiz.map((q: any, i: number) => (
                              <div key={i} className="space-y-8 animate-in fade-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                  <div className="flex items-start gap-6">
                                      <span className="w-12 h-12 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl border-4 border-white shadow-md">{i+1}</span>
                                      <p className="text-2xl font-black text-gray-800 leading-snug pt-1">{q.question}</p>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-16">
                                      {q.options.map((opt: string, oi: number) => {
                                          const isSelected = quizAnswers[i] === oi;
                                          const correctAnswer = q.correct_answer || q.answer;
                                          const isCorrect = q.correct_index === oi || 
                                                            (typeof correctAnswer === 'string' && q.options[oi]?.toLowerCase().trim() === correctAnswer.toLowerCase().trim());
                                          
                                          let btnCls = "bg-white border-gray-100 hover:border-blue-400 hover:shadow-2xl hover:scale-[1.02] text-gray-700";
                                          if (quizSubmitted) {
                                              if (isCorrect) btnCls = "border-green-500 bg-green-50 text-green-700 shadow-green-100 scale-[1.02]";
                                              else if (isSelected) btnCls = "border-red-500 bg-red-50 text-red-700";
                                              else btnCls = "opacity-40 grayscale-[20%]";
                                          } else if (isSelected) btnCls = "border-blue-600 bg-blue-50 text-blue-700 shadow-blue-100 scale-[1.02]";
                                          
                                          return (
                                              <button 
                                                key={oi}
                                                disabled={quizSubmitted}
                                                onClick={() => setQuizAnswers(p => ({...p, [i]: oi}))}
                                                className={`p-6 rounded-3xl border-3 text-left text-xl font-black transition-all duration-300 ${btnCls}`}
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
                          <div className="mt-20 text-center">
                              <button 
                                onClick={handleQuizSubmit}
                                disabled={Object.keys(quizAnswers).length < lesson.quiz.length}
                                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-24 py-8 rounded-[3rem] font-black text-3xl text-white shadow-3xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                              >
                                  FINISH & SEE RESULTS
                              </button>
                          </div>
                      ) : (
                          <div className="mt-20 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 rounded-[4rem] p-16 border-4 border-white flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden backdrop-blur-xl">
                              <div className="relative z-10 text-center md:text-left">
                                  <p className="text-blue-900 font-black text-6xl mb-4">Level Up! 🌟</p>
                                  <p className="text-3xl font-black text-indigo-700 uppercase tracking-tighter">Your Score: {quizScore}/{lesson.quiz.length}</p>
                                  <div className="mt-8 inline-flex items-center gap-4 bg-white px-10 py-4 rounded-full border-4 border-indigo-100 shadow-xl">
                                    <Sparkles className="text-yellow-500 w-8 h-8" />
                                    <span className="font-black text-3xl text-blue-700">+{quizScore * 10} XP</span>
                                  </div>
                              </div>
                              <button 
                                onClick={() => setLesson(null)} 
                                className="relative z-10 px-12 py-6 bg-white text-gray-900 font-black text-2xl rounded-3xl border-4 border-indigo-50 hover:bg-indigo-50 transition-all shadow-2xl active:scale-95"
                              >
                                NEW LESSON
                              </button>
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}
    </div>
  );
}
