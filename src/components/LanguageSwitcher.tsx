import { Languages } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { languageOptions, type Language } from "@/i18n";

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
      <Languages className="h-3.5 w-3.5 text-primary" />
      <span className="hidden sm:inline">{t("app.language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        aria-label={t("app.language")}
        className="max-w-[11rem] bg-transparent text-sm font-medium text-foreground outline-none"
      >
        {languageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
