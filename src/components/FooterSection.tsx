import { Leaf } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

const FooterSection = () => {
  const { t } = useI18n();

  return (
    <footer className="bg-card py-10 border-t border-border">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          <span className="font-bold">{t("app.brand")}</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">{t("footer.text")}</p>
        <p className="text-xs text-muted-foreground">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
};

export default FooterSection;
