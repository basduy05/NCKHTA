/**
 * Scene 2 – Hero Tagline (frames 80-270, ~6.3 s)
 *
 * Background matches the app's hero: blue-50 → white → cyan-50 gradient.
 * Each headline word springs in one-by-one with motion-blur, then the
 * sub-description types itself character by character.
 */
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, GRAD, SPR, velBlur } from "../lib/tokens";

// ── Word token that springs in with motion-blur ────────────────────────────
const Word: React.FC<{
  text: string;
  frame: number;
  fps: number;
  delay: number;
  color?: string;
  isGradient?: boolean;
  size?: number;
}> = ({ text, frame, fps, delay, color, isGradient, size = 100 }) => {
  const f = Math.max(0, frame - delay);
  const sp  = spring({ frame: f,               fps, config: SPR.snappy });
  const spP = spring({ frame: Math.max(0, f - 1), fps, config: SPR.snappy });

  const y    = interpolate(sp,  [0, 1], [60, 0]);
  const yP   = interpolate(spP, [0, 1], [60, 0]);
  const blur = velBlur(y, yP, 0.4, 24);
  const op   = interpolate(sp, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  const gradStyle: React.CSSProperties = isGradient
    ? {
        background: GRAD.brandH,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }
    : {};

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.05,
        letterSpacing: "-2px",
        color: color ?? C.ink1,
        transform: `translateY(${y}px)`,
        filter: blur,
        opacity: op,
        marginRight: 12,
        ...gradStyle,
      }}
    >
      {text}
    </span>
  );
};

// ── Feature pill ───────────────────────────────────────────────────────────
const Pill: React.FC<{
  icon: string; label: string;
  frame: number; fps: number; delay: number;
  color: string; bg: string;
}> = ({ icon, label, frame, fps, delay, color, bg }) => {
  const f  = Math.max(0, frame - delay);
  const sp = spring({ frame: f, fps, config: SPR.bouncy });
  const x  = interpolate(sp, [0, 1], [40, 0]);
  const op = interpolate(sp, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 20px",
        borderRadius: 50,
        background: bg,
        border: `1.5px solid ${color}30`,
        fontSize: 18,
        fontWeight: 600,
        color,
        transform: `translateX(${x}px)`,
        opacity: op,
        boxShadow: `0 2px 12px ${color}20`,
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      {label}
    </div>
  );
};

export const S2_Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade-in/out
  const fadeIn  = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [150, 170], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOp = Math.min(fadeIn, fadeOut);

  // Sub-text: slide + fade
  const subSp = spring({ frame, fps, config: SPR.gentle, delay: 80 });
  const subY  = interpolate(subSp, [0, 1], [25, 0]);

  // Badge (top) fade
  const badgeOp = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeX  = interpolate(frame, [10, 35], [-25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Background orb animation (pulse)
  const orb1 = 0.4 + Math.sin((frame / fps) * 1.2) * 0.15;
  const orb2 = 0.3 + Math.sin((frame / fps) * 0.9 + 1) * 0.12;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 45%, #ECFEFF 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: sceneOp,
        overflow: "hidden",
      }}
    >
      {/* ── Background orbs (match the app's hero orbs) ── */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 580,
          height: 580,
          borderRadius: "50%",
          background: `rgba(219,234,254,${orb1})`,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -80,
          width: 460,
          height: 460,
          borderRadius: "50%",
          background: `rgba(207,250,254,${orb2})`,
          filter: "blur(70px)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          position: "relative",
          zIndex: 1,
          padding: "0 80px",
        }}
      >
        {/* ── Eyebrow badge ── */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            borderRadius: 50,
            background: C.brandLight,
            border: `1.5px solid ${C.brand}30`,
            fontSize: 20,
            fontWeight: 600,
            color: C.brand,
            opacity: badgeOp,
            transform: `translateX(${badgeX}px)`,
          }}
        >
          <span style={{ fontSize: 22, animation: "spin 3s linear infinite" }}>✨</span>
          Dự án Nghiên Cứu Khoa Học 2025
        </div>

        {/* ── Headline (word by word) ── */}
        <div style={{ textAlign: "center", lineHeight: 1.1 }}>
          {/* Line 1 */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 0 }}>
            <Word text="Học" frame={frame} fps={fps} delay={22} size={96} />
            <Word text="tiếng" frame={frame} fps={fps} delay={28} size={96} />
            <Word text="Anh" frame={frame} fps={fps} delay={34} size={96} />
          </div>

          {/* Line 2 – gradient */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 0, margin: "4px 0" }}>
            <Word text="thông minh hơn" frame={frame} fps={fps} delay={42} size={96} isGradient />
          </div>

          {/* Line 3 */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0 }}>
            <Word text="với" frame={frame} fps={fps} delay={58} size={96} />
            <Word text="AI" frame={frame} fps={fps} delay={66} size={96} color={C.brand} />
          </div>
        </div>

        {/* ── Sub-description ── */}
        <p
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: C.ink2,
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 780,
            opacity: subSp,
            transform: `translateY(${subY}px)`,
            margin: 0,
          }}
        >
          Nền tảng kết hợp{" "}
          <strong style={{ color: C.ink1 }}>Đồ thị Tri thức</strong> và{" "}
          <strong style={{ color: C.brand }}>Trí tuệ Nhân tạo</strong>{" "}
          giúp bạn học từ vựng, ngữ pháp hiệu quả gấp nhiều lần.
        </p>

        {/* ── Feature pills row ── */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Pill icon="🔍" label="Tra từ điển AI"    frame={frame} fps={fps} delay={100} color={C.brand}   bg={C.brandLight} />
          <Pill icon="📝" label="Luyện thi TOEIC"   frame={frame} fps={fps} delay={112} color={C.emerald} bg="#D1FAE5" />
          <Pill icon="🎙️" label="Phát âm IPA"       frame={frame} fps={fps} delay={124} color={C.amber}   bg="#FEF3C7" />
          <Pill icon="🗺️" label="Cá nhân hoá"       frame={frame} fps={fps} delay={136} color={C.purple}  bg="#F3E8FF" />
        </div>
      </div>
    </AbsoluteFill>
  );
};
