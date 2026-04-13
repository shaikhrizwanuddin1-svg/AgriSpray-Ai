import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// SSRF guard: only allow PostgreSQL connections to prevent the connection
// string from being redirected to internal network addresses (CWE-918)
const parsedDbUrl = (() => {
  try {
    return new URL(rawDatabaseUrl);
  } catch {
    console.error("DATABASE_URL is not a valid URL.");
    process.exit(1);
  }
})();

if (parsedDbUrl.protocol !== "postgresql:" && parsedDbUrl.protocol !== "postgres:") {
  console.error("DATABASE_URL must use the postgresql:// or postgres:// scheme.");
  process.exit(1);
}

const ALLOWED_DB_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const hostname = parsedDbUrl.hostname.toLowerCase();
const isPrivateNetwork =
  hostname.startsWith("10.") ||
  hostname.startsWith("172.") ||
  hostname.startsWith("192.168.") ||
  hostname === "0.0.0.0";

if (isPrivateNetwork && !ALLOWED_DB_HOSTS.has(hostname)) {
  console.error("DATABASE_URL points to a disallowed private network address.");
  process.exit(1);
}

const pool = new Pool({ connectionString: rawDatabaseUrl });

async function migrate() {
  const client = await pool.connect();
  try {
    const schema = readFileSync(join(__dirname, "sql", "schema.sql"), "utf8");
    await client.query(schema);
    console.log("Schema applied.");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT");
    console.log("Migration done: users.name column ensured.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => { console.error("Migration failed:", err.message); process.exit(1); });
