"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, ArrowRight, LayoutDashboard, GraduationCap, Users,
  BookOpen, Award, Sparkles, TrendingUp, BookMarked, BookText,
  Newspaper, Mic, Component, Trophy, ClipboardList, MessageSquare,
  User, Crown
} from "lucide-react";

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Domain" | "Tính năng" | "Hệ thống";
  href: string;
  icon: React.ElementType;
  keywords: string[];
  roles?: string[];
}

const SEARCH_ITEMS: SearchItem[] = [
  // Domains
  {
    id: "overview",
    title: "Tổng quan",
    subtitle: "Bảng điều khiển cá nhân, streak và nhiệm vụ hôm nay",
    category: "Domain",
    href: "/dashboard/student?tab=overview",
    icon: LayoutDashboard,
    keywords: ["home", "dashboard", "tong quan", "nhiem vu", "streak", "diem"]
  },
  {
    id: "learning",
    title: "Lớp học của tôi",
    subtitle: "Xem danh sách lớp học và tài liệu giảng dạy",
    category: "Domain",
    href: "/dashboard/student?tab=learning&sub=classes",
    icon: GraduationCap,
    keywords: ["lop hoc", "class", "giao vien", "hoc sinh"]
  },
  {
    id: "assignments",
    title: "Bài tập & Đề thi",
    subtitle: "Danh sách bài tập cần nộp, hạn chót và kết quả",
    category: "Tính năng",
    href: "/dashboard/student?tab=learning&sub=assignments",
    icon: ClipboardList,
    keywords: ["bai tap", "kiem tra", "homework", "quiz", "han nop"]
  },
  {
    id: "community-groups",
    title: "Nhóm học tập",
    subtitle: "Tham gia các nhóm trao đổi và học hỏi cùng bạn bè",
    category: "Domain",
    href: "/dashboard/student?tab=community&sub=groups",
    icon: Users,
    keywords: ["nhom", "group", "cong dong", "hoc tap", "ban be"]
  },
  {
    id: "community-chat",
    title: "Chat trực tuyến",
    subtitle: "Trò chuyện realtime với bạn bè và AI Teacher Bot",
    category: "Tính năng",
    href: "/dashboard/student?tab=community&sub=chat",
    icon: MessageSquare,
    keywords: ["chat", "nhan tin", "tin nhan", "bot", "trao doi"]
  },
  {
    id: "dictionary",
    title: "Tra cứu từ điển",
    subtitle: "Tra từ điển Anh - Việt kèm phát âm, loại từ và ví dụ",
    category: "Tính năng",
    href: "/dashboard/student?tab=language&sub=dictionary",
    icon: Search,
    keywords: ["tu dien", "dictionary", "dich", "tra tu", "nghia"]
  },
  {
    id: "vocabulary",
    title: "Sổ tay từ vựng (FSRS)",
    subtitle: "Bộ sưu tập từ vựng đã lưu với thuật toán lặp lại ngắt quãng",
    category: "Tính năng",
    href: "/dashboard/student?tab=language&sub=vocabulary",
    icon: BookMarked,
    keywords: ["tu vung", "vocab", "flashcard", "fsrs", "da luu"]
  },
  {
    id: "grammar",
    title: "Kho ngữ pháp tiếng Anh",
    subtitle: "Lý thuyết ngữ pháp đầy đủ từ cơ bản đến nâng cao",
    category: "Tính năng",
    href: "/dashboard/student?tab=language&sub=grammar",
    icon: BookText,
    keywords: ["ngu phap", "grammar", "thi", "cau dieu kien", "cau bi dong"]
  },
  {
    id: "news",
    title: "Đọc báo tiếng Anh",
    subtitle: "Luyện đọc tin tức quốc tế từ The Guardian và làm quiz",
    category: "Tính năng",
    href: "/dashboard/student?tab=language&sub=news",
    icon: Newspaper,
    keywords: ["doc bao", "tin tuc", "news", "guardian", "reading"]
  },
  {
    id: "practice-test",
    title: "Luyện thi & Đề test",
    subtitle: "Thi thử IELTS, TOEIC, THPT Quốc Gia với đáp án chi tiết",
    category: "Tính năng",
    href: "/dashboard/student?tab=practice&sub=practice",
    icon: Award,
    keywords: ["luyen thi", "de thi", "ielts", "toeic", "thpt", "test", "exam"]
  },
  {
    id: "practice-ipa",
    title: "Luyện phát âm chuẩn IPA",
    subtitle: "Phân tích khẩu hình và giọng đọc theo từ điển CMU",
    category: "Tính năng",
    href: "/dashboard/student?tab=practice&sub=ipa",
    icon: Mic,
    keywords: ["ipa", "phat am", "speaking", "am", "nguyen am", "phu am"]
  },
  {
    id: "ai-tools",
    title: "AI Coach & Trợ lý học tập",
    subtitle: "Hỏi đáp AI, sửa lỗi viết văn và giải thích chuyên sâu",
    category: "Domain",
    href: "/dashboard/student?tab=ai-tools",
    icon: Sparkles,
    keywords: ["ai", "coach", "tro ly", "gpt", "sua van", "writing"]
  },
  {
    id: "scores",
    title: "Kết quả học tập",
    subtitle: "Theo dõi điểm số, biểu đồ kỹ năng và lịch sử bài làm",
    category: "Tính năng",
    href: "/dashboard/student?tab=progress&sub=scores",
    icon: Component,
    keywords: ["ket qua", "diem so", "score", "ky nang", "lich su"]
  },
  {
    id: "ranking",
    title: "Bảng xếp hạng",
    subtitle: "Xếp hạng điểm tích lũy và phong trào thi đua toàn trường",
    category: "Tính năng",
    href: "/dashboard/student?tab=progress&sub=ranking",
    icon: Trophy,
    keywords: ["xep hang", "top", "leaderboard", "vinh danh", "huy chuong"]
  },
  {
    id: "roadmap",
    title: "Lộ trình học tập cá nhân",
    subtitle: "Lộ trình mục tiêu thích ứng và dự báo ngày cán đích ETA",
    category: "Tính năng",
    href: "/dashboard/student?tab=progress&sub=roadmap",
    icon: TrendingUp,
    keywords: ["lo trinh", "roadmap", "eta", "muc tieu", "ke hoach"]
  },
  // System / Account
  {
    id: "profile",
    title: "Hồ sơ cá nhân",
    subtitle: "Cập nhật tên, mục tiêu CEFR, avatar và đổi mật khẩu",
    category: "Hệ thống",
    href: "/profile",
    icon: User,
    keywords: ["ho so", "profile", "tai khoan", "mat khau", "cefr", "avatar"]
  },
  {
    id: "upgrade",
    title: "Nâng cấp iEdu PRO",
    subtitle: "Mở khóa AI không giới hạn, FSRS và toàn bộ tài nguyên",
    category: "Hệ thống",
    href: "/upgrade",
    icon: Crown,
    keywords: ["nang cap", "upgrade", "pro", "premium", "goi", "gia"]
  }
];

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export default function CommandSearchModal({ isOpen, onClose, userRole = "student" }: CommandSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Can be toggled from parent
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_ITEMS;

    return SEARCH_ITEMS.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchKeywords;
    });
  }, [query]);

  // Clamp selection index
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle navigate
  const handleSelect = (item: SearchItem) => {
    onClose();
    router.push(item.href);
  };

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 !mt-0 !m-0 z-[150] bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={20} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Tìm tính năng, bài học, từ vựng, đề thi..."
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-800 dark:text-white outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline px-2 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-50 dark:divide-slate-800/50">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Không tìm thấy kết quả phù hợp cho "{query}"</p>
              <p className="text-xs mt-1 text-slate-400">Thử tìm kiếm với từ khóa khác như "từ vựng", "chat", "đề thi"...</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-left transition-all ${
                    isSelected
                      ? "bg-blue-50/80 dark:bg-blue-900/30 text-[var(--brand)] font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isSelected
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          item.category === "Domain"
                            ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                            : item.category === "Tính năng"
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {item.subtitle}
                    </p>
                  </div>

                  <ArrowRight
                    size={16}
                    className={`shrink-0 transition-transform ${
                      isSelected ? "text-[var(--brand)] translate-x-1 opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-[10px]">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-[10px]">
                ↓
              </kbd>{" "}
              di chuyển
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-[10px]">
                ENTER
              </kbd>{" "}
              chọn
            </span>
          </div>
          <span>iEdu Global Search</span>
        </div>
      </div>
    </div>
  );
}
