"use client";
import React from "react";

type SkeletonVariant = "line" | "card" | "avatar";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  /** Number of lines for variant='line' */
  lines?: number;
}

export function Skeleton({
  variant = "line",
  width,
  height,
  className = "",
  lines = 1,
}: SkeletonProps) {
  if (variant === "line") {
    if (lines > 1) {
      return (
        <div className={`flex flex-col gap-2 ${className}`}>
          {Array.from({ length: lines }).map((_, i) => (
            <span
              key={i}
              className="skeleton block h-3"
              style={{ width: i === lines - 1 ? "70%" : "100%" }}
            />
          ))}
        </div>
      );
    }
    return (
      <span
        className={`skeleton block h-3 ${className}`}
        style={{ width: width ?? "100%", height: height ?? undefined }}
      />
    );
  }
  if (variant === "avatar") {
    const s = typeof width === "number" ? width : 40;
    return (
      <span
        className={`skeleton inline-block rounded-full ${className}`}
        style={{ width: s, height: s }}
      />
    );
  }
  // card
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? 120,
        borderRadius: 20,
      }}
    />
  );
}
