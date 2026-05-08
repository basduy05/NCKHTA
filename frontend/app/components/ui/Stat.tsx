"use client";
import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

type StatTone = "neutral" | "brand" | "accent" | "warn" | "danger";

interface StatProps {
  label: string;
  value: React.ReactNode;
  delta?: number;
  /** Suffix shown next to delta, e.g. "%" or "đ". */
  deltaSuffix?: string;
  icon?: React.ReactNode;
  tone?: StatTone;
  hint?: React.ReactNode;
  className?: string;
}

const toneIconBg: Record<StatTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  brand:   "bg-blue-50 text-blue-600",
  accent:  "bg-emerald-50 text-emerald-600",
  warn:    "bg-amber-50 text-amber-600",
  danger:  "bg-red-50 text-red-600",
};

export function Stat({
  label,
  value,
  delta,
  deltaSuffix = "%",
  icon,
  tone = "neutral",
  hint,
  className = "",
}: StatProps) {
  const showDelta = typeof delta === "number" && !Number.isNaN(delta);
  const positive = showDelta && delta! > 0;
  const negative = showDelta && delta! < 0;
  return (
    <div className={`app-card p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        {icon && (
          <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${toneIconBg[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl sm:text-[28px] font-bold tabular-nums tracking-tight text-slate-900">
          {value}
        </span>
        {showDelta && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              positive
                ? "text-emerald-600"
                : negative
                ? "text-red-600"
                : "text-slate-500"
            }`}
          >
            {positive && <ArrowUp size={12} />}
            {negative && <ArrowDown size={12} />}
            {Math.abs(delta!).toFixed(0)}
            {deltaSuffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
