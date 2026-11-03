"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { apiErrorMessage, AuthAPI } from "@/app/lib/api";
import { EMAIL_LOGIN_ENABLED } from "@/app/lib/auth-policy";
import Dialog from "@/app/components/ui/Dialog";
import GoogleSignInButton from "@/app/components/ui/GoogleSignInButton";
import { Segmented } from "@/app/components/dashboard/kit";

type Step = "choice" | "identifier" | "otp" | "pin" | "done";

const field = "h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10";
const primary = "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-bold text-on-accent disabled:opacity-60";
const back = "inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground";

/**
 * Saving a guest workspace. Google is the way in: the guest is upgraded in
 * place, so every transaction, account and split stays. Email or phone with a
 * PIN is offered only while `EMAIL_LOGIN_ENABLED` is on, since the API refuses
 * one-time codes otherwise.
 */
export default function GuestClaimModal() {
    const { isGuestClaimOpen, closeGuestClaim, claimGuest, claimGuestWithGoogle, user } = useAuth();
    const [step, setStep] = useState<Step>("choice");
    const [identifierType, setIdentifierType] = useState<"email" | "phone">("email");
    const [identifier, setIdentifier] = useState("");
    const [savedAs, setSavedAs] = useState("");
    // Set when Google signed into an account that already existed: the API
    // signs in to it and leaves the guest's entries where they were.
    const [joinedExisting, setJoinedExisting] = useState(false);
    const [otp, setOtp] = useState("");
    const [pin, setPin] = useState("");
    const [claimToken, setClaimToken] = useState("");
    const [devOTP, setDevOTP] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isGuestClaimOpen) return;
        setStep("choice");
        setIdentifierType("email");
        setIdentifier("");
        setOtp("");
        setPin("");
        setClaimToken("");
        setDevOTP("");
        setError("");
        setJoinedExisting(false);
    }, [isGuestClaimOpen]);

    if (!isGuestClaimOpen || (!user?.is_guest && step !== "done")) return null;

    const normalizedIdentifier = identifierType === "email"
        ? identifier.trim().toLowerCase()
        : identifier.replace(/[\s()-]/g, "").trim();

    const saveWithGoogle = async (credential: string, nonce: string) => {
        setLoading(true);
        setError("");
        try {
            const guestUUID = user?.uuid;
            const saved = await claimGuestWithGoogle(credential, nonce);
            sessionStorage.removeItem("finnri_guest_prompt_dismissed");
            setSavedAs(saved.email || "your Google account");
            setJoinedExisting(Boolean(guestUUID) && saved.uuid !== guestUUID);
            setStep("done");
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t save this workspace. Your guest data is still here."));
        } finally {
            setLoading(false);
        }
    };

    const sendCode = async (event: FormEvent) => {
        event.preventDefault();
        if (identifierType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) { setError("Enter a valid email address."); return; }
        if (identifierType === "phone" && normalizedIdentifier.replace(/\D/g, "").length < 8) { setError("Enter a valid phone number with country code."); return; }
        setLoading(true);
        setError("");
        try {
            const identified = await AuthAPI.identify(normalizedIdentifier);
            if (identified.data.exists) {
                setError(`That ${identifierType} already has a Finnri account. Use a different ${identifierType} to save this workspace.`);
                return;
            }
            const response = await AuthAPI.sendOTP(normalizedIdentifier);
            setIdentifier(normalizedIdentifier);
            setDevOTP(response.data.dev_otp || "");
            setOtp("");
            setStep("otp");
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t send a verification code."));
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async (event: FormEvent) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit verification code."); return; }
        setLoading(true);
        setError("");
        try {
            const response = await AuthAPI.verifyOTP(identifier, otp);
            setClaimToken(response.data.claim_token);
            setPin("");
            setStep("pin");
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "That verification code was not accepted."));
        } finally {
            setLoading(false);
        }
    };

    const finishClaim = async (event: FormEvent) => {
        event.preventDefault();
        if (!/^\d{4}$/.test(pin)) { setError("Enter a 4-digit PIN."); return; }
        if (/^(\d)\1{3}$/.test(pin)) { setError("Choose a PIN with more than one distinct digit."); return; }
        setLoading(true);
        setError("");
        try {
            await claimGuest(claimToken, pin);
            sessionStorage.removeItem("finnri_guest_prompt_dismissed");
            setSavedAs(identifier);
            setStep("done");
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t save this workspace. Your guest data is still here."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isGuestClaimOpen} onClose={closeGuestClaim} labelledBy="guest-claim-title" className="z-[140]" panelClassName="sm:max-w-md">
            <header className="flex items-start justify-between gap-4 px-6 pt-6">
                <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-selected text-accent"><ShieldCheck className="h-5 w-5" /></span>
                <button type="button" onClick={closeGuestClaim} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-track hover:text-foreground" aria-label="Close"><X className="h-5 w-5" /></button>
            </header>
            <div className="px-6 pb-6 pt-4">
                {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-negative/10 p-3 text-sm font-semibold text-negative"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

                {step === "choice" && (
                    <div className="space-y-5">
                        <div>
                            <h2 id="guest-claim-title" className="font-display text-2xl font-bold">Save this workspace</h2>
                            <p className="mt-1.5 text-[15px] leading-6 text-muted">Sign in with Google and everything you’ve added as a guest (transactions, accounts and splits) moves into your account. Then it’s on every device you sign in to, including the Finnri app.</p>
                        </div>
                        <GoogleSignInButton busy={loading} onCredential={(credential, nonce) => void saveWithGoogle(credential, nonce)} onError={setError} />
                        {loading && <p className="flex items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Saving your workspace…</p>}
                        {EMAIL_LOGIN_ENABLED && <button type="button" onClick={() => { setStep("identifier"); setError(""); }} className="w-full text-center text-sm font-semibold text-muted underline underline-offset-4 hover:text-foreground">Use email or phone instead</button>}
                        <p className="text-[13px] text-muted">Until you save it, this workspace lives only in this browser. Clearing its data or switching device can lose it.</p>
                    </div>
                )}

                {step === "identifier" && (
                    <form onSubmit={sendCode} className="space-y-4">
                        <button type="button" onClick={() => { setStep("choice"); setError(""); }} className={back}><ArrowLeft className="h-4 w-4" /> Back</button>
                        <h2 id="guest-claim-title" className="font-display text-2xl font-bold">Save with email or phone</h2>
                        <Segmented label="Use" options={[{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }] as const} value={identifierType} onChange={(value) => { setIdentifierType(value); setIdentifier(""); setError(""); }} className="w-full" />
                        <label className="block">
                            <span className="text-sm font-semibold text-muted">{identifierType === "email" ? "Email address" : "Phone number"}</span>
                            <input autoFocus required type={identifierType === "email" ? "email" : "tel"} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={identifierType === "email" ? "name@example.com" : "+91 98765 43210"} className={`${field} mt-1`} />
                        </label>
                        <button disabled={loading} className={primary}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send a code"}</button>
                    </form>
                )}

                {step === "otp" && (
                    <form onSubmit={verifyCode} className="space-y-4">
                        <button type="button" onClick={() => { setStep("identifier"); setError(""); }} className={back}><ArrowLeft className="h-4 w-4" /> Change {identifierType}</button>
                        <div><h2 id="guest-claim-title" className="font-display text-2xl font-bold">Enter the code</h2><p className="mt-1 text-[15px] text-muted">Sent to {identifier}.</p></div>
                        {devOTP && process.env.NODE_ENV !== "production" && <div className="flex items-center justify-between rounded-xl bg-warning-surface p-3 text-warning"><span className="text-sm font-semibold">Local code <code className="ml-1 text-base font-bold tracking-[0.2em]">{devOTP}</code></span><button type="button" onClick={() => setOtp(devOTP)} className="rounded-full bg-card px-3 py-1.5 text-sm font-bold">Use it</button></div>}
                        <input autoFocus required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Verification code" placeholder="000000" className={`${field} h-14 text-center text-2xl font-bold tracking-[0.4em]`} />
                        <button disabled={loading} className={primary}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify"}</button>
                    </form>
                )}

                {step === "pin" && (
                    <form onSubmit={finishClaim} className="space-y-4">
                        <button type="button" onClick={() => { setStep("otp"); setError(""); }} className={back}><ArrowLeft className="h-4 w-4" /> Back</button>
                        <div><h2 id="guest-claim-title" className="font-display text-2xl font-bold">Create a 4-digit PIN</h2><p className="mt-1 text-[15px] text-muted">You’ll use it with {identifier} on other devices.</p></div>
                        <span className="relative block"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" /><input autoFocus required type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} aria-label="Four digit PIN" placeholder="••••" className={`${field} h-14 pl-12 text-center text-2xl font-bold tracking-[0.4em]`} /></span>
                        <button disabled={loading} className={primary}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save this workspace"}</button>
                    </form>
                )}

                {step === "done" && joinedExisting && (
                    <div className="text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-warning-surface text-warning"><AlertCircle className="h-7 w-7" /></span>
                        <h2 id="guest-claim-title" className="font-display mt-4 text-2xl font-bold">You already had an account</h2>
                        <p className="mt-1.5 text-[15px] leading-6 text-muted">You’re now signed in to your existing Finnri account, {savedAs}. What you added as a guest wasn’t moved into it, so add anything you still need here or in the app.</p>
                        <button type="button" onClick={closeGuestClaim} className={`${primary} mt-6`}>Continue</button>
                    </div>
                )}

                {step === "done" && !joinedExisting && (
                    <div className="text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-positive/15 text-positive"><CheckCircle2 className="h-7 w-7" /></span>
                        <h2 id="guest-claim-title" className="font-display mt-4 text-2xl font-bold">Workspace saved</h2>
                        <p className="mt-1.5 text-[15px] leading-6 text-muted">Everything stayed where it was. Sign in as {savedAs} on any device to see it.</p>
                        <button type="button" onClick={closeGuestClaim} className={`${primary} mt-6`}>Done</button>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
