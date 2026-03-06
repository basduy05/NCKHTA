import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Brain, Network, BookOpen, Users, Sparkles, GraduationCap, BarChart3, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-300 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition mb-8">
            <ArrowLeft size={18} /> Quay lại trang chủ
          </Link>
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Sparkles size={16} className="mr-2" /> Nghiên cứu Khoa học - Công nghệ Ứng dụng
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                iEdu - Nền tảng Học tập Thông minh
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                Ứng dụng Đồ thị Tri thức (Knowledge Graph) và Trí tuệ Nhân tạo (AI) trong việc hỗ trợ học từ vựng và ngữ pháp tiếng Anh.
              </p>
            </div>
            <div className="flex-shrink-0 bg-white rounded-3xl p-6 shadow-2xl">
              <Image src="/logo.png" alt="iEdu Logo" width={220} height={88} priority />
            </div>
          </div>
        </div>
      </section>

      {/* Vấn đề & Giải pháp */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl">
              <span className="text-red-600 text-2xl font-bold">?</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Vấn đề đặt ra</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Việc học từ vựng và ngữ pháp tiếng Anh truyền thống thường gặp nhiều hạn chế: học sinh ghi nhớ từ vựng một cách rời rạc, thiếu ngữ cảnh, và không thấy được mối liên hệ giữa các đơn vị kiến thức.
              </p>
              <p>
                Các phương pháp dạy học hiện tại chưa tận dụng được sức mạnh của công nghệ AI để cá nhân hóa trải nghiệm học tập cho từng học sinh.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
              <Sparkles className="text-green-600" size={24} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Giải pháp của iEdu</h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                iEdu xây dựng một nền tảng học tập thông minh, kết hợp <strong>Đồ thị Tri thức (Knowledge Graph)</strong> với <strong>AI tạo sinh (Generative AI)</strong> để tổ chức và liên kết kiến thức một cách có hệ thống.
              </p>
              <p>
                Học sinh không chỉ học từ vựng đơn lẻ mà còn hiểu được mạng lưới ngữ nghĩa, từ đồng nghĩa, trái nghĩa, ngữ cảnh sử dụng, và các quy tắc ngữ pháp liên quan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Công nghệ cốt lõi */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Công nghệ Cốt lõi</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Kết hợp các công nghệ tiên tiến để mang lại trải nghiệm học tập hiệu quả nhất</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Network className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Knowledge Graph</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Sử dụng Neo4j Graph Database để xây dựng đồ thị tri thức, biểu diễn mối quan hệ ngữ nghĩa giữa từ vựng, ngữ pháp và ngữ cảnh sử dụng.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Brain className="text-purple-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Generative AI</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Tích hợp Google Gemini AI để tự động tạo bài tập, câu hỏi trắc nghiệm, phân tích văn bản và trích xuất từ vựng thông minh.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="text-cyan-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Web Platform</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Nền tảng web hiện đại với Next.js và FastAPI, cho phép truy cập mọi lúc mọi nơi trên cả máy tính và thiết bị di động.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tính năng chính */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Tính năng Chính</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Hệ thống cung cấp đầy đủ công cụ cho cả giáo viên và học sinh</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { icon: BookOpen, title: "Phân tích Văn bản AI", desc: "Tự động trích xuất từ vựng, phân loại theo trình độ CEFR, phân tích ngữ pháp từ bất kỳ đoạn văn bản nào.", color: "blue" },
            { icon: Network, title: "Đồ thị Tri thức", desc: "Trực quan hóa mối quan hệ giữa các từ vựng: đồng nghĩa, trái nghĩa, từ liên quan, collocation.", color: "green" },
            { icon: GraduationCap, title: "Bài tập Trắc nghiệm AI", desc: "AI tự động tạo câu hỏi trắc nghiệm đa dạng dựa trên nội dung bài học và trình độ học sinh.", color: "purple" },
            { icon: BarChart3, title: "Theo dõi Tiến độ", desc: "Giáo viên theo dõi kết quả học tập, quản lý lớp học, giao bài tập và chấm điểm trực tuyến.", color: "orange" },
            { icon: Users, title: "Quản lý Lớp học", desc: "Hệ thống quản lý lớp học, ghi danh học sinh, phân công bài tập và quản lý bài học.", color: "cyan" },
            { icon: Sparkles, title: "Flashcard Thông minh", desc: "Hệ thống flashcard AI với spaced repetition giúp ghi nhớ từ vựng hiệu quả và lâu dài.", color: "pink" },
          ].map((f, i) => {
            const colorMap: Record<string, string> = {
              blue: "bg-blue-100 text-blue-600",
              green: "bg-green-100 text-green-600",
              purple: "bg-purple-100 text-purple-600",
              orange: "bg-orange-100 text-orange-600",
              cyan: "bg-cyan-100 text-cyan-600",
              pink: "bg-pink-100 text-pink-600",
            };
            return (
              <div key={i} className="flex gap-4 p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[f.color]}`}>
                  <f.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Kiến trúc hệ thống */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Kiến trúc Hệ thống</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Thiết kế microservices hiện đại, dễ mở rộng và bảo trì</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: "Frontend", tech: "Next.js 14", desc: "Giao diện người dùng", color: "from-blue-500 to-blue-600" },
              { label: "Backend AI", tech: "FastAPI (Python)", desc: "Xử lý AI & API", color: "from-green-500 to-green-600" },
              { label: "Graph DB", tech: "Neo4j Aura", desc: "Đồ thị tri thức", color: "from-purple-500 to-purple-600" },
              { label: "Database", tech: "SQLite", desc: "Dữ liệu quan hệ", color: "from-orange-500 to-orange-600" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className={`bg-gradient-to-r ${item.color} p-4 text-white text-center`}>
                  <p className="font-bold">{item.label}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="font-semibold text-gray-900">{item.tech}</p>
                  <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Đội ngũ / Thông tin */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Thông tin Dự án</h2>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-10 md:p-16">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Nghiên cứu Khoa học Công nghệ Ứng dụng</h3>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Đề tài:</strong> Ứng dụng Đồ thị Tri thức và AI trong hỗ trợ học từ vựng và ngữ pháp tiếng Anh</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Loại hình:</strong> Nghiên cứu Khoa học - Công nghệ Ứng dụng (NCKHTA)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Sản phẩm:</strong> Nền tảng web iEdu - Hệ thống học tập thông minh</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Công nghệ Sử dụng</h3>
              <div className="flex flex-wrap gap-3">
                {["Next.js 14", "React 18", "TypeScript", "Tailwind CSS", "FastAPI", "Python", "Neo4j", "Google Gemini AI", "LangChain", "SQLite", "JWT Auth", "Vercel", "Render"].map((tech, i) => (
                  <span key={i} className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm border border-gray-200">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-500 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Bắt đầu Trải nghiệm ngay!</h2>
          <p className="text-blue-100 mb-8 text-lg">Đăng ký tài khoản miễn phí và khám phá phương pháp học tập mới với AI</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-lg transition">
              Đăng ký miễn phí
            </Link>
            <Link href="/login" className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold border border-white/30 hover:bg-white/20 transition">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="iEdu" width={80} height={32} className="brightness-0 invert" />
            <span className="text-sm">Nền tảng Học tập Thông minh</span>
          </div>
          <p className="text-sm">&copy; 2025 iEdu - Nghiên cứu Khoa học Công nghệ Ứng dụng</p>
        </div>
      </footer>
    </main>
  );
}
