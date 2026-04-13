const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

export type AuthUser = {
  id: string;
  mobileNumber: string;
  countryCode: string;
  name: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isNewUser?: boolean;
};

export type SendOtpResponse = {
  challengeId: string;
  expiresAt: string;
  resendAvailableAt: string;
  expiresInSeconds: number;
  resendInSeconds: number;
  delivery: {
    provider: "twilio" | "console";
    mode: "sms" | "debug";
    debugOtp?: string;
  };
};

export type VerifyOtpResponse = {
  token: string;
  redirectTo: string;
  user: AuthUser;
  isNewUser: boolean;
};

const requestJson = async <T>(path: string, init: RequestInit = {}, token?: string): Promise<T> => {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          message = text;
        }
      }
    } catch { /* ignore */ }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const setUserName = (name: string, token: string) =>
  requestJson<{ user: AuthUser }>("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  }, token);

export const fetchAdminStats = (token: string) =>
  requestJson<{
    users: { total: number; activeToday: number; activeSessions: number };
    scans: { total: number; sprayEvents: number; today: number };
    dailyScans: Array<{ day: string; scans: number }>;
    recentUsers: Array<{ id: string; mobileNumber: string; name: string | null; lastLoginAt: string | null; createdAt: string }>;
    systemStatus: { database: string; backend: string; smsProvider: string; uptime: number };
  }>("/api/admin/stats", { method: "GET" }, token);

export const adminLogin = (payload: { username: string; password: string }) =>
  requestJson<{ token: string; user: AuthUser }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const sendOtp = (mobileNumber: string) =>
  requestJson<SendOtpResponse>("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ mobileNumber }),
  });

export const verifyOtp = (payload: { mobileNumber: string; challengeId: string; otp: string }) =>
  requestJson<VerifyOtpResponse>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchSession = async (token: string) => {
  const response = await requestJson<{ user: AuthUser }>("/api/auth/session", { method: "GET" }, token);
  return response.user;
};

export const logoutSession = (token: string) =>
  requestJson<void>("/api/auth/logout", {
    method: "POST",
  }, token);
