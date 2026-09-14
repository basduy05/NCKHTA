/**
 * Scene 6 – CTA / End-card (frames 795-900, ~3.5 s)
 *
 * Full blue gradient (matching the app's hero section exactly).
 * iEdu logo + tagline slam in, CTA button pulses.
 */
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, GRAD, SPR, velBlur } from "../lib/tokens";

export const S6_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade in
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Logo spring — slam from top
  const logoSp  = spring({ frame,               fps, config: SPR.stiff, delay: 5 });
  const logoSpP = spring({ frame: Math.max(0, frame - 1), fps, config: SPR.stiff, delay: 5 });
  const logoY   = interpolate(logoSp,  [0, 1], [-90, 0]);
  const logoPY  = interpolate(logoSpP, [0, 1], [-90, 0]);
  const logoBlur = velBlur(logoY, logoPY, 0.5, 28);
  const logoSc  = interpolate(logoSp, [0, 1], [0.6, 1]);

  // Headline spring
  const headSp = spring({ frame, fps, config: SPR.snappy, delay: 14 });
  const headY  = interpolate(headSp, [0, 1], [50, 0]);
  const headBlur = velBlur(headY, interpolate(
    spring({ frame: Math.max(0, frame - 1), fps, config: SPR.snappy, delay: 14 }),
    [0, 1], [50, 0],
  ), 0.4, 20);

  // Sub spring
  const subSp = spring({ frame, fps, config: SPR.gentle, delay: 24 });

  // Button spring
  const btnSp    = spring({ frame, fps, config: SPR.bouncy, delay: 36 });
  const btnScale = interpolate(btnSp, [0, 1], [0.5, 1]);
  // Pulse after entry
  const btnPulse = Math.sin((frame / fps) * Math.PI * 2) * 0.025 + 1;

  // Bottom credit
  const creditOp = interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Shimmer on button
  const shimmerX = interpolate(frame % (fps * 2.5), [0, fps * 2.5], [-200, 400]);

  // Background orbs
  const orb1 = 0.35 + Math.sin((frame / fps) * 1.1) * 0.1;
  const orb2 = 0.25 + Math.sin((frame / fps) * 0.8 + 2) * 0.08;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${C.brandSoft} 0%, #FFFFFF 45%, ${C.cyanLight} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        opacity: fadeIn,
        overflow: "hidden",
      }}
    >
      {/* ── Decorative orbs (same as app hero) ── */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -80,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `rgba(219,234,254,${orb1})`,
          filter: "blur(90px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `rgba(207,250,254,${orb2})`,
          filter: "blur(80px)",
        }}
      />

      {/* ── Logo ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translateY(${logoY}px) scale(${logoSc})`,
          filter: logoBlur,
          opacity: Math.min(logoSp, 1),
          position: "relative",
        }}
      >
        {/* Blue glow halo */}
        <div
          style={{
            position: "absolute",
            width: 380,
            height: 120,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, rgba(37,99,235,0.25) 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
        />
        <Img
          src={staticFile("logo.png")}
          style={{
            height: 80,
            width: "auto",
            position: "relative",
            filter: `drop-shadow(0 4px 24px rgba(37,99,235,0.5))`,
          }}
        />
      </div>

      {/* ── Headline ── */}
      <div
        style={{
          textAlign: "center",
          transform: `translateY(${headY}px)`,
          filter: headBlur,
          opacity: Math.min(headSp, 1),
        }}
      >
        <div
          style={{
            fontSize: 62,
            fontWeight: 900,
            color: C.ink1,
            letterSpacing: "-2px",
            lineHeight: 1.15,
          }}
        >
          Bắt đầu học{" "}
          <span
            style={{
              background: GRAD.brandH,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            thông minh hơn
          </span>
          <br />
          ngay hôm nay.
        </div>
      </div>

      {/* ── Sub ── */}
      <div
        style={{
          fontSize: 22,
          color: C.ink2,
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: 660,
          opacity: subSp,
          transform: `translateY(${interpolate(subSp, [0, 1], [20, 0])}px)`,
        }}
      >
        Không cần cài đặt. Không cần đăng ký phức tạp.<br />
        <strong style={{ color: C.brand }}>AI lo phần còn lại</strong> — bạn chỉ cần học.
      </div>

      {/* ── CTA Button ── */}
      <div
        style={{
          transform: `scale(${btnScale * btnPulse})`,
          opacity: Math.min(btnSp, 1),
          position: "relative",
          overflow: "hidden",
          borderRadius: 16,
          boxShadow: `0 12px 40px rgba(37,99,235,0.30), 0 4px 12px rgba(37,99,235,0.20)`,
        }}
      >
        {/* Button base */}
        <div
          style={{
            padding: "22px 72px",
            background: GRAD.brand,
            borderRadius: 16,
            fontSize: 26,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          Bắt đầu miễn phí
          <span style={{ fontSize: 24 }}>→</span>
        </div>

        {/* Shimmer sweep */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: shimmerX,
            width: 120,
            height: "100%",
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
            transform: "skewX(-20deg)",
          }}
        />
      </div>

      {/* ── Bottom credit ── */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 16,
          color: C.ink3,
          letterSpacing: 1.5,
          opacity: creditOp,
          textAlign: "center",
        }}
      >
        © 2025 · Chơi Sáng Tạo, Học Tư Duy · Demo không chính thức · Dự án NCKHTA
      </div>
    </AbsoluteFill>
  );
};
