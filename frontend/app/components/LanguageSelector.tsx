"use client";
import React, { useState, useRef, useEffect } from "react";
import { Globe, Languages, ChevronDown, Check } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { SupportedLocale } from "../config/translations";

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, locales, currentLocaleInfo } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] text-xs text-[var(--ink-2)] hover:border-slate-300 hover:text-[var(--ink-1)] transition cursor-pointer shadow-2xs group"
        title="Chọn ngôn ngữ / Language / ភាសា"
      >
        {/* Prominent Language Icon requested by user */}
        <Languages size={15} className="text-[var(--brand)] shrink-0 group-hover:scale-110 transition-transform" />
        <span className="text-sm leading-none">{currentLocaleInfo.flag}</span>
        {!compact && (
          <span className="font-bold hidden sm:inline uppercase text-[11px] tracking-wide text-[var(--ink-1)]">
            {currentLocaleInfo.code}
          </span>
        )}
        <ChevronDown size={12} className={`text-[var(--ink-3)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-[var(--surface-1)] border border-[var(--line)] rounded-xl shadow-[var(--sh-md)] z-50 overflow-hidden py-1 animate-duo-pop">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--ink-3)] uppercase tracking-wider border-b border-[var(--line)] flex items-center gap-1.5">
            <Globe size={11} className="text-[var(--brand)]" />
            <span>Ngôn ngữ / Language</span>
          </div>
          {locales.map((item) => {
            const isSelected = item.code === locale;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLocale(item.code as SupportedLocale);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition ${
                  isSelected
                    ? "bg-blue-50 text-[var(--brand)] font-bold"
                    : "text-[var(--ink-2)] hover:bg-[var(--surface-3)] font-medium"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{item.flag}</span>
                  <span>{item.label}</span>
                </span>
                {isSelected && <Check size={14} className="text-[var(--brand)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
