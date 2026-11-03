/** Each step's users as a bar against the first step, with its share. */
export default function FunnelChart({ steps }: { steps: { code: string; label: string; users: number; percent?: number }[] }) {
    const max = Math.max(1, ...steps.map((step) => step.users));
    return (
        <ol className="space-y-4">
            {steps.map((step, index) => (
                <li key={step.code}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold"><span className="mr-1.5 text-muted tabular-nums">{index + 1}</span>{step.label}</span>
                        <span className="shrink-0 tabular-nums"><span className="font-bold">{step.users.toLocaleString("en-IN")}</span><span className="text-muted"> · {(step.percent ?? (step.users / max) * 100).toFixed(1)}%</span></span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-track">
                        <div className="h-full rounded-full bg-[var(--series-gain)]" style={{ width: `${Math.max(2, (step.users / max) * 100)}%` }} />
                    </div>
                </li>
            ))}
        </ol>
    );
}
