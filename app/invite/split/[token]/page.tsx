import type { Metadata } from "next";
import InviteClient from "./InviteClient";

export const metadata: Metadata = {
    title: "Join a split group | Finnri",
    description: "Open a Finnri split-group invitation and track shared expenses together.",
    robots: { index: false, follow: false },
};

export default async function SplitInvitePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    return <InviteClient token={token} />;
}
