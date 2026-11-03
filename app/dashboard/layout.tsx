import { Suspense } from "react";
import DashboardLayout from "@/app/components/dashboard/DashboardLayout";
import { AuthProvider } from "@/app/context/AuthContext";
import { ThemeProvider } from "@/app/components/ui/ThemeProvider";
import { ToastProvider } from "@/app/components/ui/Toast";

export default function DashboardRouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Suspense fallback={<div className="grid min-h-screen place-items-center bg-background text-sm font-semibold text-muted">Opening your dashboard…</div>}>
                    <ToastProvider><DashboardLayout>{children}</DashboardLayout></ToastProvider>
                </Suspense>
            </AuthProvider>
        </ThemeProvider>
    );
}
