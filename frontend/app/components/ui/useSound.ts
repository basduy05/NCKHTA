"use client";
/**
 * Web Audio API sound effects for the Duolingo-playful UI.
 *
 * Synthesised tones — no asset files. SSR-safe; AudioContext is
 * lazily created on first user gesture (browsers block autoplay
 * before that).
 *
 * Usage:
 *   const sfx = useSound();
 *   sfx.correct();
 *   sfx.wrong();
 *   sfx.click();
 *   sfx.levelUp();
 */
import { useCallback, useEffect, useRef } from "react";

type AnyAudioContext = AudioContext;

let _ctx: AnyAudioContext | null = null;
let _muted: boolean = false;

if (typeof window !== "undefined") {
  try {
    const stored = window.localStorage.getItem("duo-sfx-muted");
    _muted = stored === "1";
  } catch {}
}

function ensureCtx(): AnyAudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const Ctor: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    _ctx = new Ctor();
  } catch {
    return null;
  }
  return _ctx;
}

interface ToneSpec {
  freq: number;          // Hz
  durationMs: number;
  type?: OscillatorType; // default sine
  gain?: number;         // peak gain 0..1, default 0.18
  attackMs?: number;
  releaseMs?: number;
  sweepTo?: number;      // optional frequency sweep target
}

function playTone(spec: ToneSpec, startOffsetMs = 0) {
  const ctx = ensureCtx();
  if (!ctx || _muted) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const t0 = ctx.currentTime + startOffsetMs / 1000;
  const dur = spec.durationMs / 1000;
  const attack = (spec.attackMs ?? 8) / 1000;
  const release = (spec.releaseMs ?? 80) / 1000;
  const peak = spec.gain ?? 0.18;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = spec.type ?? "sine";
  osc.frequency.setValueAtTime(spec.freq, t0);
  if (spec.sweepTo) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, spec.sweepTo),
      t0 + dur
    );
  }

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  gain.gain.setValueAtTime(peak, t0 + Math.max(attack, dur - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playSequence(tones: ToneSpec[]) {
  let offset = 0;
  for (const t of tones) {
    playTone(t, offset);
    offset += t.durationMs;
  }
}

export interface SoundApi {
  click: () => void;
  correct: () => void;
  wrong: () => void;
  streak: () => void;
  levelUp: () => void;
  finish: () => void;
  tick: () => void;
  setMuted: (m: boolean) => void;
  isMuted: () => boolean;
}

/**
 * Hook returning a stable SoundApi.
 *
 * The API itself never changes between renders, so it's safe to
 * include in dependency arrays.
 */
export function useSound(): SoundApi {
  const apiRef = useRef<SoundApi | null>(null);

  // Resume the audio context on the first user gesture so subsequent
  // sfx calls are not silently blocked by autoplay policies.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const resume = () => {
      const c = ensureCtx();
      if (c && c.state === "suspended") c.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);

  if (!apiRef.current) {
    apiRef.current = {
      click: () =>
        playTone({ freq: 600, durationMs: 60, type: "triangle", gain: 0.08 }),
      correct: () =>
        playSequence([
          { freq: 660, durationMs: 110, type: "triangle", gain: 0.18 },
          { freq: 990, durationMs: 180, type: "triangle", gain: 0.2 },
        ]),
      wrong: () =>
        playSequence([
          { freq: 220, durationMs: 130, type: "square", gain: 0.14 },
          { freq: 165, durationMs: 200, type: "square", gain: 0.14 },
        ]),
      streak: () =>
        playSequence([
          { freq: 880, durationMs: 90, type: "triangle", gain: 0.16 },
          { freq: 1175, durationMs: 90, type: "triangle", gain: 0.16 },
          { freq: 1568, durationMs: 160, type: "triangle", gain: 0.18 },
        ]),
      levelUp: () =>
        playSequence([
          { freq: 523, durationMs: 110, type: "triangle", gain: 0.16 }, // C5
          { freq: 659, durationMs: 110, type: "triangle", gain: 0.16 }, // E5
          { freq: 784, durationMs: 110, type: "triangle", gain: 0.18 }, // G5
          { freq: 1047, durationMs: 260, type: "triangle", gain: 0.2 }, // C6
        ]),
      finish: () =>
        playSequence([
          { freq: 784, durationMs: 100, type: "triangle", gain: 0.16 },
          { freq: 988, durationMs: 100, type: "triangle", gain: 0.18 },
          { freq: 1319, durationMs: 220, type: "triangle", gain: 0.2 },
        ]),
      tick: () =>
        playTone({ freq: 1200, durationMs: 30, type: "square", gain: 0.05 }),
      setMuted: (m: boolean) => {
        _muted = m;
        try {
          if (typeof window !== "undefined")
            window.localStorage.setItem("duo-sfx-muted", m ? "1" : "0");
        } catch {}
      },
      isMuted: () => _muted,
    };
  }

  return apiRef.current;
}
