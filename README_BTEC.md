# BẢN THUYẾT MINH SẢN PHẨM DỰ THI
CUỘC THI BTEC BEST CODER 2026 - PHÁT TRIỂN SẢN PHẨM ỨNG DỤNG TRÍ TUỆ NHÂN TẠO (AI)

## I. THÔNG TIN CHUNG
**Tên sản phẩm:** EAM - Education Assessment Management Platform with AI

**Lĩnh vực ứng dụng:** Giáo dục

**Tên đội dự thi:** ...............................................................................

**Thành viên nhóm:**  
Họ và tên – MSSV – Lớp  
...............................................................................  
...............................................................................  
...............................................................................

**Đơn vị:** Trường ...............................................................................

**Người hướng dẫn (nếu có):** ...........................................................

## II. MỞ ĐẦU
### 1. Ý tưởng hình thành sản phẩm
Trong bối cảnh giáo dục hiện đại, việc học ngoại ngữ như tiếng Anh đòi hỏi phương pháp cá nhân hóa để nâng cao hiệu quả. Nhóm nhận thấy rằng các nền tảng học tập truyền thống thường thiếu sự thích ứng với trình độ và nhu cầu cá nhân của học sinh. Vấn đề thực tế cần giải quyết là việc học từ vựng và ngữ pháp một cách thụ động, không tận dụng được sức mạnh của trí tuệ nhân tạo để tạo ra trải nghiệm học tập động và tương tác.

Ý nghĩa của việc áp dụng Trí tuệ nhân tạo (AI) vào giải pháp này là biến đổi quá trình học tập từ bị động thành chủ động, sử dụng công nghệ để phân tích dữ liệu học tập và cung cấp nội dung phù hợp, từ đó cải thiện kết quả học tập tổng thể.

### 2. Mục tiêu và lợi ích của sản phẩm
**Mục tiêu chính:** Phát triển một nền tảng học tập tiếng Anh tích hợp AI, sử dụng Knowledge Graph để trực quan hóa mạng lưới kiến thức và cung cấp trải nghiệm học tập cá nhân hóa.

**Lợi ích mang lại:**  
- Cho người dùng: Học tập hiệu quả hơn, thú vị hơn với công nghệ AI tạo flashcards tự động và chatbot hỗ trợ.  
- Cho xã hội: Đóng góp vào việc nâng cao chất lượng giáo dục ngoại ngữ, hỗ trợ học tập suốt đời.  
- Cho đơn vị áp dụng: Giảm chi phí và thời gian chuẩn bị tài liệu học tập, tăng tỷ lệ hoàn thành khóa học.

## III. TIẾN TRÌNH THỰC HIỆN
### 1. Chuẩn bị công nghệ / công cụ / tài nguyên
| STT | Công nghệ/công cụ | Tài nguyên |
|-----|-------------------|------------|
| 1   | Next.js (React)   | Frontend framework |
| 2   | Spring Boot (Java)| Backend core cho quản lý người dùng |
| 3   | FastAPI (Python)  | AI service với LangChain và Neo4j |
| 4   | Neo4j             | Cơ sở dữ liệu đồ thị cho Knowledge Graph |
| 5   | PostgreSQL        | Cơ sở dữ liệu quan hệ |
| 6   | Gemini/LLMs       | Dịch vụ AI cho tạo nội dung và chatbot |
| 7   | Cohere Rerank     | Cho semantic reranking |
| 8   | Render             | Triển khai backend và AI service trên đám mây |
| 9   | Vercel             | Triển khai frontend trên đám mây |

### 2. Quy trình xây dựng sản phẩm
**Bước 1:** Phân tích yêu cầu và thiết kế kiến trúc hệ thống, bao gồm các module frontend, backend và AI service.  
**Bước 2:** Phát triển backend core với Spring Boot để quản lý xác thực và tiến độ học tập.  
**Bước 3:** Xây dựng AI service với FastAPI, tích hợp Neo4j cho Knowledge Graph và LLM cho tạo nội dung.  
**Bước 4:** Phát triển frontend với Next.js, bao gồm dashboard cho học sinh, giáo viên và admin.  
**Bước 5:** Tích hợp các thành phần và thử nghiệm hệ thống.  
**Bước 6:** Triển khai lên đám mây và tối ưu hóa hiệu suất.

### 3. Mô tả giải pháp và cách thức hoạt động
Hệ thống bao gồm ba thành phần chính:  
- **Frontend:** Giao diện web cho người dùng với các dashboard tùy theo vai trò.  
- **Backend Core:** Xử lý logic nghiệp vụ như quản lý điểm số và người dùng.  
- **AI Service:** Cung cấp các chức năng AI như tạo flashcards, chatbot GraphRAG và trực quan hóa Knowledge Graph.

Luồng xử lý dữ liệu: Người dùng đăng nhập, chọn từ vựng để học, hệ thống sử dụng AI để tạo flashcards và cập nhật Knowledge Graph. Chatbot AI hỗ trợ trả lời câu hỏi dựa trên ngữ cảnh và quan hệ từ vựng.

Người dùng tương tác thông qua giao diện web, có thể xem biểu đồ đồ thị kiến thức, làm bài tập và trò chuyện với AI tutor.

## IV. ỨNG DỤNG TRÍ TUỆ NHÂN TẠO (AI)
Sản phẩm sử dụng các kỹ thuật AI sau:  
- **Machine Learning:** Cho việc phân tích tiến độ học tập và cá nhân hóa nội dung.  
- **NLP (Natural Language Processing):** Để xử lý văn bản, tạo flashcards và chatbot hội thoại.  
- **Computer Vision:** Dự kiến cho phân tích phát âm (tính năng tương lai).  
- **Recommendation System:** Đề xuất từ vựng dựa trên Knowledge Graph.  
- **GraphRAG:** Kết hợp retrieval-augmented generation với đồ thị kiến thức để cải thiện độ chính xác của chatbot.

Vai trò của AI: Nâng cao hiệu quả giải quyết vấn đề bằng cách tự động hóa việc tạo nội dung học tập, cung cấp phản hồi cá nhân hóa và trực quan hóa kiến thức một cách thông minh.

## V. TÍNH MỚI VÀ TÍNH SÁNG TẠO CỦA SẢN PHẨM
### 1. Tính mới
Những điểm mới so với giải pháp hiện có:  
- Tích hợp Knowledge Graph để trực quan hóa mối quan hệ từ vựng, giúp học sinh hiểu sâu hơn.  
- AI tạo flashcards tức thời từ bất kỳ văn bản nào.  
- Chatbot GraphRAG có khả năng hiểu ngữ cảnh và quan hệ khái niệm.

Giá trị khác biệt: Sự kết hợp giữa đồ thị kiến thức và AI generative tạo ra trải nghiệm học tập toàn diện và thích ứng.

### 2. Tính sáng tạo
Ý tưởng sáng tạo: Sử dụng Neo4j để xây dựng "bộ não" học tập, nơi kiến thức được biểu diễn dưới dạng mạng lưới, kết hợp với AI để làm cho mạng lưới này phát triển động.

Khả năng mở rộng: Có thể mở rộng sang các ngôn ngữ khác, tích hợp thêm tính năng như phát âm AI và học tập đa phương tiện. Phát triển thành nền tảng giáo dục toàn diện trong tương lai.

## VI. KHẢ NĂNG ÁP DỤNG THỰC TIỄN
### 1. Phạm vi và đối tượng áp dụng
**Đối tượng sử dụng:** Học sinh, sinh viên và người lớn muốn cải thiện kỹ năng tiếng Anh. Giáo viên có thể sử dụng để theo dõi tiến độ và tạo tài liệu.

**Môi trường áp dụng:** Trường học, trung tâm đào tạo, nền tảng học tập trực tuyến.

### 2. Hiệu quả dự kiến
**Lợi ích kinh tế:** Giảm chi phí sản xuất tài liệu học tập, tăng hiệu quả giảng dạy.  
**Xã hội:** Nâng cao tỷ lệ thành công trong học ngoại ngữ, hỗ trợ giáo dục bình đẳng.  
**Giáo dục:** Cải thiện kết quả học tập thông qua phương pháp cá nhân hóa.

Khả năng triển khai: Dễ dàng triển khai trên đám mây, có thể mở rộng quy mô để phục vụ hàng nghìn người dùng đồng thời.

## VII. HƯỚNG PHÁT TRIỂN TRONG TƯƠNG LAI
Các chức năng dự kiến bổ sung:  
- Phân tích phát âm thời gian thực sử dụng Computer Vision.  
- Học tập đa ngôn ngữ.  
- Tích hợp với thiết bị di động và VR/AR.

Định hướng nâng cấp công nghệ AI: Chuyển sang các mô hình LLM tiên tiến hơn, tích hợp multi-modal AI.

Khả năng mở rộng quy mô: Triển khai toàn cầu, tích hợp với hệ thống quản lý học tập hiện có (LMS).

## VIII. KẾT LUẬN
Tóm tắt giá trị cốt lõi của sản phẩm: EAM là nền tảng học tập tiên tiến kết hợp sức mạnh của Knowledge Graph và AI, tạo ra trải nghiệm giáo dục cá nhân hóa và hiệu quả.

Khẳng định ý nghĩa và tiềm năng phát triển: Sản phẩm không chỉ giải quyết vấn đề học tập ngoại ngữ mà còn mở ra hướng đi mới cho giáo dục số hóa, với tiềm năng mở rộng sang nhiều lĩnh vực khác.

## IX. PHỤ LỤC (NẾU CÓ)
- Link demo: [GitHub Repository](https://github.com/your-repo)  
- Tài liệu tham khảo: Neo4j Documentation, LangChain Docs, Gemini AI API.

………, ngày …… tháng …… năm 20……  
ĐẠI DIỆN NHÓM DỰ THI  
(Ký và ghi rõ họ tên)