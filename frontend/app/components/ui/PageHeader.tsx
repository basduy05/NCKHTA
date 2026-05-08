"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  icon,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-3 pb-5 mb-6 border-b border-slate-100 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500">
          {breadcrumbs.map((c, i) => {
            const last = i === breadcrumbs.length - 1;
            return (
              <React.Fragment key={i}>
                {c.href && !last ? (
                  <Link href={c.href} className="hover:text-slate-900 transition">
                    {c.label}
                  </Link>
                ) : (
                  <span className={last ? "text-slate-900 font-medium" : ""}>{c.label}</span>
                )}
                {!last && <ChevronRight size={12} className="text-slate-300" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-[28px] leading-tight font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </div>
    </header>
  );
}
