import Link from "next/link";
import Image from "next/image";
import { BookOpen, Users, ShieldCheck, Brain, Network, Sparkles, GraduationCap, BarChart3, CheckCircle2, ArrowRight, ChevronRight, Globe, Zap, Target, TrendingUp, Play } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">

      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="iEdu" width={90} height={36} priority />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition">Tính năng</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition">Cách hoạt động</a>
            <a href="#tech" className="hover:text-blue-600 transition">Công nghệ</a>
            <Link href="/about" className="hover:text-blue-600 transition">Giới thiệu</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition px-4 py-2">Đăng nhập</Link>
            <Link href="/register" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg transition shadow-sm">Đăng ký</Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-100 rounded-full blur-3xl opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center bg-blue-50 border border-blue-100 rounded-full px-4 py-2 text-sm text-blue-700 font-medium">
                <Sparkles size={16} className="mr-2" /> Nghiên cứu Khoa học Công nghệ Ứng dụng 2025
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
                Học tiếng Anh <br />
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">thông minh hơn</span><br />
                với AI
              </h1>
              <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
                Nền tảng kết hợp <strong>Đồ thị Tri thức</strong> và <strong>Trí tuệ Nhân tạo</strong> giúp bạn học từ vựng, ngữ pháp hiệu quả gấp nhiều lần.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition shadow-lg shadow-blue-200 hover:shadow-xl">
                  Bắt đầu miễn phí <ArrowRight size={20} />
                </Link>
                <Link href="/about" className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-lg transition border border-gray-200 shadow-sm">
                  <Play size={20} /> Tìm hiểu thêm
                </Link>
              </div>
              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-500 pt-2">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> Miễn phí</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> AI Gemini</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> Knowledge Graph</span>
              </div>
            </div>
            
            {/* Hero Visual */}
            <div className="flex-1 relative">
              <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-inner">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-400 ml-2">iEdu Platform</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-blue-600 mb-1">AI Phân tích văn bản</p>
                      <p className="text-sm text-gray-700">&quot;The cat sat on the mat&quot;</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-green-600">cat</p>
                        <p className="text-[10px] text-gray-500">noun • A1</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-purple-600">sat</p>
                        <p className="text-[10px] text-gray-500">verb • A1</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-orange-600">mat</p>
                        <p className="text-[10px] text-gray-500">noun • A1</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                      <Network size={18} className="text-blue-500" />
                      <div className="flex-1">
                        <div className="flex gap-1">
                          {["cat", "→", "kitten", "→", "pet", "→", "animal"].map((w, i) => (
                            <span key={i} className={`text-xs ${i % 2 === 0 ? "bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium" : "text-gray-400"}`}>{w}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
                  <Brain size={18} className="text-purple-500" />
                  <span className="text-sm font-semibold text-gray-800">Gemini AI</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
                  <Network size={18} className="text-blue-500" />
                  <span className="text-sm font-semibold text-gray-800">Neo4j Graph</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "AI", label: "Tạo bài tập tự động" },
            { value: "Graph", label: "Đồ thị tri thức" },
            { value: "CEFR", label: "Phân loại trình độ" },
            { value: "24/7", label: "Truy cập mọi lúc" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-gray-600 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Tính năng nổi bật</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">Tất cả trong một nền tảng</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">Công cụ toàn diện cho giáo viên và học sinh, được hỗ trợ bởi AI tiên tiến</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Brain, title: "Phân tích Văn bản AI", desc: "Dán bất kỳ đoạn văn nào, AI tự động trích xuất từ vựng, phân loại CEFR và phân tích cấu trúc ngữ pháp.", color: "blue", gradient: "from-blue-500 to-blue-600" },
            { icon: Network, title: "Đồ thị Tri thức", desc: "Trực quan hóa mạng lưới từ vựng: đồng nghĩa, trái nghĩa, collocation, word family trên đồ thị tương tác.", color: "cyan", gradient: "from-cyan-500 to-blue-500" },
            { icon: GraduationCap, title: "Trắc nghiệm AI", desc: "AI tự động tạo câu hỏi đa dạng từ nội dung bài học, đánh giá năng lực và đưa ra gợi ý cải thiện.", color: "purple", gradient: "from-purple-500 to-purple-600" },
            { icon: Users, title: "Quản lý Lớp học", desc: "Giáo viên tạo lớp, ghi danh học sinh, giao bài tập, theo dõi tiến độ học tập theo thời gian thực.", color: "green", gradient: "from-green-500 to-green-600" },
            { icon: BarChart3, title: "Theo dõi Kết quả", desc: "Dashboard chi tiết hiển thị điểm số, tiến độ hoàn thành bài tập, thống kê từ vựng đã học.", color: "orange", gradient: "from-orange-500 to-orange-600" },
            { icon: Sparkles, title: "Flashcard Thông minh", desc: "Hệ thống flashcard kết hợp spaced repetition, giúp ghi nhớ từ vựng lâu dài và hiệu quả.", color: "pink", gradient: "from-pink-500 to-pink-600" },
          ].map((f, i) => (
            <div key={i} className="group relative bg-white p-8 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300">
              <div className={`w-14 h-14 bg-gradient-to-br ${f.gradient} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <f.icon size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
              <p className="text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="bg-gradient-to-b from-gray-50 to-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Quy trình</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">3 bước đơn giản</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Bắt đầu học tập thông minh chỉ trong vài phút</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Đăng ký tài khoản", desc: "Tạo tài khoản miễn phí với email, chọn vai trò Học sinh hoặc Giáo viên.", icon: Target },
              { step: "02", title: "Nhập nội dung học", desc: "Dán văn bản tiếng Anh hoặc chọn bài học có sẵn. AI sẽ phân tích và trích xuất kiến thức.", icon: Zap },
              { step: "03", title: "Học & Luyện tập", desc: "Khám phá đồ thị tri thức, làm bài trắc nghiệm AI, ôn tập với flashcard thông minh.", icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{s.step}</span>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <s.icon size={24} className="text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-5 transform -translate-y-1/2 z-10">
                    <ChevronRight size={24} className="text-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECH SECTION ===== */}
      <section id="tech" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Công nghệ</span>
            <h2 className="text-4xl font-extrabold text-gray-900 leading-tight">
              Xây dựng trên nền tảng<br />
              <span className="text-blue-600">công nghệ hiện đại</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              iEdu sử dụng các công nghệ tiên tiến nhất trong lĩnh vực AI và phát triển web để mang lại trải nghiệm học tập tối ưu.
            </p>
            <div className="space-y-4">
              {[
                { label: "Google Gemini AI", desc: "Mô hình ngôn ngữ lớn cho phân tích và tạo nội dung" },
                { label: "Neo4j Knowledge Graph", desc: "Đồ thị tri thức lưu trữ quan hệ ngữ nghĩa" },
                { label: "Next.js + FastAPI", desc: "Kiến trúc hiện đại, hiệu năng cao" },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={22} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{t.label}</p>
                    <p className="text-sm text-gray-500">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Next.js 14", cat: "Frontend", color: "bg-black text-white" },
                { name: "FastAPI", cat: "Backend", color: "bg-green-600 text-white" },
                { name: "Neo4j", cat: "Graph DB", color: "bg-blue-600 text-white" },
                { name: "Gemini AI", cat: "LLM", color: "bg-purple-600 text-white" },
                { name: "LangChain", cat: "AI Framework", color: "bg-cyan-600 text-white" },
                { name: "Tailwind", cat: "UI", color: "bg-sky-500 text-white" },
                { name: "TypeScript", cat: "Language", color: "bg-blue-700 text-white" },
                { name: "SQLite", cat: "Database", color: "bg-orange-500 text-white" },
              ].map((t, i) => (
                <div key={i} className={`${t.color} rounded-2xl p-5 hover:scale-105 transition-transform cursor-default`}>
                  <p className="font-bold text-lg">{t.name}</p>
                  <p className="text-sm opacity-80">{t.cat}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== ROLE SELECTION ===== */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Bắt đầu</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">Chọn vai trò của bạn</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Truy cập dashboard phù hợp với vai trò của bạn trong hệ thống</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Link href="/dashboard/admin" className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-red-200 transition-all text-center">
              <div className="mx-auto h-16 w-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Quản Trị Viên</h3>
              <p className="text-gray-500 text-sm mb-4">Quản lý hệ thống, giáo viên, học sinh và kho từ vựng cốt lõi.</p>
              <span className="inline-flex items-center gap-1 text-red-600 font-medium text-sm group-hover:gap-2 transition-all">
                Truy cập <ArrowRight size={16} />
              </span>
            </Link>

            <Link href="/dashboard/teacher" className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-green-200 transition-all text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Giáo Viên</h3>
              <p className="text-gray-500 text-sm mb-4">Quản lý lớp học, giao bài tập và theo dõi tiến độ học sinh.</p>
              <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm group-hover:gap-2 transition-all">
                Truy cập <ArrowRight size={16} />
              </span>
            </Link>

            <Link href="/dashboard/student" className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border-2 border-blue-200 hover:border-blue-400 transition-all text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                Phổ biến nhất
              </div>
              <div className="mx-auto h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Học Sinh</h3>
              <p className="text-gray-500 text-sm mb-4">Trải nghiệm phân tích văn bản, thi trắc nghiệm và Flashcard AI.</p>
              <span className="inline-flex items-center gap-1 text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
                Truy cập <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Sẵn sàng học tập thông minh?</h2>
          <p className="text-blue-100 mb-10 text-xl max-w-2xl mx-auto">
            Tham gia iEdu ngay hôm nay và trải nghiệm phương pháp học tiếng Anh hoàn toàn mới với AI
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-xl transition">
              Đăng ký miễn phí <ArrowRight size={20} />
            </Link>
            <Link href="/login" className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg border border-white/30 hover:bg-white/20 transition">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-2 space-y-4">
              <Image src="/logo.png" alt="iEdu" width={100} height={40} className="brightness-0 invert" />
              <p className="text-sm leading-relaxed max-w-sm">
                Nền tảng học tập thông minh ứng dụng Đồ thị Tri thức và Trí tuệ Nhân tạo trong hỗ trợ học từ vựng và ngữ pháp tiếng Anh.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Truy cập</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition">Đăng nhập</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Đăng ký</Link></li>
                <li><Link href="/about" className="hover:text-white transition">Giới thiệu</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Công nghệ</h4>
              <ul className="space-y-2 text-sm">
                <li>Next.js + React</li>
                <li>FastAPI + Python</li>
                <li>Neo4j Graph Database</li>
                <li>Google Gemini AI</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">&copy; 2025 iEdu - Nghiên cứu Khoa học Công nghệ Ứng dụng</p>
            <div className="flex items-center gap-2 text-sm">
              <Globe size={16} /> <span>Deployed on Vercel &amp; Render</span>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
