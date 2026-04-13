import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Language } from "@/i18n";

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const STORAGE_KEY = "agrispray-language";

const I18nContext = createContext<I18nContextValue | null>(null);

const resolvePath = (language: Language, key: string): string => {
  const value = key.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object" && segment in acc) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, translations[language]);

  return typeof value === "string" ? value : key;
};

const interpolate = (template: string, vars?: Record<string, string | number>) => {
  if (!vars) return template;

  return template.replace(/\{\{(.*?)\}\}/g, (_, token) => {
    const trimmed = String(token).trim();
    const value = vars[trimmed];
    return value === undefined ? "" : String(value);
  });
};

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && stored in translations ? (stored as Language) : "en";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = language;
    document.documentElement.dir = ["ks", "sd", "ur"].includes(language) ? "rtl" : "ltr";
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key, vars) => interpolate(resolvePath(language, key), vars),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};
