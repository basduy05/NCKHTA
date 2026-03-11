"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (!token || !email) {
      setError("Thiếu thông tin xác thực. Vui lòng kiểm tra lại link email.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const success = await resetPassword(email, token, newPassword);
      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError("Không thể đặt lại mật khẩu. Link có thể đã hết hạn hoặc không hợp lệ.");
      }
    } catch (err: any) {
      setError(err?.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-2">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Thành công!</h2>
        <p className="text-gray-600">Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng về trang đăng nhập...</p>
        <Link href="/login" className="block text-blue-600 font-semibold hover:underline mt-4">
          Quay lại đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!token || !email ? (
        <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm border border-amber-100">
          <span className="font-bold">Cảnh báo:</span> Link truy cập không hợp lệ. Vui lòng sử dụng chính xác link từ email bạn nhận được.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Nhập ít nhất 6 ký tự"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Nhập lại mật khẩu mới"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !newPassword}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang xử lý...</> : "Cập nhật mật khẩu"}
          </button>
        </>
      )}

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/login" className="text-gray-600 hover:text-blue-600 font-medium transition">Quay lại đăng nhập</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-10 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-400/20 rounded-full translate-x-1/3 translate-y-1/3" />
          
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-2 mb-6 relative shadow-lg">
            <Image src="/logo.png" alt="iEdu" width={100} height={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 relative">Đặt lại Mật khẩu</h1>
          <p className="text-blue-100 relative opacity-90">An toàn và bảo mật cho tài khoản của bạn</p>
        </div>

        <div className="p-10">
          <Suspense fallback={<div className="flex flex-col items-center justify-center py-10"><Loader2 className="animate-spin text-blue-600 mb-2" /><p className="text-sm text-gray-500">Đang chuẩn bị...</p></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
