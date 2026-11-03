/**
 * Weekly retention as a heat grid: each cell is the share of that week's
 * cohort still active N weeks later, shaded from the track colour to blue.
 */
export default function CohortGrid({ cohorts }: { cohorts: { cohort_week: string; size: number; retention: number[] }[] }) {
    const weeks = Math.max(0, ...cohorts.map((row) => row.retention.length));
    const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
    const label = (week: string) => { const m = week.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? dayMonth.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : week; };
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[13px]">
                <thead className="text-muted">
                    <tr>
                        <th scope="col" className="px-2 py-1 text-left font-semibold">Week of</th>
                        <th scope="col" className="px-2 py-1 text-right font-semibold">Users</th>
                        {Array.from({ length: weeks }, (_, index) => <th key={index} scope="col" className="px-1 py-1 text-center font-semibold">W{index}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {cohorts.map((row) => (
                        <tr key={row.cohort_week}>
                            <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-semibold">{label(row.cohort_week)}</th>
                            <td className="px-2 py-1 text-right tabular-nums text-muted">{row.size}</td>
                            {row.retention.map((value, index) => (
                                <td key={index}>
                                    <div
                                        className="rounded-md px-1 py-2 text-center font-semibold tabular-nums"
                                        style={{ backgroundColor: `color-mix(in srgb, var(--series-base) ${Math.max(6, Math.min(100, value))}%, var(--track))`, color: value >= 55 ? "white" : "var(--foreground)" }}
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
