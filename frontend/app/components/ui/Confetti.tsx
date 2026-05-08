"use client";
import React, { useEffect, useState } from "react";

const COLORS = ["#58CC02", "#1CB0F6", "#FF9600", "#CE82FF", "#FF4B4B", "#FFC800"];

interface ConfettiProps {
  trigger: number; // change value to fire
  count?: number;
  durationMs?: number;
}

interface Particle {
  id: number;
  left: number;
  tx: number;
  delay: number;
  color: string;
  size: number;
  duration: number;
}

export function Confetti({ trigger, count = 60, durationMs = 1800 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const next: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: trigger * 1000 + i,
      left: Math.random() * 100,
      tx: (Math.random() - 0.5) * 200,
      delay: Math.random() * 200,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      duration: durationMs * (0.7 + Math.random() * 0.6),
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), durationMs + 400);
    return () => clearTimeout(t);
  }, [trigger, count, durationMs]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            borderRadius: 2,
            // @ts-expect-error custom var
            "--tx": `${p.tx}px`,
            animation: `duo-confetti-fall ${p.duration}ms ${p.delay}ms ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
