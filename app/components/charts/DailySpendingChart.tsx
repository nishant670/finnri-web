"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney } from "@/app/lib/format";

export type DailySpendingDatum = {
    date: string;
    label: string;
    amount: number;
    count: number;
};

export default function DailySpendingChart({ data, onSelectDate }: { data: DailySpendingDatum[]; onSelectDate: (date: string) => void }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "var(--accent-secondary)" }} content={({ active, label }) => {
                    if (!active) return null;
                    const day = data.find((item) => item.label === label);
                    if (!day) return null;
                    return <div className="rounded-2xl border border-border bg-card p-3 text-xs shadow-xl"><p className="font-bold">{formatDate(day.date)}</p><p className="mt-1 text-zinc-500">{formatMoney(day.amount)} · {day.count} transaction{day.count === 1 ? "" : "s"}</p></div>;
                }} />
                <Bar dataKey="amount" fill="var(--accent)" radius={[8, 8, 0, 0]} barSize={28} className="cursor-pointer" onClick={(item) => {
                    const date = item.payload?.date;
                    if (date) onSelectDate(date);
                }} />
            </BarChart>
        </ResponsiveContainer>
    );
}
