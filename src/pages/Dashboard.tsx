import { motion } from "framer-motion";
import { Leaf, Bug, Droplets, IndianRupee, Activity, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useScanAnalytics } from "@/hooks/use-scan-analytics";
import { useI18n } from "@/components/I18nProvider";
import { useAuth } from "@/components/AuthProvider";

const Dashboard = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { todayLabel, todayScanned, totals } = useScanAnalytics();
  const stats = useMemo(
    () => [
      { icon: Leaf, label: t("dashboard.plantsScanned"), value: totals.scanned.toLocaleString(), trend: t("dashboard.checkedOn", { count: todayScanned, day: todayLabel }), color: "text-primary" },
      {
        icon: Bug,
        label: t("dashboard.infectedFound"),
        value: totals.infected.toLocaleString(),
        trend: totals.scanned > 0 ? t("dashboard.infectionRate", { rate: ((totals.infected / totals.scanned) * 100).toFixed(1) }) : t("dashboard.noScans"),
        color: "text-destructive",
      },
      { icon: Droplets, label: t("dashboard.sprayEvents"), value: totals.sprayEvents.toLocaleString(), trend: t("dashboard.triggeredPositive"), color: "text-blue-500" },
      {
        icon: IndianRupee,
        label: "Money Saved",
        value: `₹${totals.moneySavedINR.toLocaleString("en-IN")}`,
        trend: `${totals.moneySavedLitres}L pesticide not used · ${totals.pesticideSaved}% saved`,
        color: "text-primary",
      },
    ],
    [t, todayLabel, todayScanned, totals],
  );

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold">
          {user?.name ? `Welcome back, ${user.name} 👋` : t("pages.dashboardTitle")}
        </h1>
        <p className="text-muted-foreground">{t("pages.dashboardDesc")}</p>
      </div>

      {/* money saved highlight */}
      {totals.moneySavedINR > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/10 px-6 py-4"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20">
            <IndianRupee className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("moneySaved.title")}</p>
            <p className="text-2xl font-bold text-primary">₹{totals.moneySavedINR.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">{totals.moneySavedLitres}L {t("moneySaved.subtitle")}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xs font-medium text-primary">{s.trend}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("pages.systemStatus")}</h3>
              <p className="text-xs text-muted-foreground">{t("pages.allOperational")}</p>
            </div>
          </div>
          <div className="space-y-2">
            {["Camera Module", "AI Model (CNN)", "Decision Engine", "Spray Controller"].map((mod) => (
              <div key={mod} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
                <span>{mod}</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {t("pages.online")}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("pages.quickActions")}</h3>
              <p className="text-xs text-muted-foreground">{t("pages.jumpToFeatures")}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Link
              to="/detection"
              className="block w-full rounded-xl bg-primary px-4 py-3 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("pages.startLiveDetection")}
            </Link>
            <Link
              to="/analytics"
              className="block w-full rounded-xl bg-muted px-4 py-3 text-center font-semibold transition-colors hover:bg-muted/70"
            >
              {t("pages.viewAnalytics")}
            </Link>
            <Link
              to="/system"
              className="block w-full rounded-xl bg-muted px-4 py-3 text-center font-semibold transition-colors hover:bg-muted/70"
            >
              {t("pages.systemArchitecture")}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
