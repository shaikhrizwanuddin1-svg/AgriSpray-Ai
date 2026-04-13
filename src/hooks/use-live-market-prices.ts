import { useEffect, useState } from "react";
import type { CropProfile } from "@/lib/agriculture-knowledge";
import {
  fetchLiveMarketPrices,
  type LiveMarketPriceResponse,
} from "@/lib/farm-api";

const emptyResponse = (crop = "", location?: string | null): LiveMarketPriceResponse => ({
  mode: "unconfigured",
  sourceLabel: "Backend API unavailable",
  updatedAt: new Date().toISOString(),
  query: { crop, location },
  records: [],
  error: crop ? "No live mandi prices loaded yet." : "Select a crop to load live mandi prices.",
});

export const useLiveMarketPrices = (crop: CropProfile | null, location?: string | null) => {
  const [data, setData] = useState<LiveMarketPriceResponse>(() => emptyResponse(crop?.name ?? "", location));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!crop) {
      setData(emptyResponse("", location));
      return;
    }

    let active = true;
    setLoading(true);

    fetchLiveMarketPrices({ crop: crop.name, location })
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .catch((error) => {
        if (!active) return;
        setData({
          ...emptyResponse(crop.name, location),
          error: error instanceof Error ? error.message : "Unable to load live mandi prices.",
        });
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [crop, location]);

  return {
    data,
    loading,
  };
};
