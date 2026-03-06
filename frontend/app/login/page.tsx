"use client";
import { useEffect, useState } from "react";
import { BookOpen, Mail, Lock, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, user, isInitialized } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isInitialized && user) {
      router.push(`/dashboard/${user.role.toLowerCase()}`);
    }
  }, [isInitialized, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const success = await login(email, password);
    if (!success) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm mb-4">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Đăng Nhập EAM</h1>
          <p className="text-indigo-100">AI-Powered English Vocabulary Platform</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
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
            </div>

            <button type="submit" disabled={isLoading || !email || !password} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition flex items-center justify-center shadow-lg shadow-indigo-200 disabled:opacity-50">
              {isLoading ? "Đang xác thực..." : <><LogIn className="mr-2 h-5 w-5" /> Đăng nhập hệ thống</>}
            </button>
            
            <div className="flex items-center justify-between text-sm mt-4">
              <a href="/forgot-password" className="text-gray-500 hover:text-indigo-600 transition">Quên mật khẩu?</a>
              <a href="/register" className="text-gray-500 hover:text-indigo-600 transition font-semibold">Tạo tài khoản mới</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
