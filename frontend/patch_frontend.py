import sys

code = """
// ==================== GRAMMAR TAB ====================
function GrammarTab({ token }: { token: string | null }) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    setLoading(true);
    try { 
      const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
      const res = await fetch(`${API_URL}/${prefix}/grammar`, { headers: { Authorization: `Bearer ${token}` } }); 
      if (!res.ok) throw new Error(`API error ${res.status}`); 
      const data = await res.json(); 
      setRules(Array.isArray(data) ? data : []); 
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center"><BookText className="mr-2 text-teal-600" /> Kho Ngữ Pháp (Grammar Rules)</h2>
        <p className="text-gray-500 text-sm">Học các cấu trúc ngữ pháp và xem các tài liệu do giáo viên chia sẻ.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-4">Danh sách Ngữ pháp</h3>
        {loading ? <p className="text-gray-400 text-sm">Đang tải...</p> : rules.length === 0 ? <p className="text-gray-400 text-sm">Chưa có tài liệu ngữ pháp nào.</p> : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((r: any) => {
               const prefix = typeof window !== "undefined" && window.location.href.includes("/teacher") ? "teacher" : "student";
               return (
              <li key={r.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h4 className="font-bold text-lg text-teal-700">{r.name}</h4>
                    {r.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{r.description}</p>}
                  </div>
                  {r.file_name && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <a href={`${API_URL}/${prefix}/grammar/${r.id}/file`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                         {r.file_name}
                      </a>
                    </div>
                  )}
                </div>
              </li>
            )})}
          </ul>
        )}
      </div>
    </div>
  )
}
"""

for target in ['app/dashboard/student/page.tsx', 'app/dashboard/teacher/page.tsx']:
    with open(target, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'function GrammarTab(' not in content:
        with open(target, 'a', encoding='utf-8') as f:
            f.write('\\n' + code)
        print('Appended to', target)
    else:
        print('Already in', target)
