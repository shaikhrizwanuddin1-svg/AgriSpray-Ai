import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import type { SmsDeliveryResult } from "./types.js";

const OTP_EXPIRY_SECONDS = Math.min(60, Math.max(30, Number(process.env.OTP_EXPIRY_SECONDS ?? 60)));
const OTP_RESEND_SECONDS = Math.min(60, Math.max(30, Number(process.env.OTP_RESEND_SECONDS ?? 30)));
const AUTH_SESSION_DAYS = Math.max(1, Number(process.env.AUTH_SESSION_DAYS ?? 30));
const AUTH_SECRET = process.env.AUTH_SECRET ?? "agrispray-dev-auth-secret";
const SMS_PROVIDER = (process.env.SMS_PROVIDER ?? "auto").toLowerCase();

type MobileNumber = {
  e164: string;
  nationalNumber: string;
  countryCode: "+91";
};

export const getOtpExpirySeconds = () => OTP_EXPIRY_SECONDS;
export const getOtpResendSeconds = () => OTP_RESEND_SECONDS;

export const getAuthSessionExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_SESSION_DAYS);
  return expiresAt;
};

export const createOtpChallengeId = () => randomUUID();
export const createAuthSessionId = () => randomUUID();
export const createOtpCode = () => String(randomInt(100000, 1000000));
export const createSessionToken = () => randomBytes(32).toString("hex");

export const hashOtp = (mobileNumber: string, otpCode: string) =>
  createHash("sha256").update(`${AUTH_SECRET}:${mobileNumber}:${otpCode}`).digest("hex");

export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const normalizeIndianMobileNumber = (rawValue: string): MobileNumber | null => {
  const digits = rawValue.replace(/\D/g, "");
  const nationalNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) return null;
  return { e164: `+91${nationalNumber}`, nationalNumber, countryCode: "+91" };
};

// ── MSG91 (free trial OTPs for India) ─────────────────────────────────────
const sendWithMsg91 = async (mobileNumber: string, otpCode: string): Promise<SmsDeliveryResult> => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey) throw new Error("MSG91_AUTH_KEY is not set in backend/.env");
  if (!templateId) throw new Error("MSG91_TEMPLATE_ID is not set in backend/.env");

  const nationalNumber = mobileNumber.replace(/^\+/, ""); // MSG91 wants 91XXXXXXXXXX

  const response = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile: nationalNumber,
      otp: otpCode,
    }),
  });

  const text = await response.text();
  let data: { type?: string; message?: string } = {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as { type?: string; message?: string };
    }
  } catch { /* ignore */ }

  if (!response.ok || data.type === "error") {
    throw new Error(data.message || `MSG91 error: ${response.status}`);
  }

  return { provider: "twilio", mode: "sms" };
};

// ── Fast2SMS ────────────────────────────────────────────────────────────────
const sendWithFast2Sms = async (mobileNumber: string, otpCode: string): Promise<SmsDeliveryResult> => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error("FAST2SMS_API_KEY is not set in backend/.env");

  // strip +91 prefix — Fast2SMS wants 10-digit national number
  const nationalNumber = mobileNumber.replace(/^\+91/, "");

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message: `Your AgriSpray OTP is ${otpCode}. Valid for ${OTP_EXPIRY_SECONDS} seconds. Do not share it.`,
      language: "english",
      flash: 0,
      numbers: nationalNumber,
    }),
  });

  const text = await response.text();
  let data: { return?: boolean; message?: unknown } = {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as { return?: boolean; message?: unknown };
    }
  } catch { /* ignore */ }

  if (!response.ok || data.return === false) {
    const msg = Array.isArray(data.message)
      ? (data.message as string[]).join(", ")
      : typeof data.message === "string"
      ? data.message
      : `Fast2SMS error: ${response.status}`;
    throw new Error(msg);
  }

  return { provider: "twilio", mode: "sms" }; // reuse existing type shape
};

// ── Twilio ──────────────────────────────────────────────────────────────────
const sendWithTwilio = async (mobileNumber: string, otpCode: string): Promise<SmsDeliveryResult> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken) throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.");
  if (!fromNumber && !messagingServiceSid) throw new Error("TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID is required.");

  const params = new URLSearchParams({
    To: mobileNumber,
    Body: `${otpCode} is your AgriSpray OTP. Valid for ${OTP_EXPIRY_SECONDS} seconds. Do not share it.`,
  });
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else if (fromNumber) params.set("From", fromNumber);

  // SSRF guard — validate accountSid is alphanumeric before embedding in URL
  if (!/^AC[a-zA-Z0-9]{32}$/.test(accountSid)) throw new Error("Invalid Twilio Account SID format.");

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const response = await fetch(twilioUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || `Twilio error: ${response.status}`);
  }

  return { provider: "twilio", mode: "sms" };
};

// sanitize string for safe logging — strip newlines to prevent log injection
const sanitizeLog = (s: string) => s.replace(/[\r\n]/g, "_").slice(0, 50);

// ── Main dispatcher ─────────────────────────────────────────────────────────
export const sendOtpCode = async (mobileNumber: string, otpCode: string): Promise<SmsDeliveryResult> => {
  if (SMS_PROVIDER === "console") {
    console.info(`[OTP DEBUG] ${sanitizeLog(mobileNumber)} -> ${sanitizeLog(otpCode)} (expires in ${OTP_EXPIRY_SECONDS}s)`);
    return { provider: "console", mode: "debug", debugOtp: otpCode };
  }

  if (SMS_PROVIDER === "msg91") {
    return sendWithMsg91(mobileNumber, otpCode);
  }

  if (SMS_PROVIDER === "twilio") {
    return sendWithTwilio(mobileNumber, otpCode);
  }

  if (SMS_PROVIDER === "fast2sms") {
    return sendWithFast2Sms(mobileNumber, otpCode);
  }

  // auto: try fast2sms → twilio → console fallback
  if (process.env.FAST2SMS_API_KEY) {
    return sendWithFast2Sms(mobileNumber, otpCode);
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return sendWithTwilio(mobileNumber, otpCode);
  }

  // no credentials at all — fall back to console debug
  console.info(`[OTP DEBUG] ${sanitizeLog(mobileNumber)} -> ${sanitizeLog(otpCode)} (expires in ${OTP_EXPIRY_SECONDS}s)`);
  return { provider: "console", mode: "debug", debugOtp: otpCode };
};
