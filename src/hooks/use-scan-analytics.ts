import { useEffect, useState } from "react";
import { fetchAnalyticsSummary, isDatabaseMode } from "@/lib/scan-api";
import {
  getScanAnalyticsSummary,
  SCAN_HISTORY_UPDATED_EVENT,
  type ScanAnalyticsSummary,
} from "@/lib/scan-history";

export const useScanAnalytics = () => {
  const [summary, setSummary] = useState<ScanAnalyticsSummary>(() => getScanAnalyticsSummary());

  useEffect(() => {
    const refresh = async () => {
      try {
        const next = await fetchAnalyticsSummary();
        setSummary(next);
      } catch (error) {
        if (!isDatabaseMode()) {
          setSummary(getScanAnalyticsSummary());
          return;
        }

        console.error("Failed to load database analytics:", error);
        setSummary({
          todayLabel: new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date()),
          todayScanned: 0,
          totals: {
            scanned: 0,
            infected: 0,
            sprayEvents: 0,
            pesticideSaved: 0,
            moneySavedINR: 0,
            moneySavedLitres: 0,
          },
          weeklyData: [],
          pieData: [],
        });
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
  }, []);

  return summary;
};
