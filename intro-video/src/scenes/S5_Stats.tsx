/**
 * Scene 5 – Social Proof / Stats (frames 625-810, ~6.2 s)
 *
 * Dark section. Three large animated counters spring in with motion-blur.
 * Author avatars slide in at the bottom.
 */
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, GRAD, SPR, velBlur } from "../lib/tokens";

interface StatItem {
  value: string;        // final display string
  countTo?: number;     // if numeric, count up from 0
  suffix?: string;
  label: string;
  sub: string;
  color: string;
  icon: string;
}

const STATS: StatItem[] = [
  {
    value: "5",
    countTo: 5,
    suffix: "+",
    label: "Tính năng học tập",
    sub: "Từ điển · Luyện thi · IPA · Roadmap · Grammar",
    color: C.brand,
    icon: "⚡",
  },
  {
    value: "3",
    countTo: 3,
    suffix: " AI",
    label: "Mô hình AI tích hợp",
    sub: "Gemini · Cohere Rerank · LangChain Graph",
    color: C.green,
    icon: "🤖",
  },
  {
    value: "A1→C1",
    label: "Lộ trình toàn diện",
    sub: "Từ cơ bản đến nâng cao — mọi trình độ",
    color: C.purple,
    icon: "🗺️",
  },
];

// ── Animated counter ────────────────────────────────────────────────────────
function useCounter(
  target: number | undefined,
  frame: number,
  fps: number,
  delay: number,
): number {
  if (target === undefined) return 0;
  const f = Math.max(0, frame - delay);
  const t = Math.min(f / (fps * 1.2), 1); // 1.2-second count-up
  // Ease out cubic
  const ease = 1 - Math.pow(1 - t, 3);
  return Math.floor(ease * target);
}

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  stat: StatItem; index: number; frame: number; fps: number;
}> = ({ stat, index, frame, fps }) => {
  const delay = 18 + index * 20;
  const f     = Math.max(0, frame - delay);

  const sp  = spring({ frame: f,                  fps, config: SPR.snappy });
  const spP = spring({ frame: Math.max(0, f - 1), fps, config: SPR.snappy });

  const y    = interpolate(sp,  [0, 1], [80, 0]);
  const yP   = interpolate(spP, [0, 1], [80, 0]);
  const blur = velBlur(y, yP, 0.4, 22);
  const op   = interpolate(sp,  [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  const sc   = interpolate(sp,  [0, 1], [0.85, 1]);

  const count  = useCounter(stat.countTo, frame, fps, delay);
  const display = stat.countTo !== undefined ? `${count}${stat.suffix ?? ""}` : stat.value;

  // Subtle shimmer animation after settle
  const shimmer = Math.sin(((frame - delay) / fps) * Math.PI * 1.2) * 0.5 + 0.5;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "44px 40px",
        background: "#F8FAFC",
        border: `1.5px solid #E2E8F0`,
        borderRadius: 24,
        backdropFilter: "blur(10px)",
        transform: `translateY(${y}px) scale(${sc})`,
        filter: blur,
        opacity: op,
        flex: 1,
        position: "relative",
        overflow: "hidden",
        boxShadow: `0 8px 40px ${stat.color}20`,
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${stat.color}, transparent)`,
          opacity: Math.min(sp, 1),
        }}
      />

      {/* Glow blob */}
      <div
        style={{
          position: "absolute",
          top: -40,
          left: "50%",
          transform: "translateX(-50%)",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `${stat.color}${Math.round(interpolate(shimmer, [0, 1], [0.06, 0.14]) * 255).toString(16).padStart(2, "0")}`,
          filter: "blur(40px)",
        }}
      />

      {/* Icon */}
      <div style={{ fontSize: 40 }}>{stat.icon}</div>

      {/* Value */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 1,
          background: `linear-gradient(135deg, ${stat.color}, #FFFFFF)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-2px",
          filter: `drop-shadow(0 0 20px ${stat.color}60)`,
        }}
      >
        {display}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#0F172A",
          textAlign: "center",
        }}
      >
        {stat.label}
      </div>

      {/* Sub */}
      <div
        style={{
          fontSize: 15,
          color: "#475569",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {stat.sub}
      </div>
    </div>
  );
};

// ── Author avatar row ──────────────────────────────────────────────────────
const AuthorRow: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const sp = spring({ frame, fps, config: SPR.gentle, delay: 80 });
  const y  = interpolate(sp, [0, 1], [20, 0]);
  const names = ["Thành viên 1", "Thành viên 2", "Thành viên 3", "Thành viên 4", "Thành viên 5"];
  const colors = [C.brand, C.cyan, C.green, C.amber, C.purple];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity: sp,
        transform: `translateY(${y}px)`,
      }}
    >
      {/* Avatar cluster */}
      <div style={{ display: "flex", position: "relative", height: 52 }}>
        {names.map((n, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * 36,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${colors[i]}, ${colors[(i + 1) % colors.length]})`,
              border: "3px solid #FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "#FFFFFF",
              zIndex: 5 - i,
            }}
          >
            {String.fromCodePoint(0x1F464 + i)}
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: names.length * 36,
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "3px solid #FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          +
        </div>
      </div>

      <div style={{ fontSize: 17, color: "#475569", letterSpacing: 1 }}>
        Nhóm nghiên cứu — Dự án NCKHTA 2025
      </div>
    </div>
  );
};

export const S5_Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [150, 170], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOp = Math.min(fadeIn, fadeOut);

  const hSp = spring({ frame, fps, config: SPR.gentle, delay: 4 });

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 100px",
        gap: 48,
        opacity: sceneOp,
        overflow: "hidden",
      }}
    >
      {/* Background grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <div
        style={{
          textAlign: "center",
          opacity: Math.min(hSp, 1),
          transform: `translateY(${interpolate(hSp, [0, 1], [25, 0])}px)`,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "#0F172A",
            letterSpacing: "-1.5px",
            lineHeight: 1.2,
          }}
        >
          Được thiết kế để{" "}
          <span
            style={{
              background: GRAD.brand,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ghi nhớ lâu hơn
          </span>
        </div>
        <div style={{ fontSize: 20, color: "#475569", marginTop: 10 }}>
          Phương pháp Spaced Repetition + AI — hiệu quả hơn học truyền thống 4×
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 24,
          width: "100%",
          maxWidth: 1300,
          position: "relative",
        }}
      >
        {STATS.map((s, i) => (
          <StatCard key={i} stat={s} index={i} frame={frame} fps={fps} />
        ))}
      </div>

      {/* Author row */}
      <AuthorRow frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
