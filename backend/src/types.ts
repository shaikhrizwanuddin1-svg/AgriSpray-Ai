export type ScanCategory =
  | "healthy"
  | "bacterialBlight"
  | "leafSpot"
  | "lateBlight"
  | "mildStress"
  | "other";

export type ScanHistoryEntry = {
  id: string;
  timestamp: string;
  disease: string;
  confidence: number;
  spray: boolean;
  category: ScanCategory;
};

export type DetectionResultPayload = {
  disease: string;
  confidence: number;
  spray: boolean;
  capturedImage?: string;
  details?: string;
};

export type AuthUser = {
  id: string;
  mobileNumber: string;
  countryCode: string;
  name: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type OtpChallenge = {
  id: string;
  mobileNumber: string;
  otpHash: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptCount: number;
  maxAttempts: number;
  verifiedAt: string | null;
  createdAt: string;
  lastSentAt: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  sessionTokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
};

export type AuthenticatedSession = {
  sessionId: string;
  user: AuthUser;
};

export type SmsDeliveryResult = {
  provider: "twilio" | "console";
  mode: "sms" | "debug";
  debugOtp?: string;
};

export type ScanAnalyticsSummary = {
  todayLabel: string;
  todayScanned: number;
  totals: {
    scanned: number;
    infected: number;
    sprayEvents: number;
    pesticideSaved: number;
    moneySavedINR: number;
    moneySavedLitres: number;
  };
  weeklyData: Array<{
    key: string;
    label: string;
    fullDate: string;
    scanned: number;
    infected: number;
  }>;
  pieData: Array<{ name: string; value: number; color: string }>;
};

export type CommandTone = "neutral" | "good" | "watch" | "critical";

export type CommandMetric = {
  label: string;
  value: string;
  tone?: CommandTone;
};

export type CommandAction = {
  title: string;
  detail: string;
  timing: string;
  tone?: CommandTone;
};

export type CommandSeries = {
  title: string;
  mode: "line" | "bar";
  primaryLabel: string;
  secondaryLabel?: string;
  points: Array<{
    label: string;
    primary: number;
    secondary?: number;
  }>;
};

export type CommandHeatCell = {
  id: string;
  label: string;
  description: string;
  severity: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CommandTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export type CommandExport = {
  filename: string;
  mimeType: string;
  data: string;
};

export type CommandResponse = {
  intent: string;
  title: string;
  summary: string;
  recommendedTab: "dashboard" | "precision" | "market" | "assistant";
  status: "analysis" | "simulation" | "prediction" | "emergency" | "report";
  metrics: CommandMetric[];
  actions: CommandAction[];
  series?: CommandSeries;
  heatmap?: CommandHeatCell[];
  table?: CommandTable;
  exportData?: CommandExport;
  speakText?: string;
};

export type FarmCommandRequest = {
  command: string;
  context: {
    crop?: {
      id?: string;
      name?: string;
      scientificName?: string;
    } | null;
    result?: DetectionResultPayload & {
      candidates?: Array<{ disease: string; confidence: number }>;
      hotspots?: Array<{
        id: string;
        left: number;
        top: number;
        width: number;
        height: number;
        severity: number;
        dominantIssue: string;
      }>;
      affectedAreaPct?: number;
      analysisMode?: "heuristic" | "ml-assisted";
    } | null;
    weather?: {
      locationName?: string;
      condition?: string;
      description?: string;
      temperatureC?: number;
      humidity?: number;
      windSpeed?: number;
      recommendation?: "spray_recommended" | "do_not_spray";
    } | null;
    advisor: {
      cropHealthScore: number;
      riskScore: number;
      riskStatus: "optimal" | "watch" | "critical";
      drone: {
        status: "ready" | "hold" | "weather_blocked" | "standby";
        coveragePct: number;
        targetZones: number;
        sprayVolumeMl: number;
        command: string;
      };
      prediction: {
        riskScore: number;
        status: "optimal" | "watch" | "critical";
        factors: string[];
      };
      profit: {
        currentInputCost: number;
        optimizedInputCost: number;
        savings: number;
        revenueLow: number;
        revenueHigh: number;
        recommendationType: string;
      };
      priceStrategy: {
        basePriceLow: number;
        basePriceHigh: number;
        demand: "high" | "steady" | "watch";
      };
      cropRecommendations: Array<{
        crop: {
          id?: string;
          name?: string;
          scientificName?: string;
        };
        score: number;
        reasonCodes: string[];
      }>;
      offline: {
        ready: boolean;
        pendingSyncCount: number;
      };
    };
    analytics: ScanAnalyticsSummary;
    cropStage: string;
    recentScans: ScanHistoryEntry[];
    intelligence?: {
      primaryDiseaseName?: string | null;
      primaryMarketTitle?: string | null;
      primarySchemeTitle?: string | null;
    };
  };
};

export type MarketPriceRecord = {
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
  sourceRecord: Record<string, unknown>;
};

export type MarketPriceResponse = {
  mode: "live" | "fallback" | "unconfigured";
  sourceLabel: string;
  sourceUrl?: string;
  updatedAt: string;
  query: {
    crop: string;
    location?: string | null;
  };
  records: MarketPriceRecord[];
  error?: string;
};
