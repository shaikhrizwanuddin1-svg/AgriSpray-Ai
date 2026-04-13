import en from "./locales/en";
import hi from "./locales/hi";
import mr from "./locales/mr";
import { extraLocales } from "./locales/extra";
import type { DeepPartial, LanguageOption, TranslationSchema } from "./types";

const mergeTranslations = (base: TranslationSchema, partial?: DeepPartial<TranslationSchema>): TranslationSchema => {
  if (!partial) return base;

  const output = { ...base } as Record<string, unknown>;

  for (const [key, value] of Object.entries(partial)) {
    const baseValue = output[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      output[key] = mergeTranslations(
        baseValue as TranslationSchema,
        value as DeepPartial<TranslationSchema>,
      );
      continue;
    }
    output[key] = value;
  }

  return output as TranslationSchema;
};

export const translations = {
  en,
  hi: mergeTranslations(en, hi),
  mr: mergeTranslations(en, mr),
  as: mergeTranslations(en, extraLocales.as),
  bn: mergeTranslations(en, extraLocales.bn),
  brx: mergeTranslations(en, extraLocales.brx),
  doi: mergeTranslations(en, extraLocales.doi),
  gu: mergeTranslations(en, extraLocales.gu),
  kn: mergeTranslations(en, extraLocales.kn),
  ks: mergeTranslations(en, extraLocales.ks),
  kok: mergeTranslations(en, extraLocales.kok),
  mai: mergeTranslations(en, extraLocales.mai),
  ml: mergeTranslations(en, extraLocales.ml),
  mni: mergeTranslations(en, extraLocales.mni),
  ne: mergeTranslations(en, extraLocales.ne),
  or: mergeTranslations(en, extraLocales.or),
  pa: mergeTranslations(en, extraLocales.pa),
  sa: mergeTranslations(en, extraLocales.sa),
  sat: mergeTranslations(en, extraLocales.sat),
  sd: mergeTranslations(en, extraLocales.sd),
  ta: mergeTranslations(en, extraLocales.ta),
  te: mergeTranslations(en, extraLocales.te),
  ur: mergeTranslations(en, extraLocales.ur),
} as const;

export type Language = keyof typeof translations;

export const languageOptions: LanguageOption[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "mr", label: "मराठी" },
  { value: "as", label: "অসমীয়া" },
  { value: "bn", label: "বাংলা" },
  { value: "brx", label: "बड़ो" },
  { value: "doi", label: "डोगरी" },
  { value: "gu", label: "ગુજરાતી" },
  { value: "kn", label: "ಕನ್ನಡ" },
  { value: "ks", label: "کٲشُر" },
  { value: "kok", label: "कोंकणी" },
  { value: "mai", label: "मैथिली" },
  { value: "ml", label: "മലയാളം" },
  { value: "mni", label: "ꯃꯤꯇꯩꯂꯣꯟ" },
  { value: "ne", label: "नेपाली" },
  { value: "or", label: "ଓଡ଼ିଆ" },
  { value: "pa", label: "ਪੰਜਾਬੀ" },
  { value: "sa", label: "संस्कृत" },
  { value: "sat", label: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { value: "sd", label: "سنڌي" },
  { value: "ta", label: "தமிழ்" },
  { value: "te", label: "తెలుగు" },
  { value: "ur", label: "اردو" },
] as const satisfies LanguageOption[];
