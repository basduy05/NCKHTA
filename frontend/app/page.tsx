"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Brain, Network, Sparkles, GraduationCap, BarChart3, CheckCircle2, ArrowRight, ChevronRight, ChevronLeft, Globe, Zap, Target, TrendingUp, Play, Users, Mail, Award, Star, LayoutDashboard } from "lucide-react";
import { useAuth } from "./context/AuthContext";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            entry.target.classList.remove("opacity-0", "translate-y-8");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    const children = el.querySelectorAll("[data-reveal]");
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}


export default function Home() {
  const revealRef = useScrollReveal();
  const { user } = useAuth();
  const dashboardUrl = user ? `/dashboard/${user.role.toLowerCase()}` : "/login";

  return (
    <main className="min-h-screen bg-white" ref={revealRef}>

      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 animate-slide-down">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="iEdu" width={90} height={36} priority />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href={user ? `${dashboardUrl}?tab=dictionary` : "/login"} className="hover:text-blue-600 transition">Tra từ điển với AI</Link>
            <Link href={user ? `${dashboardUrl}?tab=practice` : "/login"} className="hover:text-blue-600 transition">Luyện thi Toeic/IELTS</Link>
            <Link href={user ? `${dashboardUrl}?tab=ipa` : "/login"} className="hover:text-blue-600 transition">Luyện phát âm IPA</Link>
            <Link href={user ? `${dashboardUrl}?tab=roadmap` : "/login"} className="hover:text-blue-600 transition">Cá nhân hoá</Link>
            <Link href="/about" className="hover:text-blue-600 transition">Giới thiệu</Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href={dashboardUrl} className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg transition shadow-sm hover:shadow-md flex items-center gap-2">
                <LayoutDashboard size={16} /> Vào Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition px-4 py-2">Đăng nhập</Link>
                <Link href="/register" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg transition shadow-sm hover:shadow-md">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-100 rounded-full blur-3xl opacity-40 animate-pulse-soft" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-100 rounded-full blur-3xl opacity-30 animate-pulse-soft delay-200" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center bg-blue-50 border border-blue-100 rounded-full px-4 py-2 text-sm text-blue-700 font-medium animate-fade-in delay-100">
                <Sparkles size={16} className="mr-2 animate-spin" style={{ animationDuration: "3s" }} /> Dự án phát triển ứng dụng phục vụ nghiên cứu khoa học - 2025
              </div>
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight animate-fade-in-up delay-200">
                Học tiếng Anh <br />
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent animate-gradient">thông minh hơn</span><br />
                với AI
              </h1>
              <p className="text-xl text-gray-600 max-w-lg leading-relaxed animate-fade-in-up delay-300">
                Nền tảng kết hợp <strong>Đồ thị Tri thức</strong> và <strong>Trí tuệ Nhân tạo</strong> giúp bạn học từ vựng, ngữ pháp hiệu quả gấp nhiều lần.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start animate-fade-in-up delay-400">
                {user ? (
                  <Link href={dashboardUrl} className="group inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105">
                    <LayoutDashboard size={20} /> Vào Dashboard <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <Link href="/register" className="group inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105">
                    Bắt đầu miễn phí <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
                <Link href="/about" className="group inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-lg transition-all border border-gray-200 shadow-sm hover:shadow-md">
                  <Play size={20} className="group-hover:scale-110 transition-transform" /> Tìm hiểu thêm
                </Link>
              </div>
              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-gray-500 pt-2 animate-fade-in delay-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> Miễn phí</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> AI Gemini</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> AI Cohere</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-green-500" /> Knowledge Graph</span>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="flex-1 relative animate-fade-in-right delay-300">
              <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-8 shadow-2xl hover:shadow-blue-200/50 transition-shadow duration-500">
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
                      <div className="bg-green-50 rounded-lg p-3 text-center hover:scale-105 transition-transform cursor-default">
                        <p className="text-lg font-bold text-green-600">cat</p>
                        <p className="text-[10px] text-gray-500">noun • A1</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center hover:scale-105 transition-transform cursor-default">
                        <p className="text-lg font-bold text-purple-600">sat</p>
                        <p className="text-[10px] text-gray-500">verb • A1</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center hover:scale-105 transition-transform cursor-default">
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
                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 animate-float">
                  <Brain size={18} className="text-purple-500" />
                  <span className="text-sm font-semibold text-gray-800">Gemini AI</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 animate-float delay-500">
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
            { value: "AI", label: "Tạo bài tập, tra cứu từ vựng, cá nhân hoá tự động" },
            { value: "Graph", label: "Đồ thị tri thức, liên kết từ vựng" },
            { value: "CEFR", label: "Phân loại trình độ" },
            { value: "24/7", label: "Truy cập mọi lúc" },
          ].map((s, i) => (
            <div key={i} data-reveal className="opacity-0 translate-y-8 text-center" style={{ animationDelay: `${i * 0.1}s` }}>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-gray-600 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="bg-gradient-to-b from-gray-50 to-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div data-reveal className="opacity-0 translate-y-8 text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Truy nhập nhanh chóng và dễ dàng với</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">3 bước đơn giản</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Bắt đầu học tập thông minh chỉ trong vài phút</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Đăng ký tài khoản", desc: "Tạo tài khoản miễn phí với email, chọn vai trò Học sinh hoặc Giáo viên.", icon: Target },
              { step: "02", title: "Lựa chọn tính năng mà bạn muốn học tập", desc: "Với các tính năng đa dạng iEdu sẽ giúp bạn tra cứu từ vựng, luyện thi Toeic/IELTS, luyện phát âm IPA, và hơn thế nữa.", icon: Zap },
              { step: "03", title: "Học & Luyện tập với các tính năng thông minh", desc: "Làm bài trắc nghiệm AI, ôn tập với flashcard thông minh, bứt phá và làm chủ ngoại ngữ.", icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} data-reveal className="opacity-0 translate-y-8 relative" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
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
                    <ChevronRight size={24} className="text-blue-300 animate-pulse" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEVELOPMENT ORIENTATION ===== */}
      <section id="development" className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-100">
        <div data-reveal className="opacity-0 translate-y-8 text-center mb-16">
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Tầm nhìn tương lai</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4">Định hướng phát triển</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">iEdu không ngừng cải tiến để mang lại giải pháp giáo dục toàn diện nhất cho người Việt.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              icon: Sparkles, 
              title: "Hệ sinh thái AI toàn diện", 
              desc: "Tích hợp đa mô hình (Gemini, GPT-4, Claude) để tối ưu hóa khả năng phân tích và cá nhân hóa lộ trình học tập.",
              color: "bg-blue-50 text-blue-600"
            },
            { 
              icon: Globe, 
              title: "Đa ngôn ngữ & Nền tảng", 
              desc: "Mở rộng hỗ trợ nhiều ngôn ngữ khác bên cạnh tiếng Anh và phát triển ứng dụng di động cho iOS/Android.",
              color: "bg-cyan-50 text-cyan-600"
            },
            { 
              icon: Users, 
              title: "Cộng đồng thông minh", 
              desc: "Xây dựng mạng xã hội học tập, nơi người dùng có thể chia sẻ tài liệu, kinh nghiệm và cùng nhau tiến bộ.",
              color: "bg-purple-50 text-purple-600"
            },
            { 
              icon: TrendingUp, 
              title: "AI Predictive Analytics", 
              desc: "Sử dụng dữ liệu lớn để dự báo lỗ hổng kiến thức và tự động điều chỉnh độ khó bài tập theo thời gian thực.",
              color: "bg-green-50 text-green-600"
            },
          ].map((item, i) => (
            <div key={i} data-reveal className="opacity-0 translate-y-8 bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-6`}>
                <item.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>



      {/* ===== CTA SECTION ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 animate-gradient" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-20 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-300 rounded-full blur-3xl animate-pulse-soft delay-300" />
        </div>
        <div data-reveal className="opacity-0 translate-y-8 relative max-w-4xl mx-auto px-6 py-20 text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Bạn đã sẵn sàng cho một hành trình học tập thông minh?</h2>
          <p className="text-blue-100 mb-10 text-xl max-w-2xl mx-auto">
            Tham gia iEdu ngay hôm nay và trải nghiệm phương pháp học tiếng Anh hoàn toàn mới với AI
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {user ? (
              <Link href={dashboardUrl} className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105">
                <LayoutDashboard size={20} /> Vào Dashboard <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <Link href="/register" className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105">
                  Đăng ký miễn phí <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login" className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold text-lg border border-white/30 hover:bg-white/20 transition-all hover:scale-105">
                  Đăng nhập
                </Link>
              </>
            )}
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
              <p className="text-xs text-gray-500">Dự án phát triển ứng dụng phục vụ nghiên cứu khoa học</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Truy cập</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition">Đăng nhập</Link></li>
                <li><Link href="/register" className="hover:text-white transition">Đăng ký</Link></li>
                <li><Link href="/about" className="hover:text-white transition">Giới thiệu</Link></li>
                <li><a href="https://www.facebook.com/basduy05" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Facebook</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Công nghệ</h4>
              <ul className="space-y-2 text-sm">
                <li>Next.js + React</li>
                <li>FastAPI + Python</li>
                <li>Neo4j Graph Database</li>
                <li>Google Gemini AI</li>
                <li>Cohere Rerank</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">&copy; 2025 iEdu - Dự án phát triển ứng dụng phục vụ nghiên cứu khoa học</p>
            <div className="flex items-center gap-2 text-sm">
              <Globe size={16} /> <span>Deployed on Vercel &amp; Render</span>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}
