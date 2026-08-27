"use client";

import { ResponsiveContainer, Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

export default function TrendChart({
    data,
    dataKey,
    xKey = "date",
    label,
    color = "var(--accent)",
    formatter,
}: {
    data: Record<string, unknown>[];
    dataKey: string;
    xKey?: string;
    label: string;
    color?: string;
    formatter?: (value: number) => string;
}) {
    return (
        <div className="h-72 w-full" aria-label={label}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.32} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 5" vertical={false} />
                    <XAxis dataKey={xKey} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                        formatter={(value) => (formatter ? formatter(Number(value)) : Number(value).toLocaleString("en-IN"))}
                        contentStyle={{ background: "var(--chart-tooltip)", borderColor: "var(--border)", borderRadius: 16 }}
                    />
                    <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#fill-${dataKey})`} strokeWidth={2.5} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
