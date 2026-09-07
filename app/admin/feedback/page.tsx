"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, Save, Search } from "lucide-react";
import StatTile from "@/app/components/admin/StatTile";
import RoleGate from "@/app/components/admin/RoleGate";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";
import { AdminAPI, AdminPage, withQuery } from "@/app/lib/admin-api";
import { formatDate } from "@/app/lib/format";

type Feedback = {
    id: number;
    type: string;
    area: string;
    title: string;
    message: string;
    impact: string;
    status: string;
    admin_notes: string;
    created_at: string;
};
type Item = { feedback: Feedback; user: { id: number; username: string; email?: string } };
type Stats = {
    total: number;
    by_status: Record<string, number>;
    by_area: Record<string, number>;
    by_type: Record<string, number>;
    by_impact: Record<string, number>;
    median_open_age_days: number;
};
const statuses = ["new", "triaged", "planned", "shipped", "declined"];
export default function FeedbackPage() {
    const { toast } = useToast();
    const [items, setItems] = useState<Item[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [status, setStatus] = useState("");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [list, summary] = await Promise.all([
                AdminAPI.get<AdminPage<{ feedback: Item[] }>>(withQuery("feedback", { status, q, page_size: 100 })),
                AdminAPI.get<Stats>("feedback/stats"),
            ]);
            setItems(list.feedback);
            setStats(summary);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load feedback");
        } finally {
            setLoading(false);
        }
    }, [q, status]);
    useEffect(() => {
        const timer = setTimeout(() => void load(), 250);
        return () => clearTimeout(timer);
    }, [load]);
    async function save(item: Item) {
        try {
            const updated = await AdminAPI.patch<Feedback>(`feedback/${item.feedback.id}`, {
                status: item.feedback.status,
                admin_notes: item.feedback.admin_notes,
            });
            setItems((current) => current.map((row) => (row.feedback.id === updated.id ? { ...row, feedback: updated } : row)));
            toast({ title: "Feedback updated" });
            const next = await AdminAPI.get<Stats>("feedback/stats");
            setStats(next);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to update feedback");
        }
    }
    if (loading && !stats) return <PageSkeleton />;
    return (
        <div className="space-y-7">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Voice of customer</p>
                <h1 className="mt-2 text-3xl font-bold font-rounded">Feedback inbox</h1>
                <p className="mt-2 text-sm text-text-muted">Triage product feedback, preserve support notes, and surface hot areas.</p>
            </header>
            {stats && (
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatTile label="All feedback" value={stats.total} />
                    {statuses.slice(0, 3).map((key) => (
                        <StatTile key={key} label={key} value={stats.by_status[key] || 0} />
                    ))}
                    <StatTile label="Median open age" value={`${stats.median_open_age_days.toFixed(1)}d`} />
                </section>
            )}
            <div className="flex flex-col gap-3 rounded-panel border border-border bg-card p-4 sm:flex-row">
                <label className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-text-muted" />
                    <input
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                        placeholder="Search title, message, or area"
                        className="min-h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm"
                    />
                </label>
                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-bold"
                >
                    <option value="">All statuses</option>
                    {statuses.map((value) => (
                        <option key={value}>{value}</option>
                    ))}
                </select>
            </div>
            {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            <section className="grid gap-4 xl:grid-cols-2">
                {items.map((item) => (
                    <article key={item.feedback.id} className="rounded-panel border border-border bg-card p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-secondary text-accent">
                                    <MessageSquareText className="h-4 w-4" />
                                </span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                        {item.feedback.type.replaceAll("_", " ")} · {item.feedback.area || "General"}
                                    </p>
                                    <h2 className="mt-1 font-bold font-rounded">{item.feedback.title}</h2>
                                </div>
                            </div>
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase dark:bg-zinc-800">
                                {item.feedback.impact}
                            </span>
                        </div>
                        <p className="mt-5 text-sm leading-6 text-text-muted">{item.feedback.message}</p>
                        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-text-muted">
                            <span>
                                {item.user.username} · {item.user.email}
                            </span>
                            <span>{formatDate(item.feedback.created_at)}</span>
                        </div>
                        <RoleGate
                            minimum="support"
                            fallback={<p className="mt-4 text-xs font-bold capitalize text-accent">{item.feedback.status}</p>}
                        >
                            <div className="mt-4 grid gap-3 sm:grid-cols-[0.6fr_1.4fr_auto]">
                                <select
                                    value={item.feedback.status}
                                    onChange={(event) =>
                                        setItems((current) =>
                                            current.map((row) =>
                                                row.feedback.id === item.feedback.id
                                                    ? { ...row, feedback: { ...row.feedback, status: event.target.value } }
                                                    : row,
                                            ),
                                        )
                                    }
                                    className="min-h-10 rounded-xl border border-border bg-background px-3 text-xs font-bold"
                                >
                                    {statuses.map((value) => (
                                        <option key={value}>{value}</option>
                                    ))}
                                </select>
                                <input
                                    value={item.feedback.admin_notes}
                                    onChange={(event) =>
                                        setItems((current) =>
                                            current.map((row) =>
                                                row.feedback.id === item.feedback.id
                                                    ? { ...row, feedback: { ...row.feedback, admin_notes: event.target.value } }
                                                    : row,
                                            ),
                                        )
                                    }
                                    placeholder="Internal notes"
                                    className="min-h-10 rounded-xl border border-border bg-background px-3 text-xs"
                                />
                                <button
                                    onClick={() => void save(item)}
                                    className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-zinc-950"
                                    aria-label="Save feedback"
                                >
                                    <Save className="h-4 w-4" />
                                </button>
                            </div>
                        </RoleGate>
                    </article>
                ))}
                {!items.length && (
                    <div className="col-span-full rounded-panel border border-dashed border-border p-12 text-center text-text-muted">
                        No feedback matches these filters.
                    </div>
                )}
            </section>
        </div>
    );
}
