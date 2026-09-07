"use client";

import React, { FormEvent, useCallback, useEffect, useId, useState } from "react";
import {
    AlertTriangle,
    BellRing,
    Calculator,
    CalendarClock,
    ChartLine,
    Check,
    ChevronDown,
    CircleAlert,
    Gauge,
    IndianRupee,
    Loader2,
    Pause,
    Pencil,
    Play,
    Plus,
    ReceiptText,
    Trash2,
    TrendingUp,
    X,
} from "lucide-react";
import {
    Account,
    AccountsAPI,
    apiErrorMessage,
    asEntitlementError,
    Budget,
    BudgetInput,
    BudgetsAPI,
    DashboardAPI,
    DashboardBudgetStatus,
    Subscription,
    SubscriptionInput,
    SubscriptionsAPI,
} from "@/app/lib/api";
import Paywall from "@/app/components/Paywall";
import BudgetProgressCard from "@/app/components/dashboard/BudgetProgressCard";
import { categoryOptionsFor, loadCategories } from "@/app/lib/categories";
import { formatDate, formatMoney } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";
import { SUBSCRIPTION_DUE_STATES } from "@/app/lib/subscriptions";
import Dialog from "@/app/components/ui/Dialog";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/Toast";
import SubscriptionForm, { inputForSubscription } from "@/app/components/dashboard/SubscriptionForm";
import {
    calculateEMI,
    calculateSIP,
    type EMICalculation,
    type SIPCalculation,
    type SIPInput,
    PROJECTION_DISCLAIMER,
    SIP_PRESETS,
    type SIPPresetID,
    validateEMIInput,
    validateSIPInput,
} from "@/app/lib/calculators";

function ModalShell({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
    const titleId = useId();
    return <Dialog open onClose={onClose} labelledBy={titleId} panelClassName="max-h-[calc(100dvh-2rem)] max-w-xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-white/95 p-6 backdrop-blur dark:bg-zinc-900/95"><div><h2 id={titleId} className="text-xl font-bold font-rounded">{title}</h2><p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p></div><button onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X className="h-5 w-5" /></button></div>{children}</Dialog>;
}

// Reuses the form's own conversion so pause/resume cannot drift from it. It
// copied these fields by hand and passed `next_due_date` through unchanged,
// which the API rejects as a full timestamp — pausing always answered 422.
function subscriptionInput(subscription: Subscription, patch: Partial<SubscriptionInput> = {}): SubscriptionInput {
    return { ...inputForSubscription(subscription), ...patch };
}

function BudgetForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [form, setForm] = useState<BudgetInput>({ name: "Monthly spending", period: "monthly", category: "", limit_amount: 25000, currency: "INR", alert_threshold_percent: 80, active: true });
    const [saving, setSaving] = useState(false); const [error, setError] = useState("");
    // A budget matches entries by exact category name, so a free-text field here
    // produced guardrails that could never fire: typing "food" keyed the budget
    // to a string no entry carries, because the API stores "Food & Drinks".
    const [categories, setCategories] = useState<string[]>([]);
    const [categoriesError, setCategoriesError] = useState("");
    useEffect(() => {
        let active = true;
        loadCategories()
            .then((set) => { if (active) { setCategories(set.categories); setCategoriesError(""); } })
            .catch((requestError) => { if (active) setCategoriesError(apiErrorMessage(requestError, "We couldn’t load the category list.")); });
        return () => { active = false; };
    }, []);
    const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { await BudgetsAPI.create(form); onSaved(); } catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t create this budget.")); } finally { setSaving(false); } };
    return <ModalShell title="Create a monthly budget" description="Set a total or category-specific INR limit. Alerts are generated when confirmed spending crosses the threshold." onClose={onClose}><form onSubmit={submit} className="space-y-5 p-6"><label className="block space-y-2"><span className="text-xs font-bold text-zinc-500">Budget name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Monthly limit</span><input required type="number" min="1" step="0.01" value={form.limit_amount} onChange={(event) => setForm({ ...form, limit_amount: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Alert at</span><div className="relative"><input required type="number" min="1" max="100" value={form.alert_threshold_percent} onChange={(event) => setForm({ ...form, alert_threshold_percent: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 pr-10 text-sm outline-none dark:bg-zinc-800" /><span className="absolute right-4 top-3 text-sm text-zinc-400">%</span></div></label></div><label className="block space-y-2"><span className="text-xs font-bold text-zinc-500">Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} disabled={Boolean(categoriesError)} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none disabled:opacity-60 dark:bg-zinc-800"><option value="">All expenses</option>{categoryOptionsFor(categories, form.category).map((option) => <option key={option} value={option}>{option}</option>)}</select>{categoriesError ? <p className="text-xs text-red-500">{categoriesError} This budget will cover all expenses.</p> : <p className="text-xs text-zinc-400">Leave as “All expenses” for a total monthly limit.</p>}</label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}<div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-500">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-zinc-950 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create budget</button></div></form></ModalShell>;
}

function FeatureError({ error, featureLabel, fallback }: { error: unknown; featureLabel: string; fallback: string }) {
    const entitlement = asEntitlementError(error);
    if (entitlement) return <Paywall error={entitlement} featureLabel={featureLabel} />;
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"><AlertTriangle className="mb-3 h-5 w-5" /><p className="font-bold">We couldn’t load {featureLabel.toLowerCase()}</p><p className="mt-1 leading-6 opacity-75">{apiErrorMessage(error, fallback)}</p></div>;
}

export default function ToolsScreen() {
    const { toast } = useToast();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [budgetStatuses, setBudgetStatuses] = useState<DashboardBudgetStatus[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    // Load failures replace the section; a failed action must not. Pausing a
    // subscription or asking for reminders — which is entitlement-gated while
    // listing subscriptions is not — used to blank a list that had loaded fine.
    const [budgetError, setBudgetError] = useState<unknown>(null); const [budgetProgressError, setBudgetProgressError] = useState<unknown>(null); const [subscriptionError, setSubscriptionError] = useState<unknown>(null);
    const [budgetActionError, setBudgetActionError] = useState<unknown>(null); const [subscriptionActionError, setSubscriptionActionError] = useState<unknown>(null);
    const [loading, setLoading] = useState(true); const [workingId, setWorkingId] = useState<string | null>(null);
    const [showBudgetForm, setShowBudgetForm] = useState(false); const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<{ kind: "budget"; item: Budget } | { kind: "subscription" | "mark_paid"; item: Subscription } | null>(null);
    const [activeSIPPresetID, setActiveSIPPresetID] = useState<SIPPresetID>("mutual_fund");
    const [sipInput, setSipInput] = useState<SIPInput>(SIP_PRESETS[0]);
    const [sipResult, setSipResult] = useState<SIPCalculation | null>(null);
    const [sipError, setSipError] = useState("");
    const [showSIPBreakdown, setShowSIPBreakdown] = useState(false);
    const [principal, setPrincipal] = useState(1000000); const [rate, setRate] = useState(9); const [months, setMonths] = useState(60);
    const [emiResult, setEmiResult] = useState<EMICalculation | null>(null); const [emiError, setEmiError] = useState("");
    const [showSchedule, setShowSchedule] = useState(false);

    const loadPlanning = useCallback(async () => {
        setLoading(true); setBudgetError(null); setBudgetProgressError(null); setSubscriptionError(null);
        const [accountsResult, budgetsResult, subscriptionsResult, dashboardResult] = await Promise.allSettled([
            AccountsAPI.list(),
            BudgetsAPI.list(),
            SubscriptionsAPI.list(),
            DashboardAPI.get({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        ]);
        if (accountsResult.status === "fulfilled") setAccounts(accountsResult.value.data);
        if (budgetsResult.status === "fulfilled") setBudgets(budgetsResult.value.data); else setBudgetError(budgetsResult.reason);
        if (subscriptionsResult.status === "fulfilled") setSubscriptions(subscriptionsResult.value.data); else setSubscriptionError(subscriptionsResult.reason);
        if (dashboardResult.status === "fulfilled") setBudgetStatuses(dashboardResult.value.data.budget_statuses); else { setBudgetStatuses([]); setBudgetProgressError(dashboardResult.reason); }
        setLoading(false);
    }, []);
    useEffect(() => { void loadPlanning(); }, [loadPlanning]);
    useEffect(() => {
        if (loading) return;

        const scrollToHash = () => {
            const targetID = decodeURIComponent(window.location.hash.slice(1));
            if (!targetID) return;
            const target = document.getElementById(targetID);
            if (!target) return;
            window.requestAnimationFrame(() => {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
                target.focus({ preventScroll: true });
            });
        };

        scrollToHash();
        window.addEventListener("hashchange", scrollToHash);
        return () => window.removeEventListener("hashchange", scrollToHash);
    }, [loading]);

    const applySIPPreset = (preset: SIPInput) => {
        setActiveSIPPresetID(preset.id);
        setSipInput(preset);
        setSipResult(null);
        setSipError("");
        setShowSIPBreakdown(false);
    };
    const updateSIPInput = (patch: Partial<SIPInput>) => {
        setSipInput((current) => ({ ...current, ...patch, id: "custom", label: "Custom" }));
        setActiveSIPPresetID("custom");
    };
    const calculateSIPProjection = (event: FormEvent) => {
        event.preventDefault();
        const errors = validateSIPInput(sipInput);
        if (errors.length > 0) {
            setSipError(errors.join(" "));
            return;
        }
        setSipError("");
        setSipResult(calculateSIP(sipInput));
        setShowSIPBreakdown(false);
    };
    const calculate = (event: FormEvent) => {
        event.preventDefault();
        const roundedMonths = Math.round(months);
        const input = { principalAmount: principal, annualInterestRatePercent: rate, tenureMonths: roundedMonths };
        const errors = validateEMIInput(input);
        if (errors.length > 0) {
            setEmiError(errors.join(" "));
            return;
        }
        setMonths(roundedMonths);
        setEmiError("");
        setEmiResult(calculateEMI(input));
        setShowSchedule(false);
    };
    // An entitlement failure has something to offer the user, so it is shown in
    // place beside the controls. Anything else is a transient failure of one
    // action and belongs in a toast, not in a panel that outlives the attempt.
    const reportActionFailure = (requestError: unknown, setInlineError: (error: unknown) => void, fallback: string) => {
        if (asEntitlementError(requestError)) { setInlineError(requestError); return; }
        setInlineError(null);
        toast({ title: "That didn’t go through", description: apiErrorMessage(requestError, fallback) });
    };
    const toggleBudget = async (budget: Budget) => { setWorkingId(`budget-${budget.id}`); setBudgetActionError(null); try { await BudgetsAPI.update(budget.id, { name: budget.name, period: "monthly", category: budget.category, limit_amount: budget.limit_amount, currency: "INR", alert_threshold_percent: budget.alert_threshold_percent, active: !budget.active }); toast({ title: `${budget.name} ${budget.active ? "paused" : "resumed"}` }); await loadPlanning(); } catch (requestError) { reportActionFailure(requestError, setBudgetActionError, "We couldn’t update this budget."); } finally { setWorkingId(null); } };
    const deleteBudget = async (budget: Budget, confirmed = false) => { if (!confirmed) { setConfirmTarget({ kind: "budget", item: budget }); return; } setWorkingId(`budget-${budget.id}`); setBudgetActionError(null); try { await BudgetsAPI.delete(budget.id); toast({ title: `${budget.name} deleted` }); setConfirmTarget(null); await loadPlanning(); } catch (requestError) { reportActionFailure(requestError, setBudgetActionError, "We couldn’t delete this budget."); } finally { setWorkingId(null); } };
    const toggleSubscription = async (subscription: Subscription) => { setWorkingId(`subscription-${subscription.id}`); setSubscriptionActionError(null); const nextStatus = subscription.status === "active" ? "paused" : "active"; try { await SubscriptionsAPI.update(subscription.id, subscriptionInput(subscription, { status: nextStatus })); toast({ title: `${subscription.name} ${nextStatus}` }); await loadPlanning(); } catch (requestError) { reportActionFailure(requestError, setSubscriptionActionError, `We couldn’t ${nextStatus === "paused" ? "pause" : "resume"} this recurring payment.`); } finally { setWorkingId(null); } };
    const markPaid = async (subscription: Subscription, confirmed = false) => { if (!confirmed) { setConfirmTarget({ kind: "mark_paid", item: subscription }); return; } setWorkingId(`subscription-${subscription.id}`); setSubscriptionActionError(null); try { const response = await SubscriptionsAPI.markPaid(subscription.id); toast({ title: `${subscription.name} schedule advanced`, description: response.data.next_due_date ? `Next due ${formatDate(response.data.next_due_date)}. No transaction was created.` : "No transaction was created." }); setConfirmTarget(null); await loadPlanning(); } catch (requestError) { setSubscriptionError(requestError); } finally { setWorkingId(null); } };
    const syncReminders = async () => { setWorkingId("subscription-reminders"); setSubscriptionActionError(null); try { const response = await SubscriptionsAPI.createReminders(); toast({ title: response.data.created > 0 ? `${response.data.created} reminder${response.data.created === 1 ? "" : "s"} created` : "Reminders are up to date" }); await loadPlanning(); } catch (requestError) { reportActionFailure(requestError, setSubscriptionActionError, "We couldn’t create subscription reminders."); } finally { setWorkingId(null); } };
    const deleteSubscription = async (subscription: Subscription, confirmed = false) => { if (!confirmed) { setConfirmTarget({ kind: "subscription", item: subscription }); return; } setWorkingId(`subscription-${subscription.id}`); setSubscriptionActionError(null); try { await SubscriptionsAPI.delete(subscription.id); toast({ title: `${subscription.name} removed` }); setConfirmTarget(null); await loadPlanning(); } catch (requestError) { reportActionFailure(requestError, setSubscriptionActionError, "We couldn’t stop tracking this recurring payment."); } finally { setWorkingId(null); } };
    const budgetStatusByID = new Map(budgetStatuses.map((status) => [status.budget_id, status]));

    return <><div className="space-y-8 pb-16"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Plan with context</p><h1 className="mt-2 text-3xl font-bold tracking-tight font-rounded sm:text-4xl">Planning & tools</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Calculate loan and SIP scenarios, set monthly guardrails, and review recurring payments. {PROJECTION_DISCLAIMER}</p></header>
        <section aria-label="Available calculators" className="grid gap-3 sm:grid-cols-2">
            {[
                { href: "#sip", label: "SIP", caption: "Investments", icon: ChartLine },
                { href: "#emi", label: "EMI", caption: "Loans", icon: Calculator },
            ].map((tool) => <a key={tool.label} href={tool.href} className="rounded-2xl border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:bg-zinc-900"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-secondary text-accent"><tool.icon className="h-5 w-5" /></span><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-950/30">Live</span></div><p className="mt-4 font-bold">{tool.label}</p><p className="mt-1 text-xs text-zinc-400">{tool.caption}</p></a>)}
        </section>
        <section id="sip" className="grid gap-6 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8 xl:grid-cols-[.85fr_1.15fr]"><form onSubmit={calculateSIPProjection}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-secondary text-accent"><ChartLine className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">SIP calculator</p><h2 className="mt-1 text-xl font-bold font-rounded">Project an investment plan</h2></div></div><div className="mt-6 flex flex-wrap gap-2">{SIP_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => applySIPPreset(preset)} className={cn("rounded-full border px-3 py-2 text-xs font-bold transition", activeSIPPresetID === preset.id ? "border-accent bg-accent text-zinc-950" : "border-border bg-zinc-50 text-zinc-500 hover:border-accent dark:bg-zinc-800")}>{preset.label}</button>)}</div><div className="mt-7 space-y-4"><label className="block space-y-2"><span className="text-xs font-bold text-zinc-500">Monthly investment</span><input type="number" required min="1" step="0.01" value={sipInput.monthlyInvestment} onChange={(event) => updateSIPInput({ monthlyInvestment: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent dark:bg-zinc-800" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Expected return % p.a.</span><input type="number" required min="0" max="100" step="0.01" value={sipInput.expectedAnnualReturnPercent} onChange={(event) => updateSIPInput({ expectedAnnualReturnPercent: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent dark:bg-zinc-800" /></label><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Tenure in years</span><input type="number" required min="0.08" max="60" step="0.01" value={sipInput.tenureYears} onChange={(event) => updateSIPInput({ tenureYears: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent dark:bg-zinc-800" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Annual step-up %</span><input type="number" min="0" max="100" step="0.01" value={sipInput.annualStepUpPercent} onChange={(event) => updateSIPInput({ annualStepUpPercent: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent dark:bg-zinc-800" /></label><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Current corpus</span><input type="number" min="0" step="0.01" value={sipInput.currentCorpus} onChange={(event) => updateSIPInput({ currentCorpus: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent dark:bg-zinc-800" /></label></div>{sipError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{sipError}</p>}<button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-zinc-950"><TrendingUp className="h-4 w-4" /> Calculate projection</button></div></form>
            <div className="rounded-surface border border-border bg-zinc-50 p-5 dark:bg-zinc-800/50 sm:p-6">{sipResult ? <><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Estimated maturity value</p><p className="mt-3 text-4xl font-bold font-rounded sm:text-5xl">{formatMoney(sipResult.maturityValue)}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-4 dark:bg-zinc-900"><p className="text-xs text-zinc-400">Invested amount</p><p className="mt-1 text-lg font-bold">{formatMoney(sipResult.investedAmount)}</p></div><div className="rounded-2xl bg-white p-4 dark:bg-zinc-900"><p className="text-xs text-zinc-400">Estimated returns</p><p className="mt-1 text-lg font-bold text-accent">{formatMoney(sipResult.estimatedReturns)}</p></div></div><button onClick={() => setShowSIPBreakdown((show) => !show)} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-zinc-500">{showSIPBreakdown ? "Hide" : "View"} yearly breakdown <ChevronDown className={cn("h-4 w-4 transition", showSIPBreakdown && "rotate-180")} /></button>{showSIPBreakdown && <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-border bg-white dark:bg-zinc-900"><table className="w-full min-w-[460px] text-left text-xs"><thead className="sticky top-0 bg-zinc-50 text-zinc-400 dark:bg-zinc-900"><tr><th className="p-3">Year</th><th className="p-3">Invested</th><th className="p-3">Value</th></tr></thead><tbody>{sipResult.breakdown.map((row) => <tr key={row.year} className="border-t border-border"><td className="p-3">{row.year}</td><td className="p-3">{formatMoney(row.yearlyInvestment)}</td><td className="p-3">{formatMoney(row.yearEndValue)}</td></tr>)}</tbody></table></div>}</> : <div className="grid h-full min-h-72 place-items-center text-center"><div><ChartLine className="mx-auto h-8 w-8 text-zinc-300" /><h3 className="mt-4 font-bold">Your SIP projection will appear here</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">Choose a preset or enter custom assumptions to estimate maturity value, invested amount, and yearly growth.</p></div></div>}</div>
        </section>
        <section id="emi" className="grid gap-6 overflow-hidden rounded-panel bg-zinc-950 p-6 text-white sm:p-8 xl:grid-cols-[.85fr_1.15fr]"><form onSubmit={calculate}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-zinc-950"><Calculator className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">EMI calculator</p><h2 className="mt-1 text-xl font-bold font-rounded">Test a loan scenario</h2></div></div><div className="mt-7 space-y-4"><label className="block space-y-2"><span className="text-xs font-bold text-zinc-400">Principal amount</span><input type="number" required min="1" step="0.01" value={principal} onChange={(event) => setPrincipal(Number(event.target.value))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-xs font-bold text-zinc-400">Annual interest %</span><input type="number" required min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(Number(event.target.value))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent" /></label><label className="space-y-2"><span className="text-xs font-bold text-zinc-400">Tenure in months</span><input type="number" required min="1" max="360" value={months} onChange={(event) => setMonths(Number(event.target.value))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent" /></label></div>{emiError && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{emiError}</p>}<button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-zinc-950"><Gauge className="h-4 w-4" /> Calculate repayment</button></div></form>
            <div className="rounded-surface border border-white/10 bg-white/5 p-5 sm:p-6">{emiResult ? <><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Estimated monthly EMI</p><p className="mt-3 text-4xl font-bold font-rounded sm:text-5xl">{formatMoney(emiResult.monthlyEMI)}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-zinc-400">Total payment</p><p className="mt-1 text-lg font-bold">{formatMoney(emiResult.totalPayment)}</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-zinc-400">Total interest</p><p className="mt-1 text-lg font-bold text-accent">{formatMoney(emiResult.totalInterest)}</p></div></div><button onClick={() => setShowSchedule((show) => !show)} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-zinc-300">{showSchedule ? "Hide" : "View"} amortization schedule <ChevronDown className={cn("h-4 w-4 transition", showSchedule && "rotate-180")} /></button>{showSchedule && <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 bg-zinc-900 text-zinc-400"><tr><th className="p-3">Month</th><th className="p-3">Principal</th><th className="p-3">Interest</th><th className="p-3">Balance</th></tr></thead><tbody>{emiResult.schedule.map((row) => <tr key={row.month} className="border-t border-white/10"><td className="p-3">{row.month}</td><td className="p-3">{formatMoney(row.principalAmount)}</td><td className="p-3">{formatMoney(row.interestAmount)}</td><td className="p-3">{formatMoney(row.closingBalance)}</td></tr>)}</tbody></table></div>}</> : <div className="grid h-full min-h-72 place-items-center text-center"><div><IndianRupee className="mx-auto h-8 w-8 text-zinc-600" /><h3 className="mt-4 font-bold">Your repayment view will appear here</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">The same calculator powers this dashboard and the public tools page, with a month-by-month schedule at paise precision.</p></div></div>}</div>
        </section>

        <section id="budgets" className="rounded-panel border border-border bg-zinc-50 p-6 dark:bg-zinc-950 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-accent"><BellRing className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.18em]">Monthly guardrails</p></div>
                    <h2 className="mt-2 text-2xl font-bold font-rounded">Budgets</h2>
                    <p className="mt-1 text-sm text-zinc-500">Confirmed spending against this month’s active limits.</p>
                </div>
                <button disabled={Boolean(budgetError)} onClick={() => setShowBudgetForm(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"><Plus className="h-4 w-4" /> New budget</button>
            </div>

            {budgetActionError != null && <div className="mt-6"><FeatureError error={budgetActionError} featureLabel="Budget alerts" fallback="We couldn’t complete that action." /></div>}
            {loading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div> : budgetError ? (
                <div className="mt-6"><FeatureError error={budgetError} featureLabel="Budget alerts" fallback="We couldn’t load your budgets." /></div>
            ) : budgets.length === 0 ? (
                <p className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-zinc-400 dark:bg-zinc-900">No budgets yet. Add a monthly total or category guardrail.</p>
            ) : (
                <>
                    {budgetProgressError && budgets.some((budget) => budget.active) && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"><p className="font-bold">Budget progress is temporarily unavailable</p><p className="mt-1 opacity-75">Your saved limits are still shown below. Refresh to try the confirmed-spending calculation again.</p></div>}
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {budgets.map((budget) => {
                            const status = budgetStatusByID.get(budget.id);
                            const actions = <div className="flex gap-2"><button disabled={workingId === `budget-${budget.id}`} onClick={() => void toggleBudget(budget)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-100 py-2.5 text-xs font-bold dark:bg-zinc-800">{budget.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{budget.active ? "Pause" : "Resume"}</button><button onClick={() => void deleteBudget(budget)} className="rounded-xl p-3 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" aria-label={`Delete ${budget.name}`}><Trash2 className="h-4 w-4" /></button></div>;
                            if (status) return <BudgetProgressCard key={budget.id} budget={status} footer={actions} compact />;
                            return <article key={budget.id} className="rounded-2xl border border-border bg-white p-5 opacity-70 dark:bg-zinc-900"><div className="flex items-start justify-between gap-4"><div><p className="font-bold">{budget.name}</p><p className="mt-1 text-xs text-zinc-400">{budget.category || "All expenses"}</p></div><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800">{budget.active ? "Unavailable" : "Paused"}</span></div><p className="mt-5 text-xl font-bold font-rounded">{formatMoney(budget.limit_amount)} limit</p><p className="mt-1 text-xs text-zinc-400">{budget.active ? "Confirmed progress could not be loaded." : "Progress is not calculated while this budget is paused."}</p><div className="mt-5 border-t border-border pt-4">{actions}</div></article>;
                        })}
                    </div>
                </>
            )}
        </section>

        <section id="subscriptions" tabIndex={-1} className="scroll-mt-24 rounded-panel border border-border bg-white p-6 outline-none dark:bg-zinc-900 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600"><CalendarClock className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.18em]">Recurring payments</p></div>
                    <h2 className="mt-2 text-2xl font-bold font-rounded">Subscriptions</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Edit schedules and reminder windows here. Mark paid only advances a schedule; enable automatic transactions in Edit and link an account when you want Finnri to record each due payment.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button disabled={Boolean(subscriptionError) || workingId === "subscription-reminders"} onClick={() => void syncReminders()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-bold disabled:opacity-40"><BellRing className="h-4 w-4" /> Sync reminders</button>
                    <button disabled={Boolean(subscriptionError)} onClick={() => { setEditingSubscription(null); setShowSubscriptionForm(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"><Plus className="h-4 w-4" /> Track payment</button>
                </div>
            </div>
            {subscriptionActionError != null && <div className="mt-6"><FeatureError error={subscriptionActionError} featureLabel="Subscription reminders" fallback="We couldn’t complete that action." /></div>}
            {loading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div> : subscriptionError ? <div className="mt-6"><FeatureError error={subscriptionError} featureLabel="Recurring payment tracking" fallback="We couldn’t load your subscriptions." /></div> : subscriptions.length === 0 ? <p className="mt-6 rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-400 dark:bg-zinc-800">No recurring payments are being tracked.</p> : (
                <div className="mt-6 divide-y divide-border">
                    {subscriptions.map((subscription) => <article key={subscription.id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30"><ReceiptText className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{subscription.name}</h3><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", SUBSCRIPTION_DUE_STATES[subscription.due_state].className)}>{SUBSCRIPTION_DUE_STATES[subscription.due_state].label}</span>{subscription.autopay && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-950/30">Auto transactions</span>}</div><p className="mt-1 text-sm text-zinc-500">{formatMoney(subscription.amount)} · {subscription.billing_interval} · due {formatDate(subscription.next_due_date)}</p><p className="mt-1 text-xs text-zinc-400">{subscription.account?.name || "No account linked"} · reminder {subscription.reminder_days === 0 ? "on due date" : `${subscription.reminder_days} day${subscription.reminder_days === 1 ? "" : "s"} before`}</p></div></div>
                        <div className="flex flex-wrap gap-2"><button disabled={workingId === `subscription-${subscription.id}`} onClick={() => void markPaid(subscription)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent/10 px-4 text-xs font-bold text-accent"><Check className="h-3.5 w-3.5" /> Mark paid</button><button onClick={() => { setEditingSubscription(subscription); setShowSubscriptionForm(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-xs font-bold dark:bg-zinc-800"><Pencil className="h-3.5 w-3.5" /> Edit</button><button disabled={workingId === `subscription-${subscription.id}`} onClick={() => void toggleSubscription(subscription)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-xs font-bold disabled:opacity-50 dark:bg-zinc-800">{subscription.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{subscription.status === "active" ? "Pause" : "Resume"}</button><button onClick={() => void deleteSubscription(subscription)} className="rounded-xl p-3 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" aria-label={`Delete ${subscription.name}`}><Trash2 className="h-4 w-4" /></button></div>
                    </article>)}
                </div>
            )}
        </section>
        <aside className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>SIP and EMI results are estimates. Budget and subscription tools organize your own records; they do not connect to lenders, banks, fund houses, or merchants.</p></aside>
    </div>{showBudgetForm && <BudgetForm onClose={() => setShowBudgetForm(false)} onSaved={() => { setShowBudgetForm(false); toast({ title: "Budget created" }); void loadPlanning(); }} />}{showSubscriptionForm && <SubscriptionForm accounts={accounts} subscription={editingSubscription || undefined} onClose={() => { setShowSubscriptionForm(false); setEditingSubscription(null); }} onSaved={() => { const wasEditing = Boolean(editingSubscription); setShowSubscriptionForm(false); setEditingSubscription(null); toast({ title: wasEditing ? "Recurring payment updated" : "Recurring payment added" }); void loadPlanning(); }} />}
    <ConfirmDialog open={confirmTarget?.kind === "budget"} title={`Delete ${confirmTarget?.item.name || "budget"}?`} description="This permanently removes the guardrail. Existing transactions are not affected." confirmLabel="Delete budget" busy={Boolean(workingId)} onClose={() => setConfirmTarget(null)} onConfirm={() => { if (confirmTarget?.kind === "budget") void deleteBudget(confirmTarget.item, true); }} />
    <ConfirmDialog open={confirmTarget?.kind === "subscription"} title={`Stop tracking ${confirmTarget?.item.name || "subscription"}?`} description="This permanently removes the schedule and its reminders. Existing transactions are not affected." confirmLabel="Stop tracking" busy={Boolean(workingId)} onClose={() => setConfirmTarget(null)} onConfirm={() => { if (confirmTarget?.kind === "subscription") void deleteSubscription(confirmTarget.item, true); }} />
    <ConfirmDialog open={confirmTarget?.kind === "mark_paid"} title={`Advance ${confirmTarget?.item.name || "subscription"}?`} description="This records the payment date and advances the next due date. It does not create a transaction; enable automatic transactions in Edit if you want that behavior." confirmLabel="Advance schedule" busy={Boolean(workingId)} onClose={() => setConfirmTarget(null)} onConfirm={() => { if (confirmTarget?.kind === "mark_paid") void markPaid(confirmTarget.item, true); }} />
    </>;
}
