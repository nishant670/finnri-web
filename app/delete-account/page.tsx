import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
    title: "Delete your Finnri account",
    description: "Request permanent deletion of your Finnri account and associated data.",
};

const deletionMailto =
    "mailto:support@finnri.app?subject=Finnri%20account%20deletion%20request&body=Please%20delete%20my%20Finnri%20account.%0A%0AEmail%20or%20phone%20used%20for%20Finnri%3A%20%0A%0AI%20understand%20that%20this%20is%20permanent.";

export default function DeleteAccountPage() {
    return (
        <LegalPage
            title="Delete your Finnri account"
            effectiveDate="27 August 2026"
            intro={<p>You can permanently delete your Finnri account in the app or request deletion here, even if you no longer have access to the app.</p>}
        >
            <section>
                <h2>Delete in the Finnri app</h2>
                <p>Open Finnri, go to Profile → Security &amp; Privacy → Delete account, and confirm the request. This is the quickest route because you are already signed in.</p>
            </section>

            <section>
                <h2>Request deletion without the app</h2>
                <p>Email us from the address associated with your Finnri account. If you signed up by phone, include that phone number. We may ask you to verify ownership before acting so another person cannot delete your records.</p>
                <p className="mt-5"><a href={deletionMailto}>Email an account-deletion request</a></p>
                <p className="mt-3">If the button does not open your mail app, send the request to <a href="mailto:support@finnri.app">support@finnri.app</a> with the subject “Finnri account deletion request”.</p>
            </section>

            <section>
                <h2>What deletion removes</h2>
                <p>Deletion permanently removes your Finnri profile and its owned transactions, accounts, budgets, subscriptions, split-ledger records, prompts, notifications, uploaded attachments, push-device registrations, and active sessions. It is not a temporary deactivation and cannot be undone.</p>
            </section>

            <section>
                <h2>Before you request deletion</h2>
                <p>Export any records you want to keep first. If a future paid subscription is active, cancel it through the store or provider that billed you; deleting Finnri data does not itself cancel a third-party recurring charge.</p>
            </section>

            <section>
                <h2>Processing and retention</h2>
                <p>We will confirm the request and complete deletion after account ownership is verified. Information that must be retained for security, fraud prevention, dispute handling, or a legal obligation may be kept only for that purpose and for no longer than required, as described in the Privacy Policy.</p>
            </section>
        </LegalPage>
    );
}
