"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney } from "@/app/lib/format";

export type DailySpendingDatum = {
    date: string;
    label: string;
    amount: number;
    count: number;
};

/**
 * A bar per day (board R9-Dash): the biggest day in the accent, every other day
 * a quieter shade of it, and the daily average as a dashed line to read them
 * against. Clicking a bar opens that day's expenses.
 */
export default function DailySpendingChart({
    data,
    onSelectDate,
    average,
}: {
    data: DailySpendingDatum[];
    onSelectDate: (date: string) => void;
    /** The period's daily average; drawn as a reference line when above zero. */
    average?: number;
}) {
    const peak = data.reduce((max, item) => Math.max(max, item.amount), 0);
    const ticks = data.length > 2
        ? [data[0].label, data[Math.floor((data.length - 1) / 3)].label, data[Math.floor(((data.length - 1) * 2) / 3)].label, data[data.length - 1].label]
        : data.map((item) => item.label);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 4, right: 16, top: 18, bottom: 0 }} barCategoryGap="18%">
                <XAxis dataKey="label" axisLine={false} tickLine={false} ticks={ticks} interval={0} tick={{ fontSize: 12, fill: "var(--muted)" }} />
                <YAxis hide domain={[0, (max: number) => Math.max(max, average || 0)]} />
                <Tooltip cursor={{ fill: "var(--track)" }} content={({ active, label }) => {
                    if (!active) return null;
                    const day = data.find((item) => item.label === label);
                    if (!day) return null;
                    return <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-xl"><p className="font-bold">{formatDate(day.date)}</p><p className="mt-1 text-muted">{formatMoney(day.amount)} · {day.count} transaction{day.count === 1 ? "" : "s"}</p></div>;
                }} />
                {average && average > 0 ? (
                    <ReferenceLine
                        y={average}
                        stroke="var(--muted)"
                        strokeDasharray="4 4"
                        label={{ value: `avg ${formatMoney(average)}`, position: "insideTopRight", fill: "var(--muted)", fontSize: 12 }}
                    />
                ) : null}
                <Bar dataKey="amount" radius={[3, 3, 0, 0]} minPointSize={3} className="cursor-pointer" onClick={(item) => {
                    const date = item.payload?.date;
                    if (date) onSelectDate(date);
                }}>
                    {data.map((item) => (
                        <Cell key={item.date} fill={item.amount > 0 && item.amount === peak ? "var(--accent)" : "var(--bar-dim)"} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
