import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Leaf,
  Bug,
  Droplets,
  TrendingDown,
  CalendarDays,
  PieChart as PieChartIcon,
  Waves,
  Database,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useScanAnalytics } from "@/hooks/use-scan-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clearStoredData, getStorageModeLabel } from "@/lib/scan-api";
import { useI18n } from "@/components/I18nProvider";

const DashboardSection = () => {
  const { t } = useI18n();
  const { todayLabel, todayScanned, totals, weeklyData, pieData } = useScanAnalytics();
  const [clearing, setClearing] = useState(false);

  const stats = useMemo(
    () => [
      {
        icon: Leaf,
        label: t("dashboard.plantsScanned"),
        value: totals.scanned.toLocaleString(),
        trend: t("dashboard.checkedOn", { count: todayScanned, day: todayLabel }),
      },
      {
        icon: Bug,
        label: t("dashboard.infectedFound"),
        value: totals.infected.toLocaleString(),
        trend:
          totals.scanned > 0
            ? t("dashboard.infectionRate", { rate: ((totals.infected / totals.scanned) * 100).toFixed(1) })
            : t("dashboard.noScans"),
      },
      {
        icon: Droplets,
        label: t("dashboard.sprayEvents"),
        value: totals.sprayEvents.toLocaleString(),
        trend: t("dashboard.triggeredPositive"),
      },
      {
        icon: TrendingDown,
        label: t("dashboard.pesticideSaved"),
        value: `${totals.pesticideSaved}%`,
        trend: t("dashboard.comparedFull"),
      },
    ],
    [t, todayLabel, todayScanned, totals],
  );

  const storageLabel = getStorageModeLabel() === "PostgreSQL API" ? t("dashboard.storageApi") : t("dashboard.storageLocal");

  const handleClear = async () => {
    setClearing(true);
    await clearStoredData();
    setClearing(false);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/80 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Database className="h-3.5 w-3.5" />
            {t("dashboard.storageMode")}: {storageLabel}
          </div>
          <p className="text-sm text-muted-foreground">{t("dashboard.realDataText")}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={clearing}
          className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          {clearing ? t("dashboard.clearBusy") : t("dashboard.clear")}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <s.icon className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xs font-medium text-primary">{s.trend}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur"
      >
        <Tabs defaultValue="weekly" className="space-y-5">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="weekly" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("dashboard.weeklyFlow")}
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-2">
              <PieChartIcon className="h-4 w-4" />
              {t("dashboard.diseaseMix")}
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <Waves className="h-4 w-4" />
              {t("dashboard.liveSummary")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <div className="grid gap-6 lg:grid-cols-[1.8fr_0.9fr]">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
                <h3 className="mb-4 font-semibold">{t("dashboard.weeklyReport")}</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""} />
                    <Bar dataKey="scanned" fill="hsl(145, 63%, 32%)" radius={[6, 6, 0, 0]} name={t("dashboard.plantsScanned")} />
                    <Bar dataKey="infected" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} name={t("dashboard.infectedFound")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
                  <p className="text-sm font-semibold">{t("dashboard.todaysActivity")}</p>
                  <p className="mt-2 text-3xl font-bold">{todayScanned}</p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.validLeafScans", { day: todayLabel })}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
                  <p className="text-sm font-semibold">{t("dashboard.weeklyTrend")}</p>
                  <p className="mt-2 text-3xl font-bold">
                    {totals.scanned > 0 ? `${((totals.infected / totals.scanned) * 100).toFixed(1)}%` : "0%"}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("dashboard.last7days")}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="distribution">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
              <h3 className="mb-4 font-semibold">{t("dashboard.diseaseMix")}</h3>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={68} outerRadius={104} dataKey="value" stroke="none">
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                  {t("dashboard.realDataHint")}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: t("dashboard.detectionFlow"), value: t("dashboard.flowValue"), desc: t("dashboard.flowDesc") },
                { title: t("dashboard.realTimeSync"), value: t("dashboard.storedScans", { count: totals.scanned }), desc: t("dashboard.syncDesc") },
                { title: t("dashboard.qualityGuardrails"), value: t("dashboard.qualityValue"), desc: t("dashboard.qualityDesc") },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/70 bg-background/80 p-5">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-3 text-lg font-bold">{item.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default DashboardSection;
