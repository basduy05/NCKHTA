// ─── iEdu Design Tokens ────────────────────────────────────────────────────
// Pulled directly from frontend/app/globals.css

export const C = {
  // ── Brand (iEdu primary — blue-600)
  brand:       "#2563EB",
  brandDark:   "#1E40AF",
  brandLight:  "#DBEAFE",
  brandSoft:   "#EFF6FF",

  // ── Gradient partner (cyan-500)
  cyan:        "#06B6D4",
  cyanDark:    "#0891B2",
  cyanLight:   "#CFFAFE",

  // ── Duolingo semantic palette
  green:       "#58CC02",   // correct / primary action
  greenDark:   "#46A302",
  greenSoft:   "#D7FFB8",
  amber:       "#FF9600",   // streak / warn
  amberDark:   "#E08600",
  info:        "#1CB0F6",   // sky / info
  infoDark:    "#1899D6",
  purple:      "#CE82FF",   // premium / level-up
  purpleDark:  "#A560E8",
  emerald:     "#10B981",   // accent / success secondary
  red:         "#EF4444",

  // ── Surfaces
  white:       "#FFFFFF",
  bg:          "#F8FAFC",   // slate-50
  surface1:    "#F1F5F9",   // slate-100

  // ── Dark backgrounds (cinematic scenes)
  dark:        "#060E1F",   // deep navy
  darkCard:    "#0F1F3D",
  darkMid:     "#0D1B38",

  // ── Text / ink
  ink1:        "#0F172A",   // slate-900
  ink2:        "#475569",   // slate-600
  ink3:        "#94A3B8",   // slate-400
  line:        "#E2E8F0",   // slate-200
};

// ─── Spring configs ─────────────────────────────────────────────────────────
export const SPR = {
  gentle: { damping: 20, stiffness: 80,  mass: 1.0 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  stiff:  { damping: 30, stiffness: 400, mass: 0.6 },
  slow:   { damping: 25, stiffness: 40,  mass: 1.5 },
  snappy: { damping: 18, stiffness: 320, mass: 0.7 },
  wobbly: { damping:  8, stiffness: 180, mass: 1.0 },
};

// ─── Motion-blur helper ──────────────────────────────────────────────────────
// Pass the current and previous animated value (pixels) → returns CSS filter.
// intensity: multiplier; max: cap in px.
export function velBlur(
  curr: number,
  prev: number,
  intensity = 0.35,
  max = 22,
): string {
  const v = Math.abs(curr - prev);
  const px = Math.min(v * intensity, max);
  return px > 0.8 ? `blur(${px.toFixed(1)}px)` : "none";
}

// ─── Gradient strings ────────────────────────────────────────────────────────
export const GRAD = {
  brand:    `linear-gradient(135deg, ${C.brand} 0%, ${C.cyan} 100%)`,
  brandH:   `linear-gradient(90deg,  ${C.brand} 0%, ${C.cyan} 100%)`,
  heroSec:  `linear-gradient(135deg, ${C.brandSoft} 0%, #FFFFFF 50%, ${C.cyanLight} 100%)`,
  dark:     `linear-gradient(160deg, #0D1B38 0%, ${C.dark} 100%)`,
  darkBlue: `linear-gradient(135deg, #0A1628 0%, #0F2157 100%)`,
  green:    `linear-gradient(135deg, ${C.green} 0%, ${C.emerald} 100%)`,
};
