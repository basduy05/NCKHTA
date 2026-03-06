"use client";
import { useEffect, useState } from "react";
import { Mail, Lock, UserPlus, LogIn } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { register, verifyOTP, user, isInitialized } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isInitialized && user) {
      router.push(`/dashboard/${user.role.toLowerCase()}`);
    }
  }, [isInitialized, user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await register(name, email, password, role);
      if (result) {
        setSuccess(true);
      } else {
        setError("Đăng kí thất bại. Email có thể đã tồn tại.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi đăng kí");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await verifyOTP(email, otp);
      if (result) {
        router.push("/login?registered=true");
      } else {
        setError("Mã OTP không hợp lệ hoặc đã hết hạn.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi xác thực OTP");
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác thực Email</h2>
            <p className="text-gray-600 mb-6">Xin vui lòng kiểm tra email để lấy mã OTP và nhập vào bên dưới.</p>
            
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}
              <div>
                <input 
                  type="text" 
                  required 
                  value={otp} 
                  onChange={e => setOtp(e.target.value)} 
                  className="w-full px-4 py-3 text-center tracking-widest text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                  placeholder="Nhập mã OTP 6 số" 
                  maxLength={6}
                />
              </div>
              <button type="submit" disabled={isLoading || otp.length < 6} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center justify-center shadow-lg disabled:opacity-50">
                {isLoading ? "Đang xác thực..." : "Xác nhận OTP"}
              </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-center">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-2 mb-4">
            <Image src="/logo.png" alt="iEdu" width={120} height={48} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Đăng Kí iEdu</h1>
          <p className="text-blue-100">Tạo tài khoản mới</p>
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
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="Nguyễn Văn A" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="your.email@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="••••••••"/>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bạn là?</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                  <option value="STUDENT">Học Sinh</option>
                  <option value="TEACHER">Giáo Viên</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={isLoading || !email || !password} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center justify-center shadow-lg shadow-blue-200 disabled:opacity-50">
              {isLoading ? "Đang xử lý..." : <><UserPlus className="mr-2 h-5 w-5" /> Đăng kí</>}
            </button>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              Đã có tài khoản? <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold">Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
