import type { WeatherSummary } from "@/hooks/use-weather";
import type {
  CropId,
  CropIntelligence,
  CropProfile,
} from "@/lib/agriculture-knowledge";
import type { DetectionResult } from "@/lib/detection-types";
import type { ScanAnalyticsSummary, ScanHistoryEntry } from "@/lib/scan-history";
import type { CropStage, SmartFarmAdvisor } from "@/lib/smart-farm-advisor";

export type CommandTab = "dashboard" | "precision" | "market" | "assistant";

export type CommandIntentId =
  | "fullReport"
  | "futureRisk"
  | "optimizePesticide"
  | "profitAnalysis"
  | "recommendCrop"
  | "takeAction"
  | "scheduleSpray"
  | "reduceCost"
  | "farmHealth"
  | "highRiskAreas"
  | "compareScans"
  | "simulateDrone"
  | "simulateDiseaseSpread"
  | "treatmentImpact"
  | "noTreatment"
  | "predictYield"
  | "fullAnalysis"
  | "emergency"
  | "reportPdf"
  | "exportData"
  | "plantixComparison";

export type ParsedCommand = {
  intent: CommandIntentId;
  original: string;
  normalized: string;
  confidence: number;
};

export type CommandSuggestion = {
  label: string;
  command: string;
};

export type CommandMetric = {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "watch" | "critical";
};

export type CommandAction = {
  title: string;
  detail: string;
  timing: string;
  tone?: "neutral" | "good" | "watch" | "critical";
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
  printHtml?: string;
};

export type CommandResponse = {
  intent: CommandIntentId;
  title: string;
  summary: string;
  recommendedTab: CommandTab;
  status: "analysis" | "simulation" | "prediction" | "emergency" | "report";
  metrics: CommandMetric[];
  actions: CommandAction[];
  series?: CommandSeries;
  heatmap?: CommandHeatCell[];
  table?: CommandTable;
  exportData?: CommandExport;
  speakText?: string;
};

type RunFarmCommandContext = {
  command: string;
  crop: CropProfile | null;
  intelligence: CropIntelligence;
  result: DetectionResult | null;
  advisor: SmartFarmAdvisor;
  weather: WeatherSummary | null;
  analytics: ScanAnalyticsSummary;
  cropStage: CropStage;
  recentScans: ScanHistoryEntry[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) => `${Math.round(value)}%`;

const cropLabel = (crop: CropProfile | null) => crop?.name ?? "your crop";

const diseaseLabel = (context: RunFarmCommandContext) =>
  context.intelligence.primaryDisease?.name ?? context.result?.disease ?? "field stress";

const stageLabel = (stage: CropStage) =>
  ({
    seedling: "seedling",
    vegetative: "vegetative",
    flowering: "flowering",
    harvest: "harvest-ready",
  })[stage];

const BASELINE_YIELD: Record<CropId, number> = {
  rice: 1200,
  wheat: 1450,
  maize: 2100,
  cotton: 850,
  soybean: 1050,
  tomato: 7200,
  potato: 6800,
  banana: 9000,
};

export const commandSuggestions: CommandSuggestion[] = [
  { label: "Full report", command: "Scan my crop and give me full report" },
  { label: "Future risk", command: "Predict next 5 days disease risk" },
  { label: "Optimize spray", command: "Optimize pesticide usage" },
  { label: "Profit", command: "Show profit analysis for this season" },
  { label: "Crop AI", command: "Recommend best crop for my soil" },
  { label: "Take action", command: "Take action on detected disease" },
  { label: "Spray tomorrow", command: "Schedule spraying for tomorrow morning" },
  { label: "Farm health", command: "Show farm health status" },
  { label: "High-risk map", command: "Display high-risk areas" },
  { label: "Compare scans", command: "Compare last 3 scans" },
  { label: "Drone sim", command: "Simulate drone spray" },
  { label: "Spread sim", command: "Simulate disease spread" },
  { label: "No treatment", command: "What will happen if I do not treat this?" },
  { label: "Yield", command: "Predict yield for this crop" },
  { label: "Emergency", command: "Emergency: crop disease spreading fast" },
  { label: "Export", command: "Generate farm report PDF" },
  { label: "Plantix pitch", command: "Why is my solution better than Plantix?" },
  { label: "Marathi", command: "Maza crop check kar" },
  { label: "Hinglish", command: "Kiti spray lagel?" },
];

const riskTimeline = (baseRisk: number, treatedDrop: number, untreatedRise: number, days = 5) =>
  Array.from({ length: days }, (_, index) => ({
    label: `Day ${index + 1}`,
    primary: clamp(Math.round(baseRisk - treatedDrop * index), 8, 98),
    secondary: clamp(Math.round(baseRisk + untreatedRise * index), 8, 99),
  }));

const yieldEstimate = (crop: CropProfile | null, advisor: SmartFarmAdvisor) => {
  const base = BASELINE_YIELD[crop?.id ?? "tomato"];
  const factor = clamp((advisor.cropHealthScore / 100) * (1 - advisor.riskScore / 180), 0.35, 0.98);
  return Math.round(base * factor);
};

const buildHeatmap = (result: DetectionResult | null): CommandHeatCell[] => {
  if (result?.hotspots?.length) {
    return result.hotspots.map((hotspot) => ({
      id: hotspot.id,
      label: hotspot.dominantIssue,
      description: `${hotspot.severity}% severity in a ${hotspot.width}% x ${hotspot.height}% canopy zone`,
      severity: hotspot.severity,
      left: hotspot.left,
      top: hotspot.top,
      width: hotspot.width,
      height: hotspot.height,
    }));
  }

  if (!result) return [];

  return [
    {
      id: "whole-canopy",
      label: result.disease,
      description: "The full frame is being treated as one affected zone because no hotspot segmentation was found.",
      severity: clamp(Math.round((result.affectedAreaPct ?? 18) * 1.6), 18, 84),
      left: 12,
      top: 12,
      width: 76,
      height: 76,
    },
  ];
};

const summarizeRecentScans = (recentScans: ScanHistoryEntry[]) => {
  const lastThree = recentScans.slice(0, 3);
  const averageConfidence = lastThree.length
    ? Math.round(lastThree.reduce((sum, entry) => sum + entry.confidence, 0) / lastThree.length)
    : 0;

  return {
    lastThree,
    averageConfidence,
    infectedCount: lastThree.filter((entry) => entry.category !== "healthy").length,
  };
};

const createReportHtml = (response: CommandResponse) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${response.title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #102418; }
      h1 { margin-bottom: 8px; }
      p { line-height: 1.5; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
      .card { border: 1px solid #d7e4da; border-radius: 14px; padding: 14px; }
      .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #557060; }
      .value { font-size: 24px; font-weight: bold; margin-top: 6px; }
      ul { padding-left: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 18px; }
      th, td { border: 1px solid #d7e4da; padding: 10px; text-align: left; }
      th { background: #f2f8f4; }
    </style>
  </head>
  <body>
    <h1>${response.title}</h1>
    <p>${response.summary}</p>
    <div class="grid">
      ${response.metrics.map((metric) => `
        <div class="card">
          <div class="label">${metric.label}</div>
          <div class="value">${metric.value}</div>
        </div>
      `).join("")}
    </div>
    <h2>Action plan</h2>
    <ul>
      ${response.actions.map((action) => `<li><strong>${action.title}</strong> (${action.timing}) - ${action.detail}</li>`).join("")}
    </ul>
    ${response.table ? `
      <h2>${response.table.title}</h2>
      <table>
        <thead>
          <tr>${response.table.columns.map((column) => `<th>${column}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${response.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    ` : ""}
  </body>
</html>
`;

const parserRules: Array<{ intent: CommandIntentId; score: number; tokens: string[] }> = [
  { intent: "plantixComparison", score: 0.99, tokens: ["plantix", "better than existing apps", "judge killer"] },
  { intent: "emergency", score: 0.98, tokens: ["emergency", "spreading fast", "fast spread"] },
  { intent: "reportPdf", score: 0.98, tokens: ["report pdf", "generate farm report", "print report"] },
  { intent: "exportData", score: 0.98, tokens: ["export data", "download data", "export json"] },
  { intent: "simulateDiseaseSpread", score: 0.97, tokens: ["simulate disease spread", "disease spread"] },
  { intent: "simulateDrone", score: 0.97, tokens: ["simulate drone spray", "drone spray"] },
  { intent: "treatmentImpact", score: 0.96, tokens: ["impact after treatment", "after treatment", "treatment impact"] },
  { intent: "noTreatment", score: 0.96, tokens: ["do not treat", "don't treat", "if i don't treat", "what will happen if i dont treat"] },
  { intent: "compareScans", score: 0.95, tokens: ["compare last 3 scans", "compare scans", "last 3 scans"] },
  { intent: "highRiskAreas", score: 0.95, tokens: ["high-risk areas", "high risk areas", "hotspot", "affected areas"] },
  { intent: "farmHealth", score: 0.95, tokens: ["farm health status", "health status"] },
  { intent: "scheduleSpray", score: 0.95, tokens: ["schedule spraying", "schedule spray", "tomorrow morning"] },
  { intent: "takeAction", score: 0.95, tokens: ["take action", "action on detected disease"] },
  { intent: "reduceCost", score: 0.94, tokens: ["reduce cost by 20%", "reduce cost", "save cost"] },
  { intent: "futureRisk", score: 0.94, tokens: ["next 5 days disease risk", "future risk analysis", "future disease warning", "predict next 5 days"] },
  { intent: "predictYield", score: 0.94, tokens: ["predict yield", "yield for this crop"] },
  { intent: "optimizePesticide", score: 0.93, tokens: ["optimize pesticide", "optimize pesticide usage", "kiti spray", "how much spray"] },
  { intent: "profitAnalysis", score: 0.93, tokens: ["profit analysis", "this season", "profit for this season"] },
  { intent: "recommendCrop", score: 0.92, tokens: ["recommend best crop", "best crop for my soil", "crop recommendation"] },
  { intent: "fullAnalysis", score: 0.92, tokens: ["run full farm analysis", "optimize everything", "complete farming plan"] },
  { intent: "fullReport", score: 0.9, tokens: ["full report", "scan my crop", "maza crop check kar", "kay problem aahe", "check my crop"] },
];

export const parseFarmCommand = (input: string): ParsedCommand => {
  const normalized = input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  const rule = parserRules.find((entry) => entry.tokens.some((token) => normalized.includes(token)));

  return {
    intent: rule?.intent ?? "fullAnalysis",
    original: input,
    normalized,
    confidence: rule?.score ?? 0.62,
  };
};

const buildBaseActions = (context: RunFarmCommandContext): CommandAction[] => {
  const issue = diseaseLabel(context);
  const weatherLine = context.weather?.recommendation === "do_not_spray"
    ? "Wait for a dry window before chemical application."
    : "Weather supports a targeted intervention window.";

  return [
    {
      title: "Isolate the affected canopy",
      detail: `Scout around the ${issue} zones first so the spray plan stays limited to infected leaves.`,
      timing: "Now",
      tone: "critical",
    },
    {
      title: "Use precision application",
      detail: `${weatherLine} Focus only on hotspot cells instead of full-field coverage.`,
      timing: "Next 12 hours",
      tone: "good",
    },
    {
      title: "Log the next verification scan",
      detail: "Capture another scan after treatment so the dashboard can confirm whether severity is falling.",
      timing: "After treatment",
      tone: "neutral",
    },
  ];
};

const buildReportPayload = (response: CommandResponse) => ({
  generatedAt: new Date().toISOString(),
  response,
});

export const runFarmCommand = (context: RunFarmCommandContext): CommandResponse => {
  const parsed = parseFarmCommand(context.command);
  const cropName = cropLabel(context.crop);
  const issue = diseaseLabel(context);
  const heatmap = buildHeatmap(context.result);
  const recent = summarizeRecentScans(context.recentScans);
  const nextYield = yieldEstimate(context.crop, context.advisor);
  const savingsDelta = context.advisor.profit.currentInputCost - context.advisor.profit.optimizedInputCost;
  const baseMetrics: CommandMetric[] = [
    { label: "Crop", value: cropName },
    { label: "Diagnosis", value: issue },
    { label: "Health score", value: formatPercent(context.advisor.cropHealthScore), tone: context.advisor.cropHealthScore >= 70 ? "good" : "watch" },
    { label: "Risk score", value: formatPercent(context.advisor.riskScore), tone: context.advisor.riskScore >= 70 ? "critical" : "watch" },
  ];

  const responseFor = (response: Omit<CommandResponse, "exportData"> & { includeExport?: boolean }): CommandResponse => {
    const { includeExport, ...rest } = response;
    const payload = buildReportPayload({
      ...rest,
      exportData: undefined,
    });

    return {
      ...rest,
      exportData: includeExport
        ? {
            filename: `${parsed.intent}-${new Date().toISOString().slice(0, 10)}.json`,
            mimeType: "application/json",
            data: JSON.stringify(payload, null, 2),
            printHtml: createReportHtml(rest as CommandResponse),
          }
        : undefined,
    };
  };

  switch (parsed.intent) {
    case "fullReport":
    case "fullAnalysis":
      return responseFor({
        intent: parsed.intent,
        title: "Full farm intelligence report",
        summary: `${cropName} is currently showing ${issue}. The command engine is combining diagnosis, crop stage, weather, market strategy, and direct actions into one demo-ready report.`,
        recommendedTab: "dashboard",
        status: "analysis",
        metrics: [
          ...baseMetrics,
          { label: "Offline sync queue", value: String(context.advisor.offline.pendingSyncCount) },
          { label: "Estimated savings", value: formatCurrency(context.advisor.profit.savings), tone: "good" },
        ],
        actions: buildBaseActions(context),
        series: {
          title: "5-day risk outlook",
          mode: "line",
          primaryLabel: "Treated",
          secondaryLabel: "Untreated",
          points: riskTimeline(context.advisor.prediction.riskScore, 11, 7),
        },
        heatmap,
        includeExport: true,
        speakText: `${cropName} shows ${issue}. Risk is ${context.advisor.riskScore} percent and the recommended next step is targeted action, not blanket spraying.`,
      });

    case "futureRisk":
      return responseFor({
        intent: parsed.intent,
        title: "Future disease warning",
        summary: `The next 5 days look ${context.advisor.prediction.status === "critical" ? "volatile" : "manageable"} for ${cropName}. Weather, field history, crop stage, and live symptoms were all used in this forecast.`,
        recommendedTab: "dashboard",
        status: "prediction",
        metrics: [
          { label: "5-day peak risk", value: formatPercent(clamp(context.advisor.prediction.riskScore + 18, 0, 99)), tone: "critical" },
          { label: "Current stage", value: stageLabel(context.cropStage) },
          { label: "Weather trigger", value: context.weather?.description ?? "No live weather feed" },
        ],
        actions: [
          { title: "Scout before sunrise", detail: "Early moisture and fresh lesions are easiest to detect in morning light.", timing: "Tomorrow 6:00 AM", tone: "watch" },
          { title: "Protect healthy rows first", detail: "Prioritize clean canopy edges before visible lesions jump inward.", timing: "Tomorrow morning", tone: "good" },
          { title: "Re-run predictive scan", detail: "Use a new leaf scan in 48 hours to verify whether the risk curve is falling.", timing: "48 hours", tone: "neutral" },
        ],
        series: {
          title: "Treated vs untreated disease risk",
          mode: "line",
          primaryLabel: "Managed risk",
          secondaryLabel: "No treatment",
          points: riskTimeline(context.advisor.prediction.riskScore, 9, 8),
        },
        speakText: `Five-day disease risk for ${cropName} can climb quickly if you wait. The safer move is early targeted intervention and another scan in forty eight hours.`,
      });

    case "optimizePesticide":
    case "reduceCost":
      return responseFor({
        intent: parsed.intent,
        title: "Spray and cost optimizer",
        summary: `The optimizer recommends precision treatment instead of blanket spraying. Based on the current advisor profile, you can cut input spend while still protecting the healthiest canopy.`,
        recommendedTab: "market",
        status: "analysis",
        metrics: [
          { label: "Current input cost", value: formatCurrency(context.advisor.profit.currentInputCost) },
          { label: "Optimized cost", value: formatCurrency(context.advisor.profit.optimizedInputCost), tone: "good" },
          { label: "Expected savings", value: formatCurrency(Math.max(savingsDelta, 0)), tone: "good" },
          { label: "Spray coverage", value: `${context.advisor.drone.coveragePct}%` },
        ],
        actions: [
          { title: "Switch to hotspot-only spraying", detail: "Treat only flagged canopy cells to reduce unnecessary product loss.", timing: "Now", tone: "good" },
          { title: "Delay if rain is likely", detail: "Use the next dry window so the dose stays on leaf surfaces instead of washing away.", timing: "Next suitable weather slot", tone: "watch" },
          { title: "Track savings per scan", detail: "Each follow-up scan strengthens the app's proof that your input cost is dropping.", timing: "This week", tone: "neutral" },
        ],
        series: {
          title: "Input spend scenario",
          mode: "bar",
          primaryLabel: "Current",
          secondaryLabel: "Optimized",
          points: [
            { label: "Pesticide", primary: context.advisor.profit.currentInputCost, secondary: context.advisor.profit.optimizedInputCost },
            { label: "Labor", primary: Math.round(context.advisor.profit.currentInputCost * 0.28), secondary: Math.round(context.advisor.profit.optimizedInputCost * 0.2) },
            { label: "Loss avoidance", primary: Math.round(context.advisor.profit.revenueLow * 0.12), secondary: Math.round(context.advisor.profit.revenueLow * 0.18) },
          ],
        },
        speakText: `You can save about ${Math.max(savingsDelta, 0)} rupees by spraying only hotspot zones and waiting for the right weather window.`,
      });

    case "profitAnalysis":
      return responseFor({
        intent: parsed.intent,
        title: "Season profit analysis",
        summary: `${cropName} can still protect a strong season outcome if you keep healthy canopy protected and avoid wasteful broad spraying.`,
        recommendedTab: "market",
        status: "analysis",
        metrics: [
          { label: "Revenue window", value: `${formatCurrency(context.advisor.profit.revenueLow)} - ${formatCurrency(context.advisor.profit.revenueHigh)}` },
          { label: "Input savings", value: formatCurrency(context.advisor.profit.savings), tone: "good" },
          { label: "Predicted yield", value: `${nextYield} kg/acre` },
        ],
        actions: [
          { title: "Protect grade quality", detail: "Market price stays stronger when visible canopy damage does not spread into harvestable output.", timing: "This week", tone: "good" },
          { title: "Watch mandi timing", detail: "Pair the disease recovery plan with stronger demand windows instead of distress selling.", timing: "Before harvest", tone: "neutral" },
        ],
        series: {
          title: "Season outcome estimate",
          mode: "bar",
          primaryLabel: "Low case",
          secondaryLabel: "High case",
          points: [
            { label: "Revenue", primary: context.advisor.profit.revenueLow, secondary: context.advisor.profit.revenueHigh },
            { label: "Savings", primary: context.advisor.profit.savings, secondary: context.advisor.profit.savings + Math.round(savingsDelta * 0.4) },
          ],
        },
      });

    case "recommendCrop":
      return responseFor({
        intent: parsed.intent,
        title: "Crop recommendation AI",
        summary: "The recommendation engine is balancing your inferred soil condition, live weather fit, and market strength to shortlist stronger crop options.",
        recommendedTab: "dashboard",
        status: "analysis",
        metrics: context.advisor.cropRecommendations.slice(0, 3).map((entry) => ({
          label: entry.crop.name,
          value: `${entry.score}% match`,
          tone: entry.score >= 80 ? "good" : "watch",
        })),
        actions: [
          { title: `Top fit: ${context.advisor.cropRecommendations[0]?.crop.name ?? cropName}`, detail: "This option currently has the best combined weather, soil, and demand alignment.", timing: "Plan next sowing", tone: "good" },
          { title: "Keep market demand in the loop", detail: "Use direct-buyer routing before changing crop strategy so the recommendation stays profitable.", timing: "Before crop planning", tone: "neutral" },
        ],
        table: {
          title: "Top crop options",
          columns: ["Crop", "Fit score", "Why it fits"],
          rows: context.advisor.cropRecommendations.slice(0, 3).map((entry) => [
            entry.crop.name,
            `${entry.score}%`,
            entry.reasonCodes.join(", "),
          ]),
        },
      });

    case "takeAction":
    case "scheduleSpray":
      return responseFor({
        intent: parsed.intent,
        title: "Autonomous action plan",
        summary: `The decision engine is treating ${issue} as actionable. It has created a timing, cost, and precision-spray workflow for ${cropName}.`,
        recommendedTab: "precision",
        status: "analysis",
        metrics: [
          { label: "Drone status", value: context.advisor.drone.status.replaceAll("_", " ") },
          { label: "Target zones", value: String(context.advisor.drone.targetZones) },
          { label: "Spray volume", value: `${context.advisor.drone.sprayVolumeMl} ml` },
        ],
        actions: [
          { title: "Pre-check weather and battery", detail: "Confirm conditions before dispatch so the spray stays precise.", timing: "Tomorrow 6:30 AM", tone: "watch" },
          { title: "Dispatch hotspot spray", detail: context.advisor.drone.command, timing: "Tomorrow 7:00 AM", tone: "good" },
          { title: "Verification scan", detail: "Re-scan the same canopy block to quantify improvement.", timing: "Tomorrow evening", tone: "neutral" },
        ],
        heatmap,
        speakText: `Action scheduled. The best spray window is tomorrow morning with ${context.advisor.drone.sprayVolumeMl} milliliters across ${context.advisor.drone.targetZones} target zones.`,
      });

    case "farmHealth":
      return responseFor({
        intent: parsed.intent,
        title: "Farm health status",
        summary: `This is the command-center view of field health for ${cropName}, combining crop condition, disease pressure, weather, and offline readiness.`,
        recommendedTab: "dashboard",
        status: "analysis",
        metrics: [
          ...baseMetrics,
          { label: "Weather", value: context.weather?.description ?? "Unavailable" },
          { label: "Pending sync", value: String(context.advisor.offline.pendingSyncCount) },
        ],
        actions: buildBaseActions(context),
      });

    case "highRiskAreas":
      return responseFor({
        intent: parsed.intent,
        title: "High-risk area map",
        summary: "These are the canopy cells that should get immediate attention first in a precision-farming demo.",
        recommendedTab: "precision",
        status: "analysis",
        metrics: [
          { label: "Hotspot count", value: String(heatmap.length), tone: heatmap.length > 2 ? "critical" : "watch" },
          { label: "Affected area", value: `${Math.round(context.result?.affectedAreaPct ?? context.advisor.drone.coveragePct)}%` },
        ],
        actions: [
          { title: "Treat the darkest cells first", detail: "Start with the highest-severity blocks to slow spread immediately.", timing: "Now", tone: "critical" },
          { title: "Protect healthy perimeter", detail: "Spray the edge around infected cells before the pattern widens.", timing: "Next pass", tone: "good" },
        ],
        heatmap,
      });

    case "compareScans":
      return responseFor({
        intent: parsed.intent,
        title: "Last 3 scan comparison",
        summary: "The command engine is comparing the most recent scans so you can show trend improvement, consistency, and treatment timing to judges.",
        recommendedTab: "dashboard",
        status: "analysis",
        metrics: [
          { label: "Average confidence", value: `${recent.averageConfidence}%` },
          { label: "Infected scans", value: `${recent.infectedCount}/${recent.lastThree.length}` },
        ],
        actions: [
          { title: "Show scan progression", detail: "Use the table below to explain how field condition changes after each action.", timing: "Demo flow", tone: "good" },
        ],
        table: {
          title: "Recent scan timeline",
          columns: ["Scan", "Disease", "Confidence", "Spray"],
          rows: recent.lastThree.map((entry, index) => [
            `Scan ${index + 1}`,
            entry.disease,
            `${entry.confidence}%`,
            entry.spray ? "Yes" : "No",
          ]),
        },
      });

    case "simulateDrone":
      return responseFor({
        intent: parsed.intent,
        title: "Drone spray simulation",
        summary: `This simulation shows how the system would dispatch a precision spray mission for ${cropName} without needing live hardware on stage.`,
        recommendedTab: "precision",
        status: "simulation",
        metrics: [
          { label: "Mission status", value: "Simulated dispatch", tone: "good" },
          { label: "Coverage", value: `${context.advisor.drone.coveragePct}% canopy` },
          { label: "Spray volume", value: `${context.advisor.drone.sprayVolumeMl} ml` },
        ],
        actions: [
          { title: "Map infected cells", detail: "The heatmap becomes the simulated drone route.", timing: "T+00:00", tone: "neutral" },
          { title: "Spray only hotspot zones", detail: "Precision nozzles limit chemical use to affected regions.", timing: "T+00:30", tone: "good" },
          { title: "Post-spray verification", detail: "Follow with a scan to show reduced spread and improved score.", timing: "T+04:00", tone: "good" },
        ],
        series: {
          title: "Simulation timeline",
          mode: "line",
          primaryLabel: "Mission completion",
          secondaryLabel: "Chemical use saved",
          points: [
            { label: "Start", primary: 0, secondary: 0 },
            { label: "Map", primary: 35, secondary: 12 },
            { label: "Spray", primary: 72, secondary: 28 },
            { label: "Finish", primary: 100, secondary: 46 },
          ],
        },
        heatmap,
        speakText: "Drone simulation ready. The system will spray only the infected zones, save chemical, and show a verification scan after treatment.",
      });

    case "simulateDiseaseSpread":
      return responseFor({
        intent: parsed.intent,
        title: "Disease spread simulation",
        summary: "This simulation is useful for hackathon judging because it shows not only detection, but what the disease pattern looks like if left unmanaged.",
        recommendedTab: "precision",
        status: "simulation",
        metrics: [
          { label: "Current risk", value: formatPercent(context.advisor.riskScore), tone: "watch" },
          { label: "Untreated day 5", value: formatPercent(clamp(context.advisor.riskScore + 28, 0, 99)), tone: "critical" },
        ],
        actions: [
          { title: "Use the untreated curve in demo", detail: "This helps judges visualize why prediction matters, not just detection.", timing: "During presentation", tone: "neutral" },
        ],
        series: {
          title: "Projected spread curve",
          mode: "line",
          primaryLabel: "Managed spread",
          secondaryLabel: "Untreated spread",
          points: riskTimeline(context.advisor.riskScore, 4, 11),
        },
        heatmap,
      });

    case "treatmentImpact":
      return responseFor({
        intent: parsed.intent,
        title: "Treatment impact forecast",
        summary: "This forecast shows the expected drop in disease pressure if you follow the precision-treatment plan right away.",
        recommendedTab: "precision",
        status: "prediction",
        metrics: [
          { label: "Expected health recovery", value: `${clamp(context.advisor.cropHealthScore + 14, 0, 99)}%`, tone: "good" },
          { label: "Risk after treatment", value: `${clamp(context.advisor.riskScore - 18, 0, 99)}%`, tone: "good" },
        ],
        actions: [
          { title: "Measure impact with a follow-up scan", detail: "Judges will see treatment proof instead of a static diagnosis screen.", timing: "24-48 hours", tone: "good" },
        ],
        series: {
          title: "Impact after treatment",
          mode: "line",
          primaryLabel: "Risk after treatment",
          secondaryLabel: "Health recovery",
          points: [
            { label: "Now", primary: context.advisor.riskScore, secondary: context.advisor.cropHealthScore },
            { label: "Day 2", primary: clamp(context.advisor.riskScore - 8, 0, 99), secondary: clamp(context.advisor.cropHealthScore + 5, 0, 99) },
            { label: "Day 4", primary: clamp(context.advisor.riskScore - 14, 0, 99), secondary: clamp(context.advisor.cropHealthScore + 10, 0, 99) },
            { label: "Day 6", primary: clamp(context.advisor.riskScore - 18, 0, 99), secondary: clamp(context.advisor.cropHealthScore + 14, 0, 99) },
          ],
        },
      });

    case "noTreatment":
      return responseFor({
        intent: parsed.intent,
        title: "No-treatment scenario",
        summary: `If ${issue} is left untreated, disease pressure is likely to accelerate and cut both yield quality and sale timing for ${cropName}.`,
        recommendedTab: "precision",
        status: "prediction",
        metrics: [
          { label: "Yield at risk", value: `${Math.round((BASELINE_YIELD[context.crop?.id ?? "tomato"] - nextYield) * 0.65)} kg/acre`, tone: "critical" },
          { label: "Potential price hit", value: formatCurrency(Math.round(context.advisor.profit.revenueLow * 0.14)), tone: "critical" },
        ],
        actions: [
          { title: "Do not wait for full-field spread", detail: "A delay now turns a precision problem into a costlier broad-field problem.", timing: "Immediate", tone: "critical" },
        ],
        series: {
          title: "Untreated downside",
          mode: "line",
          primaryLabel: "Risk",
          secondaryLabel: "Yield retention",
          points: [
            { label: "Now", primary: context.advisor.riskScore, secondary: 100 },
            { label: "Day 2", primary: clamp(context.advisor.riskScore + 9, 0, 99), secondary: 97 },
            { label: "Day 4", primary: clamp(context.advisor.riskScore + 16, 0, 99), secondary: 92 },
            { label: "Day 6", primary: clamp(context.advisor.riskScore + 24, 0, 99), secondary: 87 },
          ],
        },
      });

    case "predictYield":
      return responseFor({
        intent: parsed.intent,
        title: "Yield prediction",
        summary: `The current yield projection for ${cropName} stays strongest if crop health improves and disease risk is pulled down over the next spray cycle.`,
        recommendedTab: "market",
        status: "prediction",
        metrics: [
          { label: "Predicted yield", value: `${nextYield} kg/acre`, tone: "good" },
          { label: "Best-case upside", value: `${Math.round(nextYield * 1.12)} kg/acre` },
          { label: "Low-case downside", value: `${Math.round(nextYield * 0.84)} kg/acre`, tone: "watch" },
        ],
        actions: [
          { title: "Protect healthy canopy first", detail: "Yield is preserved by defending unaffected rows, not only by reacting to already damaged leaves.", timing: "This week", tone: "good" },
        ],
        series: {
          title: "Yield outlook",
          mode: "bar",
          primaryLabel: "Scenario A",
          secondaryLabel: "Scenario B",
          points: [
            { label: "Low", primary: Math.round(nextYield * 0.84), secondary: Math.round(nextYield * 0.9) },
            { label: "Base", primary: nextYield, secondary: Math.round(nextYield * 1.04) },
            { label: "High", primary: Math.round(nextYield * 1.08), secondary: Math.round(nextYield * 1.12) },
          ],
        },
      });

    case "emergency":
      return responseFor({
        intent: parsed.intent,
        title: "Emergency response mode",
        summary: `Emergency mode is active. ${issue} may be spreading fast, so the system is prioritizing containment, communication, and next-scan verification.`,
        recommendedTab: "precision",
        status: "emergency",
        metrics: [
          { label: "Priority", value: "High", tone: "critical" },
          { label: "Affected canopy", value: `${Math.round(context.result?.affectedAreaPct ?? context.advisor.drone.coveragePct)}%`, tone: "critical" },
          { label: "Rapid response window", value: "Next 6 hours", tone: "critical" },
        ],
        actions: [
          { title: "Stop blanket movement between blocks", detail: "Reduce mechanical spread until the infected zone is isolated.", timing: "Immediately", tone: "critical" },
          { title: "Dispatch precision spray team", detail: "Treat hotspot zones first and avoid wasting chemical on clean canopy.", timing: "Within 2 hours", tone: "critical" },
          { title: "Send alert to farmer group", detail: "Share the affected pattern so nearby plots can scout early.", timing: "Today", tone: "watch" },
        ],
        heatmap,
        speakText: `Emergency mode active for ${cropName}. Isolate the hotspot area now and dispatch precision spraying within the next two hours.`,
      });

    case "reportPdf":
      return responseFor({
        intent: parsed.intent,
        title: "Printable farm report",
        summary: "The report is ready in a print-friendly format so you can save it as PDF from the browser print dialog.",
        recommendedTab: "assistant",
        status: "report",
        metrics: baseMetrics,
        actions: [
          { title: "Open print preview", detail: "Use the built-in browser print dialog to save a PDF copy.", timing: "Now", tone: "good" },
          { title: "Share with buyers or judges", detail: "The report includes diagnosis, actions, and proof metrics in one clean artifact.", timing: "After export", tone: "neutral" },
        ],
        includeExport: true,
      });

    case "exportData":
      return responseFor({
        intent: parsed.intent,
        title: "Structured data export",
        summary: "The command center is ready to export a JSON snapshot of the current farm state, actions, and command response.",
        recommendedTab: "assistant",
        status: "report",
        metrics: baseMetrics,
        actions: [
          { title: "Download JSON snapshot", detail: "Use the export action to create a portable farm intelligence file.", timing: "Now", tone: "good" },
        ],
        includeExport: true,
      });

    case "plantixComparison":
      return responseFor({
        intent: parsed.intent,
        title: "Hackathon positioning vs Plantix",
        summary: "For judging, the strongest narrative is that this solution does more than diagnosis: it turns a scan into action, simulation, economics, and direct market movement.",
        recommendedTab: "assistant",
        status: "analysis",
        metrics: [
          { label: "Pitch angle", value: "Diagnosis to action loop", tone: "good" },
          { label: "Judge wow factor", value: "High", tone: "good" },
        ],
        actions: [
          { title: "Lead with command center", detail: "Open the demo by speaking a farm command instead of clicking buttons.", timing: "Demo opening", tone: "good" },
          { title: "Show simulation next", detail: "Use drone and disease-spread simulations to make the product feel autonomous.", timing: "Demo middle", tone: "good" },
          { title: "Close with market and scheme impact", detail: "Explain how the app helps the farmer earn, not only detect.", timing: "Demo ending", tone: "good" },
        ],
        table: {
          title: "Positioning table",
          columns: ["Dimension", "Your solution", "Plantix-style benchmark"],
          rows: [
            ["Core flow", "Detection plus command-based action engine", "Diagnosis and advisory workflow"],
            ["Automation feel", "Voice commands, simulations, and auto action plans", "Primarily user-driven navigation"],
            ["Precision spraying", "Drone-ready hotspot planning", "Not the center of the pitch"],
            ["Farmer economics", "Profit optimizer plus direct buyer routes", "Not the main demo story"],
            ["Hackathon demo power", "One command can trigger full farm analysis", "More conventional app journey"],
          ],
        },
        speakText: "Your solution stands out because it does not stop at disease detection. It turns one scan into action, prediction, simulation, and market support in one workflow.",
      });
  }
};
