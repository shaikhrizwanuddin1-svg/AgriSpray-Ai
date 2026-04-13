CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  disease TEXT NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  spray BOOLEAN NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('healthy', 'bacterialBlight', 'leafSpot', 'lateBlight', 'mildStress', 'other')
  )
);

CREATE INDEX IF NOT EXISTS scans_timestamp_idx ON scans (timestamp DESC);
CREATE INDEX IF NOT EXISTS scans_category_idx ON scans (category);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  mobile_number TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL DEFAULT '+91',
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_mobile_number_idx ON users (mobile_number);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY,
  mobile_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_challenges_mobile_number_idx ON otp_challenges (mobile_number, created_at DESC);
CREATE INDEX IF NOT EXISTS otp_challenges_expires_at_idx ON otp_challenges (expires_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);
