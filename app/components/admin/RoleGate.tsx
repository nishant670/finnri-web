"use client";

import { AdminRole } from "@/app/lib/admin-api";
import { useAdminSession } from "./AdminShell";

const rank: Record<AdminRole, number> = { viewer: 1, support: 2, owner: 3 };
export default function RoleGate({
    minimum,
    children,
    fallback = null,
}: {
    minimum: AdminRole;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}) {
    const admin = useAdminSession();
    return admin && rank[admin.role] >= rank[minimum] ? children : fallback;
}
