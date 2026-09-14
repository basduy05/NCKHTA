/**
 * IEduIntro – main composition
 *
 * Total: 900 frames @ 30 fps = 30 seconds
 *
 *  S1 Logo Reveal     0  → 90   (3 s)
 *  S2 Tagline        80  → 270  (6.3 s, 10f crossfade with S1)
 *  S3 Features      255  → 460  (6.8 s, 15f crossfade)
 *  S4 Knowledge     445  → 640  (6.5 s, 15f crossfade)
 *  S5 Stats         625  → 810  (6.2 s, 15f crossfade)
 *  S6 CTA           795  → 900  (3.5 s, 15f crossfade)
 *
 * Scales from a 1920×1080 base canvas to any target resolution (e.g. 2560×1440 2K).
 * All scene pixel values are authored at 1920×1080; the wrapper scales them up uniformly.
 */
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { S1_LogoReveal }     from "./scenes/S1_LogoReveal";
import { S2_Tagline }        from "./scenes/S2_Tagline";
import { S3_Features }       from "./scenes/S3_Features";
import { S4_KnowledgeGraph } from "./scenes/S4_KnowledgeGraph";
import { S5_Stats }          from "./scenes/S5_Stats";
import { S6_CTA }            from "./scenes/S6_CTA";

const BASE_W = 1920;
const BASE_H = 1080;

export const IEduIntro: React.FC = () => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width / BASE_W, height / BASE_H);

  return (
    <AbsoluteFill
      style={{
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ── Background music (add bg-music.mp3 to intro-video/public/ to enable) ── */}
      {/* <Audio src={staticFile("bg-music.mp3")} volume={0.18} /> */}

      {/* ── Scene transition whoosh sounds (add whoosh.mp3 to intro-video/public/) ── */}
      {/* <Sequence from={80}  durationInFrames={20}><Audio src={staticFile("whoosh.mp3")} volume={0.6} /></Sequence> */}
      {/* <Sequence from={255} durationInFrames={20}><Audio src={staticFile("whoosh.mp3")} volume={0.6} /></Sequence> */}
      {/* <Sequence from={445} durationInFrames={20}><Audio src={staticFile("whoosh.mp3")} volume={0.6} /></Sequence> */}
      {/* <Sequence from={625} durationInFrames={20}><Audio src={staticFile("whoosh.mp3")} volume={0.6} /></Sequence> */}
      {/* <Sequence from={795} durationInFrames={20}><Audio src={staticFile("whoosh.mp3")} volume={0.6} /></Sequence> */}

      {/* ── 1920×1080 base canvas scaled to target resolution ── */}
      <div
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative",
          fontFamily:
            "'Segoe UI', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          WebkitFontSmoothing: "antialiased",
          overflow: "hidden",
        }}
      >
        <Sequence from={0}   durationInFrames={90} ><S1_LogoReveal /></Sequence>
        <Sequence from={80}  durationInFrames={190}><S2_Tagline /></Sequence>
        <Sequence from={255} durationInFrames={205}><S3_Features /></Sequence>
        <Sequence from={445} durationInFrames={195}><S4_KnowledgeGraph /></Sequence>
        <Sequence from={625} durationInFrames={185}><S5_Stats /></Sequence>
        <Sequence from={795} durationInFrames={105}><S6_CTA /></Sequence>
      </div>
    </AbsoluteFill>
  );
};
