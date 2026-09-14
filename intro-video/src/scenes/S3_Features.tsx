/**
 * Scene 3 – Feature Showcase (frames 255-460, ~6.8 s)
 *
 * White background like the app's feature section.
 * 4 cards animate in with staggered spring-bounce + motion-blur.
 * Each card lifts further with a pulsing glow that matches its accent color.
 */
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, SPR, velBlur } from "../lib/tokens";

interface Feature {
  icon: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}

const FEATURES: Feature[] = [
  {
    icon: "🔍",
    title: "Tra từ điển với AI",
    desc: "Nhận nghĩa, phiên âm IPA, ví dụ câu và bài luyện tập ngay lập tức từ bất kỳ văn bản nào.",
    color: C.brand,
    bg: "#EFF6FF",
    border: `${C.brand}25`,
  },
  {
    icon: "📝",
    title: "Luyện thi TOEIC / IELTS",
    desc: "Đề thi mô phỏng sát thực tế, AI chấm điểm & giải thích chi tiết từng câu.",
    color: C.emerald,
    bg: "#ECFDF5",
    border: `${C.emerald}25`,
  },
  {
    icon: "🎙️",
    title: "Luyện phát âm IPA",
    desc: "Nhận diện giọng nói thời gian thực, phân tích âm vị và gợi ý cải thiện phát âm.",
    color: C.amber,
    bg: "#FFFBEB",
    border: `${C.amber}25`,
  },
  {
    icon: "🗺️",
    title: "Lộ trình cá nhân hoá",
    desc: "AI điều chỉnh kế hoạch học mỗi ngày dựa trên điểm yếu và mục tiêu của bạn.",
    color: C.purple,
    bg: "#FAF5FF",
    border: `${C.purple}25`,
  },
];

// ── Single feature card ────────────────────────────────────────────────────
const FeatureCard: React.FC<{
  feat: Feature;
  index: number;
  frame: number;
  fps: number;
}> = ({ feat, index, frame, fps }) => {
  // Stagger: column 0&2 slide from left, 1&3 from right; rows stagger by 12f
  const delay = 18 + index * 14;
  const f     = Math.max(0, frame - delay);
  const fromX = index % 2 === 0 ? -70 : 70;

  const sp  = spring({ frame: f,                  fps, config: SPR.bouncy });
  const spP = spring({ frame: Math.max(0, f - 1), fps, config: SPR.bouncy });

  const x   = interpolate(sp,  [0, 1], [fromX, 0]);
  const xP  = interpolate(spP, [0, 1], [fromX, 0]);
  const op  = interpolate(sp,  [0, 0.25], [0, 1], { extrapolateRight: "clamp" });
  const sc  = interpolate(sp,  [0, 1], [0.88, 1]);
  const blur = velBlur(x, xP, 0.25, 18);

  // Hover-like glow pulse after card has settled
  const settled = Math.min(sp, 1) > 0.97;
  const pulse   = settled
    ? 0.15 + Math.sin(((frame - delay - 30) / fps) * Math.PI * 1.5) * 0.12
    : 0;

  return (
    <div
      style={{
        background: feat.bg,
        border: `1.5px solid ${feat.border}`,
        borderRadius: 20,
        padding: "36px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transform: `translateX(${x}px) scale(${sc})`,
        opacity: op,
        filter: blur,
        boxShadow: `0 4px 24px ${feat.color}${Math.round(pulse * 255).toString(16).padStart(2, "0")}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top-right glow blob */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: `${feat.color}18`,
          filter: "blur(30px)",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: `${feat.color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          boxShadow: `0 2px 12px ${feat.color}30`,
        }}
      >
        {feat.icon}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: C.ink1,
          lineHeight: 1.2,
        }}
      >
        {feat.title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 18,
          color: C.ink2,
          lineHeight: 1.55,
          fontWeight: 400,
        }}
      >
        {feat.desc}
      </div>

      {/* Accent bottom stripe */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${feat.color}, transparent)`,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          opacity: Math.min(sp, 1),
        }}
      />
    </div>
  );
};

export const S3_Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade in/out
  const fadeIn  = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [175, 200], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOp = Math.min(fadeIn, fadeOut);

  // Section header
  const hSp = spring({ frame, fps, config: SPR.gentle, delay: 5 });
  const hY  = interpolate(hSp, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 100px",
        gap: 40,
        opacity: sceneOp,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          textAlign: "center",
          opacity: hSp,
          transform: `translateY(${hY}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 50,
            background: C.brandLight,
            border: `1.5px solid ${C.brand}30`,
            fontSize: 18,
            fontWeight: 600,
            color: C.brand,
            marginBottom: 18,
          }}
        >
          ⚡ Tính năng nổi bật
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: C.ink1,
            lineHeight: 1.2,
            letterSpacing: "-1.5px",
          }}
        >
          Tất cả những gì bạn cần{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${C.brand}, ${C.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ở một nơi
          </span>
        </div>
      </div>

      {/* ── 2×2 grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          width: "100%",
          maxWidth: 1400,
        }}
      >
        {FEATURES.map((feat, i) => (
          <FeatureCard key={i} feat={feat} index={i} frame={frame} fps={fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
