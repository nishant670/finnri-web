import { AuthProvider } from "@/app/context/AuthContext";

export default function InviteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <AuthProvider>{children}</AuthProvider>;
}
