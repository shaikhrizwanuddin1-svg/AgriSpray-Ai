import type {
  CommandExport,
  CommandHeatCell,
  CommandResponse,
  FarmCommandRequest,
} from "./types.js";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const riskTimeline = (baseRisk: number, treatedDrop: number, untreatedRise: number, days = 5) =>
  Array.from({ length: days }, (_, index) => ({
    label: `Day ${index + 1}`,
    primary: clamp(Math.round(baseRisk - treatedDrop * index), 8, 98),
    secondary: clamp(Math.round(baseRisk + untreatedRise * index), 8, 99),
  }));

const normalize = (input: string) =>
  input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

const inferIntent = (command: string) => {
  const input = normalize(command);

  const rules: Array<{ intent: string; tokens: string[] }> = [
    { intent: "plantixComparison", tokens: ["plantix", "better than existing apps", "judge killer"] },
    { intent: "emergency", tokens: ["emergency", "spreading fast", "fast spread"] },
    { intent: "reportPdf", tokens: ["pdf", "farm report", "print report"] },
    { intent: "exportData", tokens: ["export data", "download data", "json"] },
    { intent: "simulateDiseaseSpread", tokens: ["simulate disease spread", "disease spread"] },
    { intent: "simulateDrone", tokens: ["simulate drone spray", "drone spray"] },
    { intent: "treatmentImpact", tokens: ["impact after treatment", "treatment impact"] },
    { intent: "noTreatment", tokens: ["don't treat", "do not treat", "if i dont treat", "if i don't treat"] },
    { intent: "compareScans", tokens: ["compare last 3 scans", "compare scans", "last 3 scans"] },
    { intent: "highRiskAreas", tokens: ["high risk areas", "high-risk areas", "hotspot"] },
    { intent: "farmHealth", tokens: ["farm health", "health status"] },
    { intent: "scheduleSpray", tokens: ["schedule spray", "schedule spraying", "tomorrow morning"] },
    { intent: "takeAction", tokens: ["take action", "action on detected disease"] },
    { intent: "reduceCost", tokens: ["reduce cost", "save cost"] },
    { intent: "futureRisk", tokens: ["predict next 5 days", "future risk", "disease risk"] },
    { intent: "predictYield", tokens: ["predict yield", "yield for this crop"] },
    { intent: "optimizePesticide", tokens: ["optimize pesticide", "optimize pesticide usage", "kiti spray"] },
    { intent: "profitAnalysis", tokens: ["profit analysis", "season profit"] },
    { intent: "recommendCrop", tokens: ["recommend best crop", "best crop for my soil", "crop recommendation"] },
    { intent: "fullReport", tokens: ["full report", "scan my crop", "maza crop check kar", "kay problem aahe"] },
    { intent: "fullAnalysis", tokens: ["full farm analysis", "optimize everything", "complete farming plan"] },
  ];

  return rules.find((rule) => rule.tokens.some((token) => input.includes(token)))?.intent ?? "fullAnalysis";
};

const buildHeatmap = (request: FarmCommandRequest): CommandHeatCell[] => {
  const hotspots = request.context.result?.hotspots ?? [];
  if (hotspots.length > 0) {
    return hotspots.map((hotspot) => ({
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

  if (!request.context.result) return [];

  return [
    {
      id: "whole-canopy",
      label: request.context.result.disease,
      description: "No hotspot segmentation was available, so the frame is treated as one affected zone.",
      severity: clamp(Math.round((request.context.result.affectedAreaPct ?? 18) * 1.7), 18, 84),
      left: 12,
      top: 12,
      width: 76,
      height: 76,
    },
  ];
};

const buildExport = (response: Omit<CommandResponse, "exportData">): CommandExport => ({
  filename: `${response.intent}-${new Date().toISOString().slice(0, 10)}.json`,
  mimeType: "application/json",
  data: JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      response,
    },
    null,
    2,
  ),
});

export const runFarmCommandFromRequest = (request: FarmCommandRequest): CommandResponse => {
  const intent = inferIntent(request.command);
  const cropName = request.context.crop?.name ?? "your crop";
  const disease = request.context.intelligence?.primaryDiseaseName
    ?? request.context.result?.disease
    ?? "field stress";
  const heatmap = buildHeatmap(request);
  const lastThree = request.context.recentScans.slice(0, 3);
  const averageConfidence = lastThree.length
    ? Math.round(lastThree.reduce((sum, scan) => sum + scan.confidence, 0) / lastThree.length)
    : 0;

  const baseResponse = {
    intent,
    title: "Farm command response",
    summary: `${cropName} is currently showing ${disease}.`,
    recommendedTab: "dashboard" as const,
    status: "analysis" as const,
    metrics: [
      { label: "Crop", value: cropName },
      { label: "Diagnosis", value: disease },
      { label: "Health score", value: `${request.context.advisor.cropHealthScore}%` },
      { label: "Risk score", value: `${request.context.advisor.riskScore}%` },
    ],
    actions: [
      {
        title: "Inspect the affected canopy",
        detail: "Start with the visible hotspots before expanding treatment.",
        timing: "Now",
        tone: "critical" as const,
      },
      {
        title: "Use precision application",
        detail: "Target only the affected zones to reduce waste.",
        timing: "Next spray window",
        tone: "good" as const,
      },
    ],
  };

  switch (intent) {
    case "futureRisk": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Future disease warning",
        summary: `The next 5 days show elevated disease pressure for ${cropName} based on current symptoms, weather, and crop stage.`,
        status: "prediction",
        series: {
          title: "5-day risk outlook",
          mode: "line",
          primaryLabel: "Managed risk",
          secondaryLabel: "Untreated risk",
          points: riskTimeline(request.context.advisor.prediction.riskScore, 9, 8),
        },
        actions: [
          {
            title: "Scout at first light",
            detail: "Moisture-driven lesions are easier to spot in the morning.",
            timing: "Tomorrow 6:00 AM",
            tone: "watch",
          },
          {
            title: "Protect healthy canopy early",
            detail: "Treat clean edges before the infection pattern widens.",
            timing: "Tomorrow morning",
            tone: "good",
          },
        ],
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "simulateDrone": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Drone spray simulation",
        summary: `This simulated mission shows how ${cropName} would be sprayed only in affected zones without requiring live drone hardware.`,
        recommendedTab: "precision",
        status: "simulation",
        metrics: [
          { label: "Mission status", value: "Simulated dispatch", tone: "good" },
          { label: "Coverage", value: `${request.context.advisor.drone.coveragePct}%` },
          { label: "Spray volume", value: `${request.context.advisor.drone.sprayVolumeMl} ml` },
        ],
        heatmap,
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
        actions: [
          {
            title: "Map infected cells",
            detail: "Use hotspot zones as the drone route.",
            timing: "T+00:00",
            tone: "neutral",
          },
          {
            title: "Spray only hotspot zones",
            detail: "Precision nozzles reduce chemical waste outside infected regions.",
            timing: "T+00:30",
            tone: "good",
          },
        ],
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "compareScans": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Last 3 scan comparison",
        summary: "Recent scan history has been summarized for trend storytelling and treatment proof.",
        metrics: [
          { label: "Average confidence", value: `${averageConfidence}%` },
          { label: "Infected scans", value: `${lastThree.filter((scan) => scan.category !== "healthy").length}/${lastThree.length}` },
        ],
        table: {
          title: "Recent scan timeline",
          columns: ["Scan", "Disease", "Confidence", "Spray"],
          rows: lastThree.map((scan, index) => [
            `Scan ${index + 1}`,
            scan.disease,
            `${scan.confidence}%`,
            scan.spray ? "Yes" : "No",
          ]),
        },
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "profitAnalysis":
    case "optimizePesticide":
    case "reduceCost": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: intent === "profitAnalysis" ? "Season profit analysis" : "Spray and cost optimizer",
        recommendedTab: "market",
        metrics: [
          { label: "Current input cost", value: formatCurrency(request.context.advisor.profit.currentInputCost) },
          { label: "Optimized cost", value: formatCurrency(request.context.advisor.profit.optimizedInputCost), tone: "good" },
          { label: "Estimated savings", value: formatCurrency(request.context.advisor.profit.savings), tone: "good" },
          { label: "Revenue window", value: `${formatCurrency(request.context.advisor.profit.revenueLow)} - ${formatCurrency(request.context.advisor.profit.revenueHigh)}` },
        ],
        series: {
          title: "Input spend scenario",
          mode: "bar",
          primaryLabel: "Current",
          secondaryLabel: "Optimized",
          points: [
            {
              label: "Pesticide",
              primary: request.context.advisor.profit.currentInputCost,
              secondary: request.context.advisor.profit.optimizedInputCost,
            },
            {
              label: "Labor",
              primary: Math.round(request.context.advisor.profit.currentInputCost * 0.28),
              secondary: Math.round(request.context.advisor.profit.optimizedInputCost * 0.2),
            },
          ],
        },
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "predictYield": {
      const predictedYield = clamp(
        Math.round(1000 * (request.context.advisor.cropHealthScore / 100) * (1 - request.context.advisor.riskScore / 180)),
        350,
        9800,
      );
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Yield prediction",
        recommendedTab: "market",
        status: "prediction",
        summary: `Yield for ${cropName} remains protectable if the disease risk curve is reduced quickly.`,
        metrics: [
          { label: "Predicted yield", value: `${predictedYield} kg/acre`, tone: "good" },
          { label: "Best case", value: `${Math.round(predictedYield * 1.1)} kg/acre` },
          { label: "Low case", value: `${Math.round(predictedYield * 0.84)} kg/acre`, tone: "watch" },
        ],
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "reportPdf": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Printable farm report",
        recommendedTab: "assistant",
        status: "report",
        summary: "The backend can convert this farm command response into a real PDF report.",
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "exportData": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Structured data export",
        recommendedTab: "assistant",
        status: "report",
        summary: "The backend has prepared a portable JSON report snapshot for this command.",
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "plantixComparison": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Hackathon positioning vs Plantix",
        recommendedTab: "assistant",
        summary: "This solution stands out because it moves from detection into action, simulation, economics, and market movement in one flow.",
        table: {
          title: "Positioning table",
          columns: ["Dimension", "Your solution", "Benchmark app"],
          rows: [
            ["Core flow", "Detection plus command-driven action engine", "Diagnosis and advisory flow"],
            ["Automation feel", "Voice, simulation, and action plans", "Mostly app navigation"],
            ["Precision spray", "Hotspot mission planning", "Not the main pitch"],
            ["Farmer income", "Profit plus buyer route support", "Secondary focus"],
          ],
        },
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    case "emergency": {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Emergency response mode",
        recommendedTab: "precision",
        status: "emergency",
        summary: `${disease} may be spreading fast in ${cropName}, so the system is prioritizing containment and rapid response.`,
        heatmap,
        metrics: [
          { label: "Priority", value: "High", tone: "critical" },
          { label: "Affected canopy", value: `${Math.round(request.context.result?.affectedAreaPct ?? request.context.advisor.drone.coveragePct)}%`, tone: "critical" },
          { label: "Response window", value: "Next 6 hours", tone: "critical" },
        ],
        actions: [
          {
            title: "Isolate the infected block",
            detail: "Reduce movement until hotspot zones are contained.",
            timing: "Immediately",
            tone: "critical",
          },
          {
            title: "Dispatch targeted spraying",
            detail: request.context.advisor.drone.command,
            timing: "Within 2 hours",
            tone: "critical",
          },
        ],
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }

    default: {
      const response: Omit<CommandResponse, "exportData"> = {
        ...baseResponse,
        title: "Full farm intelligence report",
        summary: `${cropName} is currently showing ${disease}. The backend command engine combined diagnosis, weather, crop stage, and economics into one report.`,
        metrics: [
          ...baseResponse.metrics,
          { label: "Offline sync queue", value: String(request.context.advisor.offline.pendingSyncCount) },
          { label: "Estimated savings", value: formatCurrency(request.context.advisor.profit.savings), tone: "good" },
        ],
        series: {
          title: "5-day risk outlook",
          mode: "line",
          primaryLabel: "Managed",
          secondaryLabel: "Untreated",
          points: riskTimeline(request.context.advisor.prediction.riskScore, 10, 7),
        },
        heatmap,
      };
      return { ...response, exportData: buildExport(response), speakText: response.summary };
    }
  }
};
