import type { DetectionResult } from "@/lib/detection-types";
import {
  SCAN_HISTORY_UPDATED_EVENT,
  clearLocalScanHistory,
  getScanAnalyticsSummary,
  saveScanResult,
  type ScanAnalyticsSummary,
  type ScanHistoryEntry,
} from "@/lib/scan-history";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

const dispatchRefresh = () => {
  window.dispatchEvent(new Event(SCAN_HISTORY_UPDATED_EVENT));
};

export const isDatabaseMode = () => Boolean(API_BASE_URL);

export const getStorageModeLabel = () => (isDatabaseMode() ? "PostgreSQL API" : "Browser scan history");

export const persistScanResult = async (result: DetectionResult) => {
  if (!isDatabaseMode()) {
    saveScanResult(result);
    return;
  }

  const response = await fetch(buildUrl("/api/scans"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  if (!response.ok) {
    throw new Error(`Failed to save scan to database (${response.status})`);
  }

  dispatchRefresh();
};

export const fetchAnalyticsSummary = async (): Promise<ScanAnalyticsSummary> => {
  if (!isDatabaseMode()) {
    return getScanAnalyticsSummary();
  }

  const response = await fetch(buildUrl("/api/analytics/summary"));
  if (!response.ok) {
    throw new Error(`Failed to fetch database analytics (${response.status})`);
  }

  return response.json() as Promise<ScanAnalyticsSummary>;
};

export const fetchStoredScans = async (): Promise<ScanHistoryEntry[]> => {
  if (!isDatabaseMode()) {
    return [];
  }

  const response = await fetch(buildUrl("/api/scans"));
  if (!response.ok) {
    throw new Error(`Failed to fetch scans from database (${response.status})`);
  }

  return response.json() as Promise<ScanHistoryEntry[]>;
};

export const clearStoredData = async () => {
  if (!isDatabaseMode()) {
    clearLocalScanHistory();
    dispatchRefresh();
    return;
  }

  const response = await fetch(buildUrl("/api/scans"), { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to clear database scan data (${response.status})`);
  }

  dispatchRefresh();
};
