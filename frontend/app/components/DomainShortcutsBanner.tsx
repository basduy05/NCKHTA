"use client";
import React from "react";
import Link from "next/link";
import {
  Sparkles, Award, BookOpen, Mic, TrendingUp,
  ClipboardList, Users, Search, Trophy, ArrowRight,
  Newspaper, MessageSquare
} from "lucide-react";

interface ShortcutItem {
  title: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  color: string;
}

interface DomainShortcutsProps {
  domain: string;
  subTab?: string;
}

export default function DomainShortcutsBanner({ domain, subTab }: DomainShortcutsProps) {
  const getShortcuts = (): ShortcutItem[] => {
    switch (domain) {
      case "learning":
        if (subTab === "assignments") {
          return [
            {
              title: "Hỏi AI Coach giải thích bài khó",
              desc: "Nhận gợi ý và phương pháp giải chi tiết từng bước",
              href: "/dashboard/student?tab=ai-tools",
              icon: Sparkles,
              badge: "AI Hỗ trợ",
              color: "text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300",
            },
            {
              title: "Luyện thêm đề thi cùng chủ đề",
              desc: "Tăng phản xạ làm bài và củng cố kiến thức",
              href: "/dashboard/student?tab=practice&sub=practice",
              icon: Award,
              color: "text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300",
            },
          ];
        }
        return [
          {
            title: "Kiểm tra danh sách bài tập cần nộp",
            desc: "Hoàn thành bài tập để không bị trễ hạn",
            href: "/dashboard/student?tab=learning&sub=assignments",
            icon: ClipboardList,
            badge: "Quan trọng",
            color: "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300",
          },
          {
            title: "Ôn lại từ vựng trong bài học",
            desc: "Luyện tập theo thuật toán ngắt quãng FSRS",
            href: "/dashboard/student?tab=language&sub=vocabulary",
            icon: BookOpen,
            color: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300",
          },
        ];

      case "community":
        if (subTab === "chat") {
          return [
            {
              title: "Tra cứu từ điển ngay khi trò chuyện",
              desc: "Tìm nghĩa, ví dụ và phiên âm IPA tức thì",
              href: "/dashboard/student?tab=language&sub=dictionary",
              icon: Search,
              color: "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300",
            },
            {
              title: "Vào nhóm học tập để xem tài liệu",
              desc: "Trao đổi bài tập và tài liệu học tập cùng lớp",
              href: "/dashboard/student?tab=community&sub=groups",
              icon: Users,
              color: "text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300",
            },
          ];
        }
        return [
          {
            title: "Nhắn tin trực tuyến cùng bạn học",
            desc: "Hỏi đáp nhanh và trao đổi thảo luận nhóm",
            href: "/dashboard/student?tab=community&sub=chat",
            icon: MessageSquare,
            color: "text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300",
          },
          {
            title: "Chia sẻ tiến độ & điểm số",
            desc: "Xem thành tích học tập và sự tiến bộ của bạn",
            href: "/dashboard/student?tab=progress&sub=scores",
            icon: TrendingUp,
            color: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300",
          },
        ];

      case "language":
        if (subTab === "grammar") {
          return [
            {
              title: "Làm bài tập vận dụng ngữ pháp",
              desc: "Áp dụng cấu trúc vừa học vào bài kiểm tra",
              href: "/dashboard/student?tab=learning&sub=assignments",
              icon: ClipboardList,
              badge: "Thực hành",
              color: "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300",
            },
            {
              title: "Đọc báo để thấy ngữ cảnh thực tế",
              desc: "Phân tích ngữ pháp qua các tin tức quốc tế",
              href: "/dashboard/student?tab=language&sub=news",
              icon: Newspaper,
              color: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300",
            },
          ];
        }
        if (subTab === "news") {
          return [
            {
              title: "Tra nhanh các từ mới vừa đọc",
              desc: "Lưu từ vựng kèm ngữ cảnh bài báo",
              href: "/dashboard/student?tab=language&sub=dictionary",
              icon: Search,
              color: "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300",
            },
            {
              title: "Nhờ AI Coach tóm tắt hoặc thảo luận",
              desc: "Hỏi đáp với AI về quan điểm của bài báo",
              href: "/dashboard/student?tab=ai-tools",
              icon: Sparkles,
              color: "text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300",
            },
          ];
        }
        return [
          {
            title: "Luyện phát âm chuẩn IPA với từ này",
            desc: "Nhận diện âm chuẩn qua mic và biểu đồ sóng âm",
            href: "/dashboard/student?tab=practice&sub=ipa",
            icon: Mic,
            badge: "Khuyên dùng",
            color: "text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300",
          },
          {
            title: "Nhờ AI Coach đặt câu hội thoại",
            desc: "Thực hành phản xạ với các từ vựng đã chọn",
            href: "/dashboard/student?tab=ai-tools",
            icon: Sparkles,
            color: "text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300",
          },
        ];

      case "practice":
        if (subTab === "ipa") {
          return [
            {
              title: "Trò chuyện luyện phản xạ cùng AI Coach",
              desc: "Áp dụng ngữ điệu và phát âm chuẩn vào hội thoại",
              href: "/dashboard/student?tab=ai-tools",
              icon: Sparkles,
              badge: "AI 1-on-1",
              color: "text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300",
            },
            {
              title: "Tra cứu cách đọc các từ vựng mới",
              desc: "Xem bảng phiên âm chuẩn Oxford / Cambridge",
              href: "/dashboard/student?tab=language&sub=dictionary",
              icon: BookOpen,
              color: "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300",
            },
          ];
        }
        return [
          {
            title: "Xem bảng xếp hạng tuần này",
            desc: "Kiểm tra thứ hạng và cạnh tranh cùng bạn bè",
            href: "/dashboard/student?tab=progress&sub=ranking",
            icon: Trophy,
            badge: "Thi đua",
            color: "text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300",
          },
          {
            title: "Ôn lại các quy tắc ngữ pháp hay sai",
            desc: "Củng cố điểm lý thuyết trước khi thi lại",
            href: "/dashboard/student?tab=language&sub=grammar",
            icon: BookOpen,
            color: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300",
          },
        ];

      case "progress":
        if (subTab === "ranking") {
          return [
            {
              title: "Tăng điểm bằng cách hoàn thành bài tập",
              desc: "Bài tập nộp đúng hạn sẽ nhận thêm điểm thưởng",
              href: "/dashboard/student?tab=learning&sub=assignments",
              icon: ClipboardList,
              badge: "+ Điểm",
              color: "text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300",
            },
            {
              title: "Luyện phát âm IPA để tích lũy thêm XP",
              desc: "Mỗi bài phát âm chuẩn cộng điểm thưởng Streak",
              href: "/dashboard/student?tab=practice&sub=ipa",
              icon: Mic,
              color: "text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300",
            },
          ];
        }
        if (subTab === "roadmap") {
          return [
            {
              title: "Bắt đầu học từ vựng cho chặng tiếp theo",
              desc: "Ghi nhớ bộ từ mới theo đề xuất của lộ trình",
              href: "/dashboard/student?tab=language&sub=vocabulary",
              icon: BookOpen,
              badge: "Bước kế tiếp",
              color: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300",
            },
            {
              title: "Kiểm tra năng lực qua đề test",
              desc: "Đánh giá mức độ hoàn thành chặng học hiện tại",
              href: "/dashboard/student?tab=practice&sub=practice",
              icon: Award,
              color: "text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300",
            },
          ];
        }
        return [
          {
            title: "Luyện lại kỹ năng có điểm thấp nhất",
            desc: "Làm thêm các bài tập bổ trợ để nâng band điểm",
            href: "/dashboard/student?tab=practice&sub=practice",
            icon: Award,
            badge: "Cải thiện",
            color: "text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-300",
          },
          {
            title: "Xem lộ trình học tập cá nhân hóa",
            desc: "Kế hoạch từng tuần để đạt mục tiêu CEFR / IELTS",
            href: "/dashboard/student?tab=progress&sub=roadmap",
            icon: TrendingUp,
            color: "text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300",
          },
        ];

      default:
        return [];
    }
  };

  const shortcuts = getShortcuts();
  if (shortcuts.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-[var(--line)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--ink-2)] uppercase tracking-wider">
            ⚡ Gợi ý bước tiếp theo
          </span>
          <span className="text-[11px] text-[var(--ink-3)] hidden sm:inline">
            (Liên kết thông minh theo tiến trình học)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {shortcuts.map((sc, idx) => {
          const Icon = sc.icon;
          return (
            <Link
              key={idx}
              href={sc.href}
              className={`group flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all shadow-2xs hover:shadow-xs ${sc.color}`}
            >
              <div className="p-2 rounded-xl bg-white shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-[13px] font-bold text-slate-800 truncate">
                    {sc.title}
                  </h4>
                  {sc.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-white/80 text-slate-700 shrink-0 border border-slate-200">
                      {sc.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 line-clamp-1">
                  {sc.desc}
                </p>
              </div>
              <ArrowRight
                size={15}
                className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition shrink-0 self-center"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
