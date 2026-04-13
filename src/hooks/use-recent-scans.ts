import { useEffect, useState } from "react";
import { fetchStoredScans, isDatabaseMode } from "@/lib/scan-api";
import {
  readScanHistory,
  SCAN_HISTORY_UPDATED_EVENT,
  type ScanHistoryEntry,
} from "@/lib/scan-history";

export const useRecentScans = (limit = 10) => {
  const [scans, setScans] = useState<ScanHistoryEntry[]>(() => readScanHistory().slice(0, limit));

  useEffect(() => {
    const refresh = async () => {
      try {
        if (isDatabaseMode()) {
          const stored = await fetchStoredScans();
          setScans(stored.slice(0, limit));
          return;
        }
        setScans(readScanHistory().slice(0, limit));
      } catch {
        setScans(readScanHistory().slice(0, limit));
      }
    };

    void refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener(SCAN_HISTORY_UPDATED_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(SCAN_HISTORY_UPDATED_EVENT, refresh);
    };
  }, [limit]);

  return scans;
};
