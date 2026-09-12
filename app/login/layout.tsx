import { AuthProvider } from "@/app/context/AuthContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sign in to Finnri | Finnri",
    description: "Sign in with Google or continue as a guest to open your private Finnri dashboard.",
    robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <AuthProvider>{children}</AuthProvider>;
}
