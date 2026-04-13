import type { ScanAnalyticsSummary, ScanCategory, ScanHistoryEntry } from "./types.js";

const CATEGORY_META: Record<ScanCategory, { name: string; color: string; infected: boolean }> = {
  healthy: { name: "Healthy", color: "hsl(145, 63%, 32%)", infected: false },
  bacterialBlight: { name: "Bacterial Blight", color: "hsl(0, 72%, 51%)", infected: true },
  leafSpot: { name: "Leaf Spot", color: "hsl(40, 90%, 50%)", infected: true },
  lateBlight: { name: "Late Blight", color: "hsl(200, 80%, 50%)", infected: true },
  mildStress: { name: "Mild Stress", color: "hsl(30, 75%, 45%)", infected: true },
  other: { name: "Other", color: "hsl(220, 12%, 45%)", infected: false }
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const buildAnalyticsSummary = (history: ScanHistoryEntry[], now = new Date()): ScanAnalyticsSummary => {
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - 6);

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      fullDate: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date),
      scanned: 0,
      infected: 0
    };
  });

  const distribution: Record<ScanCategory, number> = {
    healthy: 0,
    bacterialBlight: 0,
    leafSpot: 0,
    lateBlight: 0,
    mildStress: 0,
    other: 0
  };

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

  // Cost assumptions: 1 spray = 0.5 litre pesticide, ₹800 per litre
  const COST_PER_LITRE_INR = 800;
  const LITRES_PER_SPRAY = 0.5;
  const moneySavedLitres = Math.round(skippedSprays * LITRES_PER_SPRAY * 10) / 10;
  const moneySavedINR = Math.round(skippedSprays * LITRES_PER_SPRAY * COST_PER_LITRE_INR);

  const todayKey = startOfDay(now).toISOString().slice(0, 10);
  const todayBucket = buckets.find((bucket) => bucket.key === todayKey);

  return {
    todayLabel: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
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
    pieData: (Object.keys(CATEGORY_META) as ScanCategory[])
      .map((category) => ({
        name: CATEGORY_META[category].name,
        value: distribution[category],
        color: CATEGORY_META[category].color
      }))
      .filter((item) => item.value > 0)
  };
};
