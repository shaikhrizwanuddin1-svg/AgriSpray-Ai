import TechStackSection from "@/components/TechStackSection";
import FooterSection from "@/components/FooterSection";
import { useI18n } from "@/components/I18nProvider";

const TechStack = () => {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">{t("pages.techTitle")}</h1>
        <p className="text-muted-foreground">{t("pages.techDesc")}</p>
      </div>
      <TechStackSection />
      <FooterSection />
    </div>
  );
};

export default TechStack;
