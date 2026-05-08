"use client";
import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

export function Card({
  interactive = false,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  const Comp = Tag as any;
  return (
    <Comp
      className={`duo-card ${interactive ? "duo-card--interactive" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  intent?: "correct" | "wrong" | "streak" | "info";
}

export function Chip({ intent = "info", className = "", children, ...rest }: ChipProps) {
  return (
    <span className={`duo-chip duo-chip--${intent} ${className}`} {...rest}>
      {children}
    </span>
  );
}

interface ProgressProps {
  value: number;   // 0..100
  className?: string;
}

export function Progress({ value, className = "" }: ProgressProps) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`duo-progress ${className}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="duo-progress__fill" style={{ width: `${v}%` }} />
    </div>
  );
}
