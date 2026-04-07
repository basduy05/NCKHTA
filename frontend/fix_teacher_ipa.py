import codecs

path = r'C:/Users/basdu/Downloads/NCKHTA/frontend/app/dashboard/teacher/IpaTab.tsx'
with codecs.open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Reduce big wrapper padding
code = code.replace('bg-indigo-900 rounded-[2.5rem] p-10 text-white shadow-2xl animate-in', 'bg-gradient-to-br from-indigo-900 to-purple-900 rounded-[2rem] p-6 lg:p-8 text-white shadow-2xl animate-in')

# Reduce title margins/sizes
code = code.replace('text-4xl font-black mb-2 flex', 'text-3xl md:text-4xl font-black mb-2 flex')
code = code.replace('mb-10', 'mb-6 md:mb-8')

# Add decorative background
if 'Decorative background glow' not in code:
    code = code.replace('        </div>\n      )}\n    </div>', '          {/* Decorative background glow */}\n          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />\n        </div>\n      )}\n    </div>')

# Reduce inner card sizes
code = code.replace('rounded-3xl p-8', 'rounded-2xl p-6')
code = code.replace('gap-8', 'gap-6')
code = code.replace('text-xl font-black mb-6 flex', 'text-xl font-black mb-4 flex')
code = code.replace('text-xl font-black mb-6', 'text-xl font-black mb-4')
code = code.replace('space-y-6', 'space-y-4 md:space-y-6')

# Enhance list items
code = code.replace('w-6 h-6', 'w-5 h-5 p-0.5')
code = code.replace('text-xs font-black', 'text-[10px] sm:text-xs font-black mt-0.5')
code = code.replace('text-base leading-relaxed', 'text-sm sm:text-base leading-relaxed')

with codecs.open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated teacher IpaTab.tsx layout")
