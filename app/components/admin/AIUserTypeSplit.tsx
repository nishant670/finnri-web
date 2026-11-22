import { formatUSDMicros } from "@/app/lib/format";

export type AISegment = { events: number; credits_used: number; estimated_cost_usd_micros: number };
export type AIByUserType = Partial<Record<"registered" | "guest" | "test", AISegment>>;

const rows = [
    { key: "registered", label: "Registered users" },
    { key: "guest", label: "Guests" },
    { key: "test", label: "Test accounts" },
] as const;

// Where AI usage went. Totals elsewhere include everyone, since test traffic
// still costs money; this says how much of it was real customers.
export default function AIUserTypeSplit({ split, className = "" }: { split?: AIByUserType; className?: string }) {
    if (!split) return null;
    const totalCost = rows.reduce((sum, row) => sum + (split[row.key]?.estimated_cost_usd_micros ?? 0), 0);
    return (
        <article className={`min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-7 ${className}`}>
            <h2 className="text-[17px] font-bold">AI usage by user type</h2>
            <p className="mt-1 text-xs text-muted">Totals above include everyone. Cost is the estimated provider cost.</p>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-muted">
                            <th className="pb-2 font-semibold">Who</th>
                            <th className="pb-2 text-right font-semibold">AI reads</th>
                            <th className="hidden pb-2 text-right font-semibold sm:table-cell">Credits</th>
                            <th className="pb-2 text-right font-semibold">Cost</th>
                            <th className="pb-2 text-right font-semibold">Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const segment = split[row.key] ?? { events: 0, credits_used: 0, estimated_cost_usd_micros: 0 };
                            const share = totalCost > 0 ? Math.round((segment.estimated_cost_usd_micros / totalCost) * 100) : 0;
                            return (
                                <tr key={row.key} className="border-t border-border">
                                    <td className={`py-2.5 font-semibold ${row.key === "test" ? "text-muted" : ""}`}>{row.label}</td>
                                    <td className="py-2.5 text-right tabular-nums">{segment.events.toLocaleString("en-IN")}</td>
                                    <td className="hidden py-2.5 text-right tabular-nums sm:table-cell">{segment.credits_used.toLocaleString("en-IN")}</td>
                                    <td className="py-2.5 text-right tabular-nums">{formatUSDMicros(segment.estimated_cost_usd_micros)}</td>
                                    <td className="py-2.5 text-right tabular-nums">{totalCost > 0 ? `${share}%` : "—"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </article>
    );
}
