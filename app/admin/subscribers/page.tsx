"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Download } from "lucide-react";
import StatTile from "@/app/components/admin/StatTile";
import DataTable from "@/app/components/admin/DataTable";
import TrendChart from "@/app/components/admin/TrendChart";
import RoleGate from "@/app/components/admin/RoleGate";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";
import { AdminAPI, AdminPage, dateWindow, withQuery } from "@/app/lib/admin-api";
import { percent } from "@/app/lib/admin-metrics";
import { formatDate, formatMinorMoney } from "@/app/lib/format";

const PlanMixChart = dynamic(() => import("@/app/components/charts/PlanMixChart"), {
    ssr: false,
    loading: () => <div className="h-full animate-pulse rounded-2xl bg-surface-muted" aria-hidden="true" />,
});

type Revenue = {
    active_subscribers: number;
    modelled_mrr_minor: number;
    modelled_arr_minor: number;
    modelled_arpu_minor: number;
    paid_conversion_percent: number;
    inferred_churned_in_window: number;
    renewals_due_7_days: number;
    renewals_due_30_days: number;
    cancel_at_period_end: number;
    by_plan: Record<string, { subscribers: number; modelled_mrr_minor: number }>;
    trend: Record<string, unknown>[];
};
type SubRow = {
    subscription: { id: number; status: string; current_period_end: string; cancel_at_period_end: boolean; plan: { name: string } };
    user: { username: string; email: string };
};
type Quote = {
    id: number;
    user_id: number;
    status: string;
    paid_months_completed: number;
    average_monthly_credits: number;
    created_at: string;
};
export default function SubscribersPage() {
    const { toast } = useToast();
    const [revenue, setRevenue] = useState<Revenue | null>(null);
    const [subs, setSubs] = useState<SubRow[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const window = dateWindow(30);
        Promise.all([
            AdminAPI.get<Revenue>(withQuery("revenue", window)),
            AdminAPI.get<AdminPage<{ subscriptions: SubRow[] }>>("subscriptions?page_size=100"),
            AdminAPI.get<{ requests: Quote[] }>("billing/lifetime-quotes?page_size=100"),
        ])
            .then(([r, s, q]) => {
                setRevenue(r);
                setSubs(s.subscriptions);
                setQuotes(q.requests);
            })
            .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load subscriptions"))
            .finally(() => setLoading(false));
    }, []);
    if (loading) return <PageSkeleton />;
    async function updateQuote(id: number, status: string) {
        try {
            const updated = await AdminAPI.patch<Quote>(`billing/lifetime-quotes/${id}`, { status });
            setQuotes((current) => current.map((quote) => (quote.id === id ? updated : quote)));
            toast({ title: "Quote status updated" });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to update quote");
        }
    }
    const mix = Object.entries(revenue?.by_plan || {}).map(([name, row]) => ({ name: name.replaceAll("_", " "), value: row.subscribers }));
    return (
        <div className="space-y-7">
            <header className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Entitlements & forecast</p>
                    <h1 className="mt-2 text-3xl font-bold font-rounded">Subscribers</h1>
                </div>
                <a
                    href="/api/admin/export/subscriptions.csv"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold"
                >
                    <Download className="h-4 w-4" />
                    Export
                </a>
            </header>
            <div className="flex items-start gap-3 rounded-panel border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                    <strong>Modelled from plan prices — no payment provider connected.</strong> These figures forecast entitlement value;
                    they are not cash collected.
                </p>
            </div>
            {error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
            {revenue && (
                <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatTile label="Active subscribers" value={revenue.active_subscribers} />
                        <StatTile label="Modelled MRR" value={formatMinorMoney(revenue.modelled_mrr_minor)} />
                        <StatTile label="Modelled ARR" value={formatMinorMoney(revenue.modelled_arr_minor)} />
                        <StatTile label="ARPU" value={formatMinorMoney(revenue.modelled_arpu_minor)} />
                        <StatTile label="Paid conversion" value={percent(revenue.paid_conversion_percent)} />
                        <StatTile
                            label="Renewals · 7 days"
                            value={revenue.renewals_due_7_days}
                            hint={`${revenue.renewals_due_30_days} due within 30 days`}
                        />
                        <StatTile label="Cancel at period end" value={revenue.cancel_at_period_end} />
                        <StatTile label="Inferred churn" value={revenue.inferred_churned_in_window} hint="No status-history stream yet" />
                    </section>
                    <section className="grid gap-5 xl:grid-cols-2">
                        <article className="rounded-panel border border-border bg-card p-6">
                            <h2 className="text-lg font-bold font-rounded">Modelled MRR trend</h2>
                            <p className="mt-1 text-xs text-text-muted">Reconstructed from current subscription periods.</p>
                            <TrendChart
                                data={revenue.trend || []}
                                dataKey="modelled_mrr_minor"
                                label="Modelled MRR"
                                formatter={formatMinorMoney}
                            />
                        </article>
                        <article className="rounded-panel border border-border bg-card p-6">
                            <h2 className="text-lg font-bold font-rounded">Plan mix</h2>
                            <div className="h-72">
                                <PlanMixChart data={mix} />
                            </div>
                        </article>
                    </section>
                    <section>
                        <h2 className="mb-4 text-lg font-bold font-rounded">Subscriber ledger</h2>
                        <DataTable
                            rows={subs}
                            columns={[
                                {
                                    key: "user",
                                    label: "User",
                                    render: (row) => (
                                        <span className="font-semibold">
                                            {row.user.username}
                                            <small className="block font-normal text-text-muted">{row.user.email}</small>
                                        </span>
                                    ),
                                },
                                { key: "plan", label: "Plan", render: (row) => row.subscription.plan?.name || "—" },
                                { key: "status", label: "Status", render: (row) => row.subscription.status },
                                { key: "renewal", label: "Period end", render: (row) => formatDate(row.subscription.current_period_end) },
                                {
                                    key: "cancel",
                                    label: "Cancelling",
                                    render: (row) => (row.subscription.cancel_at_period_end ? "Yes" : "No"),
                                },
                            ]}
                        />
                    </section>
                </>
            )}
            <section>
                <h2 className="mb-4 text-lg font-bold font-rounded">Lifetime quote queue</h2>
                <DataTable
                    rows={quotes}
                    empty="No quote requests."
                    columns={[
                        { key: "user", label: "User", render: (row) => `#${row.user_id}` },
                        {
                            key: "status",
                            label: "Status",
                            render: (row) => (
                                <RoleGate minimum="support" fallback={row.status}>
                                    <select
                                        value={row.status}
                                        onChange={(event) => void updateQuote(row.id, event.target.value)}
                                        className="min-h-9 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                                    >
                                        <option>requested</option>
                                        <option>reviewing</option>
                                        <option>quoted</option>
                                        <option>accepted</option>
                                        <option>declined</option>
                                        <option>closed</option>
                                    </select>
                                </RoleGate>
                            ),
                        },
                        { key: "months", label: "Paid months", render: (row) => row.paid_months_completed },
                        {
                            key: "credits",
                            label: "Avg monthly credits",
                            render: (row) => row.average_monthly_credits.toLocaleString("en-IN"),
                        },
                        { key: "created", label: "Requested", render: (row) => formatDate(row.created_at) },
                    ]}
                />
            </section>
        </div>
    );
}
