export const MOCK_PRACTICE_TESTS = [
  {
    id: "toeic-listening-1",
    title: "TOEIC Listening Part 3: Conversations",
    test_type: "TOEIC",
    skill: "listening",
    time_limit: 10,
    instructions: "Listen to the conversation and answer the questions.",
    passage: "[Audio Transcript] \nM: Hi Sarah, do you know what time the marketing meeting starts?\nF: It was originally scheduled for 10:00 AM, but the director asked to push it back to 1:00 PM because of a scheduling conflict with the sales team.\nM: Oh, I see. In that case, I'll have time to finish the Q3 report and print some copies before we meet.\nF: That's a good idea. Oh, by the way, make sure to bring the new promotional materials. The director wants to review them together.",
    questions: [
      {
        number: 1,
        question: "When is the meeting taking place?",
        options: [
          "At 10:00 AM",
          "At 1:00 PM",
          "At 3:00 PM",
          "Tomorrow morning"
        ],
        correct_answer: 1,
        explanation: "The woman says 'push it back to 1:00 PM'."
      },
      {
        number: 2,
        question: "What will the man do before the meeting?",
        options: [
          "Call the sales team",
          "Meet with the director",
          "Print a report",
          "Buy some lunch"
        ],
        correct_answer: 2,
        explanation: "The man says 'I'll have time to finish the Q3 report and print some copies'."
      },
      {
        number: 3,
        question: "What is the man asked to bring?",
        options: [
          "Promotional materials",
          "His laptop",
          "Meeting agenda",
          "Sales figures"
        ],
        correct_answer: 0,
        explanation: "The woman says 'make sure to bring the new promotional materials'."
      }
    ],
    tips: [
      "In Part 3, always read the questions before listening to the audio.",
      "Listen for keywords and synonyms instead of exact matching phrases."
    ]
  },
  {
    id: "ielts-writing-1",
    title: "IELTS Writing Task 2: Environment",
    test_type: "IELTS",
    skill: "writing",
    time_limit: 40,
    instructions: "Write at least 250 words.",
    passage: "Some people think that the best way to solve environmental problems is to increase the cost of fuel for cars and other vehicles. To what extent do you agree or disagree?",
    questions: [],
    tips: [
      "Structure your essay clearly: Introduction, Body Paragraphs, and Conclusion.",
      "Make sure you clearly state your opinion in the introduction and support it in the body."
    ]
  },
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
  },
  {
    id: "ielts-reading-2",
    title: "The Mystery of the Indus Valley Civilization",
    test_type: "IELTS",
    skill: "reading",
    time_limit: 20,
    instructions: "Read the passage and choose the correct options.",
    passage: `The Indus Valley Civilization, which flourished around 2500 BCE in what is now Pakistan and northwest India, remains one of the great enigmas of the ancient world. Known for its sophisticated urban planning and advanced drainage systems, it was a major contemporary of Mesopotamia and Egypt.

One of the most striking features of Indus cities like Mohenjo-Daro and Harappa is their grid-like layout. The streets were laid out in straight lines, intersecting at right angles, a design that suggests a high degree of central planning and social organization. Each house was equipped with a bathing area and access to a remarkably efficient sewage system, featuring brick-lined drains that ran along the streets.

The civilization also possessed a unique writing system, which has yet to be fully deciphered. Thousands of seals, often depicting animals and mystical creatures, have been discovered, each bearing a short inscription in the Indus script. Scholars have debated whether this script represents a complete language or simply a system of symbols used for trade and administration.

Around 1900 BCE, the Indus Valley Civilization began to decline. The reasons for its eventual collapse are still debated by archaeologists. Some suggest that climate change, such as shifting river patterns or severe droughts, made agriculture unsustainable. Others point to potential invasions or internal social instability. Despite its disappearance, the legacy of the Indus Valley Civilization continues to fascinate those who study the origins of urban life.`,
    questions: [
      {
        number: 1,
        question: "What is mentioned as a 'sophisticated' feature of the Indus Valley Civilization?",
        options: [
          "Their artistic cave paintings",
          "Advanced urban planning and drainage",
          "A complex military hierarchy",
          "Direct democracy systems"
        ],
        correct_answer: 1,
        explanation: "The text highlights 'sophisticated urban planning and advanced drainage systems'."
      },
      {
        number: 2,
        question: "What is the status of the Indus writing script according to the text?",
        options: [
          "It is widely used in modern Pakistan",
          "It has been fully translated by scholars",
          "It remains undeciphered",
          "It consists only of animal drawings without text"
        ],
        correct_answer: 2,
        explanation: "The text states the script 'has yet to be fully deciphered'."
      },
      {
        number: 3,
        question: "What is a suspected cause for the civilization's decline?",
        options: [
          "A massive volcanic eruption",
          "Shifting river patterns or droughts",
          "Discovery of iron weapons",
          "An agreement to merge with Mesopotamia"
        ],
        correct_answer: 1,
        explanation: "The text mentions climate change factors like 'shifting river patterns or severe droughts'."
      }
    ],
    tips: [
      "IELTS Reading often uses synonyms. Look for words like 'decline' or 'collapse' in the text when searching for the cause of disappearance.",
      "Scientific dates and ancient locations are key anchors for finding specific information."
    ]
  },
  {
    id: "toeic-reading-2",
    title: "Job Advertisement: Marketing Coordinator",
    test_type: "TOEIC",
    skill: "reading",
    time_limit: 15,
    instructions: "Read the job advertisement and answer the questions.",
    passage: `POSITION: Marketing Coordinator
COMPANY: NexGen Tech Solutions
LOCATION: Chicago, IL (Remote option available for experienced candidates)

NexGen Tech Solutions is looking for a creative and detail-oriented Marketing Coordinator to join our growing team. The successful candidate will assist in the development and execution of marketing campaigns, manage our social media presence, and coordinate promotional events.

QUALIFICATIONS:
- Bachelor's degree in Marketing, Communications, or a related field.
- Minimum of 2 years of experience in digital marketing or public relations.
- Proficiency in content management systems and graphic design software (Adobe Creative Suite favored).
- Excellent written and verbal communication skills.

BENEFITS:
- Competitive salary and performance-based bonuses.
- Comprehensive health and dental insurance.
- 15 days of paid time off plus national holidays.
- Professional development budget for annual conferences.

TO APPLY:
Please send your resume and a cover letter detailing your relevant experience to careers@nexgentech.com by June 30. Only shortlisted candidates will be contacted for an initial interview via video call.`,
    questions: [
      {
        number: 1,
        question: "Who is eligible for a remote working option?",
        options: [
          "All new employees",
          "Only candidates from Chicago",
          "Experienced candidates",
          "Interns and fresh graduates"
        ],
        correct_answer: 2,
        explanation: "The ad states: 'Remote option available for experienced candidates'."
      },
      {
        number: 2,
        question: "Which skill is specifically mentioned as 'favored'?",
        options: [
          "Public speaking",
          "Adobe Creative Suite",
          "Foreign language proficiency",
          "Project management certification"
        ],
        correct_answer: 1,
        explanation: "The ad mentions: 'Adobe Creative Suite favored'."
      },
      {
        number: 3,
        question: "What is the deadline for applications?",
        options: [
          "May 15",
          "June 1",
          "June 30",
          "July 4"
        ],
        correct_answer: 2,
        explanation: "The text asks to send resumes 'by June 30'."
      }
    ],
    tips: [
      "Job ads in TOEIC focus on qualifications and benefits. Scan these headings quickly.",
      "Check the 'To Apply' section for deadlines and specific submission requirements."
    ]
  }
];

