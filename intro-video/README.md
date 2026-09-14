# iEdu Intro Video — Remotion

## Xem preview (đang chạy)
http://localhost:3000

## Các lệnh

```bash
cd intro-video

# Mở Remotion Studio để xem và điều chỉnh
npm run dev

# Render ra file MP4 (cần ffmpeg)
npm run render
# Output: out/iedu_intro.mp4
```

## Cài ffmpeg để render (nếu chưa có)
https://www.gyan.dev/ffmpeg/builds/ → tải ffmpeg-release-essentials.zip
→ Giải nén → thêm thư mục bin/ vào PATH

## Cấu trúc video (30 fps, 1920×1080, 30 giây)

| Cảnh | Thời gian | Nội dung |
|------|-----------|----------|
| S1   | 0 – 3s    | Logo iEdu spring + particle burst + rings |
| S2   | 2.7 – 9s  | Tagline word-by-word + feature pills |
| S3   | 8.5 – 15s | 4 Feature cards (blue bg matching app) |
| S4   | 14.8 – 21s| Knowledge Graph animation (SVG) |
| S5   | 20.8 – 27s| Stats counter + author row |
| S6   | 26.5 – 30s| CTA end-card (blue hero gradient) |

## Màu sắc dùng đúng theo globals.css
- Brand: #2563EB (blue-600)
- Cyan: #06B6D4 (cyan-500)
- Green: #58CC02 (Duolingo)
- Amber: #FF9600
- Purple: #CE82FF
