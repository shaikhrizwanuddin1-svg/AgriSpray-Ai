import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  Download,
  FileText,
  Mic,
  MicOff,
  Radar,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/components/I18nProvider";
import { useRecentScans } from "@/hooks/use-recent-scans";
import type { WeatherSummary } from "@/hooks/use-weather";
import type { CropIntelligence, CropProfile } from "@/lib/agriculture-knowledge";
import {
  canUseFarmBackend,
  generateFarmPdfOnServer,
  runFarmCommandOnServer,
} from "@/lib/farm-api";
import type { DetectionResult } from "@/lib/detection-types";
import {
  commandSuggestions,
  runFarmCommand,
  type CommandResponse,
  type CommandTab,
} from "@/lib/farm-command-engine";
import type { ScanAnalyticsSummary } from "@/lib/scan-history";
import type { CropStage, SmartFarmAdvisor } from "@/lib/smart-farm-advisor";

type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => RecognitionInstance;

type FarmCommandCenterProps = {
  result: DetectionResult | null;
  selectedCrop: CropProfile | null;
  weather: WeatherSummary | null;
  intelligence: CropIntelligence;
  advisor: SmartFarmAdvisor;
  analytics: ScanAnalyticsSummary;
  cropStage: CropStage;
  onTabChange: (tab: CommandTab) => void;
};

const speechLocales: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  as: "as-IN",
  bn: "bn-IN",
  brx: "hi-IN",
  doi: "hi-IN",
  gu: "gu-IN",
  kn: "kn-IN",
  ks: "ur-IN",
  kok: "hi-IN",
  mai: "hi-IN",
  ml: "ml-IN",
  mni: "bn-IN",
  ne: "ne-NP",
  or: "or-IN",
  pa: "pa-IN",
  sa: "hi-IN",
  sat: "hi-IN",
  sd: "sd-IN",
  ta: "ta-IN",
  te: "te-IN",
  ur: "ur-IN",
};

const toneClass = {
  neutral: "border-border/70 bg-background/70 text-foreground",
  good: "border-primary/20 bg-primary/10 text-primary",
  watch: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
} as const;

const tabLabelKeys: Record<CommandTab, string> = {
  dashboard: "smartFarm.tabs.dashboard",
  precision: "smartFarm.tabs.precision",
  market: "smartFarm.tabs.market",
  assistant: "smartFarm.tabs.assistant",
};

const responseTitleKeys: Record<string, string> = {
  fullReport: "smartFarm.commandCenter.responseTitles.fullReport",
  futureRisk: "smartFarm.commandCenter.responseTitles.futureRisk",
  optimizePesticide: "smartFarm.commandCenter.responseTitles.optimizePesticide",
  profitAnalysis: "smartFarm.commandCenter.responseTitles.profitAnalysis",
  recommendCrop: "smartFarm.commandCenter.responseTitles.recommendCrop",
  takeAction: "smartFarm.commandCenter.responseTitles.takeAction",
  scheduleSpray: "smartFarm.commandCenter.responseTitles.scheduleSpray",
  reduceCost: "smartFarm.commandCenter.responseTitles.reduceCost",
  farmHealth: "smartFarm.commandCenter.responseTitles.farmHealth",
  highRiskAreas: "smartFarm.commandCenter.responseTitles.highRiskAreas",
  compareScans: "smartFarm.commandCenter.responseTitles.compareScans",
  simulateDrone: "smartFarm.commandCenter.responseTitles.simulateDrone",
  simulateDiseaseSpread: "smartFarm.commandCenter.responseTitles.simulateDiseaseSpread",
  treatmentImpact: "smartFarm.commandCenter.responseTitles.treatmentImpact",
  noTreatment: "smartFarm.commandCenter.responseTitles.noTreatment",
  predictYield: "smartFarm.commandCenter.responseTitles.predictYield",
  fullAnalysis: "smartFarm.commandCenter.responseTitles.fullAnalysis",
  emergency: "smartFarm.commandCenter.responseTitles.emergency",
  reportPdf: "smartFarm.commandCenter.responseTitles.reportPdf",
  exportData: "smartFarm.commandCenter.responseTitles.exportData",
  plantixComparison: "smartFarm.commandCenter.responseTitles.plantixComparison",
};

const metricLabelKeys: Record<string, string> = {
  Crop: "smartFarm.commandCenter.metricLabels.crop",
  Diagnosis: "smartFarm.commandCenter.metricLabels.diagnosis",
  "Health score": "smartFarm.commandCenter.metricLabels.healthScore",
  "Risk score": "smartFarm.commandCenter.metricLabels.riskScore",
  "Offline sync queue": "smartFarm.commandCenter.metricLabels.offlineSyncQueue",
  "Estimated savings": "smartFarm.commandCenter.metricLabels.estimatedSavings",
  "Average confidence": "smartFarm.commandCenter.metricLabels.averageConfidence",
  "Infected scans": "smartFarm.commandCenter.metricLabels.infectedScans",
  "Current input cost": "smartFarm.commandCenter.metricLabels.currentInputCost",
  "Optimized cost": "smartFarm.commandCenter.metricLabels.optimizedCost",
  "Expected savings": "smartFarm.commandCenter.metricLabels.expectedSavings",
  "Revenue window": "smartFarm.commandCenter.metricLabels.revenueWindow",
  "Predicted yield": "smartFarm.commandCenter.metricLabels.predictedYield",
  "Drone status": "smartFarm.commandCenter.metricLabels.droneStatus",
  "Target zones": "smartFarm.commandCenter.metricLabels.targetZones",
  "Spray volume": "smartFarm.commandCenter.metricLabels.sprayVolume",
  Weather: "smartFarm.commandCenter.metricLabels.weather",
  "Pending sync": "smartFarm.commandCenter.metricLabels.pendingSync",
  "Hotspot count": "smartFarm.commandCenter.metricLabels.hotspotCount",
  "Affected area": "smartFarm.commandCenter.metricLabels.affectedArea",
  "Mission status": "smartFarm.commandCenter.metricLabels.missionStatus",
  Coverage: "smartFarm.commandCenter.metricLabels.coverage",
  "Current risk": "smartFarm.commandCenter.metricLabels.currentRisk",
  "Untreated day 5": "smartFarm.commandCenter.metricLabels.untreatedDay5",
  "Expected health recovery": "smartFarm.commandCenter.metricLabels.expectedHealthRecovery",
  "Risk after treatment": "smartFarm.commandCenter.metricLabels.riskAfterTreatment",
  "Yield at risk": "smartFarm.commandCenter.metricLabels.yieldAtRisk",
  "Potential price hit": "smartFarm.commandCenter.metricLabels.potentialPriceHit",
  Priority: "smartFarm.commandCenter.metricLabels.priority",
  "Response window": "smartFarm.commandCenter.metricLabels.responseWindow",
  "Pitch angle": "smartFarm.commandCenter.metricLabels.pitchAngle",
  "Judge wow factor": "smartFarm.commandCenter.metricLabels.judgeWowFactor",
};

const tableTitleKeys: Record<string, string> = {
  "Recent scan timeline": "smartFarm.commandCenter.tableTitles.recentScans",
  "Positioning table": "smartFarm.commandCenter.tableTitles.positioning",
  "Top crop options": "smartFarm.commandCenter.tableTitles.topCrops",
};

const tableColumnKeys: Record<string, string> = {
  Scan: "smartFarm.commandCenter.tableColumns.scan",
  Disease: "smartFarm.commandCenter.tableColumns.disease",
  Confidence: "smartFarm.commandCenter.tableColumns.confidence",
  Spray: "smartFarm.commandCenter.tableColumns.spray",
  Dimension: "smartFarm.commandCenter.tableColumns.dimension",
  "Your solution": "smartFarm.commandCenter.tableColumns.yourSolution",
  "Benchmark app": "smartFarm.commandCenter.tableColumns.benchmark",
  Crop: "smartFarm.commandCenter.tableColumns.crop",
  "Fit score": "smartFarm.commandCenter.tableColumns.fitScore",
  "Why it fits": "smartFarm.commandCenter.tableColumns.whyItFits",
};

const chartLabelKeys: Record<string, string> = {
  "Day 1": "smartFarm.commandCenter.chartLabels.day1",
  "Day 2": "smartFarm.commandCenter.chartLabels.day2",
  "Day 3": "smartFarm.commandCenter.chartLabels.day3",
  "Day 4": "smartFarm.commandCenter.chartLabels.day4",
  "Day 5": "smartFarm.commandCenter.chartLabels.day5",
  "Day 6": "smartFarm.commandCenter.chartLabels.day6",
};

const suggestionLabelKeys: Record<string, string> = {
  "Full report": "smartFarm.commandCenter.suggestionLabels.fullReport",
  "Future risk": "smartFarm.commandCenter.suggestionLabels.futureRisk",
  "Optimize spray": "smartFarm.commandCenter.suggestionLabels.optimizeSpray",
  Profit: "smartFarm.commandCenter.suggestionLabels.profit",
  "Crop AI": "smartFarm.commandCenter.suggestionLabels.cropAI",
  "Take action": "smartFarm.commandCenter.suggestionLabels.takeAction",
  "Spray tomorrow": "smartFarm.commandCenter.suggestionLabels.sprayTomorrow",
  "Farm health": "smartFarm.commandCenter.suggestionLabels.farmHealth",
  "High-risk map": "smartFarm.commandCenter.suggestionLabels.highRiskMap",
  "Compare scans": "smartFarm.commandCenter.suggestionLabels.compareScans",
  "Drone sim": "smartFarm.commandCenter.suggestionLabels.droneSim",
  "Spread sim": "smartFarm.commandCenter.suggestionLabels.spreadSim",
  "No treatment": "smartFarm.commandCenter.suggestionLabels.noTreatment",
  Yield: "smartFarm.commandCenter.suggestionLabels.yield",
  Emergency: "smartFarm.commandCenter.suggestionLabels.emergency",
  Export: "smartFarm.commandCenter.suggestionLabels.export",
  "Plantix pitch": "smartFarm.commandCenter.suggestionLabels.plantixPitch",
  Marathi: "smartFarm.commandCenter.suggestionLabels.marathi",
  Hinglish: "smartFarm.commandCenter.suggestionLabels.hinglish",
};

const FarmCommandCenter = ({
  result,
  selectedCrop,
  weather,
  intelligence,
  advisor,
  analytics,
  cropStage,
  onTabChange,
}: FarmCommandCenterProps) => {
  const { language, t } = useI18n();
  const backendEnabled = canUseFarmBackend();
  const recentScans = useRecentScans(6);
  const [command, setCommand] = useState("Run full farm analysis");
  const [lastExecutedCommand, setLastExecutedCommand] = useState("Run full farm analysis");
  const [response, setResponse] = useState<CommandResponse | null>(null);
  const [responseSource, setResponseSource] = useState<"local" | "backend">("local");
  const [commandBusy, setCommandBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const dataContext = useMemo(
    () => ({
      crop: selectedCrop,
      intelligence,
      result,
      advisor,
      weather,
      analytics,
      cropStage,
      recentScans,
    }),
    [advisor, analytics, cropStage, intelligence, recentScans, result, selectedCrop, weather],
  );

  const executeCommand = useCallback(async (finalCommand: string) => {
    setCommand(finalCommand);
    setCommandBusy(true);

    try {
      const nextResponse = backendEnabled
        ? await runFarmCommandOnServer({
            command: finalCommand,
            context: dataContext,
          })
        : runFarmCommand({
            ...dataContext,
            command: finalCommand,
          });

      setResponseSource(backendEnabled ? "backend" : "local");
      startTransition(() => setResponse(nextResponse));
      onTabChange(nextResponse.recommendedTab);
    } catch {
      const fallback = runFarmCommand({
        ...dataContext,
        command: finalCommand,
      });
      setResponseSource("local");
      startTransition(() => setResponse(fallback));
      onTabChange(fallback.recommendedTab);
    } finally {
      setCommandBusy(false);
    }
  }, [backendEnabled, dataContext, onTabChange]);

  useEffect(() => {
    void executeCommand(lastExecutedCommand);
  }, [dataContext, executeCommand, lastExecutedCommand]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocales[language] ?? "en-IN";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const handleListen = useCallback(() => {
    if (typeof window === "undefined") return;
    const recognitionWindow = window as Window & {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const Recognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = speechLocales[language] ?? "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (!transcript) return;
      setCommand(transcript);
      setLastExecutedCommand(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }, [language]);

  const handleDownload = useCallback(() => {
    if (!response?.exportData || typeof window === "undefined") return;
    const blob = new Blob([response.exportData.data], { type: response.exportData.mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = response.exportData.filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [response]);

  const handlePrint = useCallback(async () => {
    if (!response || typeof window === "undefined") return;

    if (backendEnabled) {
      setPdfBusy(true);
      try {
        const blob = await generateFarmPdfOnServer({ response });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        // sanitize filename — only allow safe characters
        const safeName = response.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        link.href = url;
        link.download = `${safeName || "farm-report"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      } finally {
        setPdfBusy(false);
      }
    }

    // sanitize printHtml before writing to new window
    if (!response.exportData?.printHtml) return;
    const safeHtml = response.exportData.printHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/on\w+\s*=/gi, "data-removed=");
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=980,height=760");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(safeHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [backendEnabled, response]);

  const translate = useCallback((key: string | undefined, fallback: string) => {
    if (!key) return fallback;
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  }, [t]);

  const translatedTitle = response
    ? translate(responseTitleKeys[response.intent], response.title)
    : "";
  const translatedStatus = response
    ? translate(`smartFarm.commandCenter.statusLabels.${response.status}`, response.status)
    : "";
  const translatedTab = response
    ? translate(tabLabelKeys[response.recommendedTab], response.recommendedTab)
    : "";
  const translatedSource = translate(
    `smartFarm.commandCenter.responseSource.${responseSource}`,
    responseSource,
  );
  const chartData = useMemo(
    () =>
      response?.series?.points.map((point) => ({
        ...point,
        label: translate(chartLabelKeys[point.label], point.label),
      })) ?? [],
    [response?.series?.points, translate],
  );

  const hasSecondarySeries = Boolean(response?.series?.points.some((point) => typeof point.secondary === "number"));

  return (
    <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <TerminalSquare className="h-3.5 w-3.5" />
            {t("smartFarm.commandCenter.badge")}
          </div>
          <h3 className="mt-3 text-2xl font-bold">{t("smartFarm.commandCenter.title")}</h3>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {t("smartFarm.commandCenter.description")}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm">
          <p className="font-semibold">{t("smartFarm.commandCenter.demoMode")}</p>
          <p className="mt-1 text-muted-foreground">{t("smartFarm.commandCenter.demoDescription")}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-primary">
            {backendEnabled ? t("smartFarm.commandCenter.backendActive") : t("smartFarm.commandCenter.localFallback")}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-border/70 bg-background/80 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={t("smartFarm.commandCenter.placeholder")}
            className="min-h-24 flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <div className="flex flex-col gap-2 lg:w-60">
            <button
              type="button"
              onClick={() => {
                if (command === lastExecutedCommand) {
                  void executeCommand(command);
                  return;
                }
                setLastExecutedCommand(command);
              }}
              disabled={commandBusy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              {commandBusy ? t("smartFarm.commandCenter.running") : t("smartFarm.commandCenter.runCommand")}
            </button>
            <button
              type="button"
              onClick={handleListen}
              disabled={listening}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? t("smartFarm.listening") : t("smartFarm.commandCenter.useVoice")}
            </button>
            <button
              type="button"
              onClick={() => speak(response?.speakText ?? response?.summary ?? "")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            >
              <Bot className="h-4 w-4" />
              {speaking ? "Speaking..." : "Speak reply"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {commandSuggestions.map((suggestion) => (
            <button
              key={suggestion.command}
              type="button"
              onClick={() => {
                setCommand(suggestion.command);
                if (suggestion.command === lastExecutedCommand) {
                  void executeCommand(suggestion.command);
                  return;
                }
                setLastExecutedCommand(suggestion.command);
              }}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
            >
              {translate(suggestionLabelKeys[suggestion.label], suggestion.label)}
            </button>
          ))}
        </div>
      </div>

      {response ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{translatedStatus}</p>
                  <h4 className="mt-2 text-xl font-bold">{translatedTitle}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{response.summary}</p>
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {t("smartFarm.commandCenter.opens", { tab: translatedTab, source: translatedSource })}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {response.metrics.map((metric) => (
                  <div key={`${response.title}-${metric.label}`} className={`rounded-2xl border p-4 ${toneClass[metric.tone ?? "neutral"]}`}>
                    <p className="text-sm opacity-80">{translate(metricLabelKeys[metric.label], metric.label)}</p>
                    <p className="mt-2 text-xl font-bold">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <BrainCircuit className="h-4 w-4 text-primary" />
                {t("smartFarm.commandCenter.actionEngine")}
              </div>
              <div className="space-y-3">
                {response.actions.map((action) => (
                  <div key={`${action.title}-${action.timing}`} className={`rounded-2xl border p-4 ${toneClass[action.tone ?? "neutral"]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{action.title}</p>
                      <span className="rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                        {action.timing}
                      </span>
                    </div>
                    <p className="mt-2 text-sm opacity-90">{action.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {response.series ? (
              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Radar className="h-4 w-4 text-primary" />
                  {response.series.title}
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    {response.series.mode === "line" ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="primary" name={response.series.primaryLabel} stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
                        {hasSecondarySeries ? (
                          <Line type="monotone" dataKey="secondary" name={response.series.secondaryLabel ?? "Secondary"} stroke="#f97316" strokeWidth={2.5} dot={false} />
                        ) : null}
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="primary" name={response.series.primaryLabel} fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                        {hasSecondarySeries ? (
                          <Bar dataKey="secondary" name={response.series.secondaryLabel ?? "Secondary"} fill="#f97316" radius={[8, 8, 0, 0]} />
                        ) : null}
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("smartFarm.commandCenter.commandInsights")}
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
                {t("smartFarm.commandCenter.recentScansLoaded", { count: recentScans.length })}
              </div>
              {response.exportData ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    <Download className="h-4 w-4" />
                    {t("smartFarm.commandCenter.exportJson")}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={pdfBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    <FileText className="h-4 w-4" />
                    {pdfBusy
                      ? t("smartFarm.commandCenter.preparingPdf")
                      : backendEnabled
                        ? t("smartFarm.commandCenter.downloadServerPdf")
                        : t("smartFarm.commandCenter.printPdf")}
                  </button>
                </div>
              ) : null}
            </div>

            {response.heatmap?.length ? (
              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Radar className="h-4 w-4 text-primary" />
                  {t("smartFarm.commandCenter.hotspotMap")}
                </div>
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 dark:from-emerald-950/20 dark:via-zinc-900 dark:to-amber-950/20">
                  {response.heatmap.map((cell) => (
                    <div
                      key={cell.id}
                      className="absolute border-2 border-destructive/80 bg-destructive/15"
                      style={{
                        left: `${cell.left}%`,
                        top: `${cell.top}%`,
                        width: `${cell.width}%`,
                        height: `${cell.height}%`,
                      }}
                    >
                      <span className="absolute left-1 top-1 rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold">
                        {cell.severity}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {response.heatmap.map((cell) => (
                    <div key={`${cell.id}-label`} className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                      <p className="font-semibold">{cell.label}</p>
                      <p className="mt-1 text-muted-foreground">{cell.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {response.table ? (
              <div className="rounded-3xl border border-border/70 bg-background/80 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Bot className="h-4 w-4 text-primary" />
                  {translate(tableTitleKeys[response.table.title], response.table.title)}
                </div>
                <div className="overflow-x-auto rounded-2xl border border-border/70">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {response.table.columns.map((column) => (
                          <th key={column} className="px-4 py-3 text-left font-semibold">
                            {translate(tableColumnKeys[column], column)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {response.table.rows.map((row, rowIndex) => (
                        <tr key={`${response.table.title}-${rowIndex}`} className="border-t border-border/70">
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 align-top text-muted-foreground">
                              {String(cell).replace(/[<>"'&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;" }[c] ?? c))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FarmCommandCenter;
