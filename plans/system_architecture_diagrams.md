# Sơ đồ Kiến trúc và Luồng AI của Hệ thống EAM

## Tổng quan Hệ thống

Hệ thống EAM (Educational AI Management) là một nền tảng học tập tiếng Anh thông minh sử dụng Đồ thị Tri thức (Knowledge Graph) và Trí tuệ Nhân tạo (AI) để tạo trải nghiệm học tập cá nhân hóa. Hệ thống bao gồm ba thành phần chính:

1. **Frontend**: Giao diện người dùng được xây dựng bằng Next.js với React Force Graph để trực quan hóa đồ thị kiến thức.
2. **AI Service**: Dịch vụ AI chính sử dụng FastAPI, LangChain và Neo4j để xử lý các tác vụ AI như trích xuất từ vựng, tạo flashcard, và chatbot.
3. **Backend Core**: Dịch vụ backend chính sử dụng Spring Boot để quản lý người dùng, tiến độ học tập và logic nghiệp vụ.
4. **Databases**: PostgreSQL cho dữ liệu quan hệ và Neo4j cho đồ thị tri thức.

## Sơ đồ Kiến trúc Hệ thống (UML Component Diagram)

```mermaid
graph TB
    subgraph "User Layer"
        U[User]
    end

    subgraph "Presentation Layer"
        F[Frontend<br/>Next.js + React<br/>Force Graph]
    end

    subgraph "Application Layer"
        AS[AI Service<br/>FastAPI + LangChain]
        BC[Backend Core<br/>Spring Boot]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Relational DB)]
        N[(Neo4j<br/>Graph DB)]
    end

    subgraph "External Services"
        LLM[LLM APIs<br/>OpenAI/Gemini]
        CO[Cohere<br/>Rerank API]
    end

    U --> F
    F --> AS
    F --> BC
    AS --> PG
    AS --> N
    BC --> PG
    AS --> LLM
    AS --> CO

    classDef frontend fill:#e1f5fe
    classDef ai fill:#f3e5f5
    classDef backend fill:#e8f5e8
    classDef database fill:#fff3e0
    classDef external fill:#ffebee

    class F frontend
    class AS ai
    class BC backend
    class PG,N database
    class LLM,CO external
```

### Chi tiết Các Thành phần

#### Frontend (Next.js)
- **Công nghệ**: Next.js 14, React, TailwindCSS, Three.js/React-Force-Graph
- **Chức năng chính**:
  - Giao diện người dùng cho học sinh, giáo viên và admin
  - Trực quan hóa đồ thị kiến thức 3D
  - Xử lý tương tác người dùng (nhập văn bản, upload file)
  - Hiển thị flashcard, quiz, và kết quả AI

#### AI Service (FastAPI)
- **Công nghệ**: Python FastAPI, LangChain, Pydantic
- **Chức năng chính**:
  - Trích xuất từ vựng từ văn bản (`POST /student/analyze-text`)
  - Tra cứu từ điển với AI (`POST /student/dictionary/lookup`)
  - Tạo bài tập thực hành (`POST /student/practice/generate`)
  - Đánh giá bài viết (`POST /student/writing/evaluate`)
  - Phát âm IPA (`POST /student/ipa/generate`)
  - Upload và phân tích file (`POST /student/file/upload-analyze`)
  - Truy vấn đồ thị kiến thức (`GET /student/knowledge-graph`)

#### Backend Core (Spring Boot)
- **Công nghệ**: Java Spring Boot, Maven
- **Chức năng chính**:
  - Quản lý người dùng và xác thực JWT
  - Quản lý lớp học và bài tập
  - Tính toán tiến độ học tập và Spaced Repetition
  - Lưu trữ kết quả quiz và điểm số

#### Databases
- **PostgreSQL**: Lưu trữ dữ liệu quan hệ (người dùng, lớp học, bài tập, kết quả)
- **Neo4j**: Lưu trữ đồ thị tri thức (quan hệ giữa từ vựng, khái niệm)

## Sơ đồ Luồng AI (UML Sequence Diagram)

Dưới đây là sơ đồ luồng cho quá trình trích xuất và học từ vựng từ văn bản, một trong những tính năng AI cốt lõi của hệ thống.

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant AS as AI Service
    participant LLM as LLM Service
    participant GS as Graph Service
    participant N as Neo4j
    participant PG as PostgreSQL

    U->>F: Nhập văn bản cần học
    F->>AS: POST /student/analyze-text
    AS->>LLM: Trích xuất từ vựng (extract_vocabulary)
    LLM-->>AS: Danh sách từ vựng + định nghĩa
    AS->>LLM: Tạo flashcard (generate_flashcard)
    LLM-->>AS: Nội dung flashcard
    AS->>GS: Xây dựng kết nối đồ thị (build_graph_connections)
    GS->>N: Lưu trữ quan hệ từ vựng
    N-->>GS: Xác nhận lưu trữ
    GS-->>AS: Đồ thị kết nối
    AS->>PG: Lưu từ vựng vào DB quan hệ
    PG-->>AS: Xác nhận lưu trữ
    AS-->>F: Trả về từ vựng + flashcard + đồ thị
    F-->>U: Hiển thị kết quả AI

    Note over AS,GS: Sử dụng Semantic Reranking<br/>để đảm bảo độ chính xác
    Note over LLM: Request Queuing với Semaphore<br/>để xử lý tối đa 7 request đồng thời
```

### Chi tiết Luồng AI

1. **Nhập liệu**: Người dùng nhập văn bản vào giao diện frontend
2. **Gửi yêu cầu**: Frontend gửi POST request đến AI Service endpoint `/student/analyze-text`
3. **Xử lý AI**:
   - **Trích xuất từ vựng**: LLM phân tích văn bản, lọc ra từ vựng quan trọng theo cấp độ CEFR
   - **Tạo flashcard**: Tự động tạo nội dung flashcard với ví dụ, hình ảnh minh họa
   - **Xây dựng đồ thị**: Tạo kết nối giữa các từ vựng trong Neo4j
4. **Lưu trữ**: Lưu từ vựng vào PostgreSQL và quan hệ vào Neo4j
5. **Trả kết quả**: Trả về dữ liệu cho frontend hiển thị

## Sơ đồ Luồng Chatbot AI (GraphRAG)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant AS as AI Service
    participant GS as Graph Service
    participant N as Neo4j
    participant LLM as LLM Service

    U->>F: Hỏi câu hỏi về từ vựng
    F->>AS: POST /graph-query (hoặc tương tự)
    AS->>GS: Truy vấn đồ thị (query_graph)
    GS->>N: Cypher query để tìm quan hệ
    N-->>GS: Trả về context từ đồ thị
    GS-->>AS: Context enriched
    AS->>LLM: Generate answer với context
    LLM-->>AS: Câu trả lời AI
    AS-->>F: Trả về câu trả lời
    F-->>U: Hiển thị câu trả lời

    Note over GS,N: GraphRAG: Retrieval-Augmented Generation<br/>từ đồ thị tri thức
```

### Tính năng Nâng cao trong Luồng AI

- **Request Queuing**: Sử dụng Semaphore để giới hạn 7 request đồng thời, đảm bảo ổn định hệ thống
- **Semantic Reranking**: Sử dụng Cohere Rerank v3.0 để sắp xếp lại kết quả theo độ liên quan
- **Unicode Integrity**: Đảm bảo hiển thị đúng ký tự đặc biệt tiếng Việt
- **Caching**: Cache kết quả AI để tăng tốc độ phản hồi

## Sơ đồ Lớp (UML Class Diagram) cho AI Service

```mermaid
classDiagram
    class LLMService {
        +extract_vocabulary(text: str): List[VocabItem]
        +generate_flashcard(word: str): Flashcard
        +generate_quiz(context: str): Quiz
        +evaluate_writing(text: str): Score
        +generate_practice(difficulty: str): Practice
    }

    class GraphService {
        +build_connections(words: List[str]): Graph
        +query_graph(question: str): Context
        +get_user_progress(user_id: int): Progress
        +update_mastery(user_id: int, word_id: int): void
    }

    class AuthService {
        +verify_token(token: str): User
        +create_access_token(data: dict): str
        +hash_password(password: str): str
    }

    class Database {
        +get_db(): Connection
        +init_db(): void
        +save_vocabulary(user_id: int, vocab: VocabItem): int
    }

    class StudentRouter {
        +analyze_text(req: TextAnalysisRequest): dict
        +dictionary_lookup(req: DictionaryRequest): dict
        +generate_practice(req: PracticeRequest): dict
        +evaluate_writing(req: WritingRequest): dict
    }

    LLMService --> GraphService : sử dụng để enrich context
    StudentRouter --> LLMService : gọi methods AI
    StudentRouter --> GraphService : truy vấn đồ thị
    StudentRouter --> AuthService : xác thực user
    StudentRouter --> Database : lưu trữ dữ liệu
```

## Kết luận

Các sơ đồ trên mô tả chi tiết kiến trúc và luồng hoạt động của hệ thống EAM, tập trung vào việc sử dụng AI và đồ thị tri thức để tạo trải nghiệm học tập cá nhân hóa. Hệ thống được thiết kế để mở rộng và có thể tích hợp thêm các tính năng AI mới như đánh giá phát âm, tạo hình ảnh minh họa, và gamification.