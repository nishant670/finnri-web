import type { Metadata } from "next";
import AdminShell from "@/app/components/admin/AdminShell";
import { ToastProvider } from "@/app/components/ui/Toast";

export const metadata: Metadata = { title: "FINNRI Admin", robots: { index: false, follow: false, nocache: true } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <AdminShell>{children}</AdminShell>
        </ToastProvider>
    );
}
