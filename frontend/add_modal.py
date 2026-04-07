import re
import codecs

path = 'C:/Users/basdu/Downloads/NCKHTA/frontend/app/dashboard/admin/page.tsx'

with codecs.open(path, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('function AILogsTab()')
if start == -1:
    print('AILogsTab not found')
    exit(1)

with codecs.open('C:/Users/basdu/Downloads/NCKHTA/frontend/ailogstab.new.tsx', 'r', encoding='utf-8') as f:
    ailogs_text = f.read()

# Add the selectedFeedback state
ailogs_text = ailogs_text.replace(
    'const [page, setPage] = useState(0);',
    'const [page, setPage] = useState(0);\n  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);\n  const [copied, setCopied] = useState(false);'
)

# Function to copy feedback
copy_func = '''
  const handleCopyFeedback = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };
'''
ailogs_text = ailogs_text.replace('const PAGE_SIZE = 50;', 'const PAGE_SIZE = 50;\n' + copy_func)

# Make feedback column clickable
ailogs_text = ailogs_text.replace(
    '<td className="py-3 px-4">',
    '<td className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition rounded" onClick={() => setSelectedFeedback(l.eval_feedback || l.error_message)}>'
)

# Add the Modal at the end, right before the last closing div of the return
modal_jsx = '''
      {/* Feedback Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedFeedback(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <ClipboardList className="mr-2 text-indigo-600" size={20} />
                Chi tiết Feedback
              </h3>
              <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 m-4 rounded-xl border border-gray-100">
              {selectedFeedback}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-2xl">
              <button 
                onClick={() => handleCopyFeedback(selectedFeedback)}
                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                {copied ? <><Check size={16} /> Đã copy</> : <><Copy size={16} /> Copy Text</>}
              </button>
              <button 
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}'''
ailogs_text = ailogs_text.replace('    </div>\n  );\n}', modal_jsx)

# add the Copy icon to the imports if it's not there
import_idx = text.find('import {')
if text.find('Copy,') == -1 and text.find(' Copy ') == -1:
    text = text.replace('import { ', 'import { Copy, ')

patched = text[:start] + ailogs_text

with codecs.open(path, 'w', encoding='utf-8') as f:
    f.write(patched)

print('Patched page.tsx with feedback modal')
