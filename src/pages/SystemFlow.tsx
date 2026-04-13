import SystemFlowSection from "@/components/SystemFlowSection";
import { useI18n } from "@/components/I18nProvider";

const SystemFlow = () => {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">{t("pages.systemTitle")}</h1>
        <p className="text-muted-foreground">{t("pages.systemDesc")}</p>
      </div>
      <SystemFlowSection />
    </div>
  );
};

export default SystemFlow;
