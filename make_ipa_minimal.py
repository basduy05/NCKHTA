import re
import codecs

filepath = 'frontend/app/dashboard/student/IpaTab.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    text = f.read()

# Make the section box minimal
text = text.replace('className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden"', 'className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm relative"')
text = text.replace('<div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />', '')

# Make generate button minimal
old_btn = 'className="bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-4 lg:px-14 lg:py-5 rounded-full font-black text-[17px] sm:text-xl text-white flex items-center gap-3 shadow-xl hover:shadow-blue-300 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:hover:translate-y-0"'
new_btn = 'className="bg-indigo-600 hover:bg-indigo-700 px-10 py-3 rounded-xl font-semibold text-white flex items-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"'
text = text.replace(old_btn, new_btn)

# Make Target Header minimal
old_target = """<header className="bg-gradient-to-br from-indigo-950 to-blue-900 rounded-[2rem] p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden">
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
              </header>"""

new_target = """<div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                  <button 
                    onClick={() => speak(lesson.lesson_title || lesson.target_ipa || "Pronunciation Lesson")} 
                    className="bg-indigo-50 border border-indigo-100 w-20 h-20 rounded-2xl flex items-center justify-center hover:bg-indigo-100 transition-colors shrink-0"
                  >
                    <Volume2 size={32} className="text-indigo-600" />
                  </button>
                  <div className="flex-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-md text-xs font-bold text-gray-600 mb-3">
                         <Sparkles size={12} className="text-indigo-500" /> Phân tích bởi AI
                      </div>
                      <h2 className="text-3xl font-bold mb-2 text-gray-900">{lesson.lesson_title || (lesson.target_ipa ? `Âm mục tiêu: /${lesson.target_ipa}/` : "Your Lesson")}</h2>
                      <p className="text-base text-gray-600 leading-relaxed max-w-3xl">{lesson.introduction || renderValue(lesson.description_vn)}</p>
                  </div>
              </div>"""
text = text.replace(old_target, new_target)

# Make Quiz Header minimal
text = text.replace('className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-xl relative overflow-hidden"', 'className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden"')
text = text.replace('<div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />', '')
text = text.replace('className="text-4xl font-black text-gray-900 mb-12 flex items-center gap-5"', 'className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3"')
text = text.replace('className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center text-blue-700 shadow-inner"', 'className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner"')

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(text)
print("Updated to Minimalist UI")
