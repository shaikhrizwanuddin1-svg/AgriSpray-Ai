import DetectionSimulator from "@/components/DetectionSimulator";
import { useI18n } from "@/components/I18nProvider";

const Detection = () => {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">{t("detectionPage.title")}</h1>
        <p className="text-muted-foreground">{t("detectionPage.description")}</p>
      </div>
      <DetectionSimulator />
    </div>
  );
};

export default Detection;
