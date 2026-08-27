export default function FunnelChart({ steps }: { steps: { code: string; label: string; users: number; percent?: number }[] }) {
    const max = Math.max(1, ...steps.map((step) => step.users));
    return (
        <div className="space-y-4">
            {steps.map((step, index) => (
                <div key={step.code}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-semibold">
                            {index + 1}. {step.label}
                        </span>
                        <span className="text-text-muted">
                            {step.users.toLocaleString("en-IN")} · {(step.percent ?? (step.users / max) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${Math.max(2, (step.users / max) * 100)}%`, opacity: 1 - index * 0.1 }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
