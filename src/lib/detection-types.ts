export type DetectionCandidate = {
  disease: string;
  confidence: number;
};

export type DetectionHotspot = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  severity: number;
  dominantIssue: string;
};

export type DetectionResult = {
  disease: string;
  confidence: number;
  spray: boolean;
  capturedImage: string;
  details: string;
  candidates?: DetectionCandidate[];
  hotspots?: DetectionHotspot[];
  affectedAreaPct?: number;
  analysisMode?: "heuristic" | "ml-assisted";
};
