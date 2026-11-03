import Link from "next/link";
import { ChevronRight, Lightbulb, Siren } from "lucide-react";
import { DashboardInsight } from "@/app/lib/api";
import { formatDate, formatMoney } from "@/app/lib/format";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";

function insightHref(insight: DashboardInsight, period: { start_date: string; end_date: string }) {
    if (insight.budget_id) return "/dashboard/tools#budgets";
    return transactionHref({
        ...period,
        type: "expense",
        ...(insight.category ? { category: insight.category } : {}),
        ...(insight.merchant ? { q: insight.merchant } : {}),
        ...(insight.account_id ? { account_id: insight.account_id } : {}),
        ...(insight.kind === "unusual_spending" && insight.amount !== undefined ? { min_amount: insight.amount } : {}),
    });
}

/** The facts beside the amount, which sits on the title line instead. */
function supportingFacts(insight: DashboardInsight) {
    const facts: string[] = [];
    if (insight.transaction_count !== undefined) facts.push(`${insight.transaction_count} transaction${insight.transaction_count === 1 ? "" : "s"}`);
    if (insight.change_percentage !== undefined) facts.push(`${insight.change_percentage >= 0 ? "+" : ""}${Math.round(insight.change_percentage)}% change`);
    if (insight.percentage !== undefined) facts.push(`${Math.round(insight.percentage)}% ${insight.budget_id ? "used" : "share"}`);
    if (insight.limit_amount !== undefined) facts.push(`${formatMoney(insight.limit_amount)} limit`);
    if (insight.remaining_amount !== undefined) facts.push(`${formatMoney(insight.remaining_amount)} remaining`);
    if (insight.next_expected_date) facts.push(`Expected ${formatDate(insight.next_expected_date)}`);
    if (insight.confidence !== undefined) facts.push(`${Math.round(insight.confidence * 100)}% match`);
    return facts;
}

/**
 * One insight as a row in Overview's "Needs attention": what happened, the
 * amount, the supporting facts, where to look, and how it was worked out.
 */
export default function DashboardInsightCard({
    insight,
    period,
}: {
    insight: DashboardInsight;
    period: { start_date: string; end_date: string };
}) {
    const warning = insight.severity === "warning";
    const facts = supportingFacts(insight);
    const Icon = warning ? Siren : Lightbulb;

    return (
        <article className="flex items-start gap-3 px-4 py-4 sm:px-5">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px]", warning ? "bg-warning-surface text-warning" : "bg-selected text-accent")}><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[15px] font-bold">{insight.title}</h3>
                    {insight.amount !== undefined && <p className="shrink-0 text-[15px] font-bold tabular-nums">{formatMoney(insight.amount)}</p>}
                </div>
                <p className="mt-0.5 text-sm leading-5 text-muted">{insight.body}</p>
                {facts.length > 0 && <p className="mt-1.5 text-[13px] text-muted">{facts.join(" · ")}</p>}
                {(insight.action_label || insight.explanation) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4">
                        {insight.action_label && <Link href={insightHref(insight, period)} className="inline-flex min-h-9 items-center gap-0.5 text-sm font-bold hover:underline">{insight.action_label}<ChevronRight className="h-4 w-4" /></Link>}
                        {insight.explanation && (
                            <details className="text-sm">
                                <summary className="flex min-h-9 cursor-pointer list-none items-center font-semibold text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">How this was worked out</summary>
                                <p className="mb-1 leading-5 text-muted">{insight.explanation}</p>
                            </details>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
