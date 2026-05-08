# Audit + Redesign Plan — iEdu sang EdTech-grade UI

**Ngữ cảnh**: Tiếp nối 3 phiên đã làm
1. Fix bug `/admin/feedback` (DB query an toàn, thêm log).
2. Tạo design system Duolingo-playful (`globals.css` tokens + `app/components/ui/{Button,Card,Modal,Confetti,TestForm,useSound}`).
3. Migrate Vocabulary / IPA / Grammar / Practice tab sang dùng Button/Card/Confetti/useSound (sound + 3D button + confetti khi ≥80%).

Phiên này (mới) đổi hướng: nâng UI lên chuẩn **EdTech app** (kiểu Khan Academy, Quizlet, Brilliant) — học thuật, gọn, đáng tin, có chất "platform" hơn là "game". Vẫn giữ một phần playful (sound, confetti, animation) nhưng tone trầm hơn, ít neon hơn.

---

## 1. Audit hiện trạng

### 1.1 Vấn đề về thị giác (visual)

| # | Vấn đề | Vị trí | Mức độ |
|---|--------|--------|--------|
| V1 | Quá nhiều tone gradient (indigo→blue, teal→cyan, amber→orange, indigo-950) — không có "voice" thống nhất | Hero của mỗi tab, modal header | Cao |
| V2 | `font-black` lạm dụng (text-3xl đến text-7xl `font-black`) — đọc mệt, thiếu hierarchy | Hero, score screens, Practice | Cao |
| V3 | `rounded-[3rem]` / `rounded-[4rem]` tự do bên cạnh `rounded-2xl/3xl` của design system — không nhất quán | IpaTab, PracticeTab finish | Trung |
| V4 | Border `border-t border-gray-100` rải rác giữa các section trong card — vạch chia nội dung không cần thiết | Admin modals, teacher tabs, AIToolsTab | Thấp |
| V5 | Shadow đa dạng: `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xl`, `shadow-3xl`, `shadow-[0_6px_0_0_...]` — không có thang đo | Toàn bộ | Trung |
| V6 | Empty states đơn giản (icon size=48, 1 dòng text) — thiếu hướng dẫn hành động | VocabularyTab, ScoresTab, RankingTab | Trung |
| V7 | Loading states dùng spinner gối — không có skeleton chuẩn | Hầu hết tab | Trung |
| V8 | Trang admin dùng grid 4-col stats với card khác phong cách so với dashboard student | admin/page.tsx | Cao |
| V9 | Modal Practice hero dùng `rounded-[4rem]` + `from-indigo-600` không match design system Duolingo green | PracticeTab finish screen | Trung |

### 1.2 Vấn đề về UX

| # | Vấn đề | Mức độ |
|---|--------|--------|
| U1 | Sidebar fixed width 240px, không collapse trên mobile/tablet — chiếm chỗ | Cao |
| U2 | Top bar không có breadcrumb / page title — user khó biết đang ở đâu khi vào sâu | Trung |
| U3 | Không có quick action / search global (Cmd+K kiểu modern app) | Thấp |
| U4 | Practice/Grammar/Vocab có 3 cách hiển thị quiz khác nhau — không có ngữ cảnh chuyển section | Cao |
| U5 | Feedback button float ở góc — đè lên các nút khác trên mobile | Trung |
| U6 | Không có dark mode (EdTech app modern thường có) | Thấp |
| U7 | Toast / alert dùng `showAlert` text-only — không có icon trạng thái thống nhất | Trung |

### 1.3 Vấn đề kỹ thuật ảnh hưởng UI

- `tsconfig.tsbuildinfo` đã commit (tăng diff noise).
- Một số file chứa file `.bk` / `fix_*.py` lẫn vào source.
- Không có Storybook / route preview cho design system → khó verify component mới mà không chạy dev server.

### 1.4 Đã có sẵn (giữ lại)

- ✅ Design tokens trong `globals.css` (`--duo-*`).
- ✅ Component primitives `Button/Card/Modal/Confetti/TestForm/useSound`.
- ✅ Sound + confetti đã wire ở 4 tab quiz.
- ✅ Memory file `feedback_design_direction.md` lưu hướng playful.

---

## 2. Design decisions cần chốt trước khi code

> Các đề xuất dưới đây là **đề xuất cụ thể**. Phiên sau bắt đầu bằng việc bạn xác nhận hoặc đổi.

### 2.1 Palette (đề xuất EdTech-academic, vẫn giữ playful accent)

```
Primary    #2563EB  blue-600     brand chính, link, primary CTA
Primary-dk #1E40AF  blue-800
Accent     #10B981  emerald-500  success, progress
Warn       #F59E0B  amber-500    streak, attention
Danger     #EF4444  red-500      wrong, destructive
Surface-1  #FFFFFF  card
Surface-2  #F8FAFC  page bg (slate-50)
Surface-3  #F1F5F9  hover bg (slate-100)
Ink-1      #0F172A  text primary (slate-900)
Ink-2      #475569  text secondary (slate-600)
Ink-3      #94A3B8  text muted (slate-400)
Line       #E2E8F0  borders (slate-200)
```

→ Khác Duolingo green (`#58CC02`) hiện tại. Quyết định: **giữ green cho semantic "correct"** (vẫn đúng cho việc học), nhưng **brand chuyển sang blue-600** vì học thuật hơn green của Duo.

### 2.2 Typography scale

```
Display   40/48  font-bold   tracking-tight   hero title only
H1        28/36  font-bold   tracking-tight
H2        22/30  font-bold
H3        18/26  font-semibold
Body      15/24  font-normal
Body-sm   13/20  font-normal
Caption   12/16  font-medium uppercase tracking-wide
```

**Quy tắc**: bỏ hoàn toàn `font-black` ngoài hero của trang đăng nhập. Xoá `text-7xl` / `text-5xl font-black` trong score screen — thay bằng `text-4xl font-bold tabular-nums`.

### 2.3 Radius scale

```
sm   8px    chip, badge
md   12px   input, small button
lg   16px   button, small card
xl   20px   card
2xl  28px   hero card / modal
```

Bỏ mọi `rounded-[3rem]`, `rounded-[4rem]` — dùng `rounded-2xl` (28px) là max.

### 2.4 Shadow scale

```
xs  0 1px 2px rgba(15,23,42,.05)            divider, hover
sm  0 2px 6px rgba(15,23,42,.06)            card resting
md  0 8px 24px rgba(15,23,42,.08)           card hover, modal
lg  0 16px 40px rgba(15,23,42,.12)          floating, popover
btn-3d  0 4px 0 0 var(--brand-dark)         duo-style button (giữ cho quiz)
```

Bỏ mọi `shadow-2xl`, `shadow-3xl`, `shadow-xl shadow-{color}-200`.

### 2.5 Layout

- **Sidebar** desktop: 240px → 220px. Mobile: ẩn, thay bằng bottom nav 5 mục (Tổng quan / Học / Luyện / Tiến độ / Cá nhân).
- **App shell**: header thanh trên cao 56px chứa breadcrumb + user. Bỏ hero gradient lặp ở mỗi tab — thay bằng page header gọn (title + 1 dòng mô tả + action chính).
- **Content max-width**: 1200px center. Hiện tại các tab thả tự do 100%.

### 2.6 Icon

- Giữ `lucide-react`, dùng `size={20}` mặc định (`size={16}` cho inline, `size={24}` cho hero). Bỏ size=32, 36, 40, 48 ngoài empty state.

### 2.7 Sound + animation

- Giữ Web Audio `useSound` đã có. **Giảm volume mặc định** 0.18 → 0.12 (đỡ chói).
- Giữ `animate-duo-pop` / `animate-duo-shake` / `Confetti` cho moment đặc biệt.
- **Bỏ** `animate-bounce`, `animate-pulse` trên element trang trí (chỉ giữ cho loading).

---

## 3. Plan thực thi (chia phiên rõ ràng)

> Mỗi phiên ~ 1–2 giờ chat. Đừng gộp 2 phiên vào 1 vì chất lượng giảm.

### Phiên A — Foundation (KHÔNG ĐỤNG TAB CỤ THỂ)
**Mục tiêu**: cơ sở mới sẵn sàng. Sau phiên này tab cũ vẫn render nhưng có thể mượn token mới khi cần.

1. Thêm CSS tokens layer mới `--ink-1`, `--ink-2`, `--surface-1..3`, `--brand`, `--brand-dark`, `--line` vào `globals.css`. Giữ song song `--duo-*` cũ.
2. Tạo `app/components/ui/PageHeader.tsx` (title + breadcrumb + action slot).
3. Tạo `app/components/ui/EmptyState.tsx` (icon + title + body + action).
4. Tạo `app/components/ui/Skeleton.tsx` (3 variant: line, card, avatar).
5. Tạo `app/components/ui/Stat.tsx` (icon + value + label + delta — thay grid stats hiện tại).
6. Cập nhật `Button` thêm intent `brand` (blue-600) bên cạnh `primary` (vẫn green) — quiz dùng green, app shell dùng brand.
7. Cập nhật `Modal`: padding chuẩn lại, footer luôn sticky (đã làm phần lớn ở phiên 4).
8. Type-check + write 1 trang demo `/dev-design` show all primitives để verify.

**Files mới**: 4 component. **Files sửa**: `globals.css`, `Button.tsx`, `Modal.tsx`. **Không** sửa tab nào.

### Phiên B — App shell
**Mục tiêu**: layout vỏ ngoài đồng bộ. Tab nội dung chưa đụng nhưng "khung" đã chuẩn.

1. Refactor `dashboard/layout.tsx`:
   - Sidebar 220px desktop, hidden mobile.
   - Bottom nav mobile (5 mục — chọn theo role).
   - Header trên cùng 56px: breadcrumb (path-based) + user dropdown + 1 nút search (placeholder).
2. `app/dashboard/student/page.tsx` + `teacher/page.tsx` + `admin/page.tsx`:
   - Bỏ hero gradient của từng tab, thay bằng `<PageHeader>`.
   - Content `max-w-[1200px] mx-auto px-4 sm:px-6`.
3. Move `<FeedbackButton>` từ floating góc → menu trong user dropdown trên header (giảm đè trên mobile).
4. Toast / alert xác nhận giữ Toast.tsx; chỉ chuẩn lại style để khớp tokens mới.

**Risk**: layout đổi → mọi tab phải kiểm. Test 5 phút mỗi role.

### Phiên C — Tab học (Vocabulary + Dictionary)
**Mục tiêu**: 2 tab này dùng nhiều nhất, làm chuẩn trước.

1. VocabularyTab:
   - Top bar dùng `<PageHeader>` + `<Stat>` row thay 3 chip.
   - Word grid dùng `<Card>` thật sự (không `!p-5` override).
   - Empty state → `<EmptyState>`.
   - Modal edit đã làm phiên 4, chỉ cần tinh chỉnh padding theo tokens mới.
   - Quiz overlay (FIB/Matching/Spelling/MC) — refactor thành `<Quiz>` wrapper + 4 sub-component theo type. Logic hiện tại giữ nguyên, chỉ tách view.
2. DictionaryTab: tương tự — focus search + result card.

### Phiên D — Tab luyện (Grammar + IPA + Practice)
**Mục tiêu**: thống nhất quiz UI. Đây là phần phức tạp nhất.

1. Trích `<QuizShell>` chung từ Grammar + IPA quiz: header progress, body slot, footer (Kiểm tra / Tiếp tục) — dùng `<Button intent="brand">`.
2. PracticeTab: bỏ 2 finish screen `rounded-[4rem]` gradient — thay bằng `<ResultCard>` chuẩn (icon + score lớn `tabular-nums` + 2 action).
3. Bỏ `font-black` tất cả ở 3 tab này. Đổi sang `font-bold` + `font-semibold`.
4. Sound vol giảm.

### Phiên E — Admin + Teacher
**Mục tiêu**: vốn lệch tone nhất, làm cuối.

1. Admin sidebar tabs → secondary nav (chips ngang trên content) — gọn hơn tabs đứng.
2. Stats card → `<Stat>`.
3. Bảng dữ liệu (users, feedback, exam logs) → table component chung với pagination.
4. Modal create/edit → `<Modal>` chuẩn.

### Phiên F — Polish
1. Loading skeleton ở mọi tab.
2. Empty state đầy đủ (illustration đơn giản bằng SVG inline cũng được).
3. Mobile QA: mở từng route trên 375px viewport, fix overflow.
4. Audit lại typography hierarchy: bất kỳ chỗ nào có `font-black` đều xem lại.
5. Dọn `.bk`, `fix_*.py`, `tsconfig.tsbuildinfo` khỏi repo.

---

## 4. Anti-goals (KHÔNG làm trong các phiên redesign)

- ❌ Không đụng logic `useAuth`, `authFetch`, FSRS rating, AI eval. Chỉ view layer.
- ❌ Không thêm i18n / locale lib.
- ❌ Không thêm dark mode trong các phiên A–F. Coi như follow-up.
- ❌ Không refactor TypeScript types — giữ `any` chỗ nào đang `any`.
- ❌ Không đổi structure route Next.js. Chỉ đổi component bên trong.

---

## 5. Câu hỏi cần trả lời ở đầu phiên A

1. **Brand color**: blue-600 (đề xuất) hay giữ duo-green? Nếu blue-600, Confetti vẫn pha xanh-xanh-đỏ-cam (không cần đổi).
2. **Mobile bottom nav**: 5 mục nào cho student? Đề xuất: Tổng quan / Học (Vocab+Dict+Grammar) / Luyện (Practice+IPA) / Tiến độ (Scores+Ranking+Roadmap) / Cá nhân.
3. **Bỏ FeedbackButton floating** — chuyển vào user menu, OK?
4. **Dark mode**: skip phiên A–F (đề xuất) hay phải có ngay?

---

## 6. File checklist cho phiên A (sao chép sang chat mới)

```
[ ] frontend/app/globals.css                      (thêm tokens mới, không xoá cái cũ)
[ ] frontend/app/components/ui/Button.tsx         (thêm intent='brand')
[ ] frontend/app/components/ui/Modal.tsx          (chuẩn padding, đã sticky footer)
[ ] frontend/app/components/ui/PageHeader.tsx     MỚI
[ ] frontend/app/components/ui/EmptyState.tsx     MỚI
[ ] frontend/app/components/ui/Skeleton.tsx       MỚI
[ ] frontend/app/components/ui/Stat.tsx           MỚI
[ ] frontend/app/components/ui/index.ts           (thêm export)
[ ] frontend/app/dev-design/page.tsx              MỚI (preview tất cả primitives)
```

Sau phiên A, type-check + render thử `/dev-design` rồi mới sang phiên B.

---

**Cách dùng tài liệu này**: ở phiên mới, mở chat và paste:

> "Đọc `plans/edtech_redesign_audit.md` rồi bắt đầu **Phiên A**. Trước khi code, hỏi tôi 4 câu ở mục 5."
