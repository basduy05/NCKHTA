"use client";
import { useState } from "react";
import { Mail, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      if (forgotPassword) {
        const result = await forgotPassword(email);
        if (result) {
          setMessage("Mã reset mật khẩu đã được gửi vào email của bạn.");
        } else {
          setError("Không thể gửi yêu cầu. Email có thể không tồn tại.");
        }
      } else {
         setError("Chức năng đang được cập nhật.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi khi xử lý");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-center">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-2 mb-4">
            <Image src="/logo.png" alt="iEdu" width={120} height={48} style={{ height: "auto" }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Quên Mật Khẩu</h1>
          <p className="text-blue-100">Nhập email để nhận mã khôi phục</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
            {message && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center">{message}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="your.email@example.com" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={isLoading || !email} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center justify-center shadow-lg shadow-blue-200 disabled:opacity-50">
              {isLoading ? "Đang gửi..." : <><Send className="mr-2 h-5 w-5" /> Gửi yêu cầu</>}
            </button>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              Nhớ mật khẩu? <Link href="/login" className="text-blue-600 hover:text-blue-800 font-semibold">Đăng nhập</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
