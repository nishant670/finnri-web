"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, Building2, ChevronRight, CreditCard, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { EmptyPanel, ErrorNotice, PageHeader, Panel, SectionTitle, Stat } from "@/app/components/dashboard/kit";
import { Account, AccountsAPI, apiErrorMessage } from "@/app/lib/api";
import { ACCOUNT_TYPES, creditCardPosition } from "@/app/lib/accounts";
import { formatDate, formatMoney, formatRupees, toLocalISO } from "@/app/lib/format";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";
import { PageSkeleton } from "@/app/components/ui/Skeleton";

function AccountIcon({ type }: { type: Account["type"] }) {
    const props = { className: "h-5 w-5", strokeWidth: 1.8 };
    if (type === "cash") return <Banknote {...props} />;
    if (type === "upi") return <Smartphone {...props} />;
    if (type === "bank") return <Building2 {...props} />;
    if (type === "credit_card" || type === "debit_card") return <CreditCard {...props} />;
    return <WalletCards {...props} />;
}

const typeLabel = (type: Account["type"]) => ACCOUNT_TYPES.find((item) => item.value === type)?.label || "Account";

/** The next date a card's bill falls due, from its due day of the month. */
function nextDueDate(dueDay: number) {
    if (!dueDay) return null;
    const today = new Date();
    const clamp = (year: number, month: number) => new Date(year, month, Math.min(dueDay, new Date(year, month + 1, 0).getDate()));
    const thisMonth = clamp(today.getFullYear(), today.getMonth());
    return thisMonth >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisMonth : clamp(today.getFullYear(), today.getMonth() + 1);
}

function AccountRow({ account, share, href }: { account: Account; share: number; href: string }) {
    const summary = account.summary;
    const isCard = account.type === "credit_card";
    const outstanding = summary?.outstanding ?? summary?.limit?.outstanding ?? account.balance;
    const position = creditCardPosition(outstanding);
    const utilisation = summary?.limit?.utilisation_pct ?? summary?.credit_utilisation;
    const due = isCard ? nextDueDate(account.due_day) : null;
    const balance = summary?.running_balance;
    const meta = [account.provider, account.identifier ? (isCard || account.type === "bank" ? `•• ${account.identifier.slice(-4)}` : account.identifier) : ""].filter(Boolean).join(" · ") || typeLabel(account.type);

    return (
        <Link href={href} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-track sm:px-5 md:grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_7.5rem] md:gap-5">
            <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-track text-muted" style={{ color: account.color || undefined }}><AccountIcon type={account.type} /></span>
            <span className="min-w-0">
                <span className="flex items-center gap-2"><span className="truncate text-[15px] font-semibold">{account.name}</span>{account.is_default && <span className="shrink-0 rounded-full bg-selected px-2 py-0.5 text-[11px] font-bold">Default</span>}</span>
                <span className="block truncate text-[13px] text-muted">{meta}</span>
            </span>
            <span className="hidden min-w-0 md:block">
                <span className="block text-[13px] text-muted">Spent this month</span>
                <span className="flex items-center gap-2"><span className="text-[15px] font-semibold tabular-nums">{formatMoney(summary?.spent_this_month ?? 0)}</span><span className="h-1.5 max-w-24 flex-1 overflow-hidden rounded-full bg-track" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--series-gain)]" style={{ width: `${Math.round(share * 100)}%` }} /></span></span>
            </span>
            <span className="hidden min-w-0 md:block">
                {isCard ? (
                    <>
                        <span className="block text-[13px] text-muted">{account.credit_limit ? `${Math.round(utilisation ?? 0)}% of ${formatRupees(account.credit_limit)} used` : "No limit set"}</span>
                        {account.credit_limit ? <span className="mt-1.5 block h-1.5 max-w-40 overflow-hidden rounded-full bg-track" aria-hidden="true"><span className={cn("block h-full rounded-full", (utilisation ?? 0) > 75 ? "bg-negative" : (utilisation ?? 0) > 30 ? "bg-warning" : "bg-positive")} style={{ width: `${Math.min(100, utilisation ?? 0)}%` }} /></span> : null}
                    </>
                ) : (
                    <span className="block text-[13px] text-muted">{summary?.last_activity_date ? `Last used ${formatDate(summary.last_activity_date)}` : "No activity yet"}</span>
                )}
            </span>
            <span className="text-right">
                {isCard ? (
                    <>
                        <span className="block text-[15px] font-bold tabular-nums">{formatMoney(position.displayAmount)}</span>
                        <span className="block text-[13px] text-muted">{position.label === "In credit" ? "In credit" : due ? `Due ${formatDate(due)}` : "Outstanding"}</span>
                    </>
                ) : balance !== undefined ? (
                    <>
                        <span className="block text-[15px] font-bold tabular-nums">{formatMoney(balance)}</span>
                        <span className="block text-[13px] text-muted">Balance</span>
                    </>
                ) : (
                    <>
                        <span className="block text-[15px] font-bold tabular-nums md:hidden">{formatMoney(summary?.spent_this_month ?? 0)}</span>
                        <span className="block text-[13px] text-muted md:hidden">spent this month</span>
                        <ChevronRight className="hidden h-4 w-4 text-muted md:block" />
                    </>
                )}
            </span>
        </Link>
    );
}

export default function AccountsScreen() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadAccounts = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await AccountsAPI.list(Intl.DateTimeFormat().resolvedOptions().timeZone);
            setAccounts(response.data);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t load your accounts."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadAccounts(); }, [loadAccounts]);

    const monthRange = useMemo(() => {
        const start = new Date();
        start.setDate(1);
        return { start_date: toLocalISO(start), end_date: toLocalISO() };
    }, []);
    const assetAccounts = accounts.filter((account) => account.type !== "credit_card");
    const cardAccounts = accounts.filter((account) => account.type === "credit_card");
    // An account with entries but no opening balance has no balance to add.
    const knownAssetBalance = assetAccounts.reduce((sum, account) => sum + (account.summary?.running_balance ?? (account.summary?.entries_total ? 0 : account.balance)), 0);
    const withoutBaseline = assetAccounts.filter((account) => account.summary?.entries_total && account.summary.running_balance === undefined).length;
    const cardsOwed = cardAccounts.reduce((sum, account) => sum + creditCardPosition(account.summary?.outstanding ?? account.balance).owedAmount, 0);
    const spentThisMonth = accounts.reduce((sum, account) => sum + (account.summary?.spent_this_month ?? 0), 0);
    const topSpend = Math.max(1, ...accounts.map((account) => account.summary?.spent_this_month ?? 0));

    const section = (title: string, list: Account[]) => list.length > 0 && (
        <section aria-label={title}>
            <SectionTitle title={title} detail={`${list.length}`} />
            <Panel className="divide-y divide-border overflow-hidden">
                {[...list].sort((a, b) => (b.summary?.spent_this_month ?? 0) - (a.summary?.spent_this_month ?? 0)).map((account) => (
                    <AccountRow key={account.id} account={account} share={(account.summary?.spent_this_month ?? 0) / topSpend} href={transactionHref({ account_id: account.id, ...monthRange })} />
                ))}
            </Panel>
        </section>
    );

    return (
        <div className="space-y-5 pb-12">
            <PageHeader title="Accounts" description="What you hold and what your cards owe, from what you’ve logged. Pick an account to see this month’s transactions." />
            {error && <ErrorNotice message={error} onRetry={() => void loadAccounts()} />}

            {loading && accounts.length === 0 ? <PageSkeleton /> : accounts.length === 0 ? (
                <EmptyPanel title="No accounts yet" body="Add your cash, UPI, bank and card accounts in the Finnri app; they show here with what you’ve spent from each." />
            ) : (
                <>
                    <section aria-label="Account totals" className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-3 [&>*]:border-border max-lg:[&>*:last-child]:col-span-2 max-lg:[&>*:last-child]:border-t max-lg:[&>*:first-child]:border-r lg:[&>*:not(:last-child)]:border-r">
                        <Stat label="Cash & bank" value={formatRupees(knownAssetBalance)} detail={withoutBaseline ? `${withoutBaseline} without an opening balance` : `${assetAccounts.length} account${assetAccounts.length === 1 ? "" : "s"}`} />
                        <Stat label="Card dues" value={formatRupees(cardsOwed)} detail={`${cardAccounts.length} card${cardAccounts.length === 1 ? "" : "s"}`} />
                        <Stat label="Spent this month" value={formatRupees(spentThisMonth)} detail="Across all accounts" />
                    </section>
                    {section("Bank, UPI & cash", assetAccounts)}
                    {section("Credit cards", cardAccounts)}
                </>
            )}
            <p className="flex items-center gap-2 text-[13px] text-muted"><ShieldCheck className="h-4 w-4 shrink-0" /> Finnri never connects to your bank. Add or edit accounts in the Finnri app.</p>
        </div>
    );
}
