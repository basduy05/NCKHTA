"use client";
import React, { useState, useEffect } from "react";
import { 
  Newspaper, Search, BookOpen, Clock, Globe, Sparkles, 
  Bookmark, CheckCircle, ArrowLeft, Volume2, BookmarkCheck,
  ChevronRight, ExternalLink, Filter, Lightbulb
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ClickableText from "./ClickableText";
import WordPopup from "./WordPopup";

interface Article {
  title: string;
  content: string;
  url?: string;
  thumbnail?: string;
  source?: string;
  cefr_level?: string;
}

interface NewsTabProps {
  API_URL: string;
}

const CEFR_LEVELS = [
  { id: "ALL", label: "Tất cả trình độ", color: "bg-gray-100 text-gray-700" },
  { id: "A1", label: "A1 - Sơ cấp", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "A2", label: "A2 - Cơ bản", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "B1", label: "B1 - Trung cấp", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "B2", label: "B2 - Trung cao cấp", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "C1", label: "C1 - Nâng cao", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

const TOPICS = [
  { id: "general", label: "Tổng hợp" },
  { id: "science", label: "Khoa học" },
  { id: "technology", label: "Công nghệ" },
  { id: "environment", label: "Môi trường" },
  { id: "education", label: "Giáo dục" },
];

export default function NewsTab({ API_URL }: NewsTabProps) {
  const { authFetch } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState("B1");
  const [selectedTopic, setSelectedTopic] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Reader view state
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xl">("normal");
  const [readCompleted, setReadCompleted] = useState<Record<string, boolean>>({});

  // Popup lookup state
  const [popupWord, setPopupWord] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fetchNews = async () => {
    try {
      setLoading(true);
      const lvl = selectedLevel === "ALL" ? "B1" : selectedLevel;
      const res = await authFetch(`${API_URL}/student/news/reading?level=${lvl}&topic=${selectedTopic}&limit=6`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (err) {
      console.error("Error fetching news:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedLevel, selectedTopic]);

  const handleWordClick = (word: string, e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPos({
      x: rect.left,
      y: rect.bottom + window.scrollY,
    });
    setPopupWord(word);
  };

  const filteredArticles = articles.filter(a => 
    !searchQuery || 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fontSizeClass = {
    normal: "text-base leading-relaxed",
    large: "text-lg leading-loose",
    xl: "text-xl leading-loose",
  }[fontSize];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white p-6 md:p-8 shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <Newspaper size={14} className="text-amber-300" />
            <span>Đọc báo song ngữ & Tra từ tức thì</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Đọc báo tiếng Anh thực tế (Real-world English)
          </h1>
          <p className="text-blue-100 text-sm md:text-base leading-relaxed">
            Nâng cao vốn từ vựng và phản xạ ngữ pháp qua tin tức quốc tế. 
            <span className="font-semibold text-amber-200"> Nhấp chuột trực tiếp vào bất kỳ từ nào</span> để xem phiên âm, nghĩa tiếng Việt và lưu ngay vào sổ tay FSRS.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none transform translate-x-8 translate-y-8">
          <Globe size={240} />
        </div>
      </div>

      {/* Reader Modal / View */}
      {activeArticle ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Reader Top Bar */}
          <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => { setActiveArticle(null); setPopupWord(null); }}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ArrowLeft size={16} /> Quay lại danh sách bài báo
            </button>

            <div className="flex items-center gap-3">
              {/* Font size control */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 text-xs font-medium">
                <button
                  onClick={() => setFontSize("normal")}
                  className={`px-2.5 py-1 rounded-md transition ${fontSize === "normal" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize("large")}
                  className={`px-2.5 py-1 rounded-md transition text-sm ${fontSize === "large" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"}`}
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSize("xl")}
                  className={`px-2.5 py-1 rounded-md transition text-base font-bold ${fontSize === "xl" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500"}`}
                >
                  A++
                </button>
              </div>

              {/* Mark as read */}
              <button
                onClick={() => setReadCompleted(prev => ({ ...prev, [activeArticle.title]: !prev[activeArticle.title] }))}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  readCompleted[activeArticle.title]
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-600"
                }`}
              >
                <CheckCircle size={15} />
                {readCompleted[activeArticle.title] ? "Đã hoàn thành bài đọc" : "Đánh dấu đã đọc"}
              </button>
            </div>
          </div>

          <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200">
                CEFR {activeArticle.cefr_level || selectedLevel}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Globe size={13} /> {activeArticle.source || "International News"}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={13} /> ~3 phút đọc
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
              {activeArticle.title}
            </h1>

            {/* Hint alert */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 text-amber-800 dark:text-amber-300 text-xs">
              <Lightbulb size={18} className="shrink-0 text-amber-600" />
              <span>
                <strong>Mẹo luyện đọc:</strong> Bấm vào bất kỳ từ tiếng Anh nào trong văn bản dưới đây để tra từ điển tức thì, nghe phát âm và bấm <strong>"Lưu vào sổ tay"</strong> để ôn tập lặp lại ngắt quãng (FSRS)!
              </span>
            </div>

            {/* Thumbnail if present */}
            {activeArticle.thumbnail && (
              <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 max-h-96">
                <img
                  src={activeArticle.thumbnail}
                  alt={activeArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Article Content with ClickableText */}
            <div className={`prose dark:prose-invert max-w-none pt-4 text-gray-800 dark:text-gray-200 ${fontSizeClass}`}>
              <ClickableText
                content={activeArticle.content}
                onWordClick={handleWordClick}
                className="leading-relaxed"
              />
            </div>

            {/* Read External Link */}
            {activeArticle.url && (
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <a
                  href={activeArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Xem bài gốc trên nguồn báo chí <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Articles List & Filters */
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài báo, từ khóa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Topic Select */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <Filter size={15} className="text-gray-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-500 shrink-0">Chủ đề:</span>
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition ${
                      selectedTopic === t.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CEFR Level Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-500 shrink-0">Cấp độ CEFR:</span>
              <div className="flex items-center gap-2">
                {CEFR_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                      selectedLevel === lvl.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-72 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Newspaper size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Không tìm thấy bài báo phù hợp</h3>
              <p className="text-sm text-gray-500 mt-1">Hãy thử chọn chủ đề hoặc cấp độ CEFR khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, idx) => (
                <div
                  key={idx}
                  onClick={() => { setActiveArticle(article); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail */}
                    {article.thumbnail ? (
                      <div className="h-44 overflow-hidden relative">
                        <img
                          src={article.thumbnail}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-black/60 text-white backdrop-blur-md shadow">
                            {article.cefr_level || selectedLevel}
                          </span>
                        </div>
                        {readCompleted[article.title] && (
                          <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full shadow">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-28 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-850 p-4 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white">
                          {article.cefr_level || selectedLevel}
                        </span>
                        <BookOpen className="text-blue-300" size={24} />
                      </div>
                    )}

                    {/* Content preview */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <span>{article.source || "Tin tức"}</span>
                        <span>•</span>
                        <span>~3 phút đọc</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition line-clamp-2 text-base mb-2">
                        {article.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                        {article.content}
                      </p>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="px-5 pb-4 pt-2 border-t border-gray-50 dark:border-gray-850 flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Đọc & Tra từ <ChevronRight size={14} />
                    </span>
                    <span className="text-[11px] text-gray-400">Click to lookup</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Word Popup */}
      {popupWord && (
        <WordPopup
          word={popupWord}
          position={popupPos}
          onClose={() => setPopupWord(null)}
          API_URL={API_URL}
        />
      )}
    </div>
  );
}
