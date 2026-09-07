"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Download, Search, UserRound } from "lucide-react";
import DataTable from "@/app/components/admin/DataTable";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { AdminAPI, AdminPage, withQuery } from "@/app/lib/admin-api";
import { formatDate } from "@/app/lib/format";

type UserRow = {
    id: number;
    username: string;
    email?: string;
    phone?: string;
    is_guest: boolean;
    created_at: string;
    last_active_at?: string;
    plan_code?: string;
    credits_remaining: number;
    entries_count: number;
    ai_credits_used: number;
};
export default function AdminUsersPage() {
    const [rows, setRows] = useState<UserRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [submitted, setSubmitted] = useState("");
    const [type, setType] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await AdminAPI.get<AdminPage<{ users: UserRow[] }>>(
                withQuery("users", { q: submitted, type, page, page_size: 25, sort: "last_active_desc" }),
            );
            setRows(result.users);
            setTotal(result.total);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load users");
        } finally {
            setLoading(false);
        }
    }, [page, submitted, type]);
    useEffect(() => {
        void load();
    }, [load]);
    function search(event: FormEvent) {
        event.preventDefault();
        setPage(1);
        setSubmitted(q);
    }
    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Customer directory</p>
                    <h1 className="mt-2 text-3xl font-bold font-rounded">Users</h1>
                    <p className="mt-2 text-sm text-text-muted">PII is masked in this list. Support-level detail views are audited.</p>
                </div>
                <a
                    href="/api/admin/export/users.csv"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </a>
            </header>
            <form onSubmit={search} className="flex flex-col gap-3 rounded-panel border border-border bg-card p-4 sm:flex-row">
                <label className="relative flex-1">
                    <span className="sr-only">Search users</span>
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-text-muted" />
                    <input
                        value={q}
                        onChange={(event) => setQ(event.target.value)}
                        placeholder="Username, email, phone, or user ID"
                        className="min-h-11 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm outline-none focus:border-accent"
                    />
                </label>
                <select
                    value={type}
                    onChange={(event) => {
                        setType(event.target.value);
                        setPage(1);
                    }}
                    className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold"
                >
                    <option value="">All users</option>
                    <option value="registered">Registered</option>
                    <option value="guest">Guests</option>
                </select>
                <button className="min-h-11 rounded-xl bg-accent px-6 text-sm font-bold text-zinc-950">Search</button>
            </form>
            {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div>}
            {loading ? (
                <PageSkeleton rows={6} />
            ) : (
                <>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{total.toLocaleString("en-IN")} users</span>
                        <span>Page {page}</span>
                    </div>
                    <DataTable
                        rows={rows}
                        columns={[
                            {
                                key: "user",
                                label: "User",
                                render: (row) => (
                                    <Link href={`/admin/users/${row.id}`} className="flex items-center gap-3 font-bold hover:text-accent">
                                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-secondary text-accent">
                                            <UserRound className="h-4 w-4" />
                                        </span>
                                        <span>
                                            {row.username}
                                            <small className="mt-0.5 block font-normal text-text-muted">
                                                #{row.id} · {row.email || row.phone || "Anonymous"}
                                            </small>
                                        </span>
                                    </Link>
                                ),
                            },
                            {
                                key: "kind",
                                label: "Type",
                                render: (row) => (
                                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold dark:bg-zinc-800">
                                        {row.is_guest ? "Guest" : "Registered"}
                                    </span>
                                ),
                            },
                            {
                                key: "plan",
                                label: "Plan",
                                render: (row) => <span className="capitalize">{row.plan_code?.replaceAll("_", " ") || "Free"}</span>,
                            },
                            {
                                key: "activity",
                                label: "Last active",
                                render: (row) => <span className="text-text-muted">{formatDate(row.last_active_at)}</span>,
                            },
                            {
                                key: "entries",
                                label: "Entries",
                                className: "text-right",
                                render: (row) => row.entries_count.toLocaleString("en-IN"),
                            },
                            {
                                key: "credits",
                                label: "Credits left",
                                className: "text-right",
                                render: (row) => row.credits_remaining.toLocaleString("en-IN"),
                            },
                            {
                                key: "ai",
                                label: "AI used",
                                className: "text-right",
                                render: (row) => row.ai_credits_used.toLocaleString("en-IN"),
                            },
                        ]}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                            className="min-h-10 rounded-xl border border-border bg-card px-4 text-xs font-bold disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page * 25 >= total}
                            onClick={() => setPage((value) => value + 1)}
                            className="min-h-10 rounded-xl border border-border bg-card px-4 text-xs font-bold disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
