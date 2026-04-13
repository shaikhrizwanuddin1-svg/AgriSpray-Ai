import type { WeatherSummary } from "@/hooks/use-weather";
import {
  CROP_LIBRARY,
  type CropId,
  type CropProfile,
} from "@/lib/agriculture-knowledge";
import type { DetectionResult } from "@/lib/detection-types";
import type { ScanAnalyticsSummary } from "@/lib/scan-history";

export type CropStage = "seedling" | "vegetative" | "flowering" | "harvest";
export type AdvisorStatus = "optimal" | "watch" | "critical";
export type CounterfeitReasonCode =
  | "missingBatchCode"
  | "weakBatchCode"
  | "missingLicenseCode"
  | "weakLicenseCode"
  | "missingManufacturer"
  | "missingSafetyInfo"
  | "suspiciousClaims"
  | "traceabilityStrong"
  | "safetyInfoPresent";

export type SensorReading = {
  id: "soilMoisture" | "soilPh" | "soilTemp" | "canopyWetness" | "infectionPressure";
  value: number;
  unit: string;
  status: AdvisorStatus;
};

export type DronePlan = {
  status: "ready" | "hold" | "weather_blocked" | "standby";
  coveragePct: number;
  targetZones: number;
  sprayVolumeMl: number;
  command: string;
};

export type PredictionInsight = {
  riskScore: number;
  status: AdvisorStatus;
  factors: Array<"weather" | "history" | "stage" | "symptoms">;
};

export type ProfitPlan = {
  currentInputCost: number;
  optimizedInputCost: number;
  savings: number;
  revenueLow: number;
  revenueHigh: number;
  recommendationType: "spotSpray" | "delayWeather" | "nutritionFirst" | "protectHealthyCanopy";
};

export type PriceStrategy = {
  basePriceLow: number;
  basePriceHigh: number;
  demand: "high" | "steady" | "watch";
};

export type CropRecommendation = {
  crop: CropProfile;
  score: number;
  reasonCodes: Array<"weatherFit" | "soilFit" | "marketFit">;
};

export type OfflineSummary = {
  ready: boolean;
  pendingSyncCount: number;
};

export type SmartFarmAdvisor = {
  cropHealthScore: number;
  riskScore: number;
  riskStatus: AdvisorStatus;
  sensors: SensorReading[];
  drone: DronePlan;
  prediction: PredictionInsight;
  profit: ProfitPlan;
  priceStrategy: PriceStrategy;
  cropRecommendations: CropRecommendation[];
  offline: OfflineSummary;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getStatusFromScore = (score: number, watchFrom = 45, criticalFrom = 70): AdvisorStatus => {
  if (score >= criticalFrom) return "critical";
  if (score >= watchFrom) return "watch";
  return "optimal";
};

const average = (min: number, max: number) => (min + max) / 2;

const CROP_STRATEGY: Record<CropId, {
  temperature: [number, number];
  humidity: [number, number];
  soilPh: [number, number];
  soilMoisture: [number, number];
  yieldKgPerAcre: number;
  priceBand: [number, number];
  demand: PriceStrategy["demand"];
}> = {
  rice: {
    temperature: [24, 34],
    humidity: [65, 90],
    soilPh: [5.2, 6.8],
    soilMoisture: [62, 88],
    yieldKgPerAcre: 1200,
    priceBand: [22, 31],
    demand: "steady",
  },
  wheat: {
    temperature: [14, 26],
    humidity: [35, 62],
    soilPh: [6.0, 7.5],
    soilMoisture: [38, 58],
    yieldKgPerAcre: 1450,
    priceBand: [24, 32],
    demand: "steady",
  },
  maize: {
    temperature: [18, 30],
    humidity: [45, 70],
    soilPh: [5.8, 7.2],
    soilMoisture: [42, 64],
    yieldKgPerAcre: 2100,
    priceBand: [19, 27],
    demand: "high",
  },
  cotton: {
    temperature: [24, 35],
    humidity: [40, 65],
    soilPh: [5.8, 8.0],
    soilMoisture: [36, 58],
    yieldKgPerAcre: 850,
    priceBand: [62, 78],
    demand: "steady",
  },
  soybean: {
    temperature: [20, 31],
    humidity: [50, 75],
    soilPh: [6.0, 7.2],
    soilMoisture: [40, 60],
    yieldKgPerAcre: 1050,
    priceBand: [43, 55],
    demand: "high",
  },
  tomato: {
    temperature: [18, 30],
    humidity: [45, 70],
    soilPh: [6.0, 7.0],
    soilMoisture: [48, 72],
    yieldKgPerAcre: 7200,
    priceBand: [14, 28],
    demand: "high",
  },
  potato: {
    temperature: [14, 26],
    humidity: [45, 72],
    soilPh: [5.2, 6.7],
    soilMoisture: [46, 70],
    yieldKgPerAcre: 6800,
    priceBand: [16, 26],
    demand: "steady",
  },
  banana: {
    temperature: [22, 34],
    humidity: [55, 85],
    soilPh: [5.5, 7.2],
    soilMoisture: [58, 82],
    yieldKgPerAcre: 9000,
    priceBand: [18, 34],
    demand: "high",
  },
};

const getDiseaseRiskBase = (disease?: string | null) => {
  switch (disease) {
    case "Healthy":
      return 14;
    case "Mild Leaf Stress":
      return 46;
    case "Leaf Spot Symptoms Detected":
      return 58;
    case "Rust / Fungal Infection":
      return 64;
    case "Bacterial Blight / Late Blight":
      return 74;
    default:
      return 36;
  }
};

const stageRiskMap: Record<CropStage, number> = {
  seedling: 10,
  vegetative: 8,
  flowering: 14,
  harvest: 5,
};

const fitScore = (value: number, [min, max]: [number, number]) => {
  if (value >= min && value <= max) return 100;
  const distance = value < min ? min - value : value - max;
  return clamp(100 - distance * 12, 10, 100);
};

export const buildSmartFarmAdvisor = ({
  crop,
  result,
  weather,
  analytics,
  online,
  cropStage,
}: {
  crop: CropProfile | null;
  result: DetectionResult | null;
  weather: WeatherSummary | null;
  analytics: ScanAnalyticsSummary;
  online: boolean;
  cropStage: CropStage;
}): SmartFarmAdvisor => {
  const strategy = crop ? CROP_STRATEGY[crop.id] : CROP_STRATEGY.tomato;
  const infectionPressure = analytics.totals.scanned > 0
    ? analytics.totals.infected / analytics.totals.scanned
    : 0.18;
  const humidity = weather?.humidity ?? average(...strategy.humidity);
  const temperature = weather?.temperatureC ?? average(...strategy.temperature);
  const rainPenalty = weather?.recommendation === "do_not_spray" ? 12 : 0;
  const affectedArea = result?.affectedAreaPct ?? 0;

  const cropHealthScore = result
    ? result.disease === "Healthy"
      ? clamp(Math.round(84 + result.confidence * 0.12 - affectedArea * 0.18), 58, 99)
      : clamp(Math.round(88 - result.confidence * 0.5 - affectedArea * 0.45), 12, 81)
    : clamp(Math.round(74 - infectionPressure * 12), 52, 82);

  const riskScore = clamp(
    Math.round(
      getDiseaseRiskBase(result?.disease)
      + humidity * 0.16
      + infectionPressure * 26
      + stageRiskMap[cropStage]
      + rainPenalty
      + (result?.disease === "Healthy" ? -10 : 0),
    ),
    8,
    98,
  );

  const soilMoisture = clamp(
    Math.round(average(...strategy.soilMoisture) + (humidity - 55) * 0.28 + (weather?.recommendation === "do_not_spray" ? 9 : -4)),
    18,
    96,
  );
  const soilPh = clamp(
    Number((average(...strategy.soilPh) + (result?.disease === "Mild Leaf Stress" ? 0.35 : 0)).toFixed(1)),
    4.8,
    8.4,
  );
  const soilTemp = clamp(Math.round(temperature + (soilMoisture > average(...strategy.soilMoisture) ? -1 : 2)), 8, 42);
  const canopyWetness = clamp(Math.round(humidity + (weather?.recommendation === "do_not_spray" ? 16 : 2)), 18, 98);

  const sensors: SensorReading[] = [
    {
      id: "soilMoisture",
      value: soilMoisture,
      unit: "%",
      status: getStatusFromScore(Math.abs(soilMoisture - average(...strategy.soilMoisture)) * 2.8, 22, 40),
    },
    {
      id: "soilPh",
      value: soilPh,
      unit: "",
      status: getStatusFromScore(Math.abs(soilPh - average(...strategy.soilPh)) * 28, 16, 28),
    },
    {
      id: "soilTemp",
      value: soilTemp,
      unit: "C",
      status: getStatusFromScore(Math.abs(soilTemp - average(...strategy.temperature)) * 2.2, 18, 34),
    },
    {
      id: "canopyWetness",
      value: canopyWetness,
      unit: "%",
      status: getStatusFromScore(canopyWetness - average(...strategy.humidity), 12, 24),
    },
    {
      id: "infectionPressure",
      value: Math.round(infectionPressure * 100),
      unit: "%",
      status: getStatusFromScore(infectionPressure * 100, 35, 60),
    },
  ];

  const targetZones = result?.hotspots?.length ?? 0;
  const coveragePct = result?.affectedAreaPct ?? 0;
  const sprayVolumeMl = clamp(Math.round(coveragePct * 11 + targetZones * 34), 0, 2400);
  const droneStatus: DronePlan["status"] = !result
    ? "standby"
    : result.disease === "Healthy"
      ? "hold"
      : weather?.recommendation === "do_not_spray"
        ? "weather_blocked"
        : "ready";

  const cropLabel = crop?.id ?? "field";
  const drone: DronePlan = {
    status: droneStatus,
    coveragePct,
    targetZones,
    sprayVolumeMl,
    command: `DRONE/PRECISION crop=${cropLabel} stage=${cropStage} zones=${targetZones} coverage=${coveragePct}% volume=${sprayVolumeMl}ml`,
  };

  const prediction: PredictionInsight = {
    riskScore,
    status: getStatusFromScore(riskScore),
    factors: [
      "weather",
      "history",
      "stage",
      ...(result && result.disease !== "Healthy" ? (["symptoms"] as const) : []),
    ],
  };

  const currentInputCost = Math.round(
    3400
    + (result?.disease === "Bacterial Blight / Late Blight" ? 1900 : 900)
    + (crop?.category === "Fruit" || crop?.category === "Vegetable" ? 1400 : 700),
  );
  const precisionSavings = clamp(
    Math.round((100 - coveragePct) * 18 + (weather?.recommendation === "do_not_spray" ? 420 : 0)),
    350,
    4200,
  );
  const optimizedInputCost = Math.max(1100, currentInputCost - precisionSavings);
  const expectedYield = strategy.yieldKgPerAcre;
  const revenueLow = Math.round(expectedYield * strategy.priceBand[0]);
  const revenueHigh = Math.round(expectedYield * strategy.priceBand[1]);

  const profit: ProfitPlan = {
    currentInputCost,
    optimizedInputCost,
    savings: currentInputCost - optimizedInputCost,
    revenueLow,
    revenueHigh,
    recommendationType: result?.disease === "Mild Leaf Stress"
      ? "nutritionFirst"
      : weather?.recommendation === "do_not_spray"
        ? "delayWeather"
        : result?.disease === "Healthy"
          ? "protectHealthyCanopy"
          : "spotSpray",
  };

  const priceStrategy: PriceStrategy = {
    basePriceLow: strategy.priceBand[0],
    basePriceHigh: strategy.priceBand[1],
    demand: strategy.demand,
  };

  const cropRecommendations: CropRecommendation[] = CROP_LIBRARY
    .map((candidate) => {
      const profile = CROP_STRATEGY[candidate.id];
      const weatherFit = fitScore(temperature, profile.temperature);
      const humidityFit = fitScore(humidity, profile.humidity);
      const moistureFit = fitScore(soilMoisture, profile.soilMoisture);
      const phFit = fitScore(soilPh, profile.soilPh);
      const marketFit = profile.demand === "high" ? 100 : profile.demand === "steady" ? 82 : 64;
      const score = Math.round(weatherFit * 0.32 + humidityFit * 0.18 + moistureFit * 0.2 + phFit * 0.15 + marketFit * 0.15);
      const reasonCodes: CropRecommendation["reasonCodes"] = ["weatherFit", "soilFit", "marketFit"];
      return { crop: candidate, score, reasonCodes };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  return {
    cropHealthScore,
    riskScore,
    riskStatus: getStatusFromScore(riskScore),
    sensors,
    drone,
    prediction,
    profit,
    priceStrategy,
    cropRecommendations,
    offline: {
      ready: true,
      pendingSyncCount: online ? 0 : analytics.totals.scanned,
    },
  };
};

export const evaluatePesticideAuthenticity = ({
  batchCode,
  licenseCode,
  labelText,
}: {
  batchCode: string;
  licenseCode: string;
  labelText: string;
}) => {
  const reasons: CounterfeitReasonCode[] = [];
  const trimmedBatch = batchCode.trim();
  const trimmedLicense = licenseCode.trim();
  const trimmedLabel = labelText.trim().toLowerCase();

  if (!trimmedBatch) {
    reasons.push("missingBatchCode");
  } else if (!/^[A-Z0-9-]{6,20}$/i.test(trimmedBatch)) {
    reasons.push("weakBatchCode");
  } else {
    reasons.push("traceabilityStrong");
  }

  if (!trimmedLicense) {
    reasons.push("missingLicenseCode");
  } else if (!/^[A-Z0-9/-]{5,24}$/i.test(trimmedLicense)) {
    reasons.push("weakLicenseCode");
  }

  if (!/(mfg|manufacturer|marketed by|company|address)/i.test(trimmedLabel)) {
    reasons.push("missingManufacturer");
  }

  if (!/(dose|warning|poison|first aid|safety|precaution|expiry)/i.test(trimmedLabel)) {
    reasons.push("missingSafetyInfo");
  } else {
    reasons.push("safetyInfoPresent");
  }

  if (/(100% original|miracle|instant cure|secret formula|government approved guaranteed)/i.test(trimmedLabel)) {
    reasons.push("suspiciousClaims");
  }

  const riskScore = reasons.reduce((score, reason) => {
    switch (reason) {
      case "missingBatchCode":
      case "missingLicenseCode":
      case "missingManufacturer":
      case "suspiciousClaims":
        return score + 24;
      case "weakBatchCode":
      case "weakLicenseCode":
      case "missingSafetyInfo":
        return score + 14;
      default:
        return score - 6;
    }
  }, 26);

  return {
    status: riskScore >= 70 ? "fail" : riskScore >= 42 ? "review" : "pass",
    riskScore: clamp(riskScore, 8, 98),
    reasons,
  };
};
