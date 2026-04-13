import { useDeferredValue, useMemo, useState } from "react";
import { Search, Sprout, Store, Landmark, X } from "lucide-react";
import {
  CROP_LIBRARY,
  POPULAR_CROP_IDS,
  TOTAL_DISEASE_PROFILES,
  WORLD_DISEASE_FAMILIES,
  getCropById,
  getCropSearchText,
  type CropId,
} from "@/lib/agriculture-knowledge";
import { useI18n } from "@/components/I18nProvider";
import {
  getCropDisplayLabel,
  getCropSupportLabel,
  isCompactAgronomyLocale,
} from "@/lib/crop-intel-display";

interface CropSelectorProps {
  selectedCropId: CropId | null;
  onSelectCrop: (cropId: CropId | null) => void;
}

const CropSelector = ({ selectedCropId, onSelectCrop }: CropSelectorProps) => {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const selectedCrop = getCropById(selectedCropId);
  const compactLocale = isCompactAgronomyLocale(language);

  const getCropLabel = (cropId: CropId) => {
    const crop = getCropById(cropId);
    return crop ? getCropDisplayLabel(crop, language, t) : t(`cropIntel.cropNames.${cropId}`);
  };
  const getCategoryLabel = (category: string) => t(`cropIntel.categories.${category.toLowerCase()}`);
  const getFamilyLabel = (familyId: string) => t(`cropIntel.families.${familyId}.label`);

  const filteredCrops = useMemo(() => {
    if (!deferredQuery) return CROP_LIBRARY;
    return CROP_LIBRARY.filter((crop) => getCropSearchText(crop).includes(deferredQuery));
  }, [deferredQuery]);

  const popularCrops = useMemo(
    () => POPULAR_CROP_IDS.map((cropId) => getCropById(cropId)).filter(Boolean),
    [],
  );

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sprout className="h-3.5 w-3.5" />
              {t("cropIntel.badge")}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{t("cropIntel.title")}</h2>
            {!compactLocale && (
              <p className="max-w-3xl text-sm text-muted-foreground">
                {t("cropIntel.description")}
              </p>
            )}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={compactLocale ? "" : t("cropIntel.searchPlaceholder")}
              className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <div className="space-y-3">
            {!compactLocale && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.popularCrops")}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {popularCrops.map((crop) => (
                <button
                  key={crop.id}
                  type="button"
                  onClick={() => onSelectCrop(crop.id)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    selectedCropId === crop.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  {getCropLabel(crop.id)}
                </button>
              ))}
              {selectedCropId && (
                <button
                  type="button"
                  onClick={() => onSelectCrop(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted"
                  aria-label={t("cropIntel.clearCrop")}
                >
                  <X className="h-3.5 w-3.5" />
                  {!compactLocale && t("cropIntel.clearCrop")}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {!compactLocale && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.cropLibrary")}</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCrops.map((crop) => (
                <button
                  key={crop.id}
                  type="button"
                  onClick={() => onSelectCrop(crop.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedCropId === crop.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className={`flex items-start gap-3 ${compactLocale ? "" : "justify-between"}`}>
                    <div>
                      <p className="font-semibold">{getCropLabel(crop.id)}</p>
                      <p className="text-xs italic text-muted-foreground">{crop.scientificName}</p>
                    </div>
                    {!compactLocale && (
                      <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {getCategoryLabel(crop.category)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {compactLocale ? getCropSupportLabel(crop) : crop.aliases.join(", ")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-border/70 bg-background/70 p-5">
          <div className="space-y-2">
            {!compactLocale && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.selectedCrop")}</p>
            )}
            {selectedCrop ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold">{getCropLabel(selectedCrop.id)}</h3>
                    <p className="text-sm italic text-muted-foreground">{selectedCrop.scientificName}</p>
                  </div>
                  {!compactLocale && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {getCategoryLabel(selectedCrop.category)}
                    </span>
                  )}
                </div>
                {compactLocale ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs">
                      {getCropSupportLabel(selectedCrop)}
                    </span>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs">
                      {selectedCrop.diseaseGuide.length}
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{selectedCrop.summary}</p>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.healthyLeafSigns")}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCrop.healthSignals.map((signal) => (
                          <span key={signal} className="rounded-full border border-border bg-card px-3 py-1 text-xs">
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {compactLocale ? <span className="font-medium">{t("cropIntel.badge")}</span> : t("cropIntel.noCropSelected")}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
                <Store className="h-4 w-4 text-primary" />
                {t("cropIntel.directSellingTitle")}
              </div>
              {!compactLocale && <p className="text-sm text-muted-foreground">{t("cropIntel.directSellingDesc")}</p>}
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
                <Landmark className="h-4 w-4 text-primary" />
                {t("cropIntel.schemeMatchingTitle")}
              </div>
              {!compactLocale && <p className="text-sm text-muted-foreground">{t("cropIntel.schemeMatchingDesc")}</p>}
            </div>
          </div>

          {!compactLocale && (
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("cropIntel.atlasCoverage")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("cropIntel.atlasCoverageSummary", {
                  cropCount: CROP_LIBRARY.length,
                  diseaseCount: TOTAL_DISEASE_PROFILES,
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {WORLD_DISEASE_FAMILIES.map((family) => (
                  <span key={family.id} className="rounded-full border border-border bg-background px-3 py-1 text-xs">
                    {getFamilyLabel(family.id)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CropSelector;
