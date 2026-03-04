# 🚀 KẾ HOẠCH PHÁT TRIỂN DỰ ÁN EAM - NCKH 2025 (ADVANCED)

Mục tiêu transform dự án từ "Web học từ vựng cơ bản" sang "Hệ sinh thái học tập thông minh dựa trên Đồ thị tri thức & AI".

## GIAI ĐOẠN 1: CORE ENGINE & GRAPH DATA (Tuần 1-2)
Mục tiêu: Xây dựng bộ não cho hệ thống, đảm bảo các tính năng cốt lõi (Trích xuất từ, Flashcard, Quiz) hoạt động trơn tru với AI.

- [ ] **AI Service (FastAPI) - Tính năng cốt lõi:**
    - [ ] **Trích xuất từ vựng thông minh:** API `POST /vocabulary/extract`: Nhập văn bản -> AI lọc ra các từ vựng quan trọng (theo cấp độ CEFR A1-C2) -> Trả về danh sách từ kèm định nghĩa, phiên âm.
    - [ ] **Tạo Flashcard tự động:** API `POST /flashcard/generate`: Từ danh sách từ vựng -> Tạo nội dung Flashcard chi tiết (Ví dụ, Ảnh minh họa, Từ đồng nghĩa).
    - [ ] **Sinh câu hỏi Quiz (MCQ & Recall):** API `POST /quiz/generate`: Tạo câu hỏi trắc nghiệm và điền từ dựa trên chính văn bản người dùng vừa nhập (Context-aware Quiz).
    - [ ] **Trích xuất Graph:** API `POST /extract-graph`: Xây dựng kết nối giữa các từ vừa học.

- [ ] **AI Service (FastAPI) - Nâng cao:**
    - [ ] Cài đặt LangChain kết nối với OpenAI/Gemini.
    - [ ] Viết API `GET /graph-query`: Hỏi đáp dựa trên ngữ cảnh đồ thị (GraphRAG).

- [ ] **Database (Neo4j & Postgres):**
    - [ ] Thiết kế lại Schema Graph: `(User)-[:MASTERED]->(Concept)`, `(Word)-[:RELATED_TO]->(Word)`.
    - [ ] **Lưu trữ lịch sử học tập (Postgres):** Lưu kết quả Quiz, danh sách từ vựng đã lưu của user để tính toán thời gian ôn tập (Spaced Repetition).

- [ ] **Backend Core (Spring Boot):**
    - [ ] Thiết lập JWT Authentication.
    - [ ] API đồng bộ tiến độ học tập của User.
    - [ ] **Logic ôn tập (SRS):** Tính toán thời điểm user cần ôn lại từ vựng (dựa trên thuật toán SuperMemo/Anki).


## GIAI ĐOẠN 2: VISUALIZATION & INTERACTIVITY (Tuần 3-4)
Mục tiêu: Giao diện người dùng gây ấn tượng mạnh (Wow factor).
- [ ] **Frontend (Next.js):**
    - [ ] Tích hợp thư viện `react-force-graph` hoặc `D3.js`.
    - [ ] **Màn hình "Neural Network":** Hiển thị não bộ kiến thức của người dùng. Mỗi từ thuộc rồi sẽ sáng lên, từ chưa thuộc sẽ tối.
    - [ ] **Flow:** Người dùng nhập đoạn văn -> Hệ thống vẽ ra bản đồ tư duy của đoạn văn đó ngay lập tức.
    - [ ] Sidebar Chatbot AI: Hỏi đáp song song với quá trình học.

## GIAI ĐOẠN 3: MULTIMODAL & VOICE (Tuần 5)
Mục tiêu: Đa dạng hóa đầu vào/đầu ra.
- [ ] **Text-to-Image:** Dùng AI (Stable Diffusion API hoặc OpenAI DALL-E) để tạo hình ảnh minh hoạt cho từ vựng khó nhớ (Mnemonics).
- [ ] **Pronunciation Check:** Tích hợp Web Speech API hoặc file upload lên Python để chấm điểm phát âm.

## GIAI ĐOẠN 4: GAMIFICATION & DEPLOY (Tuần 6)
Mục tiêu: Tăng tính tương tác xã hội.
- [ ] **Leaderboard:** Bảng xếp hạng realtime (Redis + Spring Boot).
- [ ] **Deployment:** Đẩy toàn bộ lên Render & Vercel.
- [ ] **Testing:** Kiểm thử khả năng chịu tải.

---
## CÔNG NGHỆ SỬ DỤNG (TECH STACK)
1. **Frontend:** Next.js 14, TailwindCSS, Three.js/React-Force-Graph (3D Visualization).
2. **AI Engine:** LangChain, GraphRAG, OpenAI API / Google Gemini API.
3. **Graph DB:** Neo4j (Lưu trữ trí tuệ).
4. **Core API:** Java Spring Boot (Xử lý nghiệp vụ chặt chẽ).
