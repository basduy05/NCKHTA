import re
import codecs

filepath = 'frontend/app/dashboard/student/IpaTab.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    content = f.read()

# 1. Add customWords state
if 'const [customWords, setCustomWords] = useState("");' not in content:
    content = content.replace(
        'const [focus, setFocus] = useState("vowels");',
        'const [focus, setFocus] = useState("vowels");\n  const [customWords, setCustomWords] = useState("");'
    )

# 2. Update generateLesson body
old_generate = """const res = await authFetch(`${API_URL}/student/ipa/generate`, {
        method: "POST",
        body: JSON.stringify({ focus })
      });"""

new_generate = """const bodyPayload: any = { focus };
      const wordsList = customWords.split(',').map(w => w.trim()).filter(Boolean);
      if (wordsList.length > 0) {
         bodyPayload.words = wordsList;
      }
      
      const res = await authFetch(`${API_URL}/student/ipa/generate`, {
        method: "POST",
        body: JSON.stringify(bodyPayload)
      });"""

content = content.replace(old_generate, new_generate)

# 3. Update the rendering logic
return_index = content.find('  return (')

new_return = """  return (
    <div className="space-y-8 pb-12 w-full">
      <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row gap-6 mb-8 justify-between items-start md:items-end border-b border-gray-100 pb-8">
            <div className="flex flex-wrap lg:inline-flex bg-gray-100/80 p-2 rounded-[1.5rem] gap-2 items-center">
              {["vowels", "diphthongs", "consonants"].map(type => (
                  <button 
                    key={type}
                    onClick={() => setFocus(type)}
                    className={`px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all text-sm
                      ${focus === type 
                        ? "bg-white text-blue-600 shadow-md scale-[1.02]" 
                        : "text-gray-500 hover:text-blue-500 hover:bg-white/50"}`}
                  >
                      {type === "vowels" ? "Vowels" : type === "diphthongs" ? "Diphthongs" : "Consonants"}
                  </button>
              ))}
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                 <Sparkles size={16} className="text-blue-500" />
                 Luyện theo từ vựng (tuỳ chọn)
              </label>
              <input 
                type="text" 
                value={customWords} 
                onChange={e => setCustomWords(e.target.value)} 
                placeholder="Ví dụ: apple, banana, car..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-gray-700"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {(IPA_DATA as any)[focus].map((item: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => speak(item.example)}
                    className="bg-white border border-gray-100 p-4 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group relative flex flex-col items-center justify-center min-h-[100px] overflow-hidden"
                  >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Volume2 size={14} /></div>
                      </div>
                      <span className="text-3xl font-black text-blue-800 mb-1 group-hover:scale-110 transition-transform">/{item.ipa}/</span>
                      <span className="text-xs text-gray-400 font-bold uppercase group-hover:text-blue-600 transition-colors">{item.example}</span>
                      <span className="text-[10px] text-gray-300 font-medium mt-0.5 tracking-widest hidden group-hover:block transition-all">/{item.transcription}/</span>
                  </button>
              ))}
          </div>

          <div className="mt-10 flex justify-center">
              <button 
                onClick={generateLesson}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-4 lg:px-14 lg:py-5 rounded-full font-black text-[17px] sm:text-xl text-white flex items-center gap-3 shadow-xl hover:shadow-blue-300 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? <div className="animate-spin rounded-full h-6 w-6 border-4 border-white/30 border-t-white" /> : <Brain size={28} />}
                GENERATE LESSON WITH AI
              </button>
          </div>
        </div>
      </section>

      {lesson && (
          <div className="space-y-8 lg:space-y-10 animate-in fade-in slide-in-from-bottom-12 duration-700">
              <header className="bg-gradient-to-br from-indigo-950 to-blue-900 rounded-[2rem] p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
                      <button 
                        onClick={() => speak(lesson.lesson_title || lesson.target_ipa || "Pronunciation Lesson")} 
                        className="bg-white/10 backdrop-blur-md border border-white/20 w-24 h-24 lg:w-28 lg:h-28 rounded-3xl flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all shrink-0 shadow-xl"
                      >
                        <Volume2 size={40} className="text-blue-200" />
                      </button>
                      <div className="flex-1">
                          <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs font-black uppercase tracking-wider text-blue-300 mb-4 italic shadow-sm">
                             <Sparkles size={14} /> AI Pronunciation Guide
                          </div>
                          <h2 className="text-4xl lg:text-5xl font-black mb-3">{lesson.lesson_title || (lesson.target_ipa ? `Target: /${lesson.target_ipa}/` : "Your Lesson")}</h2>
                          <p className="text-lg lg:text-xl text-blue-100/90 font-medium leading-relaxed max-w-3xl">{lesson.introduction || renderValue(lesson.description_vn)}</p>
                      </div>
                  </div>
                  <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                  <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                      <h4 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shadow-inner"><CheckCircle2 size={24} /></div>
                        Core Vocabulary / Sounds
                      </h4>
                      <div className="space-y-4">
                          {(lesson.sounds || lesson.examples || []).map((ex: any, i: number) => {
                              // Handle both new backend ('sounds' with example_words array) and old backend ('examples' with single word)
                              if (ex.example_words && Array.isArray(ex.example_words)) {
                                  return (
                                     <div key={i} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 gap-4 hover:border-blue-100 transition-all">
                                         <div className="flex items-center justify-between mb-3 border-b border-gray-200/60 pb-3">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => speak(ex.name)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-gray-100"><Volume2 size={16} /></button>
                                                <span className="text-2xl font-black text-blue-800">{ex.symbol}</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-500 uppercase">{ex.name}</span>
                                         </div>
                                         <p className="text-sm text-gray-600 italic mb-4 leading-relaxed">{ex.description}</p>
                                         <div className="flex flex-wrap gap-2">
                                            {ex.example_words.map((w: string, wi: number) => (
                                                <button key={wi} onClick={() => speak(w)} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 shadow-sm hover:border-blue-400 hover:text-blue-600 flex items-center gap-2">
                                                   {w} <span className="font-mono text-xs text-blue-500 opacity-70">{ex.example_ipa && ex.example_ipa[wi] ? ex.example_ipa[wi] : ''}</span>
                                                </button>
                                            ))}
                                         </div>
                                     </div>
                                  );
                              }
                              
                              // Fallback for old format
                              return (
                                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 lg:p-5 bg-gray-50/50 rounded-2xl hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100 group/item gap-4">
                                      <div className="flex items-center gap-4">
                                          <button onClick={() => speak(ex.word)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100 group-hover/item:scale-110 transition-transform shrink-0"><Volume2 size={20} /></button>
                                          <div>
                                              <p className="text-xl font-black text-gray-900 uppercase tracking-tight">{ex.word}</p>
                                              <p className="text-sm text-blue-500 font-bold font-mono">/{ex.ipa}/</p>
                                          </div>
                                      </div>
                                      <p className="text-[15px] font-black text-gray-400 uppercase sm:text-right">{renderValue(ex.meaning_vn)}</p>
                                  </div>
                              );
                          })}
                      </div>
                      
                      {/* Minimal Pairs support for new backend */}
                      {lesson.minimal_pairs && lesson.minimal_pairs.length > 0 && (
                          <div className="mt-8 pt-8 border-t border-gray-100">
                             <h5 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Sparkles size={18} className="text-blue-500"/> Minimal Pairs</h5>
                             <div className="space-y-3">
                                {lesson.minimal_pairs.map((mp: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                        <div className="flex-1 flex justify-center gap-2 items-center">
                                           <div className="text-center group cursor-pointer" onClick={() => speak(mp.word1)}>
                                              <p className="font-black text-gray-900 group-hover:text-blue-600">{mp.word1}</p>
                                              <p className="text-xs font-mono text-blue-500">{mp.ipa1}</p>
                                           </div>
                                           <div className="px-4 text-gray-300 font-black italic">VS</div>
                                           <div className="text-center group cursor-pointer" onClick={() => speak(mp.word2)}>
                                              <p className="font-black text-gray-900 group-hover:text-blue-600">{mp.word2}</p>
                                              <p className="text-xs font-mono text-blue-500">{mp.ipa2}</p>
                                           </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                          </div>
                      )}
                  </div>

                  <div className="bg-white p-6 lg:p-8 rounded-[2rem] border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full">
                      <h4 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner"><Info size={24} /></div>
                        Interactive Use
                      </h4>
                      <div className="space-y-4">
                        {lesson.practice_sentences?.map((item: any, i: number) => {
                            const sentence = typeof item === 'string' ? item : (item.sentence || item.text);
                            const answer = typeof item === 'object' ? (item.answer || item.focus_word) : "";
                            
                            return (
                                <div key={i} className="p-5 lg:p-6 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3 relative group/sent">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover/sent:opacity-100 transition-all">
                                      <button onClick={() => speak(sentence.replace("[blank]", answer))} className="text-indigo-600 hover:scale-110 transition-transform p-2 bg-white rounded-xl shadow-sm border border-indigo-50">
                                          <Volume2 size={18} />
                                      </button>
                                    </div>
                                    <div className="pr-10">
                                      {sentence.includes("[blank]") ? (
                                        <SentenceWithBlank 
                                          sentence={sentence} 
                                          correctAnswer={answer} 
                                          onCorrect={() => setPracticeResults(p => ({...p, [i]: true}))}
                                        />
                                      ) : (
                                        <p className="text-xl font-bold text-gray-800 leading-relaxed italic">"{sentence}"</p>
                                      )}
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                  </div>
              </div>

              {lesson.quiz && lesson.quiz.length > 0 && (
                  <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                      <h3 className="text-4xl font-black text-gray-900 mb-12 flex items-center gap-5">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center text-blue-700 shadow-inner"><Brain size={36} /></div>
                          Phonetic Quiz
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
                          </div>
                      )}
                  </div>
              )}
          </div>
      )}
    </div>
  );
}"""

content = content[:return_index] + new_return
with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(content)
print("Updated student IPA Tab")
