"use client";

import React, { useState, useEffect } from "react";
import {
  Mail, Bell, Send, CheckCircle2, AlertTriangle, AlertCircle,
  RefreshCw, Users, Sparkles, Smartphone, Monitor, Eye, History,
  ExternalLink, Check, Copy, Flame, ShieldAlert, Zap, Info, Clock,
  ChevronRight, Radio, Filter, Layers, ArrowRight
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useNotification } from "@/app/context/NotificationContext";
import { useI18n } from "@/app/context/I18nContext";

interface BroadcastLog {
  id: number;
  title: string;
  message: string;
  channel: "email" | "in_app" | "both";
  target_audience: string;
  recipients_count: number;
  delivered_count: number;
  failed_count: number;
  sent_at: string;
  status: string;
}

interface TemplatePreset {
  id: string;
  name: string;
  icon: string;
  category: string;
  channel: "both" | "email" | "in_app";
  target: string;
  title: string;
  message: string;
  actionLink: string;
  buttonText: string;
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: "streak_alert",
    name: "Nhắc nhở Streak & Học tập",
    icon: "🔥",
    category: "Retention",
    channel: "both",
    target: "CHURN_RISK",
    title: "🔥 Đừng để chuỗi Streak của bạn bị gián đoạn!",
    message: "Xin chào! Bạn chỉ còn vài bài tập nhỏ hôm nay để tiếp tục duy trì chuỗi Streak ấn tượng. Hãy dành 5-10 phút luyện phát âm và từ vựng cùng AI Coach để luôn duy trì phong độ nhé!",
    actionLink: "/dashboard/student?tab=learning",
    buttonText: "Tiếp tục học ngay",
  },
  {
    id: "pro_discount",
    name: "Khuyến mãi Nâng cấp PRO",
    icon: "💎",
    category: "Marketing",
    channel: "both",
    target: "FREE_TIER",
    title: "⚡ Nhận ưu đãi 50% Gói iEdu PRO hôm nay!",
    message: "Nâng tầm phản xạ giao tiếp tiếng Anh với tính năng không giới hạn: Chấm điểm phát âm IPA theo thời gian thực, Kho ngữ pháp nâng cao và Lộ trình cá nhân hóa được thiết kế riêng cho bạn.",
    actionLink: "/upgrade",
    buttonText: "Kích hoạt ưu đãi 50%",
  },
  {
    id: "system_maintenance",
    name: "Bảo trì Hệ thống định kỳ",
    icon: "🔧",
    category: "System",
    channel: "both",
    target: "ALL",
    title: "🔧 Thông báo nâng cấp hệ thống & Cải tiến AI",
    message: "Hệ thống iEdu sẽ tiến hành nâng cấp máy chủ AI định kỳ vào lúc 02:00 sáng Chủ Nhật nhằm tăng tốc độ phản hồi gấp 2 lần. Quá trình nâng cấp dự kiến diễn ra trong 20 phút.",
    actionLink: "/dashboard",
    buttonText: "Xem chi tiết hệ thống",
  },
  {
    id: "new_ai_features",
    name: "Ra mắt tính năng AI Coach",
    icon: "🚀",
    category: "Product",
    channel: "both",
    target: "STUDENTS",
    title: "🚀 Trải nghiệm tính năng AI Phản biện & Chữa đề mới!",
    message: "iEdu vừa cập nhật thuật toán phát hiện lỗi phát âm IPA chuẩn xác từng âm tiết và gia sư đàm thoại tương tác trực tiếp 24/7. Hãy mở bảng điều khiển và thử ngay hôm nay!",
    actionLink: "/dashboard/student?tab=ai-tools",
    buttonText: "Khám phá AI Coach",
  },
];

export default function BroadcastTab({ API_URL }: { API_URL: string }) {
  const { authFetch, user } = useAuth();
  const { showAlert } = useNotification();
  const { t } = useI18n();

  // Navigation sub-tab
  const [activeSubTab, setActiveSubTab] = useState<"compose" | "history">("compose");

  // Form State
  const [channel, setChannel] = useState<"both" | "email" | "in_app">("both");
  const [targetAudience, setTargetAudience] = useState<string>("ALL");
  const [title, setTitle] = useState<string>("🔥 Đừng để chuỗi Streak của bạn bị gián đoạn!");
  const [message, setMessage] = useState<string>(
    "Xin chào! Bạn chỉ còn vài bài tập nhỏ hôm nay để tiếp tục duy trì chuỗi Streak ấn tượng. Hãy dành 5-10 phút luyện phát âm và từ vựng cùng AI Coach để luôn duy trì phong độ nhé!"
  );
  const [actionLink, setActionLink] = useState<string>("/dashboard/student?tab=learning");
  const [buttonText, setButtonText] = useState<string>("Tiếp tục học ngay");
  const [testEmail, setTestEmail] = useState<string>("");

  // UI state
  const [previewChannel, setPreviewChannel] = useState<"email" | "in_app">("email");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSending, setIsSending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  // History & Statistics
  const [historyLogs, setHistoryLogs] = useState<BroadcastLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Init test email
  useEffect(() => {
    if (user?.email && !testEmail) {
      setTestEmail(user.email);
    }
  }, [user]);

  // Load history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await authFetch(`${API_URL}/admin/broadcast/history`);
      if (res.ok) {
        const d = await res.json();
        setHistoryLogs(d.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch broadcast history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle template selection
  const handleApplyTemplate = (tmpl: TemplatePreset) => {
    setChannel(tmpl.channel);
    setTargetAudience(tmpl.target);
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setActionLink(tmpl.actionLink);
    setButtonText(tmpl.buttonText);
    showAlert(`Đã áp dụng mẫu "${tmpl.name}"`, "info");
  };

  // Handle test send
  const handleTestSend = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      showAlert("Vui lòng nhập địa chỉ email hợp lệ để gửi thử nghiệm", "warning");
      return;
    }
    if (!title.trim() || !message.trim()) {
      showAlert("Tiêu đề và nội dung không được để trống", "warning");
      return;
    }

    setIsTesting(true);
    try {
      const res = await authFetch(`${API_URL}/admin/broadcast/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          title,
          message,
          action_link: actionLink,
          button_text: buttonText,
          test_email: testEmail,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(data.detail || "Đã gửi bản tin thử nghiệm thành công!", "success");
      } else {
        showAlert(data.detail || "Không thể gửi thử nghiệm", "error");
      }
    } catch (err: any) {
      showAlert(err.message || "Lỗi khi gửi email thử nghiệm", "error");
    } finally {
      setIsTesting(false);
    }
  };

  // Handle official broadcast
  const handleConfirmSend = async () => {
    setConfirmModal(false);
    setIsSending(true);
    try {
      const res = await authFetch(`${API_URL}/admin/broadcast/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          target_audience: targetAudience,
          title,
          message,
          action_link: actionLink,
          button_text: buttonText,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(
          `Phát sóng thành công! Đã gửi đến ${data.delivered}/${data.total_recipients} người dùng.`,
          "success"
        );
        fetchHistory();
        setActiveSubTab("history");
      } else {
        showAlert(data.detail || "Gửi phát sóng thất bại", "error");
      }
    } catch (err: any) {
      showAlert(err.message || "Lỗi khi phát sóng thông báo", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Stats calculation
  const totalCampaigns = historyLogs.length;
  const totalDelivered = historyLogs.reduce((acc, cur) => acc + (cur.delivered_count || 0), 0);
  const totalFailed = historyLogs.reduce((acc, cur) => acc + (cur.failed_count || 0), 0);
  const successRate = totalDelivered + totalFailed > 0
    ? Math.round((totalDelivered / (totalDelivered + totalFailed)) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-700 via-indigo-600 to-[var(--brand)] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={13} className="text-yellow-300" />
            <span>Multi-Channel Communication Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("broadcast.tab_title", "Trung Tâm Phát Sóng Email & Thông Báo Đẩy")}
          </h1>
          <p className="text-white/80 text-sm max-w-2xl">
            {t(
              "broadcast.tab_desc",
              "Gửi email tiếp thị và thông báo thời gian thực đến toàn bộ hệ sinh thái học viên, giáo viên hoặc phân khúc học viên có nguy cơ rời bỏ (Churn Risk)."
            )}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("compose")}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm flex items-center gap-2 ${
              activeSubTab === "compose"
                ? "bg-white text-indigo-700 shadow-md font-semibold"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <Send size={15} />
            <span>{t("broadcast.compose", "Soạn tin mới")}</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab("history");
              fetchHistory();
            }}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm flex items-center gap-2 ${
              activeSubTab === "history"
                ? "bg-white text-indigo-700 shadow-md font-semibold"
                : "bg-white/15 text-white hover:bg-white/25"
            }`}
          >
            <History size={15} />
            <span>{t("broadcast.history", "Lịch sử gửi")} ({historyLogs.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xs text-[var(--muted)] font-medium">Tổng chiến dịch</div>
            <div className="text-xl font-bold text-[var(--foreground)]">{totalCampaigns}</div>
          </div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xs text-[var(--muted)] font-medium">Lượt gửi thành công</div>
            <div className="text-xl font-bold text-emerald-600">{totalDelivered.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-xs text-[var(--muted)] font-medium">Tỷ lệ chuyển phát</div>
            <div className="text-xl font-bold text-blue-600">{successRate}%</div>
          </div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Mail size={20} />
          </div>
          <div>
            <div className="text-xs text-[var(--muted)] font-medium">Trạng thái SMTP</div>
            <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sẵn sàng (Port 465)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main View: Compose vs History */}
      {activeSubTab === "compose" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Form Settings (7 cols) */}
          <div className="xl:col-span-7 space-y-6">
            {/* Template Selector Bar */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>{t("broadcast.template", "Mẫu nội dung tối ưu sẵn có")}</span>
                </span>
                <span className="text-xs text-[var(--muted)]">Nhấn để áp dụng nhanh</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleApplyTemplate(tmpl)}
                    type="button"
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--border-color)] hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 transition-all text-left group"
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {tmpl.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--foreground)] truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] truncate">
                        {tmpl.title}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Compose Form */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm space-y-5">
              {/* Channel Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. {t("broadcast.channel", "Kênh phát sóng")}</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: "both",
                      label: "Cả 2 Kênh",
                      desc: "Email + Đẩy In-App",
                      icon: Zap,
                      color: "from-purple-500 to-indigo-600",
                    },
                    {
                      id: "email",
                      label: "Chỉ Email",
                      desc: "Gửi qua SMTP SSL",
                      icon: Mail,
                      color: "from-blue-500 to-cyan-600",
                    },
                    {
                      id: "in_app",
                      label: "Chỉ In-App",
                      desc: "SSE & Thông báo web",
                      icon: Bell,
                      color: "from-amber-500 to-orange-600",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = channel === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setChannel(item.id as any);
                          if (item.id === "email") setPreviewChannel("email");
                          if (item.id === "in_app") setPreviewChannel("in_app");
                        }}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-2 ring-[var(--brand)]/20"
                            : "border-[var(--border-color)] hover:border-[var(--muted)]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon
                            size={16}
                            className={isSelected ? "text-[var(--brand)]" : "text-[var(--muted)]"}
                          />
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-[var(--foreground)]">{item.label}</div>
                        <div className="text-[10px] text-[var(--muted)]">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center justify-between">
                  <span>2. {t("broadcast.target", "Đối tượng mục tiêu")}</span>
                  <span className="text-[11px] font-normal text-[var(--muted)]">
                    {targetAudience === "CHURN_RISK"
                      ? "⚡ Học viên nguy cơ cao được lọc từ mô hình ML"
                      : "Áp dụng cho phân khúc tương ứng"}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "ALL", label: "Toàn bộ Users", icon: Users },
                    { id: "STUDENTS", label: "Chỉ Học viên", icon: Users },
                    { id: "TEACHERS", label: "Chỉ Giáo viên", icon: Users },
                    { id: "CHURN_RISK", label: "⚠️ Churn Risk", icon: AlertTriangle },
                    { id: "INACTIVE_7D", label: "Vắng mặt >7 ngày", icon: Clock },
                    { id: "FREE_TIER", label: "Gói Free", icon: Flame },
                    { id: "A1_A2", label: "Trình độ A1-A2", icon: ShieldAlert },
                    { id: "B1_B2", label: "Trình độ B1-B2", icon: Sparkles },
                  ].map((tgt) => {
                    const isSelected = targetAudience === tgt.id;
                    return (
                      <button
                        key={tgt.id}
                        type="button"
                        onClick={() => setTargetAudience(tgt.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all text-xs font-medium ${
                          isSelected
                            ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-sm font-semibold"
                            : "border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                        }`}
                      >
                        {tgt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Message */}
              <div className="space-y-4 pt-2 border-t border-[var(--border-color)]">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                    3. Tiêu đề thông báo (Subject / Title)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: 🔥 Đừng bỏ lỡ bài học quan trọng hôm nay!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center justify-between">
                    <span>Nội dung chi tiết (Message Body)</span>
                    <span className="text-[11px] font-normal text-[var(--muted)]">
                      Hỗ trợ xuống dòng & Emoji
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nhập nội dung thông điệp gửi đến người dùng..."
                    className="w-full p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] leading-relaxed"
                  />
                </div>

                {/* CTA Action Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--foreground)]">
                      Đường dẫn hành động (Action Link)
                    </label>
                    <input
                      type="text"
                      value={actionLink}
                      onChange={(e) => setActionLink(e.target.value)}
                      placeholder="/dashboard/student?tab=learning"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[var(--foreground)]">
                      Tên nút bấm (Button Text)
                    </label>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="Vào học ngay"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                {/* Test Send Line */}
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-[var(--card-hover)] p-2.5 rounded-xl border border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)] shrink-0 px-1">
                    <Mail size={14} className="text-[var(--brand)]" />
                    <span>Test trực tiếp tới:</span>
                  </div>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="admin@iedu.app"
                    className="flex-1 w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  />
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={isTesting}
                    className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] hover:bg-[var(--brand)]/20 font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Đang gửi test...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>{t("broadcast.test_send", "Gửi thử cho tôi")}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Official Send Button */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
                    <Info size={14} className="text-blue-500" />
                    <span>Hệ thống tự động lọc email trùng lặp và bỏ qua user đã unsubscribed.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmModal(true)}
                    disabled={isSending || !title.trim() || !message.trim()}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-[var(--brand)] hover:opacity-95 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Đang phát sóng...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>{t("broadcast.send_now", "Phát sóng chiến dịch")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Preview (5 cols) */}
          <div className="xl:col-span-5 space-y-4">
            {/* Preview Toolbar */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-3 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-1 bg-[var(--card-hover)] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewChannel("email")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    previewChannel === "email"
                      ? "bg-white dark:bg-gray-800 text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Mail size={13} />
                  <span>Email Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewChannel("in_app")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    previewChannel === "in_app"
                      ? "bg-white dark:bg-gray-800 text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Bell size={13} />
                  <span>In-App Preview</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  title="Desktop view"
                  className={`p-1.5 rounded-lg text-xs ${
                    previewDevice === "desktop"
                      ? "bg-[var(--brand)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--card-hover)]"
                  }`}
                >
                  <Monitor size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  title="Mobile view"
                  className={`p-1.5 rounded-lg text-xs ${
                    previewDevice === "mobile"
                      ? "bg-[var(--brand)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--card-hover)]"
                  }`}
                >
                  <Smartphone size={15} />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div
              className={`transition-all mx-auto ${
                previewDevice === "mobile" ? "max-w-[340px]" : "w-full"
              }`}
            >
              {previewChannel === "email" ? (
                /* Email Window Mockup */
                <div className="bg-[#f8fafc] dark:bg-gray-900 border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xl text-slate-800 dark:text-slate-200">
                  {/* Window Bar */}
                  <div className="bg-slate-200 dark:bg-gray-800 px-4 py-2.5 border-b border-slate-300 dark:border-gray-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
                      iEdu Notification Client
                    </span>
                    <Eye size={14} className="text-slate-400" />
                  </div>

                  {/* Mail metadata */}
                  <div className="p-4 bg-white dark:bg-gray-950 border-b border-slate-100 dark:border-gray-800 text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 w-14">From:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        iEdu Learning &lt;noreply@iedu.app&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 w-14">To:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {testEmail || "student@iedu.app"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 w-14">Subject:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate">
                        {title || "Tiêu đề thông báo..."}
                      </span>
                    </div>
                  </div>

                  {/* Email Content HTML render */}
                  <div className="p-6 bg-white dark:bg-gray-950 space-y-6">
                    {/* Header banner */}
                    <div className="text-center pb-4 border-b border-slate-100 dark:border-gray-800">
                      <div className="inline-flex items-center gap-2 font-black text-xl tracking-tight text-indigo-600 dark:text-indigo-400">
                        <span>🎓 iEdu Learning</span>
                      </div>
                      <div className="text-[11px] text-slate-400 tracking-wider uppercase mt-1">
                        Hệ thống đào tạo tiếng Anh thông minh
                      </div>
                    </div>

                    {/* Main Title & Body */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {title || "Chưa có tiêu đề"}
                      </h2>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {message || "Chưa có nội dung thông báo..."}
                      </div>

                      {/* CTA Button */}
                      <div className="pt-3 pb-2 text-center">
                        <a
                          href={actionLink || "#"}
                          onClick={(e) => e.preventDefault()}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5"
                        >
                          <span>{buttonText || "Xem chi tiết"}</span>
                          <ArrowRight size={15} />
                        </a>
                      </div>
                    </div>

                    {/* Email Footer */}
                    <div className="pt-6 border-t border-slate-100 dark:border-gray-800 text-center space-y-1.5 text-[11px] text-slate-400">
                      <p>© 2026 iEdu Platform. Tất cả các quyền được bảo lưu.</p>
                      <p>
                        Email này được gửi tự động. Vui lòng không trả lời thư này.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* In-App Notification Preview */
                <div className="space-y-4">
                  {/* 1. Floating Toast preview */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-900/60 shadow-2xl space-y-2 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-purple-600" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Bell size={18} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {title || "Thông báo từ iEdu"}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {message || "Nội dung thông báo..."}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">Vừa xong</span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        {buttonText || "Xem ngay"}
                      </button>
                    </div>
                  </div>

                  {/* 2. Notification Bell Dropdown Item Preview */}
                  <div className="bg-white dark:bg-gray-900 border border-[var(--border-color)] rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Trong menu thông báo (Bell Dropdown)
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 animate-ping" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {title || "Tiêu đề thông báo"}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {message || "Nội dung chi tiết..."}
                        </p>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 inline-block">
                          Được gửi tới: {targetAudience}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History & Logs View */
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--foreground)]">
                {t("broadcast.history", "Lịch sử các đợt phát sóng")}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Theo dõi thời gian, phân khúc người nhận và tỷ lệ gửi thành công thực tế
              </p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={isLoadingHistory}
              className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--card-hover)] text-xs font-semibold text-[var(--foreground)] transition-colors flex items-center gap-1.5 self-start"
            >
              <RefreshCw size={14} className={isLoadingHistory ? "animate-spin" : ""} />
              <span>{t("common.refresh", "Làm mới dữ liệu")}</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-16 text-center text-xs text-[var(--muted)] flex flex-col items-center justify-center gap-2">
              <RefreshCw size={24} className="animate-spin text-[var(--brand)]" />
              <span>Đang tải lịch sử phát sóng...</span>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--muted)] space-y-2">
              <Mail size={32} className="mx-auto text-[var(--muted)]/40" />
              <p>Chưa có chiến dịch phát sóng nào được gửi.</p>
              <button
                onClick={() => setActiveSubTab("compose")}
                className="text-[var(--brand)] font-semibold hover:underline"
              >
                Tạo chiến dịch đầu tiên ngay
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--card-hover)] text-[var(--muted)] uppercase font-semibold border-b border-[var(--border-color)]">
                  <tr>
                    <th className="py-3 px-4"># ID</th>
                    <th className="py-3 px-4">Chiến dịch / Tiêu đề</th>
                    <th className="py-3 px-4">Kênh</th>
                    <th className="py-3 px-4">Đối tượng</th>
                    <th className="py-3 px-4 text-center">Người nhận</th>
                    <th className="py-3 px-4 text-center">Thành công</th>
                    <th className="py-3 px-4 text-center">Thất bại</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--card-hover)] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-[var(--muted)]">
                        #{log.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[var(--foreground)]">{log.title}</div>
                        <div className="text-[11px] text-[var(--muted)] line-clamp-1 max-w-xs">
                          {log.message}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.channel === "both"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : log.channel === "email"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {log.channel === "both" ? "Email + In-App" : log.channel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[var(--foreground)]">
                        {log.target_audience}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-[var(--foreground)]">
                        {log.recipients_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {log.delivered_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-red-500">
                        {log.failed_count}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--muted)]">
                        {log.sent_at ? log.sent_at.slice(0, 16).replace("T", " ") : "N/A"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 size={13} />
                          <span>{log.status || "Completed"}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Zap size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Xác nhận phát sóng thông báo?
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Bạn sắp gửi chiến dịch này qua kênh{" "}
                <span className="font-bold text-[var(--foreground)] uppercase">{channel}</span> đến phân
                khúc <span className="font-bold text-[var(--foreground)]">{targetAudience}</span>.
              </p>
            </div>

            <div className="bg-[var(--card-hover)] p-3.5 rounded-xl border border-[var(--border-color)] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Tiêu đề:</span>
                <span className="font-semibold text-[var(--foreground)] truncate max-w-[220px]">
                  {title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Kênh:</span>
                <span className="font-bold text-indigo-600 uppercase">{channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Hành động:</span>
                <span className="font-mono text-[var(--foreground)] truncate max-w-[220px]">
                  {actionLink}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--card-hover)] text-xs font-semibold text-[var(--foreground)] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
              >
                Xác nhận gửi ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
