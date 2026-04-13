import type { WeatherSummary } from "@/hooks/use-weather";
import type { CropIntelligence, CropProfile } from "@/lib/agriculture-knowledge";
import type { DetectionResult } from "@/lib/detection-types";
import type { CommandResponse } from "@/lib/farm-command-engine";
import type { ScanAnalyticsSummary, ScanHistoryEntry } from "@/lib/scan-history";
import type { CropStage, SmartFarmAdvisor } from "@/lib/smart-farm-advisor";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

export const canUseFarmBackend = () => Boolean(API_BASE_URL);

export type FarmCommandRequestPayload = {
  command: string;
  context: {
    crop: CropProfile | null;
    result: DetectionResult | null;
    weather: WeatherSummary | null;
    intelligence: CropIntelligence;
    advisor: SmartFarmAdvisor;
    analytics: ScanAnalyticsSummary;
    cropStage: CropStage;
    recentScans: ScanHistoryEntry[];
  };
};

export type LiveMarketPriceRecord = {
  commodity: string;
  market: string;
  district: string;
  state: string;
  variety: string;
  grade: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
};

export type LiveMarketPriceResponse = {
  mode: "live" | "fallback" | "unconfigured";
  sourceLabel: string;
  sourceUrl?: string;
  updatedAt: string;
  query: {
    crop: string;
    location?: string | null;
  };
  records: LiveMarketPriceRecord[];
  error?: string;
};

const toServerPayload = (payload: FarmCommandRequestPayload) => ({
  command: payload.command,
  context: {
    crop: payload.context.crop,
    result: payload.context.result,
    weather: payload.context.weather,
    advisor: payload.context.advisor,
    analytics: payload.context.analytics,
    cropStage: payload.context.cropStage,
    recentScans: payload.context.recentScans,
    intelligence: {
      primaryDiseaseName: payload.context.intelligence.primaryDisease?.name ?? null,
      primaryMarketTitle: payload.context.intelligence.markets[0]?.title ?? null,
      primarySchemeTitle: payload.context.intelligence.schemes[0]?.title ?? null,
    },
  },
});

export const runFarmCommandOnServer = async (payload: FarmCommandRequestPayload): Promise<CommandResponse> => {
  if (!canUseFarmBackend()) {
    throw new Error("Backend API is not configured.");
  }

  const response = await fetch(buildUrl("/api/farm/command"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toServerPayload(payload)),
  });

  if (!response.ok) {
    throw new Error(`Farm command API failed (${response.status})`);
  }

  return response.json() as Promise<CommandResponse>;
};

export const generateFarmPdfOnServer = async (options: {
  response?: CommandResponse;
  request?: FarmCommandRequestPayload;
}) => {
  if (!canUseFarmBackend()) {
    throw new Error("Backend API is not configured.");
  }

  const response = await fetch(buildUrl("/api/farm/report.pdf"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.response
      ? { response: options.response }
      : options.request
        ? toServerPayload(options.request)
        : {}),
  });

  if (!response.ok) {
    throw new Error(`Farm PDF API failed (${response.status})`);
  }

  return response.blob();
};

export const fetchLiveMarketPrices = async (params: {
  crop: string;
  location?: string | null;
}): Promise<LiveMarketPriceResponse> => {
  if (!canUseFarmBackend()) {
    return {
      mode: "unconfigured",
      sourceLabel: "Backend API unavailable",
      updatedAt: new Date().toISOString(),
      query: params,
      records: [],
      error: "Set VITE_API_BASE_URL to use live mandi pricing.",
    };
  }

  const query = new URLSearchParams({ crop: params.crop });
  if (params.location) query.set("location", params.location);

  const response = await fetch(buildUrl(`/api/market-prices?${query.toString()}`));
  if (!response.ok) {
    throw new Error(`Market price API failed (${response.status})`);
  }

  return response.json() as Promise<LiveMarketPriceResponse>;
};
