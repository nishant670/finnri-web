import { AuthProvider } from "@/app/context/AuthContext";

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return <AuthProvider>{children}</AuthProvider>;
}
