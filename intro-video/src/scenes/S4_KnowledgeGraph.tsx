/**
 * Scene 4 – Knowledge Graph (frames 440-630, ~6.3 s)
 *
 * Dark navy backdrop. An animated SVG knowledge graph draws itself:
 * nodes spring in from centre, edges grow outward sequentially.
 * A glowing "AI Core" hub pulses in the middle.
 */
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, GRAD, SPR, velBlur } from "../lib/tokens";

interface NodeDef {
  label: string;
  angle: number;   // radians
  radius: number;  // px from center
  color: string;
  icon: string;
}

const NODES: NodeDef[] = [
  { label: "Từ vựng",    angle: -Math.PI / 2,             radius: 260, color: C.brand,   icon: "📖" },
  { label: "Ngữ pháp",   angle: -Math.PI / 2 + Math.PI / 3, radius: 260, color: C.cyan,    icon: "✏️" },
  { label: "Phát âm IPA",angle: -Math.PI / 2 + 2*Math.PI/3, radius: 260, color: C.amber,   icon: "🎙️" },
  { label: "Luyện thi",  angle: -Math.PI / 2 + Math.PI,     radius: 260, color: C.green,   icon: "📝" },
  { label: "Đọc hiểu",   angle: -Math.PI / 2 + 4*Math.PI/3, radius: 260, color: C.purple,  icon: "👁️" },
  { label: "Nói & Nghe", angle: -Math.PI / 2 + 5*Math.PI/3, radius: 260, color: C.emerald, icon: "🎧" },
];

// Centre of the graph (relative to SVG viewBox 700×600)
const CX = 350, CY = 300;

// ── Animated edge (line that grows from cx,cy to node) ────────────────────
const Edge: React.FC<{
  node: NodeDef; frame: number; delay: number;
}> = ({ node, frame, delay }) => {
  const f   = Math.max(0, frame - delay);
  const progress = interpolate(f, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const nx  = CX + Math.cos(node.angle) * node.radius;
  const ny  = CY + Math.sin(node.angle) * node.radius;
  const ex  = CX + (nx - CX) * progress;
  const ey  = CY + (ny - CY) * progress;
  const op  = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <line
      x1={CX} y1={CY}
      x2={ex}  y2={ey}
      stroke={node.color}
      strokeWidth={1.5}
      strokeDasharray="6 4"
      opacity={op * 0.55}
    />
  );
};

// ── Animated node (circle + icon + label) ─────────────────────────────────
const GraphNode: React.FC<{
  node: NodeDef; frame: number; fps: number; delay: number;
}> = ({ node, frame, fps, delay }) => {
  const f   = Math.max(0, frame - delay);
  const sp  = spring({ frame: f,               fps, config: SPR.bouncy });
  const spP = spring({ frame: Math.max(0, f - 1), fps, config: SPR.bouncy });

  const nx    = CX + Math.cos(node.angle) * node.radius;
  const ny    = CY + Math.sin(node.angle) * node.radius;
  const scale = interpolate(sp, [0, 1], [0, 1]);
  const scaleP = interpolate(spP, [0, 1], [0, 1]);
  const blur  = velBlur(scale * 30, scaleP * 30, 0.5, 16);
  const op    = interpolate(sp, [0, 0.4], [0, 1], { extrapolateRight: "clamp" });

  // Label offset: push away from centre
  const lx = nx + Math.cos(node.angle) * 62;
  const ly = ny + Math.sin(node.angle) * 62;

  return (
    <g
      style={{
        transform: `translate(${nx}px, ${ny}px) scale(${scale})`,
        transformOrigin: `${nx}px ${ny}px`,
        filter: blur,
        opacity: op,
      }}
    >
      {/* Glow ring */}
      <circle cx={0} cy={0} r={38} fill={`${node.color}22`} />
      {/* Main circle */}
      <circle cx={0} cy={0} r={28} fill={node.color} />
      {/* Icon (rendered as foreignObject for emoji) */}
      <text
        x={0} y={9}
        textAnchor="middle"
        fontSize={22}
        style={{ userSelect: "none" }}
      >
        {node.icon}
      </text>

      {/* Label */}
      <text
        x={Math.cos(node.angle) * 62}
        y={Math.sin(node.angle) * 62 + 5}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill="#0F172A"
        fontFamily="system-ui, sans-serif"
      >
        {node.label}
      </text>
    </g>
  );
};

export const S4_KnowledgeGraph: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene fade in/out
  const fadeIn  = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [162, 190], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sceneOp = Math.min(fadeIn, fadeOut);

  // Header text spring
  const hSp = spring({ frame, fps, config: SPR.gentle, delay: 5 });

  // Central AI hub animation
  const hubSp   = spring({ frame, fps, config: SPR.snappy, delay: 5 });
  const hubScale = interpolate(hubSp, [0, 1], [0, 1]);
  const hubPulse = 1 + Math.sin((frame / fps) * Math.PI * 1.8) * 0.04;

  // Orbit ring rotation
  const ringRot = (frame / fps) * 18; // 18 deg/s

  // Sub-text
  const subOp = interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        padding: "0 80px",
        opacity: sceneOp,
        overflow: "hidden",
      }}
    >
      {/* ── Left: text panel ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          flexShrink: 0,
          width: 480,
          opacity: Math.min(hSp, 1),
          transform: `translateX(${interpolate(hSp, [0, 1], [-35, 0])}px)`,
        }}
      >
        {/* Tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 50,
            background: C.brandLight,
            border: `1.5px solid ${C.brand}40`,
            fontSize: 17,
            fontWeight: 600,
            color: C.brand,
            alignSelf: "flex-start",
          }}
        >
          🧬 Công nghệ cốt lõi
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: C.ink1,
            lineHeight: 1.15,
            letterSpacing: "-1.5px",
          }}
        >
          Đồ thị{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${C.brand}, ${C.cyan})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Tri thức
          </span>
          <br />+ Trí tuệ{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${C.green}, ${C.emerald})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Nhân tạo
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 20,
            color: C.ink2,
            lineHeight: 1.65,
            margin: 0,
            opacity: subOp,
          }}
        >
          Hệ thống lập bản đồ mối quan hệ giữa từ vựng, ngữ pháp và kỹ năng — giúp AI hiểu đúng điểm yếu và tối ưu lộ trình riêng cho từng người học.
        </p>

        {/* Tech badges */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", opacity: subOp }}>
          {[
            { name: "Gemini AI",   color: C.brand },
            { name: "LangChain",   color: C.green },
            { name: "Cohere",      color: C.purple },
            { name: "Neo4j Graph", color: C.cyan },
          ].map((t, i) => (
            <div
              key={i}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                background: `${t.color}18`,
                border: `1px solid ${t.color}35`,
                fontSize: 15,
                fontWeight: 600,
                color: t.color,
              }}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: animated SVG graph ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg
          viewBox="0 0 700 600"
          style={{ width: "100%", maxWidth: 660, overflow: "visible" }}
        >
          <defs>
            <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={C.cyan}  stopOpacity={0.9} />
              <stop offset="100%" stopColor={C.brand} stopOpacity={1}   />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Orbit ring (rotating dashed circle) */}
          <circle
            cx={CX} cy={CY} r={265}
            fill="none"
            stroke={`${C.brand}20`}
            strokeWidth={1}
            strokeDasharray="8 6"
            transform={`rotate(${ringRot}, ${CX}, ${CY})`}
          />

          {/* Edges – staggered */}
          {NODES.map((n, i) => (
            <Edge key={i} node={n} frame={frame} delay={20 + i * 8} />
          ))}

          {/* Outer nodes */}
          {NODES.map((n, i) => (
            <GraphNode key={i} node={n} frame={frame} fps={fps} delay={32 + i * 10} />
          ))}

          {/* Centre AI hub */}
          <g
            style={{
              transform: `translate(${CX}px, ${CY}px) scale(${hubScale * hubPulse})`,
              transformOrigin: `${CX}px ${CY}px`,
              filter: "url(#glow)",
            }}
          >
            {/* Pulse rings */}
            <circle cx={0} cy={0} r={72} fill={`${C.brand}18`} />
            <circle cx={0} cy={0} r={54} fill={`${C.brand}28`} />
            {/* Core */}
            <circle cx={0} cy={0} r={44} fill="url(#hubGrad)" />
            <text
              x={0} y={-8}
              textAnchor="middle"
              fontSize={26}
              style={{ userSelect: "none" }}
            >
              🧠
            </text>
            <text
              x={0} y={16}
              textAnchor="middle"
              fontSize={14}
              fontWeight={800}
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              letterSpacing={1}
            >
              AI
            </text>
          </g>
        </svg>
      </div>
    </AbsoluteFill>
  );
};
