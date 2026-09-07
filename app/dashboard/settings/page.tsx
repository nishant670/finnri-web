"use client";

import React, { useEffect, useState } from "react";
import { Check, Globe, Loader2, LogOut, Monitor, Moon, Save, ShieldAlert, Sun, User } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { apiErrorMessage, UserAPI } from "@/app/lib/api";
import { ThemePreference, useTheme } from "@/app/components/ui/ThemeProvider";
import { useToast } from "@/app/components/ui/Toast";

function nameParts(username = "") {
    const [firstName = "", ...rest] = username.trim().split(/\s+/);
    return { firstName, lastName: rest.join(" ") };
}

export default function SettingsScreen() {
    const { user, updateUser, logout, beginGuestClaim } = useAuth();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const resetForm = () => {
        const names = nameParts(user?.username);
        setFirstName(names.firstName);
        setLastName(names.lastName);
        setError("");
        setSuccess(false);
    };

    useEffect(() => {
        const names = nameParts(user?.username);
        setFirstName(names.firstName);
        setLastName(names.lastName);
    }, [user]);

    const username = `${firstName} ${lastName}`.trim();
    const dirty = username !== (user?.username ?? "");

    const handleSave = async () => {
        if (!username) {
            setSuccess(false);
            setError("Enter a name before saving.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess(false);
        try {
            const response = await UserAPI.updateProfile({ username });
            updateUser(response.data.user);
            setSuccess(true);
            toast({ title: "Profile updated" });
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t save your profile. Try again."));
        } finally {
            setLoading(false);
        }
    };

    const onNameChange = (setter: (value: string) => void, value: string) => {
        setter(value);
        setError("");
        setSuccess(false);
    };

    return (
        <>
            <div className="mx-auto max-w-3xl space-y-8 pb-20">
                <div>
                    <h1 className="text-3xl font-bold font-rounded tracking-tight dark:text-white">Settings</h1>
                    <p className="mt-1 text-sm font-medium text-zinc-500">Update your profile or sign out of this browser.</p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-accent">
                    <User className="h-5 w-5" />
                    <span className="text-sm font-bold">My Profile</span>
                </div>

                {user?.is_guest && <section className="rounded-panel border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100 sm:p-8"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"><ShieldAlert className="h-5 w-5" /></span><div><h2 className="font-bold">Save this guest workspace</h2><p className="mt-1 text-sm leading-6 opacity-75">Clearing this browser’s data, using a private window, or moving to another device can permanently lose its transactions, accounts, and splits.</p><button type="button" onClick={beginGuestClaim} className="mt-4 min-h-11 rounded-xl bg-amber-900 px-5 text-sm font-bold text-white dark:bg-amber-200 dark:text-amber-950">Save this workspace</button></div></div></section>}

                <section className="rounded-panel border border-border bg-white p-6 shadow-sm dark:bg-zinc-900 sm:p-10">
                    <div className="mb-10 flex flex-col items-center gap-6 sm:flex-row">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-panel bg-accent-secondary text-3xl font-bold font-rounded text-accent shadow-xl shadow-accent/10" aria-hidden="true">
                            {firstName[0]?.toUpperCase()}{lastName[0]?.toUpperCase()}
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl font-bold font-rounded">{user?.username || "Guest User"}</h2>
                            <p className="text-sm font-medium text-zinc-500">{user?.email || user?.phone || "No contact information"}</p>
                            <span className="mt-4 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                                {user?.is_guest ? "Guest Mode" : "Verified User"}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">First Name</span>
                            <input type="text" value={firstName} onChange={(event) => onNameChange(setFirstName, event.target.value)} autoComplete="given-name" className="w-full rounded-2xl border-none bg-zinc-50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/20 dark:bg-zinc-800" />
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Last Name</span>
                            <input type="text" value={lastName} onChange={(event) => onNameChange(setLastName, event.target.value)} autoComplete="family-name" className="w-full rounded-2xl border-none bg-zinc-50 px-5 py-3.5 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-accent/20 dark:bg-zinc-800" />
                        </label>
                    </div>

                    {error && <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
                    {success && <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Your profile has been updated.</p>}

                    <div className="mt-10 flex flex-col-reverse justify-end gap-3 border-t border-border pt-8 sm:flex-row">
                        <button type="button" onClick={resetForm} disabled={!dirty || loading} className="rounded-xl px-6 py-3 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800">
                            Discard Changes
                        </button>
                        <button type="button" onClick={handleSave} disabled={!dirty || loading} className="flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-zinc-950 shadow-xl shadow-accent/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                            {loading ? "Saving…" : "Save Profile"}
                        </button>
                    </div>
                </section>

                <section className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                    <div className="mb-6 flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800"><Sun className="h-5 w-5" /></div><div><h2 className="text-lg font-bold font-rounded">Appearance</h2><p className="text-sm text-zinc-500">Choose a theme for this browser.</p></div></div>
                    <div className="grid grid-cols-3 gap-3">{([{ value: "light", label: "Light", Icon: Sun }, { value: "dark", label: "Dark", Icon: Moon }, { value: "system", label: "System", Icon: Monitor }] as const).map(({ value, label, Icon }) => <button key={value} type="button" onClick={() => setTheme(value as ThemePreference)} aria-pressed={theme === value} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition-colors ${theme === value ? "border-accent bg-accent/10 text-accent" : "border-border bg-zinc-50 text-zinc-500 hover:border-accent/40 dark:bg-zinc-800"}`}><Icon className="h-5 w-5" />{label}</button>)}</div>
                </section>

                <section className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                    <div className="mb-6 flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800"><Globe className="h-5 w-5" /></div>
                        <div>
                            <h2 className="text-lg font-bold font-rounded">Language & Currency</h2>
                            <p className="text-sm text-zinc-500">These defaults are fixed in this release.</p>
                        </div>
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800"><dt className="text-xs font-bold uppercase tracking-wider text-zinc-400">Primary Currency</dt><dd className="mt-1 font-bold">INR (₹)</dd></div>
                        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800"><dt className="text-xs font-bold uppercase tracking-wider text-zinc-400">Language</dt><dd className="mt-1 font-bold">English (India)</dd></div>
                    </dl>
                </section>

                <section className="flex flex-col items-start justify-between gap-5 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:flex-row sm:items-center sm:p-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"><LogOut className="h-6 w-6" /></div>
                        <h2 className="font-bold">Sign out on this browser</h2>
                    </div>
                    <button type="button" onClick={logout} className="w-full rounded-xl border border-border px-6 py-3 text-sm font-bold transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:w-auto">Logout</button>
                </section>
            </div>
        </>
    );
}
