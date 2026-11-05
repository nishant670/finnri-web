"use client";

import { ResponsiveContainer, Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

export type TrendChartProps = {
    data: Record<string, unknown>[];
    dataKey: string;
    xKey?: string;
    label: string;
    color?: string;
    formatter?: (value: number) => string;
};

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

/** "2026-10-09" or an ISO timestamp → "9 Oct"; anything else is shown as given. */
function axisDate(value: unknown) {
    const text = String(value ?? "");
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? dayMonth.format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : text;
}

/** A single series over time, drawn in the dashboard's chart style. */
export default function TrendChartClient({
    data,
    dataKey,
    xKey = "date",
    label,
    color = "var(--series-gain)",
    formatter,
}: TrendChartProps) {
    const rows = data.map((row) => ({ ...row, [dataKey]: Number(row[dataKey] ?? 0) }));
    const gradientId = `fill-${dataKey.replace(/\W/g, "")}`;
    return (
        <div className="h-64 w-full sm:h-72" role="img" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey={xKey} tickFormatter={axisDate} minTickGap={24} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                        tick={{ fill: "var(--muted)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={formatter ? (value) => formatter(Number(value)) : (value) => Number(value).toLocaleString("en-IN")}
                        width={formatter ? 72 : 48}
                    />
                    <Tooltip
                        labelFormatter={axisDate}
                        formatter={(value) => [formatter ? formatter(Number(value)) : Number(value).toLocaleString("en-IN"), label]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 13, color: "var(--foreground)" }}
                        cursor={{ stroke: "var(--muted)", strokeDasharray: "4 4" }}
                    />
                    <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#${gradientId})`} strokeWidth={2.5} isAnimationActive={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
