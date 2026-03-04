"use client";
import { useState } from "react";
import { FileSearch, Sparkles, BrainCircuit, Flame, Trophy, PlayCircle, CheckCircle2, XCircle } from "lucide-react";

export default function StudentDashboard() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [flippedWord, setFlippedWord] = useState<number | null>(null);
  
  // Quiz State
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const analyzeText = () => {
    if (!text) return;
    setLoading(true);
    setResult(null);
    setAnswers({});
    setSubmitted(false);
    
    setTimeout(() => {
      setResult({
        words: [
          { word: "Artificial", phon: "/ˌɑːtɪˈfɪʃl/", meaning: "Nhân tạo", example: "AI stands for Artificial Intelligence.", level: "B2" },
          { word: "Intelligence", phon: "/ɪnˈtelɪdʒəns/", meaning: "Trí thông minh", example: "He showed high intelligence.", level: "B2" },
          { word: "Analyze", phon: "/ˈænəlaɪz/", meaning: "Phân tích", example: "We need time to analyze the data.", level: "B1" }
        ],
        quiz: [
          { q: "What does 'Artificial' mean?", options: ["Tự nhiên", "Nhân tạo", "Máy móc", "Xây dựng"], ans: 1 },
          { q: "Choose the correct pronunciation for 'Analyze'", options: ["/ˈænəlaɪz/", "/əˈnælɪsɪs/", "/ˈænəlɪst/"], ans: 0 }
        ]
      });
      setLoading(false);
    }, 1500);
  };

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleSubmitQuiz = () => {
    if (!result || !result.quiz) return;
    let s = 0;
    result.quiz.forEach((q: any, i: number) => {
       if (answers[i] === q.ans) s += 1;
    });
    setScore(s);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold mb-2">Xin chào, Học viên! 🚀</h1>
            <p className="text-indigo-100 max-w-xl text-lg">Hôm nay bạn muốn học gì? Dán văn bản tiếng Anh vào đây và để AI tạo Flashcard & Quiz cho bạn.</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4 bg-white/20 px-6 py-3 rounded-2xl backdrop-blur-md">
            <div className="flex flex-col items-center border-r border-white/30 pr-4">
              <span className="text-sm font-medium text-indigo-100 uppercase">Streak</span>
              <div className="flex items-center font-bold text-2xl text-orange-300">
                <Flame className="mr-1 fill-orange-300" /> 12
              </div>
            </div>
            <div className="flex flex-col items-center pl-2">
              <span className="text-sm font-medium text-indigo-100 uppercase">Điểm KN</span>
              <div className="flex items-center font-bold text-2xl text-yellow-300">
                <Trophy className="mr-1 fill-yellow-300" /> {450 + (score * 10)}
              </div>
            </div>
          </div>
        </div>
        <BrainCircuit className="absolute -right-10 -bottom-10 text-white/10 w-64 h-64" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-0 shadow-indigo-100/50">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <div className="bg-indigo-100 p-2 rounded-lg justify-center mr-3"><FileSearch size={24} className="text-indigo-600"/></div> 
              Kho Trí Tuệ (Phân tích Văn bản)
            </h2>
            <textarea 
              rows={6}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5 text-gray-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all text-lg"
              placeholder="Dán một đoạn báo, essay hoặc bất kỳ văn bản tiếng Anh nào bạn muốn học..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            ></textarea>
            <div className="flex justify-end mt-4">
              <button 
                onClick={analyzeText}
                disabled={loading || !text}
                className="btn-primary py-3 px-8 text-lg rounded-xl flex items-center shadow-lg shadow-indigo-300 hover:shadow-indigo-400 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 transition-all"
              >
                {loading ? "AI đang đọc và bóc tách dữ liệu..." : <><Sparkles size={20} className="mr-2" /> Xử lý bằng LLM</>}
              </button>
            </div>
          </div>

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">Flashcard Từ Vựng <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full font-bold">{result.words.length} từ</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {result.words.map((w: any, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setFlippedWord(flippedWord === idx ? null : idx)}
                      className="relative h-48 cursor-pointer perspective-1000"
                    >
                      <div className={`w-full h-full transition-transform duration-500 transform-style-3d ${flippedWord === idx ? 'rotate-y-180' : ''}`}>
                        
                        <div className="absolute w-full h-full backface-hidden bg-white border-2 border-indigo-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 flex flex-col items-center justify-center p-6">
                           <h4 className="text-2xl font-black text-indigo-700 mb-2">{w.word}</h4>
                           <p className="text-gray-400 font-mono flex items-center"><PlayCircle size={16} className="mr-1"/> {w.phon}</p>
                           <span className="absolute top-3 right-3 px-2 py-1 bg-gray-100 text-xs font-bold text-gray-500 rounded-md">{w.level}</span>
                        </div>

                        <div className="absolute w-full h-full backface-hidden bg-indigo-600 rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 rotate-y-180 text-white text-center">
                           <h4 className="text-xl font-bold mb-3">{w.meaning}</h4>
                           <p className="text-indigo-200 text-sm italic border-t border-indigo-500/50 pt-3">"{w.example}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card bg-gradient-to-b from-white to-gray-50/50 border-0 shadow-lg shadow-gray-200/50 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Quiz Thử Thách</h3>
                
                {submitted && (
                  <div className={`mb-6 p-4 rounded-xl flex items-center ${score === result.quiz.length ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    <Trophy className="mr-3" size={28}/> 
                    <div>
                      <p className="font-bold text-lg">Bạn đã đạt {score}/{result.quiz.length} điểm!</p>
                      <p className="text-sm opacity-80">Bạn nhận được +{score * 10} Điểm KN</p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {result.quiz.map((q: any, i: number) => (
                    <div key={i} className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm">
                      <p className="font-bold text-gray-800 text-lg mb-4 flex items-start">
                        <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0">{i+1}</span> 
                        {q.q}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isSelected = answers[i] === optIdx;
                          let optClass = "border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer";
                          let icon = null;

                          if (submitted) {
                            if (optIdx === q.ans) {
                              optClass = "border-emerald-500 bg-emerald-50 cursor-default";
                              icon = <CheckCircle2 className="text-emerald-500" size={20} />;
                            } else if (isSelected) {
                              optClass = "border-red-500 bg-red-50 cursor-default";
                              icon = <XCircle className="text-red-500" size={20} />;
                            } else {
                              optClass = "border-gray-100 opacity-50 cursor-default";
                            }
                          } else if (isSelected) {
                            optClass = "border-indigo-500 bg-indigo-50 shadow-sm";
                          }

                          return (
                            <div key={optIdx} onClick={() => handleSelectAnswer(i, optIdx)} className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all ${optClass}`}>
                              <div className="flex items-center">
                                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex justify-center items-center ${isSelected ? 'border-indigo-600' : 'border-gray-300'}`}>
                                  {isSelected && !submitted && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                                </div>
                                <span className={submitted && optIdx === q.ans ? "text-emerald-700 font-bold" : "text-gray-700 font-medium"}>{opt}</span>
                              </div>
                              {icon}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                {!submitted && Object.keys(answers).length > 0 && (
                  <div className="mt-8 text-center">
                    <button onClick={handleSubmitQuiz} className="btn-primary flex mx-auto py-3 px-10 rounded-xl text-lg shadow-md hover:shadow-lg transition">Nộp Bài & Chấm Điểm</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card bg-white p-6 rounded-2xl shadow-md border-0">
             <div className="relative h-40 bg-gray-900 rounded-xl flex flex-col items-center justify-center overflow-hidden mb-6 group">
                <div className="text-white z-10 flex flex-col items-center">
                  <BrainCircuit className="mb-2 text-indigo-400 group-hover:scale-110 transition duration-300" size={32} />
                  <p className="font-bold">Đồ thị tư duy (Graph)</p>
                  <button className="mt-3 px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg backdrop-blur-md transition text-sm">Khám phá không gian 3D</button>
                </div>
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-black"></div>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #818cf8 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div>
             </div>

            <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b">Tiến độ tuần này</h3>
             <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">Từ mới đã học</span>
                  <span className="font-bold text-indigo-600">35 / 50</span>
                </div>
                <div className="w-full bg-indigo-50 rounded-full h-3 mb-6">
                  <div className="bg-indigo-600 h-3 rounded-full relative" style={{ width: '70%' }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border border-indigo-200"></div>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">Điểm Quiz trung bình</span>
                  <span className="font-bold text-emerald-600">8.5 / 10</span>
                </div>
                <div className="w-full bg-emerald-50 rounded-full h-3">
                  <div className="bg-emerald-500 h-3 rounded-full relative" style={{ width: '85%' }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border border-emerald-200"></div>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}