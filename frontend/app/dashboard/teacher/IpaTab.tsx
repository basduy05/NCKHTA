"use client";

import React, { useState, useEffect } from 'react';
import { Volume2, BookText, Sparkles, Languages, Globe, X } from 'lucide-react';

interface IpaTabProps {
  authFetch: any;
  API_URL: string;
}

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

export function IpaTab({ authFetch, API_URL }: IpaTabProps) {
  const [focus, setFocus] = useState("vowels");
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<any>(null);
  const [practiceResult, setPracticeResult] = useState<Record<string, any>>({});
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  const speak = (text: string) => {
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStudy = async (symbol: string) => {
    setLoading(true);
    setLesson(null);
    try {
      const res = await authFetch(`${API_URL}/student/ipa/lesson?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) setLesson(await res.json());
    } catch { } finally { setLoading(false); }
  };

  const currentData = IPA_DATA[focus as keyof typeof IPA_DATA] || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Languages className="text-indigo-600" size={32} />
            IPA Pronunciation Master
          </h2>
          <p className="text-gray-500 font-medium mt-1">Luyện phát âm chuẩn quốc tế qua bảng ký tự phiên âm IPA.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          {["vowels", "diphthongs", "consonants"].map(t => (
            <button key={t} onClick={() => setFocus(t)} className={`px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black mt-0.5 uppercase tracking-widest transition-all ${focus === t ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:bg-white/50"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {currentData.map((item: any, i: number) => (
          <button key={i} onClick={() => handleStudy(item.ipa)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all group relative flex flex-col items-center justify-center min-h-[100px] overflow-hidden text-center">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={(e) => { e.stopPropagation(); speak(item.example); }} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Volume2 size={14} /></button>
            </div>
            <span className="text-3xl font-black text-indigo-700 mb-1 group-hover:scale-110 transition-transform">/{item.ipa}/</span>
            <span className="text-xs font-bold text-slate-400 uppercase group-hover:text-indigo-600 transition-colors">{item.example}</span>
            <span className="text-[10px] text-slate-300 font-medium mt-0.5 tracking-widest hidden group-hover:block transition-all">/{item.transcription}/</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-[2rem] border border-indigo-50 flex flex-col items-center justify-center animate-pulse">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-indigo-600 font-black">Genrating AI Lesson...</p>
        </div>
      )}

      {lesson && (
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-[2rem] p-6 lg:p-8 text-white shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6 md:mb-8">
               <div>
                  <h3 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-4">
                    <Sparkles className="text-yellow-400" />
                    Bí kíp phát âm: {lesson.symbol}
                  </h3>
                  <p className="text-indigo-200 text-lg font-medium">{lesson.description}</p>
               </div>
               <button onClick={() => setLesson(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                  <h4 className="text-xl font-black mb-4 flex items-center gap-2"><BookText className="text-indigo-300" /> Hướng dẫn chi tiết</h4>
                  <ul className="space-y-4 text-indigo-50">
                    {lesson.tutorial?.map((step: string, i: number) => (
                      <li key={i} className="flex gap-4">
                        <span className="w-5 h-5 p-0.5 bg-indigo-500 rounded-full flex items-center justify-center shrink-0 text-[10px] sm:text-xs font-black mt-0.5">{i+1}</span>
                        <p className="text-sm sm:text-base leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ul>
               </div>

               <div className="space-y-4 md:space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                     <h4 className="text-xl font-black mb-4">Từ vựng mẫu</h4>
                     <div className="grid grid-cols-2 gap-3">
                        {lesson.examples?.map((ex: any, i: number) => (
                          <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 group hover:bg-black/30 transition-colors cursor-pointer" onClick={() => speak(ex.word)}>
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-lg font-black">{ex.word}</span>
                                <Volume2 size={16} className="text-indigo-300 group-hover:scale-110 transition-transform" />
                             </div>
                             <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">{ex.meaning}</p>
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 shadow-xl">
                     <h4 className="text-xl font-black mb-2 flex items-center gap-2">⚠️ Lỗi thường gặp</h4>
                     <p className="text-rose-100 italic leading-relaxed">{lesson.common_mistake}</p>
                  </div>
               </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-40 -mt-40"></div>
          {/* Decorative background glow */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />
        </div>
      )}
    </div>
  );
}
