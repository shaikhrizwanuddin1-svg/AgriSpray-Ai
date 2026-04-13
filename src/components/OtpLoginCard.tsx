import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, LoaderCircle, RotateCcw, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendOtp, verifyOtp, setUserName, type VerifyOtpResponse } from "@/lib/auth-api";

type Step = "mobile" | "otp" | "name";

const formatSeconds = (value: number) => {
  const s = Math.max(0, value);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

const OtpLoginCard = () => {
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const { t } = useI18n();

  const [step, setStep] = useState<Step>("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [verifyResponse, setVerifyResponse] = useState<VerifyOtpResponse | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!challengeId) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challengeId]);

  useEffect(() => {
    if (step === "name") nameInputRef.current?.focus();
  }, [step]);

  const expiresInSeconds = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000)) : 0;
  const resendInSeconds = resendAvailableAt ? Math.max(0, Math.ceil((new Date(resendAvailableAt).getTime() - now) / 1000)) : 0;
  const canResend = Boolean(challengeId) && resendInSeconds === 0;
  const isExpired = Boolean(challengeId) && expiresInSeconds === 0;

  const resetToMobile = () => {
    setChallengeId(null);
    setOtpValue("");
    setExpiresAt(null);
    setResendAvailableAt(null);
    setDebugOtp(null);
    setErrorMessage(null);
    setNow(Date.now());
    setStep("mobile");
  };

  const sendOtpCode = async () => {
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      setErrorMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const response = await sendOtp(`+91${mobileNumber}`);
      setChallengeId(response.challengeId);
      setExpiresAt(response.expiresAt);
      setResendAvailableAt(response.resendAvailableAt);
      setDebugOtp(response.delivery.debugOtp ?? null);
      setOtpValue("");
      setNow(Date.now());
      setStep("otp");
      toast.success("OTP sent to +91 " + mobileNumber);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send OTP. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (otp = otpValue) => {
    if (!challengeId) { setErrorMessage("Send an OTP first."); return; }
    if (isExpired) { setErrorMessage("OTP expired. Tap Resend."); return; }
    if (!/^\d{6}$/.test(otp)) { setErrorMessage("Enter the 6-digit OTP."); return; }

    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const response = await verifyOtp({ mobileNumber: `+91${mobileNumber}`, challengeId, otp });
      if (response.isNewUser || !response.user.name) {
        setVerifyResponse(response);
        setStep("name");
      } else {
        completeLogin(response);
        toast.success(`Welcome back, ${response.user.name}!`);
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveName = async () => {
    if (!verifyResponse) return;
    if (nameValue.trim().length < 2) { setErrorMessage("Name must be at least 2 characters."); return; }

    setIsSavingName(true);
    setErrorMessage(null);
    try {
      const result = await setUserName(nameValue.trim(), verifyResponse.token);
      completeLogin({ ...verifyResponse, user: result.user });
      toast.success(`Welcome, ${result.user.name}! Account created.`);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save name.");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="w-full rounded-[30px] border border-primary-foreground/12 bg-[linear-gradient(180deg,rgba(10,20,14,0.95)_0%,rgba(12,22,16,0.92)_100%)] p-5 text-primary-foreground shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
      {/* header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">{t("login.secureAccess")}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {step === "name" ? t("login.oneLastStep") : t("login.mobileOtpLogin")}
          </h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12">
          {step === "name" ? <UserRound className="h-5 w-5 text-primary" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
        </div>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-primary-foreground/70">
        {step === "name"
          ? t("login.newUserDesc")
          : t("login.signInDesc")}
      </p>

      <div className="space-y-5">
        {/* ── STEP: mobile ── */}
        {step === "mobile" && (
          <>
            <div className="space-y-2">
              <label htmlFor="mobile-number" className="text-sm font-medium text-primary-foreground/90">
                {t("login.mobileNumber")}
              </label>
              <div className="flex gap-3">
                <div className="flex h-11 items-center rounded-xl border border-primary-foreground/12 bg-background/10 px-4 text-sm font-medium text-primary-foreground/85">
                  +91
                </div>
                <Input
                  id="mobile-number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="9876543210"
                  value={mobileNumber}
                  maxLength={10}
                  disabled={isSending}
                  onChange={(e) => {
                    setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setErrorMessage(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") void sendOtpCode(); }}
                  className="h-11 rounded-xl border-primary-foreground/12 bg-background/10 text-primary-foreground placeholder:text-primary-foreground/40"
                />
              </div>
              <p className="text-xs text-primary-foreground/55">{t("login.otpExpiry")}</p>
            </div>
            <Button
              onClick={() => void sendOtpCode()}
              disabled={isSending || mobileNumber.length !== 10}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_18px_35px_hsl(var(--primary)/0.28)]"
            >
              {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              {isSending ? t("login.sendingOtp") : t("login.sendOtp")}
            </Button>
          </>
        )}

        {/* ── STEP: otp ── */}
        {step === "otp" && (
          <div className="space-y-4 rounded-2xl border border-primary-foreground/10 bg-background/8 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary-foreground">{t("login.enterOtp")}</p>
                <p className="text-xs text-primary-foreground/60">{t("login.codeSentTo")} +91 {mobileNumber}</p>
              </div>
              <button
                type="button"
                onClick={resetToMobile}
                disabled={isSending || isVerifying}
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("login.changeNumber")}
              </button>
            </div>

            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={(value) => {
                const cleaned = value.replace(/\D/g, "").slice(0, 6);
                setOtpValue(cleaned);
                setErrorMessage(null);
                if (cleaned.length === 6 && !isExpired) void handleVerifyOtp(cleaned);
              }}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-12 w-11 border-primary-foreground/14 bg-background/12 text-base text-primary-foreground"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-primary-foreground/60">
              <span>{isExpired ? t("login.otpExpired") : `${t("login.expiresIn")} ${formatSeconds(expiresInSeconds)}`}</span>
              <button
                type="button"
                onClick={() => void sendOtpCode()}
                disabled={!canResend || isSending}
                className="inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-primary-foreground/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {canResend ? t("login.resendOtp") : `${t("login.resendIn")} ${formatSeconds(resendInSeconds)}`}
              </button>
            </div>

            <Button
              onClick={() => void handleVerifyOtp()}
              disabled={isVerifying || otpValue.length !== 6 || isExpired}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground"
            >
              {isVerifying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isVerifying ? t("login.verifying") : t("login.verifyOtp")}
            </Button>
          </div>
        )}

        {/* ── STEP: name (new user) ── */}
        {step === "name" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="user-name" className="text-sm font-medium text-primary-foreground/90">
                {t("login.yourName")}
              </label>
              <Input
                id="user-name"
                ref={nameInputRef}
                type="text"
                autoComplete="name"
                placeholder={t("login.namePlaceholder")}
                value={nameValue}
                maxLength={60}
                disabled={isSavingName}
                onChange={(e) => { setNameValue(e.target.value); setErrorMessage(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSaveName(); }}
                className="h-11 rounded-xl border-primary-foreground/12 bg-background/10 text-primary-foreground placeholder:text-primary-foreground/40"
              />
            </div>
            <Button
              onClick={() => void handleSaveName()}
              disabled={isSavingName || nameValue.trim().length < 2}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_18px_35px_hsl(var(--primary)/0.28)]"
            >
              {isSavingName ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
              {isSavingName ? t("login.saving") : t("login.continueDashboard")}
            </Button>
          </div>
        )}

        {/* error */}
        {errorMessage && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("login.authFailed")}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* debug OTP box — only shown in console/dev mode, never for real SMS */}
        {debugOtp && step === "otp" && (
          <Alert className="border-primary/20 bg-primary/8 text-primary-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertTitle>{t("login.devMode")}</AlertTitle>
            <AlertDescription>
              {t("login.yourOtp")} <span className="font-semibold tracking-[0.22em] text-primary">{debugOtp}</span>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default OtpLoginCard;
