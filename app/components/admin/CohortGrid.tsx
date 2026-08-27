export default function CohortGrid({ cohorts }: { cohorts: { cohort_week: string; size: number; retention: number[] }[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
                <thead>
                    <tr>
                        <th className="p-2 text-left">Cohort</th>
                        <th className="p-2 text-right">Users</th>
                        {Array.from({ length: Math.max(0, ...cohorts.map((row) => row.retention.length)) }, (_, index) => (
                            <th key={index} className="p-2 text-center">
                                W{index}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {cohorts.map((row) => (
                        <tr key={row.cohort_week}>
                            <td className="p-2 font-semibold">{row.cohort_week}</td>
                            <td className="p-2 text-right text-text-muted">{row.size}</td>
                            {row.retention.map((value, index) => (
                                <td key={index} className="p-1">
                                    <div
                                        className="rounded-lg p-2 text-center font-bold"
                                        style={{ backgroundColor: `color-mix(in srgb, var(--accent) ${Math.max(4, value)}%, transparent)` }}
                                    >
                                        {value.toFixed(0)}%
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
