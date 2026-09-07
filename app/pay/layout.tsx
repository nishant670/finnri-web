import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Complete payment | Finnri",
    robots: { index: false, follow: false },
};

export default function PayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return children;
}
