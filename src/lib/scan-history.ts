import type { DetectionResult } from "@/lib/detection-types";

export const SCAN_HISTORY_STORAGE_KEY = "agrispray-scan-history";
export const SCAN_HISTORY_UPDATED_EVENT = "agrispray-scan-history-updated";

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

type WeeklyBucket = {
  key: string;
  label: string;
  fullDate: string;
  scanned: number;
  infected: number;
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
  weeklyData: WeeklyBucket[];
  pieData: Array<{ name: string; value: number; color: string }>;
};

const CATEGORY_META: Record<ScanCategory, { name: string; color: string; infected: boolean }> = {
  healthy: { name: "Healthy", color: "hsl(145, 63%, 32%)", infected: false },
  bacterialBlight: { name: "Bacterial Blight", color: "hsl(0, 72%, 51%)", infected: true },
  leafSpot: { name: "Leaf Spot", color: "hsl(40, 90%, 50%)", infected: true },
  lateBlight: { name: "Late Blight", color: "hsl(200, 80%, 50%)", infected: true },
  mildStress: { name: "Mild Stress", color: "hsl(30, 75%, 45%)", infected: true },
  other: { name: "Other", color: "hsl(220, 12%, 45%)", infected: false },
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getCategoryForDisease = (disease: string): ScanCategory => {
  if (disease === "Healthy") return "healthy";
  if (disease.includes("Bacterial")) return "bacterialBlight";
  if (disease.includes("Leaf Spot")) return "leafSpot";
  if (disease.includes("Late Blight")) return "lateBlight";
  if (disease.includes("Stress")) return "mildStress";
  return "other";
};

export const readScanHistory = (): ScanHistoryEntry[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SCAN_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is ScanHistoryEntry =>
        !!entry &&
        typeof entry.id === "string" &&
        typeof entry.timestamp === "string" &&
        typeof entry.disease === "string" &&
        typeof entry.confidence === "number" &&
        typeof entry.spray === "boolean" &&
        typeof entry.category === "string",
    );
  } catch {
    return [];
  }
};

export const createScanHistoryEntry = (result: DetectionResult): ScanHistoryEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  disease: result.disease,
  confidence: result.confidence,
  spray: result.spray,
  category: getCategoryForDisease(result.disease),
});

export const replaceLocalScanHistory = (entries: ScanHistoryEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 500)));
};

export const clearLocalScanHistory = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SCAN_HISTORY_STORAGE_KEY);
};

export const saveScanResult = (result: DetectionResult) => {
  if (typeof window === "undefined") return;

  const history = readScanHistory();
  const nextEntry = createScanHistoryEntry(result);
  const nextHistory = [nextEntry, ...history].slice(0, 500);
  replaceLocalScanHistory(nextHistory);
  window.dispatchEvent(new Event(SCAN_HISTORY_UPDATED_EVENT));
};

export const getScanAnalyticsSummary = (now = new Date()): ScanAnalyticsSummary => {
  const history = readScanHistory();
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - 6);

  const buckets: WeeklyBucket[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      fullDate: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date),
      scanned: 0,
      infected: 0,
    };
  });

  const distribution = {
    healthy: 0,
    bacterialBlight: 0,
    leafSpot: 0,
    lateBlight: 0,
    mildStress: 0,
    other: 0,
  } satisfies Record<ScanCategory, number>;

  let sprayEvents = 0;

  for (const entry of history) {
    const entryDate = new Date(entry.timestamp);
    if (Number.isNaN(entryDate.getTime())) continue;

    distribution[entry.category] += 1;
    if (entry.spray) sprayEvents += 1;

    const bucketKey = startOfDay(entryDate).toISOString().slice(0, 10);
    const bucket = buckets.find((item) => item.key === bucketKey);
    if (!bucket) continue;

    bucket.scanned += 1;
    if (CATEGORY_META[entry.category].infected) {
      bucket.infected += 1;
    }
  }

  const scanned = history.length;
  const infected = distribution.bacterialBlight + distribution.leafSpot + distribution.lateBlight + distribution.mildStress;
  const skippedSprays = scanned - sprayEvents;
  const pesticideSaved = scanned > 0 ? Math.round((skippedSprays / scanned) * 100) : 0;
  const COST_PER_LITRE_INR = 800;
  const LITRES_PER_SPRAY = 0.5;
  const moneySavedLitres = Math.round(skippedSprays * LITRES_PER_SPRAY * 10) / 10;
  const moneySavedINR = Math.round(skippedSprays * LITRES_PER_SPRAY * COST_PER_LITRE_INR);
  const todayKey = startOfDay(now).toISOString().slice(0, 10);
  const todayBucket = buckets.find((bucket) => bucket.key === todayKey);

  const pieData = (Object.keys(CATEGORY_META) as ScanCategory[])
    .map((category) => ({
      name: CATEGORY_META[category].name,
      value: distribution[category],
      color: CATEGORY_META[category].color,
    }))
    .filter((item) => item.value > 0);

  return {
    todayLabel: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(now),
    todayScanned: todayBucket?.scanned ?? 0,
    totals: {
      scanned,
      infected,
      sprayEvents,
      pesticideSaved,
      moneySavedINR,
      moneySavedLitres,
    },
    weeklyData: buckets,
    pieData,
  };
};
