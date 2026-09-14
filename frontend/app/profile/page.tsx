"use client";

import { useEffect, useState } from "react";
import { 
  User, Mail, Phone, Lock, Save, ArrowLeft, Camera, Shield, 
  Smartphone, Laptop, Monitor, LogOut, CheckCircle2, AlertCircle, 
  RefreshCw, Crown, KeyRound, Sparkles, Award, Check, Clock, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  role: string;
  cefr_level?: string;
}

interface DeviceSession {
  id: number;
  session_id: string;
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
}

type TabType = "general" | "security" | "two_factor" | "devices";

export default function ProfilePage() {
  const { user, token, logout, isInitialized, updateUser, authFetch } = useAuth();
  const { showAlert, showConfirm } = useNotification();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [profile, setProfile] = useState<ProfileData>(() => ({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    role: user?.role || "",
    cefr_level: "B1"
  }));
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync profile when user in AuthContext becomes available
  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
        role: prev.role || user.role || "",
        cefr_level: prev.cefr_level || "B1"
      }));
    }
  }, [user]);

  // Devices & 2FA State
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [twoFaMsg, setTwoFaMsg] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!isInitialized) return;
    if (!token && !user) {
      router.push("/login");
      return;
    }
    fetchProfile();
    fetchDevices();
    const currentRole = (user?.role || profile.role || "").toString().toLowerCase();
    if (currentRole === "student" || !currentRole) {
      fetchSubscription();
    }
  }, [token, isInitialized, user, router]);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await authFetch(`${API_URL}/auth/me`);
      if (res.ok) {
        const data = await res.json();
        setProfile({
          name: data.name || user?.name || "",
          email: data.email || user?.email || "",
          phone: data.phone || user?.phone || "",
          role: data.role || user?.role || "",
          cefr_level: data.cefr_level || "B1"
        });
        setTwoFactorEnabled(Boolean(data.two_factor_enabled));
        updateUser({ name: data.name, phone: data.phone });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const res = await authFetch(`${API_URL}/student/subscription/status`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (e) {
      // Ignore if not a student or error
    }
  };

  const fetchDevices = async () => {
    if (!token) return;
    setIsLoadingDevices(true);
    try {
      const res = await authFetch(`${API_URL}/auth/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error("Failed to load devices:", e);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleRevokeDevice = async (sessionId: string) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn đăng xuất thiết bị này từ xa?");
    if (!confirmed) return;
    try {
      const res = await authFetch(`${API_URL}/auth/devices/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setDevices(prev => prev.filter(d => d.session_id !== sessionId));
        showAlert("Đã đăng xuất thiết bị thành công!", "success");
      } else {
        showAlert("Không thể đăng xuất thiết bị.", "error");
      }
    } catch (e) {
      showAlert("Lỗi kết nối khi đăng xuất thiết bị.", "error");
    }
  };

  const handleRevokeOthers = async () => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn đăng xuất khỏi TẤT CẢ các thiết bị khác?");
    if (!confirmed) return;
    try {
      const res = await authFetch(`${API_URL}/auth/devices/others/all`, { method: "DELETE" });
      if (res.ok) {
        await fetchDevices();
        showAlert("Đã đăng xuất khỏi tất cả các thiết bị khác!", "success");
      } else {
        showAlert("Có lỗi khi đăng xuất các thiết bị khác.", "error");
      }
    } catch (e) {
      showAlert("Lỗi kết nối khi đăng xuất thiết bị.", "error");
    }
  };

  const handleToggle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaPassword) return;
    try {
      const res = await authFetch(`${API_URL}/auth/2fa/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !twoFactorEnabled, password: twoFaPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(!twoFactorEnabled);
        setShow2FaModal(false);
        setTwoFaPassword("");
        showAlert(data.message || "Cập nhật 2FA thành công!", "success");
      } else {
        setTwoFaMsg(data.detail || "Mật khẩu xác nhận không chính xác.");
      }
    } catch (err) {
      setTwoFaMsg("Lỗi kết nối máy chủ");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await authFetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          cefr_level: profile.cefr_level
        })
      });

      if (res.ok) {
        showAlert("Cập nhật thông tin hồ sơ và mục tiêu học tập thành công!", "success");
        updateUser({ name: profile.name, phone: profile.phone, cefr_level: profile.cefr_level });
      } else {
        const data = await res.json();
        showAlert(data.detail || "Cập nhật hồ sơ thất bại", "warning");
      }
    } catch (error) {
      showAlert("Cập nhật thất bại. Vui lòng thử lại sau.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return showAlert("Mật khẩu xác nhận không khớp!", "warning");
    }
    if (newPassword.length < 6) {
      return showAlert("Mật khẩu mới phải có ít nhất 6 ký tự!", "warning");
    }

    setIsSaving(true);
    try {
      const res = await authFetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (res.ok) {
        showAlert("Đổi mật khẩu thành công!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        showAlert(data.detail || "Đổi mật khẩu thất bại. Mật khẩu hiện tại có thể chưa đúng.", "error");
      }
    } catch (error) {
      showAlert("Lỗi kết nối máy chủ.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const roleText = profile.role?.toUpperCase() === "TEACHER" 
    ? "Giáo viên" 
    : profile.role?.toUpperCase() === "ADMIN" 
    ? "Quản trị viên" 
    : "Học sinh";

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1]?.charAt(0).toUpperCase() || "U";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface-1,#f8fafc)] flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand,#2563EB)] mb-4"></div>
        <p className="text-gray-500 font-medium text-sm">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Top Banner / Hero Bar */}
      <div className="bg-[var(--brand,#2563EB)] text-white pt-8 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-sm">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-20 -mb-20" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10 space-y-6">
          {/* Top navigation actions */}
          <div className="flex items-center justify-between">
            <Link
              href={`/dashboard/${user?.role?.toLowerCase() || "student"}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md text-sm font-semibold transition"
            >
              <ArrowLeft size={18} />
              <span>Về Bảng Điều Khiển</span>
            </Link>

            <button
              onClick={() => logout(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white backdrop-blur-md text-xs font-semibold transition"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>

          {/* Profile Overview Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-white/20 to-white/40 border-2 border-white/50 backdrop-blur-md text-white flex items-center justify-center text-3xl font-black shadow-lg">
                {getInitials(profile.name)}
              </div>
              <button
                className="absolute bottom-1 right-1 p-2 rounded-xl bg-white text-gray-800 shadow-md hover:scale-105 transition"
                title="Thay ảnh đại diện"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile.name || "Người dùng iEdu"}</h1>
                <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
                  {roleText}
                </span>
                {subscription?.is_premium && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-sm">
                    <Crown size={12} className="fill-slate-950" /> PRO
                  </span>
                )}
              </div>

              <p className="text-blue-100 text-sm">{profile.email}</p>

              {/* Stats Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-xl text-xs font-semibold backdrop-blur-sm">
                  <Award size={14} className="text-yellow-300" />
                  <span>{user?.points || 0} XP Tích luỹ</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-xl text-xs font-semibold backdrop-blur-sm">
                  <Sparkles size={14} className="text-blue-200" />
                  <span>{user?.credits_ai || 50} AI Credits</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-xl text-xs font-semibold backdrop-blur-sm">
                  <Shield size={14} className={twoFactorEnabled ? "text-emerald-300" : "text-gray-300"} />
                  <span>2FA: {twoFactorEnabled ? "Đã kích hoạt" : "Chưa bật"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Segmented Nav Tabs */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm space-y-1.5">
              {[
                { key: "general", label: "Thông tin cá nhân", icon: User, desc: "Tên & liên hệ" },
                { key: "security", label: "Đổi mật khẩu", icon: KeyRound, desc: "Bảo mật đăng nhập" },
                { key: "two_factor", label: "Xác thực 2 lớp (2FA)", icon: Shield, desc: "Bảo vệ tài khoản" },
                { key: "devices", label: "Quản lý thiết bị", icon: Laptop, desc: `${devices.length} thiết bị hoạt động` },
              ].map((t) => {
                const isCurrent = activeTab === t.key;
                const IconComponent = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as TabType)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                      isCurrent
                        ? "bg-[var(--brand,#2563EB)] text-white font-bold shadow-sm shadow-blue-200"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isCurrent ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        <IconComponent size={18} />
                      </div>
                      <div>
                        <p className="text-sm leading-tight">{t.label}</p>
                        <p className={`text-[11px] mt-0.5 ${isCurrent ? "text-blue-100" : "text-slate-400"}`}>{t.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`opacity-60 ${isCurrent ? "text-white" : "text-slate-400"}`} />
                  </button>
                );
              })}
            </div>

            {/* Quick Security Tip Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800/50 border border-indigo-100 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-400">
                <Shield size={16} /> Mẹo an toàn bảo mật
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Đăng xuất các thiết bị công cộng khi không sử dụng và bật 2FA để tài khoản luôn an toàn tối đa.
              </p>
            </div>
          </div>

          {/* Right Column: Tab Panels */}
          <div className="lg:col-span-3">
            {/* TAB 1: THÔNG TIN CÁ NHÂN */}
            {activeTab === "general" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="text-[var(--brand,#2563EB)]" size={20} />
                    Thông tin tài khoản & Hồ sơ
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Cập nhật thông tin hiển thị của bạn trên hệ thống iEdu.</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Họ và tên
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          required
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white outline-none font-semibold transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Địa chỉ Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium cursor-not-allowed"
                        />
                      </div>
                      <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                        <CheckCircle2 size={12} /> Email chính thức đã xác thực
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Số điện thoại
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="0912 345 678"
                          className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white outline-none font-semibold transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Vai trò trên hệ thống
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={roleText}
                          disabled
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Mục tiêu học tập & Trình độ CEFR
                      </label>
                      <div className="relative">
                        <select
                          value={profile.cefr_level || "B1"}
                          onChange={(e) => setProfile({ ...profile, cefr_level: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white outline-none font-semibold transition bg-white dark:bg-slate-900 cursor-pointer"
                        >
                          <option value="A1">A1 — Mới bắt đầu (Beginner)</option>
                          <option value="A2">A2 — Sơ cấp (Elementary)</option>
                          <option value="B1">B1 — Trung cấp (Intermediate - Khuyên dùng)</option>
                          <option value="B2">B2 — Trung cấp cao (Upper-Intermediate)</option>
                          <option value="C1">C1 — Cao cấp (Advanced)</option>
                          <option value="IELTS 6.5+">IELTS 6.5+ (Mục tiêu du học & đại học)</option>
                          <option value="TOEIC 750+">TOEIC 750+ (Mục tiêu tốt nghiệp & đi làm)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-[var(--brand,#2563EB)] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save size={16} />
                      {isSaving ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: ĐỔI MẬT KHẨU */}
            {activeTab === "security" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="text-[var(--brand,#2563EB)]" size={20} />
                    Đổi mật khẩu tài khoản
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Đảm bảo mật khẩu chứa ít nhất 6 ký tự gồm chữ và số để tăng độ an toàn.</p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Nhập mật khẩu hiện tại"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white outline-none font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white outline-none font-medium transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white outline-none font-medium transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                      className="px-6 py-2.5 bg-[var(--brand,#2563EB)] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Lock size={16} />
                      {isSaving ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: XÁC THỰC 2 LỚP (2FA) */}
            {activeTab === "two_factor" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield className="text-indigo-600" size={20} />
                      Xác thực 2 bước (2FA OTP)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Bảo vệ tài khoản bằng mã bảo mật một lần gửi qua email.</p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                      twoFactorEnabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {twoFactorEnabled ? "Đang kích hoạt" : "Đang tắt"}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Khi kích hoạt xác thực 2 bước (2FA), mỗi lần đăng nhập vào tài khoản, hệ thống sẽ tự động gửi một mã OTP gồm 6 chữ số tới địa chỉ email <strong>{profile.email}</strong> để đảm bảo chỉ có bạn mới có quyền truy cập.
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {twoFactorEnabled ? "Tắt xác thực 2 bước" : "Kích hoạt xác thực 2 bước"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Yêu cầu xác thực mật khẩu hiện tại</p>
                    </div>

                    <button
                      onClick={() => { setShow2FaModal(true); setTwoFaMsg(""); }}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                        twoFactorEnabled
                          ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      }`}
                    >
                      {twoFactorEnabled ? "Tắt 2FA" : "Bật 2FA ngay"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: QUẢN LÝ THIẾT BỊ */}
            {activeTab === "devices" && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Laptop className="text-[var(--brand,#2563EB)]" size={20} />
                      Thiết bị & Phiên đăng nhập
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Danh sách các thiết bị đang có phiên đăng nhập hợp lệ vào tài khoản này.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchDevices}
                      disabled={isLoadingDevices}
                      className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                      title="Làm mới danh sách"
                    >
                      <RefreshCw size={16} className={isLoadingDevices ? "animate-spin" : ""} />
                    </button>
                    {devices.length > 1 && (
                      <button
                        onClick={handleRevokeOthers}
                        className="text-xs font-bold px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 transition"
                      >
                        Đăng xuất thiết bị khác
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {devices.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Chưa có thông tin thiết bị nào.</p>
                  ) : (
                    devices.map((device) => (
                      <div
                        key={device.session_id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition ${
                          device.is_current
                            ? "bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40"
                            : "bg-slate-50/70 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              device.is_current
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {device.device_type === "mobile" ? (
                              <Smartphone size={20} />
                            ) : (
                              <Monitor size={20} />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {device.device_name}
                              </p>
                              {device.is_current && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                  Thiết bị này
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {device.browser} &bull; {device.os} &bull; IP: {device.ip_address}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> Hoạt động: {new Date(device.last_active).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>

                        {!device.is_current && (
                          <button
                            onClick={() => handleRevokeDevice(device.session_id)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-200 transition shrink-0"
                          >
                            Đăng xuất
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2FA Confirmation Modal */}
      {show2FaModal && (
        <div
          className="fixed inset-0 !mt-0 !m-0 top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
              <Shield className="text-indigo-600" size={18} />
              {twoFactorEnabled ? "Xác nhận Tắt 2FA" : "Xác nhận Bật 2FA"}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Vui lòng nhập mật khẩu tài khoản của bạn để xác thực thao tác bật/tắt bảo mật 2 lớp:
            </p>

            {twoFaMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                {twoFaMsg}
              </div>
            )}

            <input
              type="password"
              placeholder="Nhập mật khẩu của bạn"
              value={twoFaPassword}
              onChange={(e) => setTwoFaPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-950 dark:text-white font-medium"
            />

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShow2FaModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                onClick={handleToggle2FA}
                disabled={!twoFaPassword}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
