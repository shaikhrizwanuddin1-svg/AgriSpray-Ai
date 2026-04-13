import type {
  CropProfile,
  GovernmentScheme,
  MarketRecommendation,
} from "./agriculture-knowledge";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

const RICH_TEXT_LANGUAGES = new Set(["en", "hi", "mr"]);

export const isCompactAgronomyLocale = (language: string) => !RICH_TEXT_LANGUAGES.has(language);

export const getCropDisplayLabel = (
  crop: CropProfile,
  language: string,
  t: Translate,
) => {
  if (!isCompactAgronomyLocale(language)) {
    return t(`cropIntel.cropNames.${crop.id}`);
  }

  return crop.aliases[crop.aliases.length - 1] ?? crop.name;
};

export const getCropSupportLabel = (crop: CropProfile) =>
  crop.aliases[crop.aliases.length - 1] ?? crop.scientificName;

export const getCompactRouteLabel = (index: number) => String(index + 1).padStart(2, "0");

export const getCompactMarketSubtitle = (
  market: MarketRecommendation,
  cropLabel: string,
) => `${cropLabel} • ${market.locationLabel}`;

export const getCompactSchemeSubtitle = (scheme: GovernmentScheme) => scheme.id.toUpperCase();
