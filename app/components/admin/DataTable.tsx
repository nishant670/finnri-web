import React from "react";

export type DataColumn<T> = { key: string; label: string; render: (row: T) => React.ReactNode; className?: string };
export default function DataTable<T>({ rows, columns, empty = "No records found." }: { rows: T[]; columns: DataColumn<T>[]; empty?: string }) {
    return <div className="overflow-x-auto rounded-panel border border-border bg-card"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-zinc-50/70 text-[11px] uppercase tracking-[0.14em] text-text-muted dark:bg-zinc-900"><tr>{columns.map((column) => <th key={column.key} className={`px-5 py-4 font-bold ${column.className || ""}`}>{column.label}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.length ? rows.map((row, index) => <tr key={index} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">{columns.map((column) => <td key={column.key} className={`px-5 py-4 ${column.className || ""}`}>{column.render(row)}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-5 py-14 text-center text-text-muted">{empty}</td></tr>}</tbody></table></div>;
}
