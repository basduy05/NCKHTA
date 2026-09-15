"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { SupportedLocale, SUPPORTED_LOCALES, TRANSLATIONS, LocaleInfo } from "../config/translations";

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, defaultVal?: string) => string;
  localize: (multilingual?: string | Record<string, string> | null, defaultVal?: string) => string;
  locales: LocaleInfo[];
  currentLocaleInfo: LocaleInfo;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "iedu_locale_pref";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("vi");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
        if (saved && (saved === "vi" || saved === "en" || saved === "km")) {
          setLocaleState(saved);
        }
      } catch (e) {
        console.error("Failed to read locale preference", e);
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
      } catch (e) {
        console.error("Failed to persist locale preference", e);
      }
    }
  }, []);

  const t = useCallback(
    (key: string, defaultVal?: string): string => {
      const dict = TRANSLATIONS[locale] || TRANSLATIONS.vi;
      if (dict && dict[key]) {
        return dict[key];
      }
      // Fallback to Vietnamese dictionary
      if (TRANSLATIONS.vi && TRANSLATIONS.vi[key]) {
        return TRANSLATIONS.vi[key];
      }
      return defaultVal || key;
    },
    [locale]
  );

  const localize = useCallback(
    (multilingual?: string | Record<string, string> | null, defaultVal: string = ""): string => {
      if (!multilingual) return defaultVal;
      if (typeof multilingual === "string") return multilingual;
      return multilingual[locale] || multilingual.vi || multilingual.en || Object.values(multilingual)[0] || defaultVal;
    },
    [locale]
  );

  const currentLocaleInfo = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        localize,
        locales: SUPPORTED_LOCALES,
        currentLocaleInfo,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      locale: "vi",
      setLocale: () => {},
      t: (key: string, defaultVal?: string) => TRANSLATIONS.vi[key] || defaultVal || key,
      localize: (multilingual, defaultVal = "") => {
        if (!multilingual) return defaultVal;
        if (typeof multilingual === "string") return multilingual;
        return multilingual.vi || multilingual.en || defaultVal;
      },
      locales: SUPPORTED_LOCALES,
      currentLocaleInfo: SUPPORTED_LOCALES[0],
    };
  }
  return context;
}
