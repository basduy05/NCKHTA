# Báo Cáo Phân Tích Chuyên Sâu Luồng Xử Lý AI (AI Logic Flow) trong NCKHTA

Bản báo cáo này trình bày chi tiết về luồng hoạt động bên trong (logic kỹ thuật) của hệ thống AI tại module `ai-service`, cụ thể tập trung vào cách hệ thống điều phối mô hình, quản lý lỗi, sinh chuỗi phản hồi và cơ chế tự phục hồi dữ liệu.

---

## 1. Cơ chế Khởi tạo và Định vị Mô Hình (LLM Routing & Factory)

Hệ thống sử dụng hàm Factory **`get_llm(difficulty, provider)`** trong `llm_service.py` để quyết định chọn mô hình ngôn ngữ nào để xử lý tác vụ dựa trên độ khó.

*   **Phân loại mức độ tác vụ (Difficulty Routing):**
    *   **Hard:** Xử lý logic phức tạp, cần suy luận sâu. Sử dụng các model cao cấp như `gemini-2.5-pro` hoặc `gemini-2.5-flash`.
    *   **Medium/Easy:** Xử lý nhanh, tác vụ tốn ít context (Flashcard, Dictionary). Chuyên sử dụng `gemini-2.5-flash-lite` để tiết kiệm chi phí và tăng tốc độ phản hồi.
*   **Mức độ ưu tiên Cung cấp (Provider Priority):**
    1.  **Google Gemini (Ưu tiên 1):** Hệ thống ưu tiên gọi Gemini. Nếu API key cấu hình chuẩn, hệ thống tự mapping sang các mô hình tương ứng.
    2.  **OpenAI (Ưu tiên 2):** Fallback sử dụng `gpt-4o-mini`.
    3.  **Cohere (Ưu tiên 3):** Dự phòng cuối cùng với các mô hình cực nhanh như `command-a-03-2025` hoặc `command-r-08-2024`.

---

## 2. Luồng Thực Thi Cốt Lõi (Core Execution Flow)

Khi một tác vụ cụ thể (Ví dụ: `generate_quiz_from_text`) được gọi, luồng sẽ tuân theo cấu trúc chuẩn hoá sau:

### Bước 1: Xây dựng cấu trúc Prompts (Strict Schema Pydantic)
*   Hệ thống không mong đợi AI trả về văn bản tự do. Mọi luồng sinh dữ liệu đều sử dụng module **`PydanticOutputParser`** của thư viện Langchain.
*   **Ví dụ:** Nếu tạo trắc nghiệm, hệ thống định nghĩa `QuizListSchema` (chứa list các object gồm `question`, `options`, `answer`, `explanation`).
*   Object này sẽ ép Langchain sinh ra một bộ `format_instructions` chèn trực tiếp vào prompt để bắt buộc AI (Gemini/OpenAI) phải phản hồi chính xác đoạn JSON với các key tương ứng.

### Bước 2: Kiểm soát Đồng thời (Concurrency Control)
*   Trước khi gọi mạng (Call API), request phải đi qua một **Semaphore**: `async with ai_semaphore:`.
*   Giới hạn được đặt ở mức `15 requests` song song để tránh bùng nổ traffic (Burst) làm sập API key giới hạn miễn phí của Google/Cohere. Các request thứ 16 trở đi sẽ phải xếp hàng (Queue).

### Bước 3: Thực thi An Toàn & Chuyển đổi mềm (Safe Invoke & Fallback)
*   Toàn bộ request được bọc trong hàm **`_safe_invoke_async`** thay vì gọi trực tiếp. Hàm này thực hiện các nhiệm vụ sống còn:
    *   **Tính toán độ trễ (Latency logging):** Đo thời gian `start_time` đến khi có kết quả để giám sát hiệu năng.
    *   **Xử lý lỗi 429 (Rate Limit) và 401 (Auth Error):** Nếu hệ thống bắt gặp lỗi từ provider (hết hạn mức hoặc sai key).
    *   **Nút chặn (Circuit Breaker):** Hệ thống gọi `mark_provider_failed("Gemini")` để đánh dấu khoá Gemini đang hỏng. Các request kế tiếp trong các luồng khác sẽ né Gemini mà chuyển thẳng sang provider tiếp theo.
    *   **Tự động Fallback:** Đổi chain đang chạy rớt sang `Cohere` ngay trong runtime mà **không từ chối (deny)** request của người dùng. Hệ thống sẽ trả về kèm một biến cảnh báo (Warning) gửi xuống giao diện để báo cho Admin biết API bị lỗi nhưng User vẫn nhận được bài tập.

### Bước 4: Hậu xử lý và Tự động phục hồi (Self-Healing & JSON Parsing)
Khi chuỗi JSON được AI trả về (hoặc fallback trả về):
1.  **Fast Path (Dòng chính):** Parse qua `PydanticOutputParser` ngay lập tức. Nếu AI ngoan ngoãn trả chuẩn cấu trúc, dữ liệu được parse thành Model và trả thẳng ra (Convert qua `model_dump()`).
2.  **Slow Path (Vá lỗi ngoại lệ):** 
    *   Nếu AI bị "ảo giác" chèn thêm các ký tự markdown như ` ```json...``` ` hoặc trả về JSON bị rớt dấu phẩy/ngoặc, việc parse Pydantic sẽ sụp đổ.
    *   Hệ thống bẻ qua hàm **`fast_repair_json`** (Module Referee) và **`json_repair`**. Referee Service là một lính canh: nó sẽ lấy chuỗi JSON hỏng đó, nhét vào một Prompt cực nhẹ chạy nền, sai khiến AI sửa lại cú pháp JSON đó cho đúng định dạng hợp lệ.
    *   Tất cả quá trình này diễn ra phía sau, người dùng cuối chỉ cảm thấy request chậm hơn 1-2 giây thay vì nhận màn hình lỗi "Internal Server Error".

### Bước 5: Chấm điểm nền (Background Evaluation)
*   Trước khi hàm invoke kết thúc, nó kích hoạt một trigger không đồng bộ: `trigger_evaluation`. Dữ liệu câu hỏi, flashcard cùng với tên Model sinh ra nó sẽ được ném vào kho dữ liệu phân tích hệ thống (`log_ai_request`) trên SQLite/Turso.
*   Admin có thể dùng dữ liệu này để theo dõi: *"Model Cohere có tỷ lệ hỏng định dạng nhiều không?"* hoặc *"Tốc độ trung bình sinh 1 Flashcard của Gemini là bao nhiêu ms?"*.

---

## 3. Ứng Dụng Trong Các Tính Năng Cụ Thể

Dưới đây là một số workflow đã được ứng dụng cơ chế trên:

1.  **`extract_vocabulary_from_text` (Trích xuất từ vựng nhanh):** 
    Sử dụng Prompt ép LLM dóng vai nhà ngôn ngữ học, tìm đúng các từ khó trong văn bản và ép xuất qua `VocabListSchema`. 
2.  **`generate_quiz_from_text` (Sinh bài tập IELTS):** 
    Chia làm 4 loại (MCQ, True/False/Not Given, Matching, Fill-in-blanks) định dạng chuẩn schema `QuizListSchema`. Prompts yêu cầu khắt khe *"KHÔNG dịch các field Option sang tiếng Việt"*, chỉ cho phép dịch Explanation.
3.  **Hệ thống tra từ `Dictionary / Flashcard` đi kèm Rerank:**
    Sử dụng thêm `cohere.Client.rerank(model="rerank-v3.0")`. Nếu DB trả ra quá nhiều kết quả nghĩa (Meanings), hệ thống sẽ dùng mô hình AI Ranker của Cohere để chấm điểm độ liên quan của các nghĩa đó với ngữ cảnh người dùng đang học rồi mới xuất ra.

---

## Tổng kết

Luồng xử lý AI của của NCKHTA là một kiến trúc **Fault-Tolerant (Chống chịu lỗi)** cấp cao:
- **Ngăn chặn bùng nổ API:** Bằng `ai_semaphore` và `_cache_get`.
- **Chống sập Provider:** Bằng cơ chế Routing theo độ khó và Fallback nóng (Gemini -> OpenAI -> Cohere).
- **Chống sai lệch Format:** Bằng Pydantic Shema (ép định dạng từ đầu vào) và Referee Self-repair (tự vá lỗi từ đầu ra).

---

## 4. Kết quả và Đánh giá Hệ thống (Results & Evaluation)

Dưới góc độ kiến trúc hệ thống, luồng xử lý AI của NCKHTA hiện tại đã đạt được mức độ trưởng thành nhất định phù hợp với sản phẩm EdTech, cân bằng tốt giữa ba yếu tố quan trọng: **Độ tin cậy (Reliability)**, **Hiệu năng (Performance)** và **Chi phí (Cost)**.

### 4.1. Điểm mạnh và Kết quả đạt được
1. **Kiến trúc chịu lỗi xuất sắc (High Fault Tolerance & Resilience):**
   - Cơ chế nắn dòng và rớt mạng mềm (Warm Fallback: Gemini -> OpenAI -> Cohere) chứng minh được tính hiệu quả trong thực tế. Khắc phục triệt để vấn đề "nút thắt cổ chai" (bottleneck) khi phụ thuộc vào một nhà cung cấp duy nhất (API rate limit, timeout, service downtime).
2. **Tính toàn vẹn Dữ liệu đầu ra (Strict Data Integrity):**
   - Sự kết hợp giữa `PydanticOutputParser` và cơ chế hậu kiểm (Referee Self-repair/Json-Repair) hoàn toàn khống chế được bản tính ngẫu nhiên (hallucination) của LLM. Tỷ lệ lỗi crash giao diện do AI sinh sai định dạng (sót dấu phẩy JSON, kèm tag markdown ngoài lề) được bọc lót và xử lý gọn gàng ở tầng backend.
3. **Tối ưu hóa Chi phí và Thông lượng (Cost & Throughput Optimization):**
   - Việc tách lớp độ khó mô hình (Difficulty Routing) kết hợp với `Semaphore` chặn luồng (max 15 req/s) giúp hệ thống không bị ngốn quota API vô ích. Các tác vụ nền hoặc tác vụ dễ ưu tiên gọi mô hình nhỏ (`gemini-2.5-flash-lite`), tiết kiệm chi phí mà vẫn đảm bảo độ phản hồi theo thời gian thực (real-time responsiveness).
4. **Độ chính xác của Ngữ liệu (Contextual Accuracy):**
   - Thuật toán Rerank (sử dụng `Cohere`) kết hợp với Database và Neo4j (Knowledge Graph) là một bước đi đột phá cho tính năng Smart Dictionary. Thay vì phơi bày tất cả các nghĩa của từ vựng, Reranker lọc ra nghĩa sát nhất với ngữ cảnh đầu vào, gia tăng cực trị cá nhân hóa cho học sinh.
5. **Tính quan sát và khả năng Audit cao (Observability):**
   - Log ngầm mọi metric về latency, tỷ lệ lỗi, và dấu thời gian của từng trigger (`log_ai_request`). Điều này giúp nhà quản trị mạng vẽ được biểu đồ theo thời gian thực về độ trễ, dễ dàng khoanh vùng khi hệ thống AI Service gặp lỗi.

### 4.2. Hạn chế hiện tại (Trade-offs & Limitations)
1. Cơ chế Referee "tự sửa lỗi" (Slow Path) dù giữ UI không bị sập, nhưng gây độ trễ bất ngờ lên mạng lưới (thêm 1-2 giây cho vòng lặp sửa lỗi).
2. Vẫn chịu sự ràng buộc độ trễ mạng (Network Latency) do phụ thuộc 100% vào Cloud LLM Providers bên thứ 3.

---

## 5. Hướng phát triển Kiến trúc (Future Directions)

Dựa trên cấu trúc sẵn có và lộ trình phát triển định hướng dài hạn, hệ thống cần nâng cấp các vách ngăn kiến trúc sau để đạt mức "Enterprise-ready":

1. **Mô hình hóa Luồng sinh Dữ liệu (Streaming Architecture):**
   - Chuyển tiếp các Endpoint AI sinh dữ liệu dài (Feedback Writing, Sinh bài giảng nguyên khối) sang mô hình **Server-Sent Events (SSE)** hoặc **WebSockets**. Đưa trực tiếp luồng stream qua FastAPI phân phối xuống Next.js để giảm thời gian chờ biểu kiến (Perceived Latency) xuống dưới 500ms thay vì đợi LLM phản hồi toàn bộ cục JSON.
2. **Kiến trúc Đa đặc vụ kết hợp (Multi-Agent System Framework):**
   - Phá vỡ giới hạn của kịch bản 1-call prompt hiện tại. Thiết lập luồng đa Agent: `Agent Researcher` (Quét báo chí qua NewsAPI) -> `Agent Generator` (Sinh Quiz/Reading) -> `Agent Referee/Reviewer` (Dò lại độ khó theo thang CEFR thực tế trước khi lưu vào SQLite/Turso).
3. **Tiến tới GraphRAG Đích thực (Full Knowledge Graph Retrieval):**
   - Hiện hệ thống Neo4j mới map quan hệ từ vựng căn bản. Cần mở rộng thiết kế GraphRAG để bám rễ vào các cấu trúc ngữ pháp (Grammar Nodes), thành ngữ (Idioms). Khi sinh câu hỏi hoặc giải thích bài, AI sẽ truy vấn đường đi ngắn nhất đồ thị (Graph Traversal) để đưa ra chuỗi liên kết logic thay vì chỉ tìm kiếm Vector thông thường (Vector Semantic Search).
4. **Tích hợp Mô hình Mã nguồn mở (Local/On-Premise LLMs):**
   - Từng bước triển khai các node AI chạy trên các container vật lý (như Llama-3-8B hoặc Qwen via vLLM) cho các tác vụ chấm điểm logic (Scoring/Evaluation) đơn giản. Tránh phụ thuộc dữ liệu bài thi học sinh ra bên ngoài và đảm bảo dữ liệu kín (Data Privacy & Compliance).
5. **Cá nhân hóa Sâu qua Học máy Dữ liệu người dùng (Advanced Learning Analytics Engine):**
   - Kết nối dữ liệu quá trình học từ cơ chế **FSRS (Spaced Repetition)** với logic của AI. Khi AI tạo bài ôn tập, nó tự động query vào kho điểm mù (Blind Spots), những từ học viên quên lặp đi lặp lại để nhúng thẳng vào Reading Comprehension do LLM tự sáng tác riêng theo sở thích (Interest-based Generation) của từng User.