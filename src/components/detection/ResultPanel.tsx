import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle,
  CloudRain,
  CloudSun,
  Droplets,
  Landmark,
  Loader2,
  MapPin,
  Microscope,
  Search,
  Sprout,
  Store,
} from "lucide-react";
import type { WeatherSummary } from "@/hooks/use-weather";
import { searchCity, saveLocation, clearSavedLocation } from "@/hooks/use-weather";
import { CROP_LIBRARY, TOTAL_DISEASE_PROFILES, buildCropIntelligence, type CropProfile } from "@/lib/agriculture-knowledge";
import type { DetectionResult } from "@/lib/detection-types";
import { useI18n } from "@/components/I18nProvider";
import {
  getCompactMarketSubtitle,
  getCompactRouteLabel,
  getCompactSchemeSubtitle,
  getCropDisplayLabel,
  getCropSupportLabel,
  isCompactAgronomyLocale,
} from "@/lib/crop-intel-display";

interface ResultPanelProps {
  result: DetectionResult | null;
  selectedCrop: CropProfile | null;
  scanning: boolean;
  weather: WeatherSummary | null;
  weatherLoading: boolean;
  weatherError: string | null;
  coordinates: { lat: number; lon: number } | null;
  onLocationChange: (lat: number, lon: number) => void;
}

const ResultPanel = ({
  result,
  selectedCrop,
  scanning,
  weather,
  weatherLoading,
  weatherError,
  coordinates,
  onLocationChange,
}: ResultPanelProps) => {
  const { language, t } = useI18n();
  const [cityInput, setCityInput] = useState("");
  const [citySearching, setCitySearching] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const compactLocale = isCompactAgronomyLocale(language);

  const getCropLabel = (cropId: CropProfile["id"]) => {
    const crop = CROP_LIBRARY.find((entry) => entry.id === cropId);
    return crop ? getCropDisplayLabel(crop, language, t) : t(`cropIntel.cropNames.${cropId}`);
  };
  const getCategoryLabel = (category: CropProfile["category"]) => t(`cropIntel.categories.${category.toLowerCase()}`);
  const getFamilyLabel = (familyId: string) => t(`cropIntel.families.${familyId}.label`);
  const getFamilySummary = (familyId: string) => t(`cropIntel.families.${familyId}.summary`);
  const getMarketTitle = (marketId: string) => t(`cropIntel.market.${marketId}.title`);
  const getMarketDescription = (marketId: string) => t(`cropIntel.market.${marketId}.description`);
  const getMarketBenefit = (marketId: string) => t(`cropIntel.market.${marketId}.benefit`);

  const getSymptomLabel = (disease: string) => {
    switch (disease) {
      case "Healthy":
        return t("cropIntel.symptoms.healthy");
      case "Leaf Spot Symptoms Detected":
        return t("cropIntel.symptoms.leafSpot");
      case "Bacterial Blight / Late Blight":
        return t("cropIntel.symptoms.blight");
      case "Mild Leaf Stress":
        return t("cropIntel.symptoms.stress");
      case "Rust / Fungal Infection":
        return t("cropIntel.symptoms.rust");
      default:
        return disease;
    }
  };

  const getGenericDescription = (disease: string, fallback: string) => {
    switch (disease) {
      case "Healthy":
        return t("cropIntel.genericDetails.healthy");
      case "Leaf Spot Symptoms Detected":
        return t("cropIntel.genericDetails.leafSpot");
      case "Bacterial Blight / Late Blight":
        return t("cropIntel.genericDetails.blight");
      case "Mild Leaf Stress":
        return t("cropIntel.genericDetails.stress");
      case "Rust / Fungal Infection":
        return t("cropIntel.genericDetails.rust");
      default:
        return fallback;
    }
  };

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

  const handleCitySearch = async () => {
    if (!cityInput.trim()) return;
    setCitySearching(true);
    setCityError(null);
    try {
      const found = await searchCity(cityInput.trim());
      if (!found) {
        setCityError(t("citySearch.notFound"));
        return;
      }
      saveLocation(found.lat, found.lon, found.name);
      onLocationChange(found.lat, found.lon);
      setCityInput("");
    } catch {
      setCityError(t("citySearch.searchFailed"));
    } finally {
      setCitySearching(false);
    }
  };

  const isHealthy = result?.disease === "Healthy";
  const isSprayNeeded = result !== null && !isHealthy;
  const diagnosisTitle = result
    ? compactLocale
      ? selectedCrop
        ? getCropLabel(selectedCrop.id)
        : t("result.title")
      : intelligence.primaryDisease?.name ?? result.disease
    : selectedCrop
      ? t("cropIntel.intelligenceReady", { crop: getCropLabel(selectedCrop.id) })
      : t("cropIntel.chooseCropPrompt");
  const diagnosisText = result
    ? compactLocale
      ? selectedCrop
        ? `${getCropSupportLabel(selectedCrop)} • ${selectedCrop.scientificName}`
        : ""
      : intelligence.primaryDisease?.coreCause ?? getGenericDescription(result.disease, result.details)
    : selectedCrop
      ? compactLocale
        ? `${getCropSupportLabel(selectedCrop)} • ${selectedCrop.scientificName}`
        : selectedCrop.summary
      : t("cropIntel.chooseCropDescription");

  const finalDecision = !result
    ? null
    : isHealthy
      ? { label: t("result.aiNoSpray"), reason: t("result.ruleHealthy"), destructive: false }
      : weather?.recommendation === "do_not_spray"
        ? { label: t("result.rainOverride"), reason: t("result.ruleRain"), destructive: true }
        : { label: t("result.aiRecommendSpray"), reason: t("result.ruleSpray"), destructive: false };

  const locationControls = (
    <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {weather
            ? `${t("citySearch.showingWeatherFor")} ${weather.locationName}`
            : weatherLoading
              ? t("result.weatherLoading")
              : t("citySearch.weatherUnavailable")}
          {coordinates && <span className="opacity-60">{coordinates.lat.toFixed(2)}, {coordinates.lon.toFixed(2)}</span>}
        </div>
        <button
          type="button"
          onClick={() => {
            clearSavedLocation();
            window.location.reload();
          }}
          className="text-[10px] text-primary hover:underline"
        >
          {t("cropIntel.useGps")}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t("citySearch.wrongCity")}
          value={cityInput}
          onChange={(event) => {
            setCityInput(event.target.value);
            setCityError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleCitySearch();
          }}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => void handleCitySearch()}
          disabled={citySearching || !cityInput.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          {citySearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      {cityError && <p className="mt-1.5 text-xs text-destructive">{cityError}</p>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-3">
        <span className="text-sm font-medium">{t("result.title")}</span>
      </div>

      <div className="flex-1 p-6">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={result.disease + result.confidence}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {result.capturedImage && (
                    <div className="h-24 w-24 overflow-hidden rounded-2xl border border-border bg-muted">
                      <img src={result.capturedImage} alt="Captured" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isSprayNeeded ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}
                        aria-label={isSprayNeeded ? t("result.diseaseDetected") : t("result.plantHealthy")}
                      >
                        {isSprayNeeded ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        {!compactLocale && (isSprayNeeded ? t("result.diseaseDetected") : t("result.plantHealthy"))}
                      </div>
                      {!compactLocale && (
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("cropIntel.symptomClass")}: {getSymptomLabel(result.disease)}
                        </span>
                      )}
                    </div>
                    <div>
                      {!compactLocale && (
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("cropIntel.cropMatchedDiagnosis")}</p>
                      )}
                      <h2 className="mt-1 text-2xl font-bold">{diagnosisTitle}</h2>
                      {diagnosisText ? <p className="mt-2 text-sm text-muted-foreground">{diagnosisText}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {selectedCrop ? (
                        <>
                          <span className="rounded-full border border-border px-3 py-1">{getCropLabel(selectedCrop.id)}</span>
                          <span className="rounded-full border border-border px-3 py-1 italic">{selectedCrop.scientificName}</span>
                          {!compactLocale && (
                            <span className="rounded-full border border-border px-3 py-1">{getCategoryLabel(selectedCrop.category)}</span>
                          )}
                        </>
                      ) : (
                        <span className="rounded-full border border-border px-3 py-1">
                          {t("cropIntel.noCropSelectedShort")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("result.confidence")}</p>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.confidence}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${isSprayNeeded ? "bg-destructive" : "bg-primary"}`}
                  />
                </div>
                <p className="mt-1 text-right font-mono text-sm">{result.confidence}%</p>
              </div>

              <div className={`grid gap-4 ${compactLocale ? "" : "xl:grid-cols-2"}`}>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Sprout className="h-4 w-4 text-primary" />
                    {compactLocale && selectedCrop ? getCropLabel(selectedCrop.id) : t("cropIntel.cropIdentity")}
                  </div>
                  {selectedCrop ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-lg font-bold">{getCropLabel(selectedCrop.id)}</p>
                        <p className="text-sm italic text-muted-foreground">{selectedCrop.scientificName}</p>
                      </div>
                      {compactLocale ? (
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-border px-3 py-1 text-xs">
                            {getCropSupportLabel(selectedCrop)}
                          </span>
                          <span className="rounded-full border border-border px-3 py-1 text-xs">
                            {selectedCrop.diseaseGuide.length}
                          </span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">{selectedCrop.summary}</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedCrop.aliases.map((alias) => (
                              <span key={alias} className="rounded-full border border-border px-3 py-1 text-xs">
                                {alias}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("cropIntel.selectCropForDiagnosis")}
                    </p>
                  )}
                </div>

                {!compactLocale && (
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Droplets className="h-4 w-4 text-primary" />
                    {t("cropIntel.sprayWeatherDecision")}
                  </div>
                  <div className={`mb-3 inline-flex items-center gap-2 text-lg font-bold ${isSprayNeeded ? "text-destructive" : "text-primary"}`}>
                    <Droplets className="h-5 w-5" />
                    {isSprayNeeded ? t("result.aiRecommendSpray") : t("result.aiNoSpray")}
                  </div>
                  {weatherLoading ? (
                    <p className="text-sm text-muted-foreground">{t("result.weatherLoading")}</p>
                  ) : weather ? (
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 text-lg font-bold ${weather.recommendation === "do_not_spray" ? "text-destructive" : "text-primary"}`}>
                        {weather.recommendation === "do_not_spray" ? <CloudRain className="h-5 w-5" /> : <CloudSun className="h-5 w-5" />}
                        {weather.recommendation === "do_not_spray" ? t("weather.notRecommended") : t("weather.recommended")}
                      </div>
                      <p className="text-sm font-medium text-foreground">{weather.locationName} | {weather.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("result.temperature")}: {weather.temperatureC} C | {t("result.humidity")}: {weather.humidity}% | {t("result.wind")}: {weather.windSpeed} m/s
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{weatherError ? t("result.weatherUnavailable") : t("result.locationPending")}</p>
                  )}
                  </div>
                )}
              </div>

              {intelligence.primaryDisease && !compactLocale && (
                <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Microscope className="h-4 w-4 text-primary" />
                    {t("cropIntel.diseaseCore")}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.cause")}</p>
                      <p className="mt-2 text-lg font-bold">{intelligence.primaryDisease.causeType}</p>
                      <p className="text-sm text-muted-foreground">{intelligence.primaryDisease.causalAgent}</p>
                      <p className="mt-3 text-sm text-muted-foreground">{intelligence.primaryDisease.marketRisk}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.coreTrigger")}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{intelligence.primaryDisease.coreCause}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {intelligence.primaryDisease.triggers.map((trigger) => (
                          <span key={trigger} className="rounded-full border border-border px-3 py-1 text-xs">
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.identificationSigns")}</p>
                      <div className="mt-3 space-y-2">
                        {intelligence.primaryDisease.identification.map((item) => (
                          <p key={item} className="text-sm text-muted-foreground">{item}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.immediateAction")}</p>
                      <div className="mt-3 space-y-2">
                        {intelligence.primaryDisease.immediateActions.map((item) => (
                          <p key={item} className="text-sm text-muted-foreground">{item}</p>
                        ))}
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.prevention")}</p>
                      <div className="mt-3 space-y-2">
                        {intelligence.primaryDisease.prevention.map((item) => (
                          <p key={item} className="text-sm text-muted-foreground">{item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Store className="h-4 w-4 text-primary" />
                  {compactLocale ? t("cropIntel.directSellingTitle") : t("cropIntel.nearbySelling")}
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {intelligence.markets.map((market, index) => (
                    <div key={market.id} className="rounded-2xl border border-border/70 bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {compactLocale ? getCompactRouteLabel(index) : getMarketTitle(market.id)}
                          </p>
                          {compactLocale ? (
                            <p className="text-xs text-muted-foreground">{getCompactMarketSubtitle(market, selectedCrop ? getCropLabel(selectedCrop.id) : t("result.title"))}</p>
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
                      {!compactLocale && (
                        <>
                          <p className="mt-3 text-sm text-muted-foreground">{getMarketDescription(market.id)}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{getMarketBenefit(market.id)}</p>
                          <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                            {t("cropIntel.query")}: {market.query}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Landmark className="h-4 w-4 text-primary" />
                  {compactLocale ? t("cropIntel.schemeMatchingTitle") : t("cropIntel.relatedSchemes")}
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {intelligence.schemes.map((scheme) => (
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
                      {!compactLocale && (
                        <>
                          <p className="mt-3 text-sm text-muted-foreground">{scheme.benefit}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{scheme.relevance}</p>
                          <p className="mt-3 text-xs text-muted-foreground">{t("cropIntel.eligibility")}: {scheme.eligibility}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`grid gap-4 ${compactLocale ? "" : "xl:grid-cols-[1.2fr_0.8fr]"}`}>
                {locationControls}
                {!compactLocale && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("result.finalDecision")}</p>
                    {finalDecision && (
                      <>
                        <div className={`text-xl font-bold ${finalDecision.destructive ? "text-destructive" : "text-primary"}`}>
                          {finalDecision.label}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{finalDecision.reason}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Brain className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold">{scanning ? t("result.processing") : diagnosisTitle}</p>
                    {diagnosisText ? <p className="text-sm text-muted-foreground">{diagnosisText}</p> : null}
                    {!compactLocale && (
                      <p className="text-sm text-muted-foreground">
                        {t("cropIntel.atlasCoverageSummary", {
                          cropCount: CROP_LIBRARY.length,
                          diseaseCount: TOTAL_DISEASE_PROFILES,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!compactLocale && (
                <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="mb-3 text-sm font-semibold">{t("cropIntel.diseaseFamiliesCovered")}</p>
                  <div className="space-y-3">
                    {intelligence.families.map((family) => (
                      <div key={family.id} className="rounded-2xl border border-border/70 bg-card p-3">
                        <p className="font-semibold">{getFamilyLabel(family.id)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{getFamilySummary(family.id)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="mb-3 text-sm font-semibold">{t("cropIntel.watchlist")}</p>
                  <div className="space-y-3">
                    {intelligence.watchlist.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border/70 bg-card p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{item.name}</p>
                          <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {item.causeType}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.coreCause}</p>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              )}

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Store className="h-4 w-4 text-primary" />
                  {compactLocale ? t("cropIntel.directSellingTitle") : t("cropIntel.nearbySelling")}
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {intelligence.markets.map((market, index) => (
                    <div key={market.id} className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="font-semibold">
                        {compactLocale ? getCompactRouteLabel(index) : getMarketTitle(market.id)}
                      </p>
                      {compactLocale ? (
                        <p className="mt-2 text-sm text-muted-foreground">{getCompactMarketSubtitle(market, selectedCrop ? getCropLabel(selectedCrop.id) : t("result.title"))}</p>
                      ) : (
                        <>
                          <p className="mt-2 text-sm text-muted-foreground">{getMarketDescription(market.id)}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{getMarketBenefit(market.id)}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-background/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <Landmark className="h-4 w-4 text-primary" />
                  {compactLocale ? t("cropIntel.schemeMatchingTitle") : t("cropIntel.suggestedSchemes")}
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {intelligence.schemes.map((scheme) => (
                    <div key={scheme.id} className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="font-semibold">{scheme.title}</p>
                      {!compactLocale && <p className="mt-2 text-sm text-muted-foreground">{scheme.benefit}</p>}
                      {compactLocale && <p className="mt-2 text-xs text-muted-foreground">{getCompactSchemeSubtitle(scheme)}</p>}
                      <a
                        href={scheme.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                      >
                        {!compactLocale && t("cropIntel.officialLink")}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {locationControls}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ResultPanel;
