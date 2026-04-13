import type { MarketPriceRecord, MarketPriceResponse } from "./types.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: MarketPriceResponse }>();

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toString = (value: unknown) => String(value ?? "").trim();

const pick = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim()) {
      return record[key];
    }
  }
  return "";
};

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (insideQuotes && next === "\"") {
        current += "\"";
        index += 1;
        continue;
      }
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const parseCsvRecords = (content: string): MarketPriceRecord[] => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const records = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record = headers.reduce<Record<string, unknown>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
    return record;
  });

  return parseRecords({ records });
};

const parseRecords = (payload: unknown): MarketPriceRecord[] => {
  const source = payload as {
    records?: Array<Record<string, unknown>>;
    result?: { records?: Array<Record<string, unknown>> };
  };

  const records = source.records ?? source.result?.records ?? [];
  if (!Array.isArray(records)) return [];

  return records
    .map((record) => ({
      commodity: toString(pick(record, ["commodity", "Commodity", "commodity_name"])),
      market: toString(pick(record, ["market", "Market", "market_name"])),
      district: toString(pick(record, ["district", "District", "district_name"])),
      state: toString(pick(record, ["state", "State", "state_name"])),
      variety: toString(pick(record, ["variety", "Variety"])),
      grade: toString(pick(record, ["grade", "Grade"])),
      arrivalDate: toString(pick(record, ["arrival_date", "Arrival_Date", "date"])),
      minPrice: toNumber(pick(record, ["min_price", "Min_Price", "minimum_price"])),
      maxPrice: toNumber(pick(record, ["max_price", "Max_Price", "maximum_price"])),
      modalPrice: toNumber(pick(record, ["modal_price", "Modal_Price", "price"])),
      sourceRecord: record,
    }))
    .filter((record) => record.commodity && record.market);
};

const buildFallback = (crop: string, location?: string | null, error?: string): MarketPriceResponse => ({
  mode: process.env.MANDI_PRICE_API_URL
    ? "fallback"
    : "unconfigured",
  sourceLabel: process.env.MANDI_PRICE_API_URL
    ? "Government mandi feed fallback"
    : "Configure government mandi feed",
  sourceUrl: process.env.MANDI_PRICE_API_URL || undefined,
  updatedAt: new Date().toISOString(),
  query: { crop, location },
  records: [],
  error: error ?? "Live mandi feed is not configured in the backend environment.",
});

const buildFeedUrl = (limit: number) => {
  if (!process.env.MANDI_PRICE_API_URL) return null;

  const url = new URL(process.env.MANDI_PRICE_API_URL);
  if (process.env.OGD_API_KEY && !url.searchParams.has("api-key")) {
    url.searchParams.set("api-key", process.env.OGD_API_KEY);
  }
  if (process.env.MANDI_PRICE_RESPONSE_FORMAT && !url.searchParams.has("format")) {
    url.searchParams.set("format", process.env.MANDI_PRICE_RESPONSE_FORMAT);
  }
  if (!url.searchParams.has("offset")) url.searchParams.set("offset", "0");
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", String(limit));

  return url.toString();
};

export const getMarketPrices = async (query: { crop: string; location?: string | null }) => {
  const normalizedCrop = normalize(query.crop);
  const normalizedLocation = normalize(query.location ?? "");
  const cacheKey = `${normalizedCrop}|${normalizedLocation}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = buildFeedUrl(250);
  if (!url) {
    return buildFallback(query.crop, query.location);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AgriSprayAI/1.0",
    },
  });

  if (!response.ok) {
    return buildFallback(query.crop, query.location, `Market feed returned ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();
  let parsed: MarketPriceRecord[] = [];

  try {
    parsed = contentType.includes("json")
      ? parseRecords(JSON.parse(raw) as unknown)
      : parseCsvRecords(raw);
  } catch {
    return buildFallback(query.crop, query.location, "Live mandi feed format could not be parsed.");
  }
  const locationTokens = normalizedLocation.split(/[,\s]+/).filter(Boolean);
  const filtered = parsed
    .filter((record) => normalize(record.commodity).includes(normalizedCrop))
    .filter((record) => (
      locationTokens.length === 0
        || locationTokens.some((token) =>
          normalize(`${record.market} ${record.district} ${record.state}`).includes(token))
    ))
    .sort((a, b) => {
      const dateComparison = String(b.arrivalDate).localeCompare(String(a.arrivalDate));
      if (dateComparison !== 0) return dateComparison;
      return b.modalPrice - a.modalPrice;
    })
    .slice(0, 8);

  const value: MarketPriceResponse = {
    mode: "live",
    sourceLabel: "OGD Platform India / AGMARKNET mandi prices",
    sourceUrl: url,
    updatedAt: new Date().toISOString(),
    query,
    records: filtered,
    error: filtered.length === 0 ? "No recent live mandi prices matched this crop and location filter." : undefined,
  };

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });

  return value;
};
