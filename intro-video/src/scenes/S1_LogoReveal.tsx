/**
 * Scene 1 – Logo Reveal (frames 0-90, 3 s)
 *
 * Dark navy → radial blue glow → iEdu logo springs in with motion-blur
 * → pulsing rings → tagline fades → crossfade out
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

// ── Expanding ring ────────────────────────────────────────────────────────────
const Ring: React.FC<{
  delay: number;
  size: number;
  color: string;
  frame: number;
}> = ({ delay, size, color, frame }) => {
  const f = Math.max(0, frame - delay);
  const scale = interpolate(f, [0, 55], [0.25, 2.2], { extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 8, 55], [0, 0.9, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        transform: `scale(${scale})`,
        opacity,
      }}
    />
  );
};

// ── Particle dot ──────────────────────────────────────────────────────────────
const Particle: React.FC<{
  x: number; y: number; angle: number; speed: number;
  delay: number; frame: number; color: string;
}> = ({ x, y, angle, speed, delay, frame, color }) => {
  const f = Math.max(0, frame - delay);
  const dist = interpolate(f, [0, 60], [0, speed * 160], { extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 5, 50, 70], [0, 1, 0.6, 0], { extrapolateRight: "clamp" });
  const px = x + Math.cos(angle) * dist;
  const py = y + Math.sin(angle) * dist;
  return (
    <div
      style={{
        position: "absolute",
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: color,
        left: "50%",
        top: "50%",
        transform: `translate(${px - 2}px, ${py - 2}px)`,
        opacity,
        boxShadow: `0 0 8px ${color}`,
      }}
    />
  );
};

export const S1_LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Logo spring (bounce in from below)
  const sp   = spring({ frame,       fps, config: SPR.bouncy, delay: 6 });
  const spP  = spring({ frame: Math.max(0, frame - 1), fps, config: SPR.bouncy, delay: 6 });

  const logoY    = interpolate(sp,  [0, 1], [110, 0]);
  const logoPY   = interpolate(spP, [0, 1], [110, 0]);
  const logoScale = interpolate(sp, [0, 1], [0.15, 1]);
  const logoBlur  = velBlur(logoY, logoPY, 0.45, 28);

  // ── Icon inner spin: quarter rotation during entry
  const iconRotate = interpolate(sp, [0, 1], [-90, 0]);

  // ── Tagline slide up
  const tagSp = spring({ frame, fps, config: SPR.gentle, delay: 38 });
  const tagY  = interpolate(tagSp, [0, 1], [22, 0]);

  // ── Glow pulse (looping after entry settles)
  const glowPulse = Math.sin((frame / fps) * Math.PI * 1.4) * 0.5 + 0.5;
  const glowSize  = interpolate(glowPulse, [0, 1], [220, 290]);
  const glowOp    = interpolate(glowPulse, [0, 1], [0.25, 0.45]) * Math.min(sp, 1);

  // ── Scene fade out
  const sceneOp = interpolate(frame, [74, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Particles (burst on logo entry)
  const particles = Array.from({ length: 18 }, (_, i) => ({
    angle: (i / 18) * Math.PI * 2,
    speed: 0.6 + (i % 3) * 0.25,
    delay: 10 + (i % 4) * 2,
    color: i % 3 === 0 ? C.brand : i % 3 === 1 ? C.cyan : C.info,
  }));

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: sceneOp,
      }}
    >
      {/* ── Ambient glow backdrop ── */}
      <div
        style={{
          position: "absolute",
          width: glowSize,
          height: glowSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(37,99,235,${glowOp * 0.5}) 0%, transparent 70%)`,
          filter: "blur(60px)",
          transition: "none",
        }}
      />

      {/* ── Expanding rings ── */}
      <Ring delay={2}  size={180} color={`rgba(37,99,235,0.40)`}  frame={frame} />
      <Ring delay={8}  size={320} color={`rgba(6,182,212,0.30)`}  frame={frame} />
      <Ring delay={14} size={480} color={`rgba(37,99,235,0.16)`}  frame={frame} />
      <Ring delay={20} size={660} color={`rgba(6,182,212,0.08)`}  frame={frame} />

      {/* ── Particle burst ── */}
      {particles.map((p, i) => (
        <Particle key={i} x={0} y={0} {...p} frame={frame} />
      ))}

      {/* ── Logo ── */}
      <div
        style={{
          transform: `translateY(${logoY}px) scale(${logoScale})`,
          filter: logoBlur,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Logo PNG với glow backdrop */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `rotate(${iconRotate}deg)`,
          }}
        >
          {/* Glow halo behind logo */}
          <div
            style={{
              position: "absolute",
              width: 260,
              height: 100,
              borderRadius: "50%",
              background: `radial-gradient(ellipse, rgba(37,99,235,0.55) 0%, transparent 70%)`,
              filter: "blur(24px)",
            }}
          />
          <Img
            src={staticFile("logo.png")}
            style={{
              height: 120,
              width: "auto",
              position: "relative",
              filter: `drop-shadow(0 0 24px rgba(37,99,235,0.4)) drop-shadow(0 0 60px rgba(6,182,212,0.25))`,
            }}
          />
        </div>
      </div>

      {/* ── Tagline ── */}
      <div
        style={{
          marginTop: 28,
          fontSize: 22,
          fontWeight: 500,
          color: "#475569",
          letterSpacing: 5,
          textTransform: "uppercase",
          opacity: tagSp,
          transform: `translateY(${tagY}px)`,
        }}
      >
        Nền tảng học tiếng Anh thông minh
      </div>

      {/* ── Bottom dot indicators ── */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          display: "flex",
          gap: 8,
          opacity: interpolate(frame, [50, 70], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {[C.brand, C.cyan, C.info, C.green].map((color, i) => (
          <div
            key={i}
            style={{
              width: i === 0 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: color,
              opacity: i === 0 ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
