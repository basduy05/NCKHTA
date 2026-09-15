export type SupportedLocale = "vi" | "en" | "km";

export interface LocaleInfo {
  code: SupportedLocale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "km", label: "ភាសាខ្មែរ", flag: "🇰🇭" },
];

export const TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  vi: {
    // Domains (Student)
    "domain.overview": "Tổng quan",
    "domain.learning": "Lớp học",
    "domain.community": "Cộng đồng",
    "domain.language": "Ngôn ngữ",
    "domain.practice": "Luyện tập",
    "domain.ai-tools": "AI Coach",
    "domain.progress": "Tiến độ",

    // Admin & Teacher Navigation
    "nav.overview": "Tổng quan",
    "nav.users": "Người dùng & GV",
    "nav.classes": "Quản lý Lớp học",
    "nav.lessons": "Quản lý Bài học",
    "nav.assignments": "Bài tập & Đề thi",
    "nav.vocab": "Sổ tay Từ Vựng",
    "nav.grammar": "Kho Ngữ Pháp",
    "nav.ai_monitoring": "Giám sát AI",
    "nav.feedback": "Góp ý & Lỗi",
    "nav.settings": "Cài đặt",
    "nav.analytics": "Phân tích BI",
    "nav.behavior": "Hành vi người dùng",
    "nav.my_classes": "Lớp học của tôi",
    "nav.my_students": "Quản lý Học sinh",
    "nav.chat": "Chat Trực Tuyến",
    "nav.ai_tools": "Công cụ AI",

    // Sub-tabs
    "sub.overview": "Bảng tổng quan",
    "sub.classes": "Danh sách lớp",
    "sub.assignments": "Bài tập & Đề thi",
    "sub.groups": "Nhóm học tập",
    "sub.chat": "Tin nhắn trực tuyến",
    "sub.dictionary": "Tra từ điển",
    "sub.vocabulary": "Sổ tay từ vựng",
    "sub.grammar": "Kho ngữ pháp",
    "sub.news": "Đọc báo song ngữ",
    "sub.practice": "Luyện thi & Đề test",
    "sub.ipa": "Phát âm chuẩn IPA",
    "sub.scores": "Bảng điểm chi tiết",
    "sub.ranking": "Bảng xếp hạng",
    "sub.roadmap": "Lộ trình cá nhân",

    // Header & Quick Actions
    "header.search": "Tìm kiếm tính năng...",
    "header.points": "Điểm tích lũy",
    "header.credits": "AI Credits",
    "header.profile": "Hồ sơ cá nhân",
    "header.feedback": "Góp ý & Báo lỗi",
    "header.logout": "Đăng xuất",
    "header.pinned": "Đã ghim",
    "header.quick_pin": "Ghim nhanh",
    "header.unpin": "Bỏ ghim",
    "header.pin_to_top": "Ghim lên đầu",
    "header.upgrade_pro": "Nâng cấp iEdu PRO ngay",

    // Bottom Navigation (Mobile)
    "bottom.overview": "Tổng quan",
    "bottom.learning": "Lớp học",
    "bottom.community": "Cộng đồng",
    "bottom.language": "Ngôn ngữ",
    "bottom.practice": "Luyện tập",
    "bottom.profile": "Cá nhân",
  },
  en: {
    // Domains (Student)
    "domain.overview": "Overview",
    "domain.learning": "Classes",
    "domain.community": "Community",
    "domain.language": "Language",
    "domain.practice": "Practice",
    "domain.ai-tools": "AI Coach",
    "domain.progress": "Progress",

    // Admin & Teacher Navigation
    "nav.overview": "Overview",
    "nav.users": "Users & Faculty",
    "nav.classes": "Class Management",
    "nav.lessons": "Lessons & Content",
    "nav.assignments": "Assignments & Exams",
    "nav.vocab": "Vocabulary Graph",
    "nav.grammar": "Grammar Library",
    "nav.ai_monitoring": "AI Monitor",
    "nav.feedback": "Feedback & Bugs",
    "nav.settings": "Settings",
    "nav.analytics": "BI Analytics",
    "nav.behavior": "User Behavior",
    "nav.my_classes": "My Classes",
    "nav.my_students": "Students Roster",
    "nav.chat": "Live Chat",
    "nav.ai_tools": "AI Suite",

    // Sub-tabs
    "sub.overview": "Overview Dashboard",
    "sub.classes": "Enrolled Classes",
    "sub.assignments": "Homework & Quizzes",
    "sub.groups": "Study Groups",
    "sub.chat": "Instant Messaging",
    "sub.dictionary": "Dictionary Lookup",
    "sub.vocabulary": "Vocabulary Notebook",
    "sub.grammar": "Grammar Bank",
    "sub.news": "Bilingual News",
    "sub.practice": "Exam & Mock Tests",
    "sub.ipa": "IPA Pronunciation",
    "sub.scores": "Detailed Scores",
    "sub.ranking": "Leaderboard",
    "sub.roadmap": "Learning Roadmap",

    // Header & Quick Actions
    "header.search": "Search features...",
    "header.points": "Points",
    "header.credits": "AI Credits",
    "header.profile": "My Profile",
    "header.feedback": "Feedback & Report",
    "header.logout": "Sign Out",
    "header.pinned": "Pinned",
    "header.quick_pin": "Quick Pins",
    "header.unpin": "Unpin",
    "header.pin_to_top": "Pin to top",
    "header.upgrade_pro": "Upgrade to iEdu PRO",

    // Bottom Navigation (Mobile)
    "bottom.overview": "Home",
    "bottom.learning": "Classes",
    "bottom.community": "Community",
    "bottom.language": "Language",
    "bottom.practice": "Practice",
    "bottom.profile": "Profile",
  },
  km: {
    // Domains (Student)
    "domain.overview": "ទិដ្ឋភាពទូទៅ",
    "domain.learning": "ថ្នាក់រៀន",
    "domain.community": "សហគមន៍",
    "domain.language": "ភាសា",
    "domain.practice": "ការអនុវត្ត",
    "domain.ai-tools": "គ្រូបង្វឹក AI",
    "domain.progress": "វឌ្ឍនភាព",

    // Admin & Teacher Navigation
    "nav.overview": "ទិដ្ឋភាពទូទៅ",
    "nav.users": "អ្នកប្រើប្រាស់ និងគ្រូ",
    "nav.classes": "គ្រប់គ្រងថ្នាក់",
    "nav.lessons": "គ្រប់គ្រងមេរៀន",
    "nav.assignments": "លំហាត់ និងការប្រឡង",
    "nav.vocab": "សៀវភៅពាក្យ",
    "nav.grammar": "បណ្ណាល័យវេយ្យាករណ៍",
    "nav.ai_monitoring": "ការត្រួតពិនិត្យ AI",
    "nav.feedback": "មតិកែលម្អ និងកំហុស",
    "nav.settings": "ការកំណត់",
    "nav.analytics": "ការវិភាគ BI",
    "nav.behavior": "ឥរិយាបថអ្នកប្រើប្រាស់",
    "nav.my_classes": "ថ្នាក់របស់ខ្ញុំ",
    "nav.my_students": "សិស្សរបស់ខ្ញុំ",
    "nav.chat": "ការជជែកផ្ទាល់",
    "nav.ai_tools": "ឧបករណ៍ AI",

    // Sub-tabs
    "sub.overview": "ផ្ទាំងគ្រប់គ្រងទូទៅ",
    "sub.classes": "បញ្ជីថ្នាក់រៀន",
    "sub.assignments": "លំហាត់ និងកិច្ចការ",
    "sub.groups": "ក្រុមសិក្សា",
    "sub.chat": "ការជជែកភ្លាមៗ",
    "sub.dictionary": "វចនានុក្រម",
    "sub.vocabulary": "សៀវភៅពាក្យផ្ទាល់ខ្លួន",
    "sub.grammar": "ឃ្លាំងវេយ្យាករណ៍",
    "sub.news": "អានព័ត៌មានទ្វេភាសា",
    "sub.practice": "ការប្រឡង និងការសាកល្បង",
    "sub.ipa": "ការបញ្ចេញសំឡេង IPA",
    "sub.scores": "ពិន្ទុលម្អិត",
    "sub.ranking": "តារាងចំណាត់ថ្នាក់",
    "sub.roadmap": "ផែនទីសិក្សា",

    // Header & Quick Actions
    "header.search": "ស្វែងរកមុខងារ...",
    "header.points": "ពិន្ទុសន្សំ",
    "header.credits": "AI Credits",
    "header.profile": "ប្រវត្តិរូប",
    "header.feedback": "មតិកែលម្អ",
    "header.logout": "ចាកចេញ",
    "header.pinned": "បានខ្ទាស់",
    "header.quick_pin": "ការខ្ទាស់រហ័ស",
    "header.unpin": "ដកខ្ទាស់",
    "header.pin_to_top": "ខ្ទាស់ទៅកំពូល",
    "header.upgrade_pro": "ដំឡើងទៅ iEdu PRO",

    // Bottom Navigation (Mobile)
    "bottom.overview": "ទំព័រដើម",
    "bottom.learning": "ថ្នាក់រៀន",
    "bottom.community": "សហគមន៍",
    "bottom.language": "ភាសា",
    "bottom.practice": "ការអនុវត្ត",
    "bottom.profile": "ប្រវត្តិរូប",
  },
};
