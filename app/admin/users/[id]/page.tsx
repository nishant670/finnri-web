"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins, Gift, ShieldAlert } from "lucide-react";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";
import DataTable from "@/app/components/admin/DataTable";
import RoleGate from "@/app/components/admin/RoleGate";
import { AdminAPI, AdminAPIError } from "@/app/lib/admin-api";
import { formatDate, formatDateRange, formatUSDMicros } from "@/app/lib/format";

type Detail = {
    user: Record<string, unknown>;
    summary: { plan_code: string; credits_remaining: number; entries_count: number; ai_credits_used: number };
    counts: Record<string, number>;
    feature_adoption: Record<string, boolean>;
    subscription?: Record<string, unknown>;
    subscriptions?: Pass[];
    credits: { total_credits_remaining: number };
    recent_feedback: Record<string, unknown>[];
    active_abuse_blocks: Record<string, unknown>[];
};
type Activity = { activity: { type: string; id: number; at: string; label: string; metadata?: Record<string, unknown> }[] };
type AI = {
    events: {
        id: number;
        started_at: string;
        action_code: string;
        status: string;
        model: string;
        final_credits: number;
        estimated_cost_usd_micros: number;
    }[];
};
type Credits = {
    grants: { id: number; source: string; credits_granted: number; credits_remaining: number; expires_at?: string }[];
    ledger: { id: number; direction: string; credits: number; reason_code: string; created_at: string }[];
};
type Plan = { code: string; name: string; billing_interval: string };
type Pass = {
    id: number;
    status: string;
    provider: string;
    current_period_start: string;
    current_period_end: string;
    plan?: { name: string };
};
// Plans with a fixed period, and what one period is called. Lifetime is sold
// by quote, so it can't be gifted.
const periodUnits: Record<string, [string, string]> = {
    weekly: ["week", "weeks"],
    monthly: ["month", "months"],
    quarterly: ["quarter", "quarters"],
    yearly: ["year", "years"],
};
const maxGiftPeriods = 12;
const tabs = ["overview", "ai usage", "credits", "subscription", "feedback", "moderation"] as const;
const tabLabels: Record<string, string> = {
    overview: "Overview",
    "ai usage": "AI usage",
    credits: "Credits",
    subscription: "Subscription",
    feedback: "Feedback",
    moderation: "Moderation",
} as const;
export default function AdminUserDetail() {
    const { id } = useParams<{ id: string }>();
    const { toast } = useToast();
    const [detail, setDetail] = useState<Detail | null>(null);
    const [activity, setActivity] = useState<Activity["activity"]>([]);
    const [ai, setAI] = useState<AI["events"]>([]);
    const [credits, setCredits] = useState<Credits | null>(null);
    const [tab, setTab] = useState<(typeof tabs)[number]>("overview");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [grant, setGrant] = useState(500);
    const [reason, setReason] = useState("support_adjustment");
    const [creditExpiry, setCreditExpiry] = useState("");
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [giftPlan, setGiftPlan] = useState("");
    const [giftPeriods, setGiftPeriods] = useState(1);
    const [giftNote, setGiftNote] = useState("");
    const [giftKey, setGiftKey] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [d, a, u, c, p] = await Promise.all([
                AdminAPI.get<Detail>(`users/${id}`),
                AdminAPI.get<Activity>(`users/${id}/activity`),
                AdminAPI.get<AI>(`users/${id}/ai-usage?page_size=50`),
                AdminAPI.get<Credits>(`users/${id}/credits`),
                AdminAPI.get<{ plans: Plan[] }>("plans"),
            ]);
            setDetail(d);
            setActivity(a.activity);
            setAI(u.events);
            setCredits(c);
            const giftable = p.plans.filter((plan) => plan.billing_interval in periodUnits);
            setPlans(giftable);
            setGiftPlan((current) => current || giftable[0]?.code || "");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load user");
        } finally {
            setLoading(false);
        }
    }, [id]);
    useEffect(() => {
        void load();
    }, [load]);
    const user = useMemo(() => detail?.user || {}, [detail]);
    const selectedPlan = plans.find((plan) => plan.code === giftPlan);
    const giftLength = selectedPlan ? describePeriods(selectedPlan, giftPeriods) : "";
    const giftReady = Boolean(selectedPlan) && giftNote.trim() !== "" && giftPeriods >= 1 && giftPeriods <= maxGiftPeriods;
    async function grantCredits() {
        setBusy(true);
        try {
            // The date picker gives a day; the credits last to the end of it, India time.
            const expiresAt = creditExpiry ? new Date(`${creditExpiry}T23:59:59+05:30`).toISOString() : undefined;
            await AdminAPI.post(`users/${id}/credits/adjustments`, { credits: grant, reason_code: reason, expires_at: expiresAt });
            setConfirm(false);
            toast({
                title: "Credits granted",
                description: `${grant} credits added to user #${id}${creditExpiry ? `, expiring ${formatDate(expiresAt)}` : ""}.`,
            });
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Grant failed");
        } finally {
            setBusy(false);
        }
    }
    function openGift() {
        // One key per confirmation, so a double-click or retry gifts once.
        setGiftKey(crypto.randomUUID());
    }
    async function giftPass() {
        if (!selectedPlan) return;
        setBusy(true);
        try {
            await AdminAPI.post(
                `users/${id}/passes`,
                { plan_code: selectedPlan.code, periods: giftPeriods, note: giftNote.trim() },
                { "Idempotency-Key": giftKey },
            );
            setGiftKey("");
            setGiftNote("");
            setGiftPeriods(1);
            toast({ title: "Pass gifted", description: `${selectedPlan.name} (${giftLength}) given to user #${id}.` });
            await load();
        } catch (reason) {
            setError(describeError(reason, "Gift failed"));
        } finally {
            setBusy(false);
        }
    }
    if (loading) return <PageSkeleton />;
    if (!detail) return <div className="rounded-panel bg-red-50 p-8 text-red-700">{error || "User not found"}</div>;
    return (
        <div className="space-y-6">
            <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-text-muted hover:text-accent">
                <ArrowLeft className="h-4 w-4" />
                Users
            </Link>
            <header className="rounded-panel border border-border bg-card p-6 sm:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">User #{id}</p>
                        <h1 className="mt-2 text-3xl font-bold font-rounded">{String(user.username || "Unknown user")}</h1>
                        <p className="mt-2 text-sm text-text-muted">
                            {String(user.email || user.phone || "Anonymous guest")} · Joined {formatDate(String(user.created_at || ""))}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Mini label="Plan" value={detail.summary.plan_code || "Free"} />
                        <Mini label="Credits" value={detail.credits.total_credits_remaining} />
                        <Mini label="Entries" value={detail.summary.entries_count} />
                        <Mini label="AI used" value={detail.summary.ai_credits_used} />
                    </div>
                </div>
            </header>
            {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tabs.map((item) => (
                    <button
                        key={item}
                        onClick={() => setTab(item)}
                        className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold ${tab === item ? "bg-accent text-zinc-950" : "border border-border bg-card text-text-muted"}`}
                    >
                        {tabLabels[item]}
                    </button>
                ))}
            </div>
            {tab === "overview" && (
                <div className="grid gap-5 xl:grid-cols-2">
                    <Panel title="Feature adoption">
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(detail.feature_adoption).map(([name, active]) => (
                                <div
                                    key={name}
                                    className={`rounded-xl p-3 text-sm font-semibold ${active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20" : "bg-zinc-100 text-text-muted dark:bg-zinc-800"}`}
                                >
                                    {name.replaceAll("_", " ")}: {active ? "Used" : "Not used"}
                                </div>
                            ))}
                        </div>
                    </Panel>
                    <Panel title="Recent activity">
                        <div className="space-y-3">
                            {activity.slice(0, 10).map((item) => (
                                <div
                                    key={`${item.type}-${item.id}`}
                                    className="flex items-center justify-between border-b border-border pb-3 text-sm"
                                >
                                    <div>
                                        <p className="font-semibold">{item.label}</p>
                                        <p className="text-xs capitalize text-text-muted">{item.type}</p>
                                    </div>
                                    <span className="text-xs text-text-muted">{formatDate(item.at)}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            )}
            {tab === "ai usage" && (
                <Panel title="AI usage events">
                    <DataTable
                        rows={ai}
                        columns={[
                            { key: "date", label: "Date", render: (row) => formatDate(row.started_at) },
                            { key: "action", label: "Action", render: (row) => row.action_code },
                            { key: "model", label: "Model", render: (row) => row.model || "—" },
                            { key: "status", label: "Status", render: (row) => row.status },
                            { key: "credits", label: "Credits", render: (row) => row.final_credits },
                            { key: "cost", label: "Cost", render: (row) => formatUSDMicros(row.estimated_cost_usd_micros) },
                        ]}
                    />
                </Panel>
            )}
            {tab === "credits" && (
                <div className="space-y-5">
                    <RoleGate minimum="support">
                        <Panel title="Grant credits">
                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <input
                                    type="number"
                                    min={1}
                                    value={grant}
                                    onChange={(event) => setGrant(Number(event.target.value))}
                                    className="min-h-11 rounded-xl border border-border bg-background px-4"
                                />
                                <input
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    className="min-h-11 flex-1 rounded-xl border border-border bg-background px-4"
                                />
                                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-bold text-text-muted">
                                    Expires
                                    <input
                                        type="date"
                                        value={creditExpiry}
                                        min={new Date().toISOString().slice(0, 10)}
                                        onChange={(event) => setCreditExpiry(event.target.value)}
                                        aria-label="Credit expiry date (leave empty for never)"
                                        className="bg-transparent text-sm font-normal text-text"
                                    />
                                </label>
                                <button
                                    onClick={() => setConfirm(true)}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-zinc-950"
                                >
                                    <Coins className="h-4 w-4" />
                                    Grant
                                </button>
                            </div>
                        </Panel>
                    </RoleGate>
                    <Panel title="Credit grants">
                        <DataTable
                            rows={credits?.grants || []}
                            columns={[
                                { key: "source", label: "Source", render: (row) => row.source },
                                { key: "granted", label: "Granted", render: (row) => row.credits_granted },
                                { key: "remaining", label: "Remaining", render: (row) => row.credits_remaining },
                                { key: "expiry", label: "Expiry", render: (row) => formatDate(row.expires_at) },
                            ]}
                        />
                    </Panel>
                </div>
            )}
            {tab === "subscription" && (
                <div className="space-y-5">
                    <RoleGate minimum="support">
                        <Panel title="Gift a pass">
                            <p className="-mt-2 mb-4 text-sm leading-6 text-text-muted">
                                Free, no payment taken. It unlocks every paid feature and carries the plan&apos;s credits, starts when
                                any pass they already have ends, and is left out of revenue.
                            </p>
                            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
                                <select
                                    value={giftPlan}
                                    onChange={(event) => setGiftPlan(event.target.value)}
                                    aria-label="Plan to gift"
                                    className="min-h-11 rounded-xl border border-border bg-background px-4"
                                >
                                    {plans.map((plan) => (
                                        <option key={plan.code} value={plan.code}>
                                            {plan.name}
                                        </option>
                                    ))}
                                </select>
                                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-bold text-text-muted">
                                    ×
                                    <input
                                        type="number"
                                        min={1}
                                        max={maxGiftPeriods}
                                        value={giftPeriods}
                                        onChange={(event) => setGiftPeriods(Number(event.target.value))}
                                        aria-label="Number of periods"
                                        className="w-14 bg-transparent text-sm font-normal text-text"
                                    />
                                    <span className="whitespace-nowrap font-normal">{giftLength}</span>
                                </label>
                                <input
                                    value={giftNote}
                                    onChange={(event) => setGiftNote(event.target.value)}
                                    maxLength={200}
                                    placeholder="Who is it for? e.g. Priya, family"
                                    aria-label="Note for the audit log"
                                    className="min-h-11 flex-1 rounded-xl border border-border bg-background px-4"
                                />
                                <button
                                    onClick={openGift}
                                    disabled={!giftReady}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-zinc-950 disabled:opacity-50"
                                >
                                    <Gift className="h-4 w-4" />
                                    Gift
                                </button>
                            </div>
                        </Panel>
                    </RoleGate>
                    <Panel title="Passes">
                        <DataTable
                            rows={detail.subscriptions || []}
                            empty="No passes. This user is on the free plan."
                            columns={[
                                { key: "plan", label: "Plan", render: (row) => row.plan?.name || "—" },
                                {
                                    key: "type",
                                    label: "Type",
                                    render: (row) =>
                                        row.provider === "gift" ? (
                                            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">Gift</span>
                                        ) : (
                                            "Paid"
                                        ),
                                },
                                { key: "state", label: "Status", render: (row) => passState(row) },
                                {
                                    key: "period",
                                    label: "Period",
                                    render: (row) => formatDateRange(row.current_period_start, row.current_period_end),
                                },
                            ]}
                        />
                    </Panel>
                </div>
            )}
            {tab === "feedback" && (
                <Panel title="Recent feedback">
                    <DataTable
                        rows={detail.recent_feedback}
                        columns={[
                            { key: "title", label: "Title", render: (row) => String(row.title || "") },
                            { key: "type", label: "Type", render: (row) => String(row.type || "") },
                            { key: "status", label: "Status", render: (row) => String(row.status || "") },
                            { key: "date", label: "Created", render: (row) => formatDate(String(row.created_at || "")) },
                        ]}
                    />
                </Panel>
            )}
            {tab === "moderation" && (
                <Panel title="Active abuse blocks">
                    {detail.active_abuse_blocks.length ? (
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
                            {JSON.stringify(detail.active_abuse_blocks, null, 2)}
                        </pre>
                    ) : (
                        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                            <ShieldAlert className="h-5 w-5" />
                            No active abuse block.
                        </div>
                    )}
                </Panel>
            )}
            <ConfirmDialog
                open={confirm}
                title="Grant AI credits?"
                description={`Grant ${grant} credits to user #${id} for “${reason}”. This money-equivalent action is written to the audit log.`}
                confirmLabel="Grant credits"
                destructive={false}
                busy={busy}
                onClose={() => setConfirm(false)}
                onConfirm={grantCredits}
            />
            <ConfirmDialog
                open={giftKey !== ""}
                title="Gift a free pass?"
                description={`Give user #${id} ${selectedPlan?.name || ""} for ${giftLength}, free, for “${giftNote.trim()}”. It starts when any pass they already have ends and is written to the audit log.`}
                confirmLabel="Gift pass"
                destructive={false}
                busy={busy}
                onClose={() => setGiftKey("")}
                onConfirm={giftPass}
            />
        </div>
    );
}
function describePeriods(plan: Plan, periods: number) {
    const [one, many] = periodUnits[plan.billing_interval] || ["period", "periods"];
    return `${periods} ${periods === 1 ? one : many}`;
}
function passState(pass: Pass) {
    const now = Date.now();
    if (pass.status !== "active" || new Date(pass.current_period_end).getTime() <= now) return "Ended";
    if (new Date(pass.current_period_start).getTime() > now) return "Queued";
    return "Active";
}
function describeError(reason: unknown, fallback: string) {
    if (reason instanceof AdminAPIError && reason.payload && typeof reason.payload === "object") {
        const fields = (reason.payload as { fields?: Record<string, string> }).fields;
        if (fields) return Object.entries(fields).map(([field, problem]) => `${field.replaceAll("_", " ")} ${problem}`).join("; ");
    }
    return reason instanceof Error ? reason.message : fallback;
}
function Mini({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="min-w-28 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
            <p className="mt-2 font-bold capitalize font-rounded">{String(value).replaceAll("_", " ")}</p>
        </div>
    );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-panel border border-border bg-card p-5 sm:p-7">
            <h2 className="mb-5 text-lg font-bold font-rounded">{title}</h2>
            {children}
        </section>
    );
}
