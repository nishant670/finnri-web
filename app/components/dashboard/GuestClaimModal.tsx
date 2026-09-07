"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock, Mail, Phone, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { apiErrorMessage, AuthAPI } from "@/app/lib/api";
import Dialog from "@/app/components/ui/Dialog";

type Step = "identifier" | "otp" | "pin" | "done";

export default function GuestClaimModal() {
    const { isGuestClaimOpen, closeGuestClaim, claimGuest, user } = useAuth();
    const [step, setStep] = useState<Step>("identifier");
    const [identifierType, setIdentifierType] = useState<"email" | "phone">("email");
    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [pin, setPin] = useState("");
    const [claimToken, setClaimToken] = useState("");
    const [devOTP, setDevOTP] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isGuestClaimOpen) return;
        setStep("identifier");
        setIdentifierType("email");
        setIdentifier("");
        setOtp("");
        setPin("");
        setClaimToken("");
        setDevOTP("");
        setError("");
    }, [isGuestClaimOpen]);

    if (!isGuestClaimOpen || (!user?.is_guest && step !== "done")) return null;

    const normalizedIdentifier = identifierType === "email"
        ? identifier.trim().toLowerCase()
        : identifier.replace(/[\s()-]/g, "").trim();

    const sendCode = async (event: FormEvent) => {
        event.preventDefault();
        if (identifierType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) { setError("Enter a valid email address."); return; }
        if (identifierType === "phone" && normalizedIdentifier.replace(/\D/g, "").length < 8) { setError("Enter a valid phone number with country code."); return; }
        setLoading(true);
        setError("");
        try {
            const identified = await AuthAPI.identify(normalizedIdentifier);
            if (identified.data.exists) {
                setError(`That ${identifierType} already has a FINNRI account. Use a different ${identifierType} to save this workspace.`);
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
            setStep("done");
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t save this workspace. Your guest data is still here."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isGuestClaimOpen} onClose={closeGuestClaim} labelledBy="guest-claim-title" className="z-[140]" panelClassName="max-h-[calc(100dvh-2rem)] max-w-md">
                <header className="flex items-start justify-between gap-4 border-b border-border p-6">
                    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Keep your data</p><h2 id="guest-claim-title" className="mt-2 text-2xl font-bold font-rounded">Save this workspace</h2></div>
                    <button type="button" onClick={closeGuestClaim} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close save workspace"><X className="h-5 w-5" /></button>
                </header>
                <div className="p-6">
                    {error && <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

                    {step === "identifier" && <form onSubmit={sendCode} className="space-y-5">
                        <p className="text-sm leading-6 text-zinc-500">Verify an email or phone without leaving the dashboard. FINNRI upgrades this guest in place, so its transactions, accounts, and splits keep the same owner.</p>
                        <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                            <button type="button" onClick={() => { setIdentifierType("email"); setIdentifier(""); setError(""); }} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold ${identifierType === "email" ? "bg-white text-accent shadow-sm dark:bg-zinc-700" : "text-zinc-400"}`}><Mail className="h-4 w-4" />Email</button>
                            <button type="button" onClick={() => { setIdentifierType("phone"); setIdentifier(""); setError(""); }} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold ${identifierType === "phone" ? "bg-white text-accent shadow-sm dark:bg-zinc-700" : "text-zinc-400"}`}><Phone className="h-4 w-4" />Phone</button>
                        </div>
                        <label className="block space-y-2"><span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{identifierType === "email" ? "Email address" : "Phone number"}</span><input autoFocus required type={identifierType === "email" ? "email" : "tel"} value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={identifierType === "email" ? "name@example.com" : "+91 98765 43210"} className="min-h-14 w-full rounded-2xl bg-zinc-100 px-4 outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800" /></label>
                        <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-zinc-950 disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send verification code <ArrowRight className="h-4 w-4" /></>}</button>
                    </form>}

                    {step === "otp" && <form onSubmit={verifyCode} className="space-y-5">
                        <button type="button" onClick={() => { setStep("identifier"); setError(""); }} className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-accent"><ArrowLeft className="h-4 w-4" />Change {identifierType}</button>
                        <div><h3 className="text-lg font-bold">Verify your {identifierType}</h3><p className="mt-1 text-sm text-zinc-500">Enter the code sent to {identifier}.</p></div>
                        {devOTP && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200"><p className="text-[10px] font-bold uppercase tracking-wider">Local development code</p><div className="mt-2 flex items-center justify-between"><code className="text-lg font-bold tracking-[0.2em]">{devOTP}</code><button type="button" onClick={() => setOtp(devOTP)} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold dark:bg-amber-900/40">Use code</button></div></div>}
                        <input autoFocus required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={6} aria-label="Verification code" placeholder="000000" className="min-h-16 w-full rounded-2xl bg-zinc-100 px-4 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800" />
                        <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-zinc-950 disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify code <CheckCircle2 className="h-4 w-4" /></>}</button>
                    </form>}

                    {step === "pin" && <form onSubmit={finishClaim} className="space-y-5">
                        <button type="button" onClick={() => { setStep("otp"); setError(""); }} className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-accent"><ArrowLeft className="h-4 w-4" />Back</button>
                        <div><h3 className="text-lg font-bold">Create a 4-digit PIN</h3><p className="mt-1 text-sm leading-6 text-zinc-500">Use it with {identifier} on another browser or device.</p></div>
                        <span className="relative block"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" /><input autoFocus required type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} aria-label="Four digit PIN" placeholder="••••" className="min-h-16 w-full rounded-2xl bg-zinc-100 pl-12 pr-4 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800" /></span>
                        <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-zinc-950 disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Save this workspace <ShieldCheck className="h-4 w-4" /></>}</button>
                    </form>}

                    {step === "done" && <div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"><CheckCircle2 className="h-7 w-7" /></span><h3 className="mt-4 text-xl font-bold">Workspace saved</h3><p className="mt-2 text-sm leading-6 text-zinc-500">Your transactions, accounts, and splits stayed here. You can now sign in with {identifier} on another device.</p><button type="button" onClick={closeGuestClaim} className="mt-6 min-h-12 w-full rounded-xl bg-accent font-bold text-zinc-950">Continue in dashboard</button></div>}
                </div>
        </Dialog>
    );
}
