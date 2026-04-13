import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type {
  AuthSession,
  AuthenticatedSession,
  AuthUser,
  DetectionResultPayload,
  OtpChallenge,
  ScanHistoryEntry,
} from "./types.js";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? { connectionString }
    : {
        host: process.env.PGHOST ?? "localhost",
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE ?? "agrispray",
        user: process.env.PGUSER ?? "postgres",
        password: process.env.PGPASSWORD ?? "postgres",
      },
);

type DbExecutor = Pool | PoolClient;

const runQuery = <TRow extends QueryResultRow>(db: DbExecutor, text: string, values: unknown[] = []) =>
  db.query<TRow>(text, values);

const AUTH_USER_SELECT = `
  users.id,
  users.mobile_number AS "mobileNumber",
  users.country_code AS "countryCode",
  users.name,
  users.role,
  users.created_at::text AS "createdAt",
  users.updated_at::text AS "updatedAt",
  users.last_login_at::text AS "lastLoginAt"
`;

type AuthenticatedSessionRow = AuthUser & {
  sessionId: string;
  isNewUser?: boolean;
};

const getCategoryForDisease = (disease: string): ScanHistoryEntry["category"] => {
  if (disease === "Healthy") return "healthy";
  if (disease.includes("Bacterial") || disease.includes("Late Blight")) return "bacterialBlight";
  if (disease.includes("Leaf Spot")) return "leafSpot";
  if (disease.includes("Blight")) return "lateBlight";
  if (disease.includes("Stress") || disease.includes("Mild")) return "mildStress";
  return "other";
};

const SPRAY_DISEASES = new Set([
  "Leaf Spot Symptoms Detected",
  "Bacterial Blight / Late Blight",
  "Mild Leaf Stress",
  "Rust / Fungal Infection",
]);

export const mapPayloadToEntry = (payload: DetectionResultPayload): ScanHistoryEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  disease: payload.disease,
  confidence: payload.confidence,
  // enforce correct spray value server-side — never trust client
  spray: SPRAY_DISEASES.has(payload.disease),
  category: getCategoryForDisease(payload.disease),
});

export const getAllScans = async (): Promise<ScanHistoryEntry[]> => {
  const result = await pool.query<ScanHistoryEntry>(
    "SELECT id, timestamp::text AS timestamp, disease, confidence::float AS confidence, spray, category FROM scans ORDER BY timestamp DESC LIMIT 500",
  );
  return result.rows;
};

export const insertScan = async (entry: ScanHistoryEntry) => {
  await pool.query("INSERT INTO scans (id, timestamp, disease, confidence, spray, category) VALUES ($1, $2, $3, $4, $5, $6)", [
    entry.id,
    entry.timestamp,
    entry.disease,
    entry.confidence,
    entry.spray,
    entry.category,
  ]);
};

export const clearScans = async () => {
  await pool.query("DELETE FROM scans");
};

export const cleanupExpiredAuthState = async () => {
  await pool.query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
  await pool.query("DELETE FROM otp_challenges WHERE verified_at IS NOT NULL OR expires_at < NOW() - INTERVAL '1 day'");
};

export const getLatestOtpChallengeByMobileNumber = async (mobileNumber: string) => {
  const result = await pool.query<OtpChallenge>(
    `SELECT
      id,
      mobile_number AS "mobileNumber",
      otp_hash AS "otpHash",
      expires_at::text AS "expiresAt",
      resend_available_at::text AS "resendAvailableAt",
      attempt_count AS "attemptCount",
      max_attempts AS "maxAttempts",
      verified_at::text AS "verifiedAt",
      created_at::text AS "createdAt",
      last_sent_at::text AS "lastSentAt"
    FROM otp_challenges
    WHERE mobile_number = $1
    ORDER BY created_at DESC
    LIMIT 1`,
    [mobileNumber],
  );

  return result.rows[0] ?? null;
};

export const expirePendingOtpChallenges = async (mobileNumber: string) => {
  await pool.query(
    "UPDATE otp_challenges SET expires_at = NOW() WHERE mobile_number = $1 AND verified_at IS NULL AND expires_at > NOW()",
    [mobileNumber],
  );
};

export const createOtpChallenge = async (challenge: {
  id: string;
  mobileNumber: string;
  otpHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
}) => {
  await pool.query(
    `INSERT INTO otp_challenges (
      id,
      mobile_number,
      otp_hash,
      expires_at,
      resend_available_at,
      attempt_count,
      max_attempts,
      last_sent_at
    ) VALUES ($1, $2, $3, $4, $5, 0, 5, NOW())`,
    [challenge.id, challenge.mobileNumber, challenge.otpHash, challenge.expiresAt, challenge.resendAvailableAt],
  );
};

export const getOtpChallengeById = async (challengeId: string) => {
  const result = await pool.query<OtpChallenge>(
    `SELECT
      id,
      mobile_number AS "mobileNumber",
      otp_hash AS "otpHash",
      expires_at::text AS "expiresAt",
      resend_available_at::text AS "resendAvailableAt",
      attempt_count AS "attemptCount",
      max_attempts AS "maxAttempts",
      verified_at::text AS "verifiedAt",
      created_at::text AS "createdAt",
      last_sent_at::text AS "lastSentAt"
    FROM otp_challenges
    WHERE id = $1`,
    [challengeId],
  );

  return result.rows[0] ?? null;
};

export const incrementOtpAttemptCount = async (challengeId: string) => {
  const result = await pool.query<{ attemptCount: number }>(
    `UPDATE otp_challenges
     SET attempt_count = attempt_count + 1
     WHERE id = $1
     RETURNING attempt_count AS "attemptCount"`,
    [challengeId],
  );

  return result.rows[0]?.attemptCount ?? 0;
};

export const markOtpChallengeVerified = async (db: DbExecutor, challengeId: string) => {
  const result = await runQuery<{ verifiedAt: string }>(
    db,
    `UPDATE otp_challenges
     SET verified_at = NOW()
     WHERE id = $1 AND verified_at IS NULL
     RETURNING verified_at::text AS "verifiedAt"`,
    [challengeId],
  );

  return result.rows[0]?.verifiedAt ?? null;
};

export const upsertUserByMobileNumber = async (
  db: DbExecutor,
  payload: { id: string; mobileNumber: string; countryCode: string },
) => {
  const result = await runQuery<AuthUser & { isNewUser: boolean }>(
    db,
    `INSERT INTO users (id, mobile_number, country_code, last_login_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (mobile_number)
     DO UPDATE SET
       country_code = EXCLUDED.country_code,
       updated_at = NOW(),
       last_login_at = NOW()
     RETURNING
       id,
       mobile_number AS "mobileNumber",
       country_code AS "countryCode",
       name,
       role,
       created_at::text AS "createdAt",
       updated_at::text AS "updatedAt",
       last_login_at::text AS "lastLoginAt",
       (xmax = 0) AS "isNewUser"`,
    [payload.id, payload.mobileNumber, payload.countryCode],
  );

  return result.rows[0];
};

export const updateUserName = async (userId: string, name: string) => {
  const result = await pool.query<AuthUser>(
    `UPDATE users SET name = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING
       id,
       mobile_number AS "mobileNumber",
       country_code AS "countryCode",
       name,
       role,
       created_at::text AS "createdAt",
       updated_at::text AS "updatedAt",
       last_login_at::text AS "lastLoginAt"`,
    [name, userId],
  );
  return result.rows[0];
};

export const createAuthSession = async (
  db: DbExecutor,
  payload: { id: string; userId: string; sessionTokenHash: string; expiresAt: Date },
) => {
  const result = await runQuery<AuthSession>(
    db,
    `INSERT INTO auth_sessions (id, user_id, session_token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING
       id,
       user_id AS "userId",
       session_token_hash AS "sessionTokenHash",
       created_at::text AS "createdAt",
       expires_at::text AS "expiresAt",
       last_seen_at::text AS "lastSeenAt"`,
    [payload.id, payload.userId, payload.sessionTokenHash, payload.expiresAt],
  );

  return result.rows[0];
};

export const getAuthenticatedSession = async (sessionTokenHash: string): Promise<AuthenticatedSession | null> => {
  const result = await pool.query<AuthenticatedSessionRow>(
    `SELECT
      auth_sessions.id AS "sessionId",
      ${AUTH_USER_SELECT}
    FROM auth_sessions
    INNER JOIN users ON users.id = auth_sessions.user_id
    WHERE auth_sessions.session_token_hash = $1
      AND auth_sessions.expires_at > NOW()
    LIMIT 1`,
    [sessionTokenHash],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    sessionId: row.sessionId,
    user: {
      id: row.id,
      mobileNumber: row.mobileNumber,
      countryCode: row.countryCode,
      name: row.name,
      role: row.role as "user" | "admin",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt,
    },
  };
};

export const touchAuthSession = async (sessionId: string) => {
  await pool.query("UPDATE auth_sessions SET last_seen_at = NOW() WHERE id = $1", [sessionId]);
};

export const deleteAuthSession = async (sessionTokenHash: string) => {
  await pool.query("DELETE FROM auth_sessions WHERE session_token_hash = $1", [sessionTokenHash]);
};
