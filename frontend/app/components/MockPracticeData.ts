export const MOCK_PRACTICE_TESTS = [
  {
    id: "ielts-reading-1",
    title: "The Impact of Artificial Intelligence on Modern Society",
    test_type: "IELTS",
    skill: "reading",
    time_limit: 20,
    instructions: "Đọc đoạn văn sau và trả lời các câu hỏi trắc nghiệm.",
    passage: `Artificial Intelligence (AI) is no longer a concept of science fiction; it is a reality that is revolutionizing how we live and work. From self-driving cars to personalized recommendations on streaming platforms, AI is integrated into the fabric of modern existence. 

One of the most significant impacts of AI is in the healthcare sector. Algorithms can now analyze medical images with a level of precision that sometimes surpasses human doctors, leading to earlier detection of diseases such as cancer. Furthermore, AI-driven research is accelerating the development of new drugs, potentially saving millions of lives.

In the workplace, AI is automating routine tasks, allowing humans to focus on more creative and complex problem-solving. However, this shift also raises concerns about job displacement. As machines become more capable, certain roles may become obsolete, necessitating a global focus on reskilling and lifelong learning.

Ethical considerations are also at the forefront of the AI debate. Issues such as algorithmic bias and data privacy require careful management to ensure that AI benefits all of humanity fairly. As we move forward, the challenge will be to harness the power of AI while mitigating its risks through robust regulation and ethical frameworks.`,
    questions: [
      {
        number: 1,
        question: "Theo đoạn văn, AI đang ảnh hưởng đến lĩnh vực y tế như thế nào?",
        options: [
          "Làm cho việc điều trị trở nên đắt đỏ hơn",
          "Phát hiện bệnh sớm hơn thông qua phân tích hình ảnh chính xác",
          "Thay thế hoàn toàn bác sĩ con người",
          "Chỉ được sử dụng trong nghiên cứu dược phẩm"
        ],
        correct_answer: 1,
        explanation: "Đoạn văn nêu rằng các thuật toán có thể phân tích hình ảnh y khoa với độ chính xác cao, giúp phát hiện bệnh sớm hơn."
      },
      {
        number: 2,
        question: "Mối quan lo ngại chính về AI trong nơi làm việc là gì?",
        options: [
          "Sự gia tăng khối lượng công việc cho con người",
          "Sự thiếu hụt các nhiệm vụ sáng tạo",
          "Sự mất việc làm do tự động hóa",
          "Chi phí đào tạo nhân viên quá cao"
        ],
        correct_answer: 2,
        explanation: "Đoạn văn đề cập đến lo ngại về 'job displacement' (mất việc làm) khi các máy móc trở nên có khả năng hơn."
      },
      {
        number: 3,
        question: "Tác giả đề xuất điều gì để giải quyết các vấn đề đạo đức của AI?",
        options: [
          "Ngừng phát triển công nghệ AI",
          "Cho phép AI tự điều chỉnh",
          "Sử dụng quy định chặt chẽ và khung đạo đức",
          "Ưu tiên lợi nhuận hơn là quyền riêng tư dữ liệu"
        ],
        correct_answer: 2,
        explanation: "Tác giả nhấn mạnh việc sử dụng 'robust regulation and ethical frameworks' để quản lý rủi ro."
      }
    ],
    tips: [
      "Hãy đọc lướt (skimming) để nắm bắt ý chính của từng đoạn văn trước khi trả lời.",
      "Chú ý đến các từ khóa như 'healthcare', 'workplace', 'ethical' để định vị thông tin nhanh hơn."
    ]
  },
  {
    id: "toeic-reading-1",
    title: "Internal Memo: New Office Policy",
    test_type: "TOEIC",
    skill: "reading",
    time_limit: 10,
    instructions: "Đọc bản ghi nhớ nội bộ sau và chọn đáp án chính xác nhất.",
    passage: `MEMORANDUM
To: All Staff
From: Human Resources Department
Date: May 15, 2026
Subject: Implementation of Flexible Working Hours

We are pleased to announce that starting June 1, the company will be implementing a flexible working hours policy. This initiative aims to improve work-life balance and increase overall employee satisfaction.

Under the new policy, employees may start their workday anytime between 7:30 AM and 10:00 AM. However, all staff must be present during the 'core hours' of 10:00 AM to 3:00 PM. The total required working hours remain 40 hours per week for full-time employees.

Please note that this policy applies to all departments except the Customer Support Team, which must maintain its current fixed schedule to ensure continuous service for our international clients. 

Staff members interested in adjusting their schedules are required to fill out a notification form on the company portal by May 25. If you have any questions, please contact your immediate supervisor.`,
    questions: [
      {
        number: 1,
        question: "Mục đích chính của chính sách mới là gì?",
        options: [
          "Để cắt giảm chi phí hoạt động",
          "Để tuyển thêm nhân viên mới",
          "Để cải thiện sự cân bằng giữa công việc và cuộc sống",
          "Để bắt đầu làm việc sớm hơn vào buổi sáng"
        ],
        correct_answer: 2,
        explanation: "Bản ghi nhớ ghi rõ: 'This initiative aims to improve work-life balance'."
      },
      {
        number: 2,
        question: "Khoảng thời gian nào tất cả nhân viên PHẢI có mặt tại văn phòng?",
        options: [
          "7:30 AM to 10:00 AM",
          "10:00 AM to 3:00 PM",
          "8:00 AM to 5:00 PM",
          "9:00 AM to 4:00 PM"
        ],
        correct_answer: 1,
        explanation: "Core hours được quy định là từ 10:00 AM đến 3:00 PM."
      },
      {
        number: 3,
        question: "Bộ phận nào KHÔNG được áp dụng chính sách này?",
        options: [
          "Human Resources",
          "Marketing",
          "IT Department",
          "Customer Support"
        ],
        correct_answer: 3,
        explanation: "Bản ghi nhớ nêu ngoại lệ cho 'Customer Support Team'."
      }
    ],
    tips: [
      "Trong TOEIC Reading Part 7, hãy luôn tìm kiếm các mốc thời gian và ngoại lệ.",
      "Chú ý đến các từ như 'except', 'however', 'starting' để tránh bị đánh lừa bởi các chi tiết."
    ]
  }
];
