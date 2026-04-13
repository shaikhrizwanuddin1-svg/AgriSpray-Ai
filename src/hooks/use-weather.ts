import { useCallback, useEffect, useState } from "react";
import type { Language } from "@/i18n";

export type WeatherSummary = {
  locationName: string;
  lat: number;
  lon: number;
  condition: string;
  description: string;
  temperatureC: number;
  humidity: number;
  windSpeed: number;
  recommendation: "spray_recommended" | "do_not_spray";
};

type WeatherState = {
  coordinates: { lat: number; lon: number } | null;
  weather: WeatherSummary | null;
  loading: boolean;
  error: string | null;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const buildWeatherUrl = (lat: number, lon: number, language: Language) => {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), lang: language });
  return `${API_BASE_URL}/weather?${params.toString()}`;
};

// search city by name using Open-Meteo geocoding
export const searchCity = async (cityName: string): Promise<{ lat: number; lon: number; name: string } | null> => {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ latitude: number; longitude: number; name: string }> };
    const r = data.results?.[0];
    if (!r) return null;
    return { lat: r.latitude, lon: r.longitude, name: r.name };
  } catch {
    return null;
  }
};

const SAVED_LOCATION_KEY = "agrispray-saved-location";

type SavedLocation = { lat: number; lon: number; name: string };

const getSavedLocation = (): SavedLocation | null => {
  try {
    const raw = localStorage.getItem(SAVED_LOCATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedLocation;
  } catch { return null; }
};

export const saveLocation = (lat: number, lon: number, name: string) => {
  localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify({ lat, lon, name }));
};

export const clearSavedLocation = () => localStorage.removeItem(SAVED_LOCATION_KEY);

// one-time fix: clear any wrongly cached location so GPS retries fresh
const fixCachedLocation = () => {
  try {
    const raw = localStorage.getItem(SAVED_LOCATION_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as SavedLocation;
    // Aurangabad coordinates range — clear if wrong city was cached
    const isAurangabad =
      saved.lat > 19.8 && saved.lat < 20.0 &&
      saved.lon > 75.2 && saved.lon < 75.5;
    if (isAurangabad) {
      localStorage.removeItem(SAVED_LOCATION_KEY);
    }
  } catch { /* ignore */ }
};
fixCachedLocation();

export const useWeather = (language: Language) => {
  const [state, setState] = useState<WeatherState>({
    coordinates: null,
    weather: null,
    loading: true,
    error: null,
  });

  const fetchWeatherForCoords = useCallback(async (lat: number, lon: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(buildWeatherUrl(lat, lon, language));
      if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
      const weather = (await response.json()) as WeatherSummary;
      // save location so it persists next time
      saveLocation(lat, lon, weather.locationName);
      setState({ coordinates: { lat, lon }, weather, loading: false, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Weather unavailable",
      }));
    }
  }, [language]);

  useEffect(() => {
    // use saved location first if available
    const saved = getSavedLocation();
    if (saved) {
      void fetchWeatherForCoords(saved.lat, saved.lon);
      return;
    }

    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, loading: false, error: "Geolocation unavailable" }));
      return;
    }

    let attempts = 0;
    const maxAttempts = 3;

    const tryGetLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // if accuracy is too poor (>5km) and we have retries left, try again
          if (position.coords.accuracy > 5000 && attempts < maxAttempts - 1) {
            attempts += 1;
            setTimeout(tryGetLocation, 1000);
            return;
          }
          void fetchWeatherForCoords(
            Number(position.coords.latitude.toFixed(4)),
            Number(position.coords.longitude.toFixed(4)),
          );
        },
        () => {
          if (attempts < maxAttempts - 1) {
            attempts += 1;
            setTimeout(tryGetLocation, 1500);
            return;
          }
          setState({ coordinates: null, weather: null, loading: false, error: "Location access denied. Type your city below." });
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
      );
    };

    tryGetLocation();
  }, [fetchWeatherForCoords]);

  return { ...state, fetchWeatherForCoords };
};
