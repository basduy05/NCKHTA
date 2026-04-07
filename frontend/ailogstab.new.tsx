function AILogsTab() {
  const { token, authFetch } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    
    try {
      const [logsRes, statsRes] = await Promise.all([
        authFetch(`${API_URL}/admin/ai-logs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`),
        authFetch(`${API_URL}/admin/ai-stats`)
      ]);
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        setTotal(logsData.total || 0);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Error fetching AI logs/stats:", err);
    } finally {
      if (!isBackground) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh interval (10 seconds)
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [token, page]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tổng yêu cầu</p>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Sparkles size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{total.toLocaleString()}</h3>
          <p className="text-xs text-gray-500 mt-2">Dữ liệu từ lúc triển khai monitoring</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tốc độ TB (Latency)</p>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">
            {stats?.model_performance?.length > 0
              ? Math.round(stats.model_performance.filter(s => s.model !== 'KnowledgeGraph').reduce((acc, s) => acc + s.avg_latency, 0) / Math.max(1, stats.model_performance.filter(s => s.model !== 'KnowledgeGraph').length))
              : 0} ms
          </h3>
          <p className="text-xs text-gray-500 mt-2">Trung bình cộng của tất cả LLM</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Truy vấn Graph</p>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Network size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">
            {stats?.model_performance?.find(s => s.model === 'KnowledgeGraph')?.avg_latency 
                ? Math.round(stats.model_performance.find(s => s.model === 'KnowledgeGraph').avg_latency) 
                : 0} ms
          </h3>
          <p className="text-xs text-gray-500 mt-2">Tốc độ tìm kiếm tri thức (Neo4j)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chất lượng AI</p>
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><GraduationCap size={20} /></div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">
            {stats?.feature_performance?.length > 0
              ? (stats.feature_performance.reduce((acc, f) => acc + (f.avg_score || 0), 0) / stats.feature_performance.filter(f => f.avg_score).length || 0).toFixed(1)
              : 0} / 10
          </h3>
          <p className="text-xs text-gray-500 mt-2">Điểm trung bình từ Giám khảo AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full max-h-[350px] flex flex-col flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center shrink-0"><Database className="mr-2 text-indigo-600" /> Hiệu năng theo Model</h2>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                  <th className="pb-3 pt-2">Model</th>
                  <th className="pb-3 pt-2">Độ khó</th>
                  <th className="pb-3 pt-2">Latency TB</th>
                  <th className="pb-3 pt-2">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {stats?.model_performance?.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition min-h-[40px]">
                    <td className="py-3 font-black text-gray-700">
                      {s.model === 'KnowledgeGraph' ? (
                        <span className="flex items-center text-purple-600"><Network size={14} className="mr-1" /> Knowledge Graph</span>
                      ) : s.model}
                    </td>
                    <td className="py-3 capitalize text-gray-500 font-bold">{s.difficulty || "N/A"}</td>
                    <td className="py-3">
                      <span className={`font-black ${s.avg_latency > 5000 ? 'text-red-500' : s.avg_latency > 2000 ? 'text-orange-500' : 'text-green-500'}`}>
                        {Math.round(s.avg_latency).toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 font-bold text-gray-400">{s.total_requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full max-h-[350px] flex flex-col flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center shrink-0"><Activity className="mr-2 text-indigo-600" /> Hiệu năng theo Tính năng</h2>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                  <th className="pb-3 pt-2">Tính năng</th>
                  <th className="pb-3 pt-2">Latency TB</th>
                  <th className="pb-3 pt-2">Tỷ lệ OK</th>
                  <th className="pb-3 pt-2">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {stats?.feature_performance?.map((f, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition min-h-[40px]">
                    <td className="py-3 font-black text-gray-700">{f.feature}</td>
                    <td className="py-3">
                      <span className={`font-black ${f.avg_latency > 10000 ? 'text-red-500' : f.avg_latency > 3000 ? 'text-orange-500' : 'text-green-500'}`}>
                        {Math.round(f.avg_latency).toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 font-bold">
                       <span className={f.success_count / (f.total_requests || 1) < 0.8 ? 'text-red-500' : 'text-gray-600'}>
                        {Math.round((f.success_count / (f.total_requests || 1)) * 100)}%
                       </span>
                    </td>
                    <td className="py-3 font-bold text-gray-400">{f.total_requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Log Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col flex-1">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <ClipboardList className="mr-2 text-indigo-600" /> Log chi tiết gần đây 
            {refreshing && <span className="ml-3 text-[10px] bg-green-100 text-green-700 font-bold px-2 flex items-center rounded-full animate-pulse transition"><RefreshCw size={10} className="mr-1 animate-spin" /> Live Data</span>}
          </h2>
          <button onClick={() => fetchData(false)} disabled={loading || refreshing} className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 border border-indigo-100 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
             <RefreshCw size={14} className={loading || refreshing ? "animate-spin" : ""} /> Làm mới ngay
          </button>
        </div>
        
        <div className="overflow-y-auto overflow-x-auto max-h-[500px] flex-1 custom-scrollbar bg-gray-50/30 rounded-xl border border-gray-50">
          {loading && logs.length === 0 ? (
             <div className="flex items-center justify-center h-48 text-indigo-400">Đang tải dữ liệu...</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse relative min-w-[800px]">
              <thead className="sticky top-0 bg-white shadow-sm z-20 outline outline-1 outline-gray-100">
                <tr className="border-b border-gray-200 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                  <th className="py-3 px-4 w-32">Thời gian</th>
                  <th className="py-3 px-4 w-40">Tính năng</th>
                  <th className="py-3 px-4 w-36">Model</th>
                  <th className="py-3 px-4 w-20 text-center">Referee</th>
                  <th className="py-3 px-4 w-1/3">Feedback</th>
                  <th className="py-3 px-4 w-28">Latency</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 text-[11px] whitespace-nowrap">{l.created_at}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="bg-indigo-50 px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-700 tracking-tight">
                        {l.feature || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-gray-700 text-[11px] truncate max-w-[150px]">{l.model}</td>
                    <td className="py-3 px-4 text-center">
                      {l.eval_score ? (
                        <span className={`px-2.5 py-1 rounded-md font-black text-[10px] ${
                          l.eval_score >= 8 ? 'bg-green-100 text-green-800' : 
                          l.eval_score >= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {l.eval_score}/10
                        </span>
                      ) : <span className="text-gray-300 font-bold">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[11px] text-gray-600 line-clamp-2 leading-tight" title={l.eval_feedback}>
                        {l.eval_feedback || (l.error_message ? <span className="text-red-500 font-medium">Error: {l.error_message}</span> : "-")}
                      </p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-bold text-[11px] ${l.latency_ms > 8000 ? 'text-red-500' : l.latency_ms > 3000 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {l.latency_ms.toLocaleString()} ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        l.status === 'success' ? 'bg-green-100 text-green-700' : 
                        l.status === 'evaluated' ? 'bg-blue-100 text-blue-700' : 
                        l.status === 'fallback' ? 'bg-orange-100 text-orange-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        <div className="flex justify-between items-center mt-6 shrink-0 border-t border-gray-100 pt-4">
          <button 
            disabled={page === 0} 
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Trang trước
          </button>
          <span className="text-sm font-medium text-gray-500 bg-gray-50 px-4 py-1.5 rounded-lg border border-gray-100">
            {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <button 
            disabled={(page + 1) * PAGE_SIZE >= total} 
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Trang sau
          </button>
        </div>
      </div>
    </div>
  );
}
