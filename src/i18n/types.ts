import en from "./locales/en";

export type TranslationSchema = typeof en;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type LanguageOption = {
  value: string;
  label: string;
};
