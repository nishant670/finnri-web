import React from "react";

export type DataColumn<T> = { key: string; label: string; render: (row: T) => React.ReactNode; className?: string };

/** The admin's one table style: quiet headers, rows that highlight, horizontal scroll on phones. */
export default function DataTable<T>({
    rows,
    columns,
    empty = "Nothing here yet.",
}: {
    rows: T[];
    columns: DataColumn<T>[];
    empty?: string;
}) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border text-[13px] text-muted">
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-semibold sm:px-5 ${column.className || ""}`}>
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.length ? (
                        rows.map((row, index) => (
                            <tr key={index} className="transition-colors hover:bg-track">
                                {columns.map((column) => (
                                    <td key={column.key} className={`px-4 py-3 sm:px-5 ${column.className || ""}`}>
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="px-5 py-12 text-center text-muted">
                                {empty}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
