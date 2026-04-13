import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CloudSun,
  Gauge,
  IndianRupee,
  Landmark,
  Leaf,
  MapPinned,
  Mic,
  MicOff,
  QrCode,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Store,
  Waves,
  WifiOff,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/components/I18nProvider";
import FarmCommandCenter from "@/components/detection/FarmCommandCenter";
import { useLiveMarketPrices } from "@/hooks/use-live-market-prices";
import { useScanAnalytics } from "@/hooks/use-scan-analytics";
import {
  buildCropIntelligence,
  type CropProfile,
} from "@/lib/agriculture-knowledge";
import type { DetectionResult } from "@/lib/detection-types";
import type { CommandTab } from "@/lib/farm-command-engine";
import {
  buildSmartFarmAdvisor,
  evaluatePesticideAuthenticity,
  type AdvisorStatus,
  type CounterfeitReasonCode,
  type CropStage,
} from "@/lib/smart-farm-advisor";
import type { WeatherSummary } from "@/hooks/use-weather";
import {
  getCompactMarketSubtitle,
  getCompactRouteLabel,
  getCompactSchemeSubtitle,
  getCropDisplayLabel,
  isCompactAgronomyLocale,
} from "@/lib/crop-intel-display";

type SmartFarmSuiteProps = {
  result: DetectionResult | null;
  selectedCrop: CropProfile | null;
  weather: WeatherSummary | null;
  coordinates: { lat: number; lon: number } | null;
};

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

const stageOptions: CropStage[] = ["seedling", "vegetative", "flowering", "harvest"];

const statusTone: Record<AdvisorStatus, string> = {
  optimal: "border-primary/20 bg-primary/10 text-primary",
  watch: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
};

const statusLabelKeys: Record<AdvisorStatus, string> = {
  optimal: "smartFarm.status.optimal",
  watch: "smartFarm.status.watch",
  critical: "smartFarm.status.critical",
};

const sensorLabelKeys: Record<string, string> = {
  soilMoisture: "smartFarm.sensors.soilMoisture",
  soilPh: "smartFarm.sensors.soilPh",
  soilTemp: "smartFarm.sensors.soilTemp",
  canopyWetness: "smartFarm.sensors.canopyWetness",
  infectionPressure: "smartFarm.sensors.infectionPressure",
};

const factorLabelKeys: Record<string, string> = {
  weather: "smartFarm.predictionFactors.weather",
  history: "smartFarm.predictionFactors.history",
  stage: "smartFarm.predictionFactors.stage",
  symptoms: "smartFarm.predictionFactors.symptoms",
};

const authenticityReasonKeys: Record<CounterfeitReasonCode, string> = {
  missingBatchCode: "smartFarm.authenticityReasons.missingBatchCode",
  weakBatchCode: "smartFarm.authenticityReasons.weakBatchCode",
  missingLicenseCode: "smartFarm.authenticityReasons.missingLicenseCode",
  weakLicenseCode: "smartFarm.authenticityReasons.weakLicenseCode",
  missingManufacturer: "smartFarm.authenticityReasons.missingManufacturer",
  missingSafetyInfo: "smartFarm.authenticityReasons.missingSafetyInfo",
  suspiciousClaims: "smartFarm.authenticityReasons.suspiciousClaims",
  traceabilityStrong: "smartFarm.authenticityReasons.traceabilityStrong",
  safetyInfoPresent: "smartFarm.authenticityReasons.safetyInfoPresent",
};

const recommendationReasonKeys: Record<string, string> = {
  weatherFit: "smartFarm.cropReasons.weatherFit",
  soilFit: "smartFarm.cropReasons.soilFit",
  marketFit: "smartFarm.cropReasons.marketFit",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const SmartFarmSuite = ({
  result,
  selectedCrop,
  weather,
  coordinates,
}: SmartFarmSuiteProps) => {
  const { language, t } = useI18n();
  const compactLocale = isCompactAgronomyLocale(language);
  const analytics = useScanAnalytics();
  const { data: liveMarketPrices, loading: marketPricesLoading } = useLiveMarketPrices(selectedCrop, weather?.locationName);
  const [activeTab, setActiveTab] = useState<CommandTab>("dashboard");
  const [cropStage, setCropStage] = useState<CropStage>("vegetative");
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [voiceQuestion, setVoiceQuestion] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [batchCode, setBatchCode] = useState("");
  const [licenseCode, setLicenseCode] = useState("");
  const [labelText, setLabelText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const intelligence = useMemo(
    () =>
      buildCropIntelligence({
        crop: selectedCrop,
        symptomClass: result?.disease ?? null,
        locationName: weather?.locationName,
        coordinates,
      }),
    [coordinates, result?.disease, selectedCrop, weather?.locationName],
  );

  const advisor = useMemo(
    () =>
      buildSmartFarmAdvisor({
        crop: selectedCrop,
        result,
        weather,
        analytics,
        online,
        cropStage,
      }),
    [analytics, cropStage, online, result, selectedCrop, weather],
  );

  const authenticity = useMemo(() => {
    if (!batchCode.trim() && !licenseCode.trim() && !labelText.trim()) return null;
    return evaluatePesticideAuthenticity({ batchCode, licenseCode, labelText });
  }, [batchCode, labelText, licenseCode]);

  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocales[language] ?? "en-IN";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const buildVoiceReply = useCallback((question: string) => {
    const normalized = question.toLowerCase();
    const cropLabel = selectedCrop ? getCropDisplayLabel(selectedCrop, language, t) : t("smartFarm.voice.noCrop");
    const diagnosis = result
      ? intelligence.primaryDisease?.name ?? result.disease
      : t("smartFarm.voice.noScan");
    const buyerRoute = intelligence.markets[0]?.title ?? t("cropIntel.nearbySelling");
    const scheme = intelligence.schemes[0]?.title ?? t("cropIntel.relatedSchemes");

    if (normalized.includes("market") || normalized.includes("sell") || normalized.includes("mandi")) {
      return t("smartFarm.voice.marketReply", { crop: cropLabel, route: buyerRoute });
    }
    if (normalized.includes("scheme") || normalized.includes("loan") || normalized.includes("subsidy")) {
      return t("smartFarm.voice.schemeReply", { scheme });
    }
    return t("smartFarm.voice.diagnosisReply", {
      crop: cropLabel,
      diagnosis,
      action: advisor.drone.status === "ready"
        ? t("smartFarm.drone.ready")
        : advisor.drone.status === "weather_blocked"
          ? t("smartFarm.drone.weatherBlocked")
          : t("smartFarm.drone.hold"),
    });
  }, [advisor.drone.status, intelligence.markets, intelligence.primaryDisease?.name, intelligence.schemes, language, result, selectedCrop, t]);

  const handleAsk = useCallback(() => {
    const reply = buildVoiceReply(voiceQuestion || t("smartFarm.voice.defaultQuestion"));
    startTransition(() => setVoiceResponse(reply));
  }, [buildVoiceReply, t, voiceQuestion]);

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
      setVoiceQuestion(transcript);
      startTransition(() => setVoiceResponse(buildVoiceReply(transcript)));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }, [buildVoiceReply, language]);

  const cropLabel = selectedCrop ? getCropDisplayLabel(selectedCrop, language, t) : t("smartFarm.voice.noCrop");
  const showPrecisionMap = Boolean(result?.capturedImage);
  const healthStatus: AdvisorStatus =
    advisor.cropHealthScore >= 70 ? "optimal" : advisor.cropHealthScore >= 45 ? "watch" : "critical";
  const weatherStatus: AdvisorStatus = weather?.recommendation === "do_not_spray" ? "critical" : "optimal";
  const offlineStatus: AdvisorStatus = advisor.offline.pendingSyncCount > 0 ? "watch" : "optimal";

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-sm">
      <div className="border-b border-border/70 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("smartFarm.badge")}</p>
            <h2 className="mt-1 text-2xl font-bold">{t("smartFarm.title")}</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("smartFarm.subtitle")}</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${online ? "border-primary/20 bg-primary/10 text-primary" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            {online ? <CloudSun className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {online ? t("smartFarm.online") : t("smartFarm.offline")}
          </div>
        </div>
      </div>

      <div className="p-6">
        <FarmCommandCenter
          result={result}
          selectedCrop={selectedCrop}
          weather={weather}
          intelligence={intelligence}
          advisor={advisor}
          analytics={analytics}
          cropStage={cropStage}
          onTabChange={setActiveTab}
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CommandTab)} className="space-y-5">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="dashboard">{t("smartFarm.tabs.dashboard")}</TabsTrigger>
            <TabsTrigger value="precision">{t("smartFarm.tabs.precision")}</TabsTrigger>
            <TabsTrigger value="market">{t("smartFarm.tabs.market")}</TabsTrigger>
            <TabsTrigger value="assistant">{t("smartFarm.tabs.assistant")}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                { id: "health", icon: Leaf, label: t("smartFarm.dashboard.cropHealth"), value: `${advisor.cropHealthScore}%`, status: healthStatus },
                { id: "risk", icon: Activity, label: t("smartFarm.dashboard.riskLevel"), value: `${advisor.riskScore}%`, status: advisor.riskStatus },
                { id: "moisture", icon: Waves, label: t("smartFarm.sensors.soilMoisture"), value: `${advisor.sensors[0]?.value ?? 0}%`, status: advisor.sensors[0]?.status ?? "watch" },
                { id: "weather", icon: CloudSun, label: t("smartFarm.dashboard.weatherAlert"), value: weather?.description ?? t("result.weatherUnavailable"), status: weatherStatus },
                { id: "offline", icon: WifiOff, label: t("smartFarm.dashboard.offlineMode"), value: advisor.offline.ready ? t("smartFarm.offlineReady") : t("smartFarm.offline"), status: offlineStatus },
              ].map((card) => (
                <div key={card.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusTone[card.status]}`}>
                      {t(statusLabelKeys[card.status])}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Radar className="h-4 w-4 text-primary" />
                  {t("smartFarm.sensorTitle")}
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {advisor.sensors.map((sensor) => (
                    <div key={sensor.id} className="rounded-2xl border border-border/70 bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{t(sensorLabelKeys[sensor.id])}</p>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusTone[sensor.status]}`}>
                          {t(statusLabelKeys[sensor.status])}
                        </span>
                      </div>
                      <p className="mt-3 text-2xl font-bold">
                        {sensor.value}
                        <span className="ml-1 text-sm font-medium text-muted-foreground">{sensor.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{t("smartFarm.sensorFootnote")}</p>
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    {t("smartFarm.predictiveTitle")}
                  </div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("smartFarm.predictiveRisk")}</p>
                      <p className="text-3xl font-bold">{advisor.prediction.riskScore}%</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone[advisor.prediction.status]}`}>
                      {t(statusLabelKeys[advisor.prediction.status])}
                    </span>
                  </div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("smartFarm.cropStage")}
                  </label>
                  <select
                    value={cropStage}
                    onChange={(event) => setCropStage(event.target.value as CropStage)}
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  >
                    {stageOptions.map((stage) => (
                      <option key={stage} value={stage}>
                        {t(`smartFarm.stages.${stage}`)}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {advisor.prediction.factors.map((factor) => (
                      <span key={factor} className="rounded-full border border-border px-3 py-1 text-xs">
                        {t(factorLabelKeys[factor])}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Sprout className="h-4 w-4 text-primary" />
                    {t("smartFarm.cropRecommendationTitle")}
                  </div>
                  <div className="space-y-3">
                    {advisor.cropRecommendations.map((recommendation) => (
                      <div key={recommendation.crop.id} className="rounded-2xl border border-border/70 bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{getCropDisplayLabel(recommendation.crop, language, t)}</p>
                            <p className="text-xs italic text-muted-foreground">{recommendation.crop.scientificName}</p>
                          </div>
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {recommendation.score}%
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {recommendation.reasonCodes.map((reason) => (
                            <span key={reason} className="rounded-full border border-border px-3 py-1 text-xs">
                              {t(recommendationReasonKeys[reason])}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="precision" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Radar className="h-4 w-4 text-primary" />
                  {t("smartFarm.droneTitle")}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    advisor.drone.status === "ready"
                      ? statusTone.optimal
                      : advisor.drone.status === "weather_blocked"
                        ? statusTone.critical
                        : statusTone.watch
                  }`}>
                    {advisor.drone.status === "ready"
                      ? t("smartFarm.drone.ready")
                      : advisor.drone.status === "weather_blocked"
                        ? t("smartFarm.drone.weatherBlocked")
                        : advisor.drone.status === "standby"
                          ? t("smartFarm.drone.standby")
                          : t("smartFarm.drone.hold")}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-xs">
                    {cropLabel}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    { label: t("smartFarm.drone.coverage"), value: `${advisor.drone.coveragePct}%` },
                    { label: t("smartFarm.drone.targetZones"), value: advisor.drone.targetZones.toString() },
                    { label: t("smartFarm.drone.sprayVolume"), value: `${advisor.drone.sprayVolumeMl} ml` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-xl font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("smartFarm.drone.command")}</p>
                  <p className="mt-2 font-mono text-sm text-foreground">{advisor.drone.command}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <MapPinned className="h-4 w-4 text-primary" />
                  {t("smartFarm.multiTitle")}
                </div>
                {showPrecisionMap ? (
                  <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                      <img src={result?.capturedImage} alt="Precision scan" className="aspect-square w-full object-cover" />
                      {result?.hotspots?.map((hotspot) => (
                        <div
                          key={hotspot.id}
                          className="absolute border-2 border-destructive/80 bg-destructive/10"
                          style={{
                            left: `${hotspot.left}%`,
                            top: `${hotspot.top}%`,
                            width: `${hotspot.width}%`,
                            height: `${hotspot.height}%`,
                          }}
                        >
                          <span className="absolute left-1 top-1 rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold">
                            {hotspot.severity}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border/70 bg-card p-4">
                        <p className="text-sm font-semibold">{t("smartFarm.likelyIssues")}</p>
                        <div className="mt-3 space-y-2">
                          {result?.candidates?.map((candidate) => (
                            <div key={candidate.disease} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                              <span>{candidate.disease}</span>
                              <span className="font-semibold text-primary">{candidate.confidence}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-card p-4">
                        <p className="text-sm font-semibold">{t("smartFarm.hotspotMap")}</p>
                        <div className="mt-3 space-y-2">
                          {result?.hotspots?.length ? result.hotspots.map((hotspot) => (
                            <div key={hotspot.id} className="rounded-xl border border-border/70 px-3 py-2 text-sm">
                              <p className="font-medium">{hotspot.dominantIssue}</p>
                              <p className="text-xs text-muted-foreground">
                                {t("smartFarm.hotspotSeverity")}: {hotspot.severity}% - {t("smartFarm.hotspotCoverage")}: {hotspot.width}% x {hotspot.height}%
                              </p>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">{t("smartFarm.noHotspots")}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    {t("smartFarm.precisionEmpty")}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <WifiOff className="h-4 w-4 text-primary" />
                {t("smartFarm.offlineTitle")}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t("smartFarm.offlineDetection")}</p>
                  <p className="mt-2 text-xl font-bold">{t("smartFarm.offlineReady")}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t("smartFarm.syncPending")}</p>
                  <p className="mt-2 text-xl font-bold">{advisor.offline.pendingSyncCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t("smartFarm.mode")}</p>
                  <p className="mt-2 text-xl font-bold">{online ? t("smartFarm.online") : t("smartFarm.offline")}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("smartFarm.offlineDescription")}</p>
            </div>
          </TabsContent>

          <TabsContent value="market" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  {t("smartFarm.profitTitle")}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t("smartFarm.profitCurrent")}</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(advisor.profit.currentInputCost)}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <p className="text-sm text-primary">{t("smartFarm.profitOptimized")}</p>
                    <p className="mt-2 text-2xl font-bold text-primary">{formatCurrency(advisor.profit.optimizedInputCost)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t("smartFarm.profitSavings")}</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(advisor.profit.savings)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t("smartFarm.profitRevenue")}</p>
                    <p className="mt-2 text-xl font-bold">
                      {formatCurrency(advisor.profit.revenueLow)} - {formatCurrency(advisor.profit.revenueHigh)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t(`smartFarm.recommendations.${advisor.profit.recommendationType}`)}
                </p>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Gauge className="h-4 w-4 text-primary" />
                  {t("smartFarm.priceTitle")}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t("smartFarm.priceBand")}</p>
                    <p className="mt-2 text-2xl font-bold">
                      {advisor.priceStrategy.basePriceLow}-{advisor.priceStrategy.basePriceHigh}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">{t("smartFarm.priceUnit")}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t("smartFarm.marketDemand")}</p>
                    <p className="mt-2 text-2xl font-bold">{t(`smartFarm.demand.${advisor.priceStrategy.demand}`)}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{t("smartFarm.priceNote")}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Store className="h-4 w-4 text-primary" />
                  {t("smartFarm.liveMarket.title")}
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {liveMarketPrices.mode === "live"
                    ? t("smartFarm.liveMarket.liveFeed")
                    : liveMarketPrices.mode === "fallback"
                      ? t("smartFarm.liveMarket.fallback")
                      : t("smartFarm.liveMarket.setupRequired")}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    {t("smartFarm.liveMarket.cropLabel")}: <span className="font-semibold text-foreground">{cropLabel}</span>
                    {weather?.locationName ? <> • {t("smartFarm.liveMarket.nearbyFilter")}: <span className="font-semibold text-foreground">{weather.locationName}</span></> : null}
                  </p>
                  <p>{t("smartFarm.liveMarket.updated")}: {new Date(liveMarketPrices.updatedAt).toLocaleString()}</p>
                </div>

                {marketPricesLoading ? (
                  <p className="mt-4 text-sm text-muted-foreground">{t("smartFarm.liveMarket.loading")}</p>
                ) : liveMarketPrices.records.length ? (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-border/70">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">{t("smartFarm.liveMarket.columns.market")}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t("smartFarm.liveMarket.columns.district")}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t("smartFarm.liveMarket.columns.state")}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t("smartFarm.liveMarket.columns.modal")}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t("smartFarm.liveMarket.columns.min")}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t("smartFarm.liveMarket.columns.max")}</th>
                          <th className="px-4 py-3 text-left font-semibold">{t("smartFarm.liveMarket.columns.date")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveMarketPrices.records.map((record) => (
                          <tr key={`${record.market}-${record.arrivalDate}-${record.modalPrice}`} className="border-t border-border/70">
                            <td className="px-4 py-3 font-medium">{record.market}</td>
                            <td className="px-4 py-3 text-muted-foreground">{record.district || "-"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{record.state || "-"}</td>
                            <td className="px-4 py-3 font-semibold text-primary">{record.modalPrice}</td>
                            <td className="px-4 py-3 text-muted-foreground">{record.minPrice}</td>
                            <td className="px-4 py-3 text-muted-foreground">{record.maxPrice}</td>
                            <td className="px-4 py-3 text-muted-foreground">{record.arrivalDate || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {liveMarketPrices.error ?? t("smartFarm.liveMarket.noRows")}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  {!compactLocale && <p>{liveMarketPrices.sourceLabel}</p>}
                  {liveMarketPrices.sourceUrl ? (
                    <a
                      href={liveMarketPrices.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      {t("smartFarm.liveMarket.openSource")}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Store className="h-4 w-4 text-primary" />
                  {t("smartFarm.marketRoutes")}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {intelligence.markets.map((market, index) => (
                    <div key={market.id} className="rounded-2xl border border-border/70 bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {compactLocale ? getCompactRouteLabel(index) : t(`cropIntel.market.${market.id}.title`)}
                          </p>
                          {compactLocale ? (
                            <p className="text-xs text-muted-foreground">{getCompactMarketSubtitle(market, cropLabel)}</p>
                          ) : (
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{market.buyerType}</p>
                          )}
                        </div>
                        <a
                          href={market.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("cropIntel.open")}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
                        >
                          {!compactLocale && t("cropIntel.open")}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {!compactLocale && <p className="mt-3 text-sm text-muted-foreground">{t(`cropIntel.market.${market.id}.description`)}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Landmark className="h-4 w-4 text-primary" />
                  {t("smartFarm.schemeSpotlight")}
                </div>
                <div className="space-y-3">
                  {intelligence.schemes.slice(0, 3).map((scheme) => (
                    <div key={scheme.id} className="rounded-2xl border border-border/70 bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{scheme.title}</p>
                          {compactLocale ? (
                            <p className="text-xs text-muted-foreground">{getCompactSchemeSubtitle(scheme)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">{scheme.sourceLabel}</p>
                          )}
                        </div>
                        <a
                          href={scheme.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("cropIntel.visit")}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-muted"
                        >
                          {!compactLocale && t("cropIntel.visit")}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {!compactLocale && <p className="mt-3 text-sm text-muted-foreground">{scheme.benefit}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Bot className="h-4 w-4 text-primary" />
                  {t("smartFarm.voiceTitle")}
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{t("smartFarm.voiceDescription")}</p>
                <textarea
                  value={voiceQuestion}
                  onChange={(event) => setVoiceQuestion(event.target.value)}
                  placeholder={t("smartFarm.voicePlaceholder")}
                  className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAsk}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Bot className="h-4 w-4" />
                    {t("smartFarm.askAssistant")}
                  </button>
                  <button
                    type="button"
                    onClick={handleListen}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                    disabled={listening}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {listening ? t("smartFarm.listening") : t("smartFarm.useMic")}
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(voiceResponse || buildVoiceReply(voiceQuestion || t("smartFarm.voice.defaultQuestion")))}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                  >
                    <Bot className="h-4 w-4" />
                    {speaking ? t("smartFarm.speaking") : t("smartFarm.speakReply")}
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("smartFarm.assistantReply")}</p>
                  <p className="mt-2 text-sm text-foreground">{voiceResponse || t("smartFarm.voiceIntro")}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <QrCode className="h-4 w-4 text-primary" />
                  {t("smartFarm.counterfeitTitle")}
                </div>
                <div className="grid gap-3">
                  <input
                    value={batchCode}
                    onChange={(event) => setBatchCode(event.target.value)}
                    placeholder={t("smartFarm.counterfeitBatch")}
                    className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={licenseCode}
                    onChange={(event) => setLicenseCode(event.target.value)}
                    placeholder={t("smartFarm.counterfeitLicense")}
                    className="h-11 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                  />
                  <textarea
                    value={labelText}
                    onChange={(event) => setLabelText(event.target.value)}
                    placeholder={t("smartFarm.counterfeitLabel")}
                    className="min-h-28 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
                  <div className="flex items-center gap-2">
                    {authenticity?.status === "pass" ? (
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                    )}
                    <p className="font-semibold">
                      {authenticity
                        ? authenticity.status === "pass"
                          ? t("smartFarm.authenticity.pass")
                          : authenticity.status === "review"
                            ? t("smartFarm.authenticity.review")
                            : t("smartFarm.authenticity.fail")
                        : t("smartFarm.authenticity.pending")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {authenticity ? `${t("smartFarm.authenticity.score")}: ${authenticity.riskScore}%` : t("smartFarm.authenticity.help")}
                  </p>
                  <div className="mt-3 space-y-2">
                    {authenticity?.reasons.map((reason) => (
                      <p key={reason} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                        {t(authenticityReasonKeys[reason])}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default SmartFarmSuite;
