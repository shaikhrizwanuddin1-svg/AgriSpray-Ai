import "dotenv/config";
import { randomUUID, timingSafeEqual } from "node:crypto";
import cors from "cors";
import express from "express";
import {
  createAuthSessionId,
  createOtpChallengeId,
  createOtpCode,
  createSessionToken,
  getAuthSessionExpiry,
  getOtpExpirySeconds,
  getOtpResendSeconds,
  hashOtp,
  hashSessionToken,
  normalizeIndianMobileNumber,
  sendOtpCode,
} from "./auth.js";
import { buildAnalyticsSummary } from "./analytics.js";
import {
  cleanupExpiredAuthState,
  clearScans,
  createAuthSession,
  createOtpChallenge,
  deleteAuthSession,
  expirePendingOtpChallenges,
  getAllScans,
  getAuthenticatedSession,
  getLatestOtpChallengeByMobileNumber,
  getOtpChallengeById,
  incrementOtpAttemptCount,
  insertScan,
  mapPayloadToEntry,
  markOtpChallengeVerified,
  pool,
  touchAuthSession,
  updateUserName,
  upsertUserByMobileNumber,
} from "./db.js";
import { runFarmCommandFromRequest } from "./farm-command-service.js";
import { getMarketPrices } from "./market-prices.js";
import { buildFarmReportPdf } from "./report-pdf.js";
import type { CommandResponse, DetectionResultPayload, FarmCommandRequest } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
const otpExpirySeconds = getOtpExpirySeconds();
const otpResendSeconds = getOtpResendSeconds();

const getSessionToken = (req: express.Request) => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
};

const allowedOrigins = corsOrigin === "*"
  ? true
  : [corsOrigin, corsOrigin.replace("127.0.0.1", "localhost"), corsOrigin.replace("localhost", "127.0.0.1")];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// CSRF protection — reject state-changing requests without matching Origin/Referer
app.use((req, res, next) => {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  if (safeMethods.has(req.method)) { next(); return; }
  const origin = req.headers.origin ?? req.headers.referer ?? "";
  const allowed = Array.isArray(allowedOrigins)
    ? allowedOrigins.some((o) => origin.startsWith(o))
    : true; // wildcard — allow all
  if (!allowed) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
});

// sanitize string for safe logging
const sanitizeLog = (s: unknown) => String(s).replace(/[\r\n]/g, "_").slice(0, 100);

// SSRF guard — only allow requests to known external APIs
const ALLOWED_HOSTS = new Set([
  "api.openweathermap.org",
  "api.open-meteo.com",
  "nominatim.openstreetmap.org",
  "api.data.gov.in",
  "data.gov.in",
  "www.data.gov.in",
]);
const validateExternalUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    if (!ALLOWED_HOSTS.has(hostname)) throw new Error(`Blocked host: ${hostname}`);
  } catch {
    throw new Error("Invalid or disallowed external URL");
  }
};

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "PostgreSQL" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Database unreachable" });
  }
});

app.get("/api/admin/stats", async (req, res, next) => {
  try {
    const sessionToken = getSessionToken(req);
    if (!sessionToken) { res.status(401).json({ error: "Unauthorized" }); return; }
    const session = await getAuthenticatedSession(hashSessionToken(sessionToken));
    if (!session || session.user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

    const [usersResult, activeSessionsResult, scansResult, todayScansResult, recentUsersResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE role='user') AS users, COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') AS active_today FROM users WHERE id != 'admin-fixed-id'`),
      pool.query(`SELECT COUNT(*) AS total FROM auth_sessions WHERE expires_at > NOW() AND user_id != 'admin-fixed-id'`),
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE spray=true) AS spray_events, COUNT(*) FILTER (WHERE timestamp::date = CURRENT_DATE) AS today FROM scans`),
      pool.query(`SELECT DATE_TRUNC('day', timestamp) AS day, COUNT(*) AS scans FROM scans WHERE timestamp > NOW() - INTERVAL '7 days' GROUP BY day ORDER BY day`),
      pool.query(`SELECT id, mobile_number AS "mobileNumber", name, last_login_at AS "lastLoginAt", created_at AS "createdAt" FROM users WHERE id != 'admin-fixed-id' ORDER BY last_login_at DESC NULLS LAST LIMIT 10`),
    ]);

    res.json({
      users: {
        total: Number(usersResult.rows[0].total),
        activeToday: Number(usersResult.rows[0].active_today),
        activeSessions: Number(activeSessionsResult.rows[0].total),
      },
      scans: {
        total: Number(scansResult.rows[0].total),
        sprayEvents: Number(scansResult.rows[0].spray_events),
        today: Number(scansResult.rows[0].today),
      },
      dailyScans: todayScansResult.rows.map((r) => ({
        day: new Date(r.day).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }),
        scans: Number(r.scans),
      })),
      recentUsers: recentUsersResult.rows,
      systemStatus: {
        database: "PostgreSQL",
        backend: "Online",
        smsProvider: process.env.SMS_PROVIDER ?? "console",
        uptime: Math.round(process.uptime()),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";

    if (!adminPassword) {
      res.status(503).json({ error: "Admin login is not configured." });
      return;
    }

    // constant-time comparison
    const usernameMatch = (() => {
      try { return timingSafeEqual(Buffer.from(username), Buffer.from(adminUsername)); } catch { return false; }
    })();
    const passwordMatch = (() => {
      try { return timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword)); } catch { return false; }
    })();

    if (!usernameMatch || !passwordMatch) {
      res.status(401).json({ error: "Invalid admin credentials." });
      return;
    }

    // upsert admin user in DB
    const client = await pool.connect();
    try {
      const adminId = "admin-fixed-id";
      await client.query(
        `INSERT INTO users (id, mobile_number, country_code, name, role, last_login_at, updated_at)
         VALUES ($1, $2, '+91', 'Administrator', 'admin', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET last_login_at = NOW(), updated_at = NOW()`,
        [adminId, "admin"]
      );

      const sessionToken = createSessionToken();
      await client.query(
        `INSERT INTO auth_sessions (id, user_id, session_token_hash, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '1 day')
         ON CONFLICT DO NOTHING`,
        [randomUUID(), adminId, hashSessionToken(sessionToken)]
      );

      res.json({
        token: sessionToken,
        user: {
          id: adminId,
          mobileNumber: "admin",
          countryCode: "+91",
          name: "Administrator",
          role: "admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/send-otp", async (req, res, next) => {
  try {
    await cleanupExpiredAuthState();

    const mobile = normalizeIndianMobileNumber(typeof req.body?.mobileNumber === "string" ? req.body.mobileNumber : "");
    if (!mobile) {
      res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
      return;
    }

    const latestChallenge = await getLatestOtpChallengeByMobileNumber(mobile.e164);
    if (latestChallenge && !latestChallenge.verifiedAt) {
      const resendAvailableAt = new Date(latestChallenge.resendAvailableAt);
      if (!Number.isNaN(resendAvailableAt.getTime()) && resendAvailableAt.getTime() > Date.now()) {
        const waitSeconds = Math.max(1, Math.ceil((resendAvailableAt.getTime() - Date.now()) / 1000));
        res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting another OTP.` });
        return;
      }
    }

    const challengeId = createOtpChallengeId();
    const otpCode = createOtpCode();
    const expiresAt = new Date(Date.now() + otpExpirySeconds * 1000);
    const resendAvailableAt = new Date(Date.now() + otpResendSeconds * 1000);

    await expirePendingOtpChallenges(mobile.e164);
    await createOtpChallenge({
      id: challengeId,
      mobileNumber: mobile.e164,
      otpHash: hashOtp(mobile.e164, otpCode),
      expiresAt,
      resendAvailableAt,
    });

    try {
      const delivery = await sendOtpCode(mobile.e164, otpCode);
      res.json({
        challengeId,
        expiresAt: expiresAt.toISOString(),
        resendAvailableAt: resendAvailableAt.toISOString(),
        expiresInSeconds: otpExpirySeconds,
        resendInSeconds: otpResendSeconds,
        delivery,
      });
    } catch (smsError) {
      await pool.query("DELETE FROM otp_challenges WHERE id = $1", [challengeId]);
      throw smsError;
    }
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-otp", async (req, res, next) => {
  try {
    await cleanupExpiredAuthState();

    const mobile = normalizeIndianMobileNumber(typeof req.body?.mobileNumber === "string" ? req.body.mobileNumber : "");
    const challengeId = typeof req.body?.challengeId === "string" ? req.body.challengeId : "";
    const otpCode = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!mobile) {
      res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
      return;
    }

    if (!challengeId) {
      res.status(400).json({ error: "Request an OTP before verifying." });
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      res.status(400).json({ error: "Enter the 6-digit OTP sent to your phone." });
      return;
    }

    const challenge = await getOtpChallengeById(challengeId);
    if (!challenge || challenge.mobileNumber !== mobile.e164) {
      res.status(404).json({ error: "OTP session not found. Request a new code." });
      return;
    }

    if (challenge.verifiedAt) {
      res.status(400).json({ error: "This OTP has already been used. Request a new code." });
      return;
    }

    const expiresAt = new Date(challenge.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      res.status(400).json({ error: "OTP expired. Please resend and try again." });
      return;
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      res.status(429).json({ error: "Too many incorrect OTP attempts. Request a new code." });
      return;
    }

    // constant-time comparison to prevent timing attacks (CWE-807)
    const computedHash = hashOtp(mobile.e164, otpCode);
    const hashesMatch = (() => {
      try {
        return timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(challenge.otpHash, "hex"));
      } catch {
        return false;
      }
    })();

    if (!hashesMatch) {
      const attemptCount = await incrementOtpAttemptCount(challenge.id);
      const attemptsRemaining = Math.max(0, challenge.maxAttempts - attemptCount);

      if (attemptsRemaining === 0) {
        res.status(429).json({ error: "Too many incorrect OTP attempts. Request a new code." });
        return;
      }

      res.status(400).json({
        error: `Incorrect OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
      });
      return;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const verifiedAt = await markOtpChallengeVerified(client, challenge.id);
      if (!verifiedAt) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "This OTP was already used. Request a new code." });
        return;
      }

      const user = await upsertUserByMobileNumber(client, {
        id: randomUUID(),
        mobileNumber: mobile.e164,
        countryCode: mobile.countryCode,
      });

      const sessionToken = createSessionToken();
      await createAuthSession(client, {
        id: createAuthSessionId(),
        userId: user.id,
        sessionTokenHash: hashSessionToken(sessionToken),
        expiresAt: getAuthSessionExpiry(),
      });

      await client.query("COMMIT");

      res.json({
        token: sessionToken,
        redirectTo: "/dashboard",
        isNewUser: user.isNewUser ?? false,
        user,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

app.patch("/api/auth/profile", async (req, res, next) => {
  try {
    const sessionToken = getSessionToken(req);
    if (!sessionToken) {
      res.status(401).json({ error: "Missing session token." });
      return;
    }

    const session = await getAuthenticatedSession(hashSessionToken(sessionToken));
    if (!session) {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length < 2) {
      res.status(400).json({ error: "Name must be at least 2 characters." });
      return;
    }

    const user = await updateUserName(session.user.id, name);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/session", async (req, res, next) => {
  try {
    await cleanupExpiredAuthState();

    const sessionToken = getSessionToken(req);
    if (!sessionToken) {
      res.status(401).json({ error: "Missing session token." });
      return;
    }

    const session = await getAuthenticatedSession(hashSessionToken(sessionToken));
    if (!session) {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }

    await touchAuthSession(session.sessionId);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const sessionToken = getSessionToken(req);
    if (sessionToken) {
      await deleteAuthSession(hashSessionToken(sessionToken));
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get("/weather", async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const lang = typeof req.query.lang === "string" ? req.query.lang : "en";

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: "lat and lon are required query parameters" });
      return;
    }

    // always run weather + Nominatim reverse geocoding in parallel
    const weatherUrl = openWeatherApiKey
      ? `https://api.openweathermap.org/data/2.5/weather?${new URLSearchParams({ lat: String(lat), lon: String(lon), appid: openWeatherApiKey, units: "metric", lang }).toString()}`
      : `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code", wind_speed_unit: "ms" }).toString()}`;
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`;

    // validate URLs against SSRF allowlist
    validateExternalUrl(weatherUrl);
    validateExternalUrl(nominatimUrl);

    const [weatherRes, geoRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&addressdetails=1`, {
        headers: { "User-Agent": "AgriSprayAI/1.0" },
      }),
    ]);

    // get accurate city name from Nominatim (ignores OpenWeather city boundaries)
    let locationName = `${lat.toFixed(2)}N, ${lon.toFixed(2)}E`;
    if (geoRes.ok) {
      try {
        const geo = (await geoRes.json()) as { address?: { city?: string; town?: string; village?: string; county?: string; state_district?: string; state?: string } };
        const a = geo.address;
        locationName = a?.city || a?.town || a?.village || a?.county || a?.state_district || a?.state || locationName;
      } catch { /* ignore */ }
    }

    if (!weatherRes.ok) {
      res.status(502).json({ error: "Weather service unavailable" });
      return;
    }

    // parse OpenWeather response
    if (openWeatherApiKey) {
      const data = (await weatherRes.json()) as {
        weather?: Array<{ main?: string; description?: string }>;
        main?: { temp?: number; humidity?: number };
        wind?: { speed?: number };
        coord?: { lat: number; lon: number };
      };
      const main = data.weather?.[0]?.main ?? "Clear";
      const description = data.weather?.[0]?.description ?? main;
      const hasRain = main.toLowerCase().includes("rain") || description.toLowerCase().includes("rain");
      res.json({
        locationName,
        lat: data.coord?.lat ?? lat,
        lon: data.coord?.lon ?? lon,
        condition: main, description,
        temperatureC: Math.round(data.main?.temp ?? 0),
        humidity: Math.round(data.main?.humidity ?? 0),
        windSpeed: Number((data.wind?.speed ?? 0).toFixed(1)),
        recommendation: hasRain ? "do_not_spray" : "spray_recommended",
      });
      return;
    }

    // parse Open-Meteo response
    const meteo = (await weatherRes.json()) as { current?: { temperature_2m?: number; relative_humidity_2m?: number; wind_speed_10m?: number; weather_code?: number } };
    const code = meteo.current?.weather_code ?? 0;
    const rainCodes = new Set([51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]);
    const conditionMap: Record<number, string> = { 0:"Clear",1:"Mainly Clear",2:"Partly Cloudy",3:"Overcast",45:"Foggy",48:"Foggy",51:"Drizzle",53:"Drizzle",55:"Drizzle",61:"Rain",63:"Rain",65:"Heavy Rain",80:"Rain Showers",81:"Rain Showers",82:"Heavy Showers",95:"Thunderstorm",99:"Thunderstorm" };
    const condition = conditionMap[code] ?? "Clear";
    res.json({
      locationName, lat, lon, condition, description: condition,
      temperatureC: Math.round(meteo.current?.temperature_2m ?? 0),
      humidity: Math.round(meteo.current?.relative_humidity_2m ?? 0),
      windSpeed: Number((meteo.current?.wind_speed_10m ?? 0).toFixed(1)),
      recommendation: rainCodes.has(code) ? "do_not_spray" : "spray_recommended",
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/scans", async (_req, res, next) => {
  try {
    const scans = await getAllScans();
    res.json(scans);
  } catch (error) {
    next(error);
  }
});

app.post("/api/scans", async (req, res, next) => {
  try {
    const payload = req.body as DetectionResultPayload;
    if (!payload?.disease || typeof payload.confidence !== "number" || typeof payload.spray !== "boolean") {
      res.status(400).json({ error: "Invalid scan payload" });
      return;
    }
    // strip capturedImage — not stored in DB
    const { capturedImage: _, ...cleanPayload } = payload;
    const entry = mapPayloadToEntry(cleanPayload);
    await insertScan(entry);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

app.get("/api/analytics/summary", async (_req, res, next) => {
  try {
    const scans = await getAllScans();
    res.json(buildAnalyticsSummary(scans));
  } catch (error) {
    next(error);
  }
});

app.post("/api/farm/command", async (req, res, next) => {
  try {
    const payload = req.body as FarmCommandRequest;
    if (!payload?.command || typeof payload.command !== "string" || !payload.context?.advisor || !payload.context?.analytics) {
      res.status(400).json({ error: "Invalid farm command payload" });
      return;
    }

    const response = runFarmCommandFromRequest(payload);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.post("/api/farm/report.pdf", async (req, res, next) => {
  try {
    const response = req.body?.response as CommandResponse | undefined;
    const commandRequest = req.body as Partial<FarmCommandRequest>;

    const finalResponse = response
      ?? (commandRequest.command && commandRequest.context
        ? runFarmCommandFromRequest(commandRequest as FarmCommandRequest)
        : null);

    if (!finalResponse) {
      res.status(400).json({ error: "Send either a command payload or a response payload." });
      return;
    }

    const pdf = await buildFarmReportPdf(finalResponse);
    const safeName = finalResponse.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName || "farm-report"}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

app.get("/api/market-prices", async (req, res, next) => {
  try {
    const crop = typeof req.query.crop === "string" ? req.query.crop.trim() : "";
    const location = typeof req.query.location === "string" ? req.query.location.trim() : "";

    if (!crop) {
      res.status(400).json({ error: "crop is required" });
      return;
    }

    const marketPrices = await getMarketPrices({ crop, location: location || null });
    res.json(marketPrices);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/scans", async (_req, res, next) => {
  try {
    await clearScans();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const raw = error instanceof Error ? error.message : "Unexpected server error";
  const msg = raw.replace(/[<>"'&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;" }[c] ?? c));
  console.error(sanitizeLog(raw));
  res.status(500).json({ error: msg });
});

const runMigrations = async () => {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'))`);
  await pool.query(`
    CREATE OR REPLACE FUNCTION notify_scan_insert()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('scan_inserted', row_to_json(NEW)::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await pool.query(`
    DROP TRIGGER IF EXISTS scan_insert_notify ON scans;
    CREATE TRIGGER scan_insert_notify
    AFTER INSERT ON scans
    FOR EACH ROW EXECUTE FUNCTION notify_scan_insert();
  `);
};

runMigrations()
  .then(() => {
    app.listen(port, () => {
      console.log(`AgriSpray backend running on http://127.0.0.1:${port}`);
    });
  })
  .catch((err: unknown) => {
    console.error("Migration failed:", sanitizeLog(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
