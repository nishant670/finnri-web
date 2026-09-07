"use client";

import dynamic from "next/dynamic";
import type { TrendChartProps } from "@/app/components/admin/TrendChartClient";

const TrendChartClient = dynamic(() => import("@/app/components/admin/TrendChartClient"), {
    ssr: false,
    loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-surface-muted" aria-hidden="true" />,
});

export default function TrendChart(props: TrendChartProps) {
    return <TrendChartClient {...props} />;
}
