"use client";
import { useState } from "react";
import { BookOpen, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await register(name, email, password, role);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?registered=true");
        }, 3000);
      } else {
        setError("Đăng kí thất bại. Email có thể đã tồn tại.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi đăng kí");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <UserPlus className="text-green-600 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đăng kí thành công!</h2>
            <p className="text-gray-600 mb-6">Xin vui lòng kiểm tra email để xác thực OTP trước khi đăng nhập.</p>
            <Link href="/login" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition">
              <LogIn className="w-5 h-5 mr-2" />
              Đi tới Đăng nhập
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm mb-4">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Đăng Kí EAM</h1>
          <p className="text-indigo-100">Tạo tài khoản mới</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                <div className="relative">
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Nguyễn Văn A" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="your.email@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="••••••••"/>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bạn là?</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none">
                  <option value="STUDENT">Học Sinh</option>
                  <option value="TEACHER">Giáo Viên</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={isLoading || !email || !password} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition flex items-center justify-center shadow-lg shadow-indigo-200 disabled:opacity-50">
              {isLoading ? "Đang xử lý..." : <><UserPlus className="mr-2 h-5 w-5" /> Đăng kí</>}
            </button>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              Đã có tài khoản? <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-semibold">Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
