"use client";

import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, ChevronRight, KeyRound, Loader2, Lock, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import BrandMark from "@/app/components/ui/BrandMark";
import GoogleSignInButton from "@/app/components/ui/GoogleSignInButton";
import { apiErrorMessage, AuthAPI } from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { EMAIL_LOGIN_ENABLED } from "@/app/lib/auth-policy";
import { consumeAuthReturnTo } from "@/app/lib/auth-return";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/app/lib/analytics";

type LoginStep = "choice" | "identifier" | "otp" | "pin";
type AuthMode = "login" | "register" | "reset";
const RESEND_COOLDOWN_MS = 30_000;

function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function webDeviceID() {
    const existing = localStorage.getItem("finnri_web_device_id");
    if (existing) return existing;
    const created = `web_${crypto.randomUUID()}`;
    localStorage.setItem("finnri_web_device_id", created);
    return created;
}

export default function LoginPage() {
    const router = useRouter();
    const { login, loginAsGuest, user, token, isLoading: authIsLoading } = useAuth();
    const [step, setStep] = useState<LoginStep>("choice");
    const [authMode, setAuthMode] = useState<AuthMode>("login");
    const [loginType, setLoginType] = useState<"email" | "phone">("email");
    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [pin, setPin] = useState("");
    const [devOTP, setDevOTP] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [otpNotice, setOtpNotice] = useState("");
    const [otpExpiresAt, setOtpExpiresAt] = useState("");
    const [resendAvailableAt, setResendAvailableAt] = useState(0);
    const [otpClock, setOtpClock] = useState(() => Date.now());
    const completingAuth = useRef(false);

    const completeLogin = useCallback((newToken: string, newUser: Parameters<typeof login>[1]) => {
        completingAuth.current = true;
        login(newToken, newUser);
        router.replace(consumeAuthReturnTo());
    }, [login, router]);

    useEffect(() => {
        if (!authIsLoading && token && !completingAuth.current) router.replace(consumeAuthReturnTo());
    }, [authIsLoading, router, token]);

    useEffect(() => {
        const authNotice = sessionStorage.getItem("finnri_auth_notice");
        if (authNotice) {
            setNotice(authNotice);
            sessionStorage.removeItem("finnri_auth_notice");
        }
    }, []);

    useEffect(() => {
        if (step !== "otp") return;
        const timer = window.setInterval(() => setOtpClock(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [step]);

    const handleGoogleCredential = async (credential: string, nonce: string) => {
        setIsGoogleLoading(true);
        setError(null);
        try {
            const result = await AuthAPI.loginGoogle({
                id_token: credential,
                nonce,
                guest_uuid: user?.is_guest ? user.uuid : undefined,
                device_id: webDeviceID(),
                biometrics_enabled: false,
            });
            trackAnalyticsEvent(ANALYTICS_EVENTS.funnelAuthenticated, { method: "google" });
            completeLogin(result.data.token, result.data.user);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "Google sign-in failed."));
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const normalizedIdentifier = () => loginType === "email"
        ? identifier.trim().toLowerCase()
        : identifier.replace(/[\s()-]/g, "").trim();

    const validateIdentifier = (value: string) => {
        if (loginType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
        if (loginType === "phone" && value.replace(/\D/g, "").length < 8) return "Enter a valid phone number with country code.";
        return "";
    };

    const sendCode = async (value: string) => {
        const response = await AuthAPI.sendOTP(value);
        const now = Date.now();
        setDevOTP(response.data.dev_otp || "");
        setOtp("");
        setOtpExpiresAt(response.data.expires_at);
        setResendAvailableAt(now + RESEND_COOLDOWN_MS);
        setOtpClock(now);
    };

    const handleIdentify = async (event: FormEvent) => {
        event.preventDefault();
        const value = normalizedIdentifier();
        const validationError = validateIdentifier(value);
        if (validationError) { setError(validationError); return; }
        setIsLoading(true); setError(null);
        try {
            setIdentifier(value);
            const response = await AuthAPI.identify(value);
            if (response.data.exists) {
                setAuthMode("login");
                setPin("");
                setStep("pin");
            } else {
                await sendCode(value);
                setOtpNotice("Verification code sent.");
                setAuthMode("register");
                setStep("otp");
            }
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t check this account."));
        } finally { setIsLoading(false); }
    };

    const handleVerifyOTP = async (event: FormEvent) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit verification code."); return; }
        setIsLoading(true); setError(null);
        try {
            const response = await AuthAPI.verifyOTP(identifier, otp);
            sessionStorage.setItem("finnri_claim_token", response.data.claim_token);
            setPin("");
            setStep("pin");
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "That verification code was not accepted."));
        } finally { setIsLoading(false); }
    };

    const handleFinalAuth = async (event: FormEvent) => {
        event.preventDefault();
        if (!/^\d{4}$/.test(pin)) { setError("Enter a 4-digit PIN."); return; }
        if (authMode !== "login" && /^(\d)\1{3}$/.test(pin)) { setError("Choose a PIN with more than one distinct digit."); return; }
        setIsLoading(true); setError(null);
        try {
            const deviceID = webDeviceID();
            let response;
            if (authMode === "register") {
                const claimToken = sessionStorage.getItem("finnri_claim_token");
                if (!claimToken) throw new Error("missing_claim");
                response = await AuthAPI.register({
                    claim_token: claimToken,
                    pin,
                    guest_uuid: user?.is_guest ? user.uuid : undefined,
                    device_id: deviceID,
                    biometrics_enabled: false,
                });
            } else if (authMode === "reset") {
                const claimToken = sessionStorage.getItem("finnri_claim_token");
                if (!claimToken) throw new Error("missing_claim");
                response = await AuthAPI.resetPIN({ claim_token: claimToken, pin, device_id: deviceID });
            } else {
                response = await AuthAPI.login({ identifier, pin, device_id: deviceID });
            }
            sessionStorage.removeItem("finnri_claim_token");
            completeLogin(response.data.token, response.data.user);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, authMode === "login" ? "That PIN didn’t work. Try again." : "Your verification session expired. Request a new code."));
        } finally { setIsLoading(false); }
    };

    const beginReset = async () => {
        setIsLoading(true); setError(null);
        try {
            await sendCode(identifier);
            setOtpNotice("Verification code sent.");
            setAuthMode("reset");
            setStep("otp");
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t send a reset code."));
        } finally { setIsLoading(false); }
    };

    const handleGuestLogin = async () => {
        setIsLoading(true); setError(null);
        try {
            completingAuth.current = true;
            await loginAsGuest();
            trackAnalyticsEvent(ANALYTICS_EVENTS.funnelAuthenticated, { method: "guest" });
            router.replace(consumeAuthReturnTo());
        }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t open a guest workspace.")); }
        finally { setIsLoading(false); }
    };

    const resendCode = async () => {
        setIsLoading(true); setError(null);
        try { await sendCode(identifier); setOtpNotice("A new verification code was sent."); }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t resend the code.")); }
        finally { setIsLoading(false); }
    };

    const chooseType = (type: "email" | "phone") => {
        setLoginType(type); setIdentifier(""); setError(null); setOtpNotice(""); setStep("identifier");
    };

    const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - otpClock) / 1000));
    const expiresAtTime = new Date(otpExpiresAt).getTime();
    const expirySeconds = Number.isFinite(expiresAtTime) ? Math.max(0, Math.ceil((expiresAtTime - otpClock) / 1000)) : 0;

    if (authIsLoading || token) {
        return <main className="font-body grid min-h-screen place-items-center bg-background text-sm font-semibold text-muted">Opening your dashboard…</main>;
    }

    const field = "h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10";
    const primary = "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-bold text-on-accent transition hover:brightness-105 disabled:opacity-60";
    const backButton = "inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground";
    const option = "group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent/50 hover:bg-selected disabled:opacity-60";

    return (
        <main className="font-body relative isolate flex min-h-screen flex-col bg-background text-foreground">
            <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden"><div className="absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full blur-[120px]" style={{ background: "var(--glow)" }} /></div>
            <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
                <Link href="/" aria-label="Finnri home"><BrandMark compact tagline={false} /></Link>
                <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to site</Link>
            </header>
            <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_440px] lg:gap-16">
                <section className="hidden lg:block">
                    <h2 className="font-display text-balance text-5xl font-bold leading-[1.05]">Your money, <span className="text-ink-gradient">understood.</span></h2>
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">The dashboard is where you read it: where it went, what’s due, who owes whom, month against month.</p>
                    <ul className="mt-8 space-y-3 text-[15px]">
                        {["Same account as the Finnri app", "Totals from transactions you confirmed", "Never asks for a bank login"].map((point) => <li key={point} className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-accent" />{point}</li>)}
                    </ul>
                </section>

                <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-[0_24px_60px_-40px_rgba(20,10,5,0.45)] sm:p-8">
                    {notice && <div role="status" className="mb-5 flex items-start gap-2 rounded-xl bg-warning-surface p-3 text-sm font-semibold text-warning"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span></div>}
                    {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-negative/10 p-3 text-sm font-semibold text-negative"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

                    {step === "choice" && <div className="space-y-5">
                        <div>
                            <h1 className="font-display text-[28px] font-bold leading-tight">Open your dashboard</h1>
                            <p className="mt-1.5 text-[15px] text-muted">Sign in with the Google account you use in the app, or look around as a guest.</p>
                        </div>
                        <GoogleSignInButton busy={isGoogleLoading} onCredential={(credential, nonce) => void handleGoogleCredential(credential, nonce)} onError={setError} />
                        {isGoogleLoading && <p className="flex items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Signing you in…</p>}
                        {/*
                          Email and phone sign-in are switched off for
                          launch — the backend refuses OTP outright, so
                          offering these would walk someone into a 503 on
                          the one screen they cannot get past.
                        */}
                        {EMAIL_LOGIN_ENABLED && <div className="space-y-2">
                            <button type="button" onClick={() => chooseType("email")} className={option}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-track"><Mail className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Continue with email</span><span className="block text-[13px] text-muted">PIN for returning users, a code to register</span></span><ChevronRight className="h-5 w-5 text-muted" /></button>
                            <button type="button" onClick={() => chooseType("phone")} className={option}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-track"><Phone className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">Continue with phone</span><span className="block text-[13px] text-muted">Your number with country code</span></span><ChevronRight className="h-5 w-5 text-muted" /></button>
                        </div>}
                        <div className="flex items-center gap-3 text-[13px] text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                        <button type="button" onClick={() => void handleGuestLogin()} disabled={isLoading} className={option}>
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-selected text-accent"><UserRound className="h-5 w-5" /></span>
                            <span className="min-w-0 flex-1"><span className="block font-semibold">Continue as a guest</span><span className="block text-[13px] text-muted">Try everything first, no sign-up</span></span>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : <ArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-0.5" />}
                        </button>
                        <p className="border-t border-border pt-4 text-[13px] leading-5 text-muted">Coming from the app? Use the same Google account and everything you’ve logged is here.</p>
                    </div>}

                    {step === "identifier" && <form onSubmit={handleIdentify} className="space-y-4">
                        <button type="button" onClick={() => { setStep("choice"); setError(null); }} className={backButton}><ArrowLeft className="h-4 w-4" /> Sign-in options</button>
                        <div><h1 className="font-display text-[28px] font-bold leading-tight">Enter your {loginType}</h1><p className="mt-1 text-[15px] text-muted">We’ll check whether you already have a Finnri account.</p></div>
                        <label className="block"><span className="text-sm font-semibold text-muted">{loginType === "email" ? "Email address" : "Phone number"}</span><input autoFocus required type={loginType === "email" ? "email" : "tel"} autoComplete={loginType === "email" ? "email" : "tel"} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={loginType === "email" ? "name@example.com" : "+91 98765 43210"} className={`${field} mt-1`} /></label>
                        <button disabled={isLoading} className={primary}>{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}</button>
                    </form>}

                    {step === "otp" && <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <button type="button" onClick={() => { setStep("identifier"); setError(null); }} className={backButton}><ArrowLeft className="h-4 w-4" /> Change {loginType}</button>
                        <div><h1 className="font-display text-[28px] font-bold leading-tight">Enter the code</h1><p className="mt-1 text-[15px] text-muted">Sent to <strong className="text-foreground">{identifier}</strong>.</p></div>
                        {otpNotice && <p role="status" className="rounded-xl bg-positive/10 p-3 text-sm text-positive"><span className="font-bold">{otpNotice}</span> {expirySeconds > 0 ? `Code expires in ${formatCountdown(expirySeconds)}.` : "This code has expired. Request a new one."}</p>}
                        {/*
                          This panel printed a working sign-in code on the
                          page with a one-click Use code button. It was
                          meant for local development, but the server
                          decides whether dev_otp is returned — and a
                          deployed environment with the debug flag left on
                          turned this screen into an account-takeover tool
                          for anyone who knew an email address. It renders
                          only outside production now.
                        */}
                        {devOTP && process.env.NODE_ENV !== "production" && <div className="flex items-center justify-between rounded-xl bg-warning-surface p-3 text-warning"><span className="text-sm font-semibold">Local code <code className="ml-1 text-base font-bold tracking-[0.2em]">{devOTP}</code></span><button type="button" onClick={() => setOtp(devOTP)} className="rounded-full bg-card px-3 py-1.5 text-sm font-bold">Use it</button></div>}
                        <input required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="000000" aria-label="Verification code" className={`${field} h-14 text-center text-2xl font-bold tracking-[0.4em]`} />
                        <button disabled={isLoading} className={primary}>{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify"}</button>
                        <button type="button" onClick={() => void resendCode()} disabled={isLoading || resendSeconds > 0} className="w-full text-center text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50">{resendSeconds > 0 ? `Send a new code in ${resendSeconds}s` : "Send a new code"}</button>
                    </form>}

                    {step === "pin" && <form onSubmit={handleFinalAuth} className="space-y-4">
                        <button type="button" onClick={() => { setStep(authMode === "login" ? "identifier" : "otp"); setError(null); }} className={backButton}><ArrowLeft className="h-4 w-4" /> Back</button>
                        <div><h1 className="font-display text-[28px] font-bold leading-tight">{authMode === "login" ? "Enter your PIN" : authMode === "reset" ? "Choose a new PIN" : "Create your PIN"}</h1><p className="mt-1 text-[15px] text-muted">{authMode === "login" ? `Signing in as ${identifier}` : "Four digits, not all the same."}</p></div>
                        <span className="relative block"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" /><input required autoFocus type="password" inputMode="numeric" autoComplete={authMode === "login" ? "current-password" : "new-password"} pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="••••" aria-label="Four digit PIN" className={`${field} h-14 pl-12 text-center text-2xl font-bold tracking-[0.4em]`} /></span>
                        <button disabled={isLoading} className={primary}>{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{authMode === "login" ? "Sign in" : authMode === "reset" ? "Save new PIN" : "Create account"} <ArrowRight className="h-4 w-4" /></>}</button>
                        {authMode === "login" && <button type="button" onClick={() => void beginReset()} disabled={isLoading} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50"><KeyRound className="h-4 w-4" /> Forgot your PIN? Reset it</button>}
                    </form>}
                </section>
            </div>
        </main>
    );
}
