import Link from "next/link";
import { BookOpen, Users, ShieldCheck, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center justify-center transform rotate-3">
              <Sparkles size={40} />
            </div>
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
            EAM - Cổng Học Tập AI <span className="text-indigo-600">Thông Minh</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Khám phá phương pháp học từ vựng và ngữ pháp đột phá với Đồ thị tri thức (Knowledge Graph) và Trí tuệ Nhân tạo.
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid md:grid-cols-3 gap-6 pt-12">
          {/* Admin */}
          <Link href="/dashboard/admin" className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-200 border border-gray-100 transition-all text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 py-auto group-hover:scale-110 transition-transform">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quản Trị Viên</h2>
            <p className="text-gray-500 text-sm">Quản lý hệ thống, giáo viên, học sinh và kho từ vựng cốt lõi.</p>
          </Link>

          {/* Teacher */}
          <Link href="/dashboard/teacher" className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-200 border border-gray-100 transition-all text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 py-auto group-hover:scale-110 transition-transform">
              <Users size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Giáo Viên</h2>
            <p className="text-gray-500 text-sm">Quản lý lớp học, giao bài tập và theo dõi tiến độ học sinh.</p>
          </Link>

          {/* Student */}
          <Link href="/dashboard/student" className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl hover:border-indigo-200 border border-gray-100 transition-all text-center border-b-4 border-b-indigo-500">
            <div className="mx-auto h-16 w-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 py-auto group-hover:scale-110 transition-transform">
              <BookOpen size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Học Sinh</h2>
            <p className="text-gray-500 text-sm">Trải nghiệm phân tích văn bản, thi trắc nghiệm và Flashcard AI.</p>
          </Link>
        </div>

      </div>
    </main>
  );
}
