"use client";
import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className = "",
  size = "md",
}: EmptyStateProps) {
  const pad = size === "sm" ? "py-8" : "py-14";
  const iconBox = size === "sm" ? "w-12 h-12" : "w-16 h-16";
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${pad} px-6 ${className}`}
    >
      {icon && (
        <div
          className={`${iconBox} rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4`}
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {body && (
        <p className="mt-1.5 text-sm text-slate-600 max-w-sm leading-relaxed">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
