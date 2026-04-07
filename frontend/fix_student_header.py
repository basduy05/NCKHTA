import codecs

path = r'C:/Users/basdu/Downloads/NCKHTA/frontend/app/dashboard/student/IpaTab.tsx'
with codecs.open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Tone down the top lesson Header
code = code.replace('rounded-[3rem] p-12 text-white', 'rounded-[2rem] p-8 lg:p-10 text-white')
code = code.replace('w-32 h-32 rounded-[2.5rem]', 'w-24 h-24 lg:w-28 lg:h-28 rounded-3xl')
code = code.replace('size={48}', 'size={40}')
code = code.replace('px-6 py-2', 'px-5 py-1.5')
code = code.replace('mb-6 italic', 'mb-4 italic shadow-sm')
code = code.replace('text-6xl font-black mb-4', 'text-4xl lg:text-5xl font-black mb-3')
code = code.replace('text-2xl text-blue-100/80', 'text-lg lg:text-xl text-blue-100/90')

with codecs.open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated student IpaTab.tsx header")