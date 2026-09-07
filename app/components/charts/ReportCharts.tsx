"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/app/lib/format";

export type CategoryChartDatum = { name: string; amount: number; percentage: number };
export type MonthChartDatum = { month: string; expense: number; income: number; net: number };

const tooltipStyle = { borderRadius: 16, border: "1px solid var(--border)", background: "var(--chart-tooltip)", color: "var(--foreground)" };

export function CategoryMixChart({ data, onSelectCategory }: { data: CategoryChartDatum[]; onSelectCategory: (category: string) => void }) {
    return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={116} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} /><Tooltip formatter={(value) => formatMoney(Number(value))} cursor={{ fill: "var(--accent-secondary)" }} contentStyle={tooltipStyle} /><Bar dataKey="amount" fill="var(--accent)" radius={[0, 8, 8, 0]} barSize={24} className="cursor-pointer" onClick={(item) => { if (item.payload?.name) onSelectCategory(item.payload.name); }} /></BarChart></ResponsiveContainer>;
}

export function MonthlyTrendChart({ data }: { data: MonthChartDatum[] }) {
    return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} /><YAxis hide /><Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={tooltipStyle} /><Line type="monotone" dataKey="expense" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="income" stroke="var(--chart-positive)" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>;
}
