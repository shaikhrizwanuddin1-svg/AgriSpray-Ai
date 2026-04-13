import DashboardSection from "@/components/DashboardSection";
import { useI18n } from "@/components/I18nProvider";

const Analytics = () => {
  const { t } = useI18n();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">{t("pages.analyticsTitle")}</h1>
        <p className="text-muted-foreground">{t("pages.analyticsDesc")}</p>
      </div>
      <DashboardSection />
    </div>
  );
};

export default Analytics;
