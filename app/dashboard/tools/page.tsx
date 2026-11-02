"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, RefreshCw } from "lucide-react";
import BudgetRow from "@/app/components/dashboard/BudgetProgressCard";
import { buttonSecondary, EmptyPanel, ErrorNotice, iconButton, PageHeader, Panel, SectionTitle, Segmented } from "@/app/components/dashboard/kit";
import EmiCalculator from "@/app/components/tools/EmiCalculator";
import SipCalculator from "@/app/components/tools/SipCalculator";
import Paywall from "@/app/components/Paywall";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { apiErrorMessage, asEntitlementError, Budget, BudgetsAPI, DashboardAPI, DashboardBudgetStatus, Subscription, SubscriptionsAPI } from "@/app/lib/api";
import { formatDate, formatMoney, formatRupees } from "@/app/lib/format";
import { presetRange } from "@/app/lib/period";
import { cn } from "@/app/lib/utils";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

type Tab = "bills" | "calculators";
const TABS = [{ value: "bills", label: "Bills & budgets" }, { value: "calculators", label: "Calculators" }] as const;
const CALCULATORS = [{ value: "sip", label: "SIP" }, { value: "emi", label: "EMI" }] as const;
const DUE_WINDOW = 30;

const INTERVAL: Record<Subscription["billing_interval"], string> = { daily: "daily", weekly: "weekly", biweekly: "every 2 weeks", monthly: "monthly", quarterly: "quarterly", yearly: "yearly" };

function whenLabel(subscription: Subscription) {
    const days = subscription.days_until_due;
    if (subscription.status !== "active") return subscription.status === "paused" ? "Paused" : "Cancelled";
    if (days < 0) return `Overdue by ${-days} day${days === -1 ? "" : "s"}`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due ${formatDate(subscription.next_due_date)}`;
}

/** Bills grouped by how soon they fall due, so the urgent ones lead. */
function dueGroups(subscriptions: Subscription[]) {
    const active = subscriptions.filter((item) => item.status === "active").sort((a, b) => a.days_until_due - b.days_until_due);
    return [
        { key: "overdue", title: "Overdue", items: active.filter((item) => item.days_until_due < 0) },
        { key: "week", title: "This week", items: active.filter((item) => item.days_until_due >= 0 && item.days_until_due <= 7) },
        { key: "month", title: `In the next ${DUE_WINDOW} days`, items: active.filter((item) => item.days_until_due > 7 && item.days_until_due <= DUE_WINDOW) },
        { key: "later", title: "Later", items: active.filter((item) => item.days_until_due > DUE_WINDOW) },
    ].filter((group) => group.items.length);
}

function initialTab(): Tab {
    return typeof window !== "undefined" && /^#(calculators|sip|emi)$/.test(window.location.hash) ? "calculators" : "bills";
}

export default function BudgetsAndBillsScreen() {
    const { toast } = useToast();
    const [tab, setTab] = useState<Tab>(initialTab);
    const [calculator, setCalculator] = useState<"sip" | "emi">(() => (typeof window !== "undefined" && window.location.hash === "#emi" ? "emi" : "sip"));
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [statuses, setStatuses] = useState<DashboardBudgetStatus[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [budgetError, setBudgetError] = useState<unknown>(null);
    const [billError, setBillError] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);
    const [markTarget, setMarkTarget] = useState<Subscription | null>(null);
    const [marking, setMarking] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setBudgetError(null);
        setBillError(null);
        const month = presetRange("month")!;
        const [budgetsResult, statusResult, subscriptionsResult] = await Promise.allSettled([
            BudgetsAPI.list(),
            DashboardAPI.get({ ...month, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
            SubscriptionsAPI.list(),
        ]);
        if (budgetsResult.status === "fulfilled") setBudgets(budgetsResult.value.data); else setBudgetError(budgetsResult.reason);
        if (statusResult.status === "fulfilled") setStatuses(statusResult.value.data.budget_statuses); else setBudgetError((current: unknown) => current ?? statusResult.reason);
        if (subscriptionsResult.status === "fulfilled") setSubscriptions(subscriptionsResult.value.data); else setBillError(subscriptionsResult.reason);
        setLoading(false);
    }, []);

    useEffect(() => { void load(); }, [load]);

    const groups = useMemo(() => dueGroups(subscriptions), [subscriptions]);
    const dueSoon = subscriptions.filter((item) => item.status === "active" && item.days_until_due <= DUE_WINDOW);
    const dueTotal = dueSoon.reduce((total, item) => total + item.amount, 0);
    const paused = subscriptions.filter((item) => item.status === "paused").length;
    const pausedBudgets = budgets.filter((budget) => !budget.active).length;
    const budgetTotal = statuses.reduce((total, status) => total + status.limit_amount, 0);
    const budgetSpent = statuses.reduce((total, status) => total + status.spent_amount, 0);

    const markPaid = async (subscription: Subscription) => {
        setMarking(true);
        try {
            const response = await SubscriptionsAPI.markPaid(subscription.id);
            toast({ title: `${subscription.name} marked paid`, description: response.data.next_due_date ? `Next due ${formatDate(response.data.next_due_date)}. No transaction was created.` : "No transaction was created." });
            setMarkTarget(null);
            await load();
        } catch (requestError) {
            setBillError(requestError);
        } finally {
            setMarking(false);
        }
    };

    const errorView = (error: unknown, label: string) => {
        const entitlement = asEntitlementError(error);
        if (entitlement) return <Paywall error={entitlement} featureLabel={label} />;
        return <ErrorNotice message={apiErrorMessage(error, `We couldn’t load your ${label.toLowerCase()}.`)} onRetry={() => void load()} />;
    };

    return (
        <>
            <div className="space-y-5 pb-12">
                <PageHeader
                    title="Budgets & bills"
                    description="What’s due soon, how your budgets are holding up, and SIP and EMI calculators."
                    actions={tab === "bills" ? <button type="button" onClick={() => void load()} disabled={loading} className={iconButton} aria-label="Refresh"><RefreshCw className={cn("h-[18px] w-[18px]", loading && "animate-spin")} /></button> : undefined}
                />
                <Segmented label="Show" options={TABS} value={tab} onChange={setTab} className="w-full sm:w-auto" />

                {tab === "calculators" ? (
                    <section id="calculators" aria-label="Calculators" className="space-y-4">
                        <Segmented label="Calculator" options={CALCULATORS} value={calculator} onChange={setCalculator} />
                        {calculator === "sip" ? <SipCalculator inDashboard /> : <EmiCalculator inDashboard />}
                    </section>
                ) : loading && !subscriptions.length && !statuses.length ? <PageSkeleton /> : (
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
                        <section id="subscriptions" aria-labelledby="bills-heading" className="min-w-0 scroll-mt-24">
                            <SectionTitle id="bills-heading" title="Coming up" detail={dueSoon.length ? `${formatRupees(dueTotal)} due in ${DUE_WINDOW} days` : undefined} />
                            {billError ? errorView(billError, "Bills and reminders") : groups.length ? (
                                <div className="space-y-4">
                                    {groups.map((group) => (
                                        <div key={group.key}>
                                            <h3 className={cn("mb-1.5 px-1 text-sm font-bold", group.key === "overdue" && "text-warning")}>{group.title}</h3>
                                            <Panel className="divide-y divide-border overflow-hidden">
                                                {group.items.map((subscription) => (
                                                    <div key={subscription.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px]", subscription.days_until_due < 0 ? "bg-warning-surface text-warning" : "bg-track text-muted")}><CalendarClock className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[15px] font-semibold">{subscription.name}</span>
                                                            <span className={cn("block truncate text-[13px]", subscription.days_until_due < 0 ? "font-semibold text-warning" : "text-muted")}>{whenLabel(subscription)} · {INTERVAL[subscription.billing_interval]}{subscription.account?.name ? ` · ${subscription.account.name}` : subscription.payment_mode ? ` · ${subscription.payment_mode}` : ""}{subscription.autopay ? " · autopay" : ""}</span>
                                                        </span>
                                                        <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatMoney(subscription.amount)}</span>
                                                        {subscription.days_until_due <= 3 && <button type="button" onClick={() => setMarkTarget(subscription)} className={cn(buttonSecondary, "h-9 px-3")} aria-label={`Mark ${subscription.name} paid`}><Check className="h-4 w-4" /><span className="max-sm:sr-only">Paid</span></button>}
                                                    </div>
                                                ))}
                                            </Panel>
                                        </div>
                                    ))}
                                    {paused > 0 && <p className="px-1 text-[13px] text-muted">{paused} paused, not shown. Resume them in the Finnri app.</p>}
                                </div>
                            ) : <EmptyPanel title="No bills or repeat payments yet" body="Track EMIs, SIPs, rent and subscriptions in the Finnri app and they’ll show here before they’re due." />}
                        </section>

                        <section id="budgets" aria-labelledby="budgets-heading" className="min-w-0 scroll-mt-24">
                            <SectionTitle id="budgets-heading" title="Budgets this month" detail={statuses.length ? `${formatRupees(budgetSpent)} of ${formatRupees(budgetTotal)}` : undefined} />
                            {budgetError ? errorView(budgetError, "Budgets") : statuses.length ? (
                                <>
                                    <Panel className="divide-y divide-border overflow-hidden">{statuses.map((status) => <BudgetRow key={status.budget_id} budget={status} />)}</Panel>
                                    {pausedBudgets > 0 && <p className="mt-2 px-1 text-[13px] text-muted">{pausedBudgets} paused budget{pausedBudgets === 1 ? "" : "s"} not shown.</p>}
                                </>
                            ) : <EmptyPanel title="No budgets yet" body="Set monthly limits in the Finnri app and track them here." />}
                        </section>
                    </div>
                )}
            </div>
            <ConfirmDialog
                open={Boolean(markTarget)}
                title={`Mark ${markTarget?.name || "this"} paid?`}
                description="This records today’s payment and moves the next due date on. It doesn’t add a transaction."
                confirmLabel="Mark paid"
                busy={marking}
                onClose={() => setMarkTarget(null)}
                onConfirm={() => { if (markTarget) void markPaid(markTarget); }}
            />
        </>
    );
}
