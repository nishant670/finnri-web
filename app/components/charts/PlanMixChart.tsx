"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors = ["#FF8865", "#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B"];

export default function PlanMixChart({ data }: { data: { name: string; value: number }[] }) {
    return (
        <ResponsiveContainer>
            <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {data.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
