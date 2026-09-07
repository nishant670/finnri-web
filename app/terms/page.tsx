import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
    title: "Terms of Service | Finnri",
    description: "Terms governing use of Finnri's mobile app, web dashboard, and financial tracking tools.",
};

export default function TermsPage() {
    return (
        <LegalPage
            title="Terms of Service"
            effectiveDate="20 August 2026"
            intro={<p>These terms govern your use of Finnri&apos;s mobile app, web dashboard, and supporting services. By creating an account, continuing as a guest, or using Finnri, you agree to these terms and the Privacy Policy.</p>}
        >
            <section>
                <h2>1. Who may use Finnri</h2>
                <p>You must be at least 18 years old and legally able to agree to these terms. You are responsible for keeping your device, PIN, verification codes, and account access secure, and for activity performed through your account.</p>
            </section>

            <section>
                <h2>2. What Finnri provides</h2>
                <p>Finnri helps you record and organise financial information you provide, review calculated totals and patterns, maintain account labels and balances, track shared expenses, and use planning tools. Some features use AI to create editable drafts from voice or text.</p>
                <p className="mt-3">Finnri does not connect to banks, hold or move money, execute payments, automatically reconcile bank activity, or provide investment, tax, lending, legal, or personalised financial advice.</p>
            </section>

            <section>
                <h2>3. Your records and decisions</h2>
                <p>You control what is saved. You are responsible for reviewing AI drafts, transaction details, balances, budgets, reminders, split shares, and calculator inputs before relying on them. Outputs and estimates may be incomplete or wrong and should not replace professional advice or official account statements.</p>
            </section>

            <section>
                <h2>4. Accounts, guests, and service limits</h2>
                <p>You may use supported features through a registered or guest account. Guest access, trial credits, AI usage, exports, and other capabilities may have limits described in the product. Do not create accounts or manipulate requests to bypass those limits.</p>
                <p className="mt-3">Finnri offers fixed-duration paid passes through its website. Current prices, duration, included credits, and feature access are published on the Pricing page and shown again before payment. These purchases do not renew automatically; buying another pass is an explicit new purchase.</p>
            </section>

            <section>
                <h2>5. Content you provide</h2>
                <p>You retain ownership of the records and content you submit. You give Finnri permission to host, process, transmit, and display that content only as needed to provide, secure, and improve the service, comply with law, and respond to support requests.</p>
                <p className="mt-3">Do not upload content you do not have the right to use, malware, unlawful material, or information intended to harm another person.</p>
            </section>

            <section>
                <h2>6. Acceptable use</h2>
                <p>You must not misuse Finnri, probe or disrupt its security, reverse engineer protected parts of the service except where law permits, access another person&apos;s account, automate abusive traffic, use the service for fraud, or violate applicable law.</p>
            </section>

            <section>
                <h2>7. Availability and changes</h2>
                <p>Finnri is under active development. Features may change, be limited, or become temporarily unavailable for maintenance, security, provider outages, or product updates. A paid pass provides the features and allowance described at purchase for its stated period, subject to fair-use and security limits. We will give appropriate notice before material changes to these terms take effect.</p>
            </section>

            <section>
                <h2>8. Intellectual property</h2>
                <p>Finnri&apos;s software, branding, interface, and original content are protected by applicable intellectual-property laws. These terms give you a limited, personal, non-exclusive, revocable right to use the service; they do not transfer ownership of Finnri or its software.</p>
            </section>

            <section>
                <h2>9. Deletion and suspension</h2>
                <p>You may delete your account through the mobile app&apos;s Security &amp; Privacy screen. We may restrict or suspend access when reasonably necessary to protect users or the service, investigate abuse, comply with law, or address a serious breach of these terms.</p>
            </section>

            <section>
                <h2>10. Disclaimers and liability</h2>
                <p>Finnri is provided on an “as available” basis. To the extent permitted by law, we do not guarantee uninterrupted operation, perfect accuracy, or that AI and calculator outputs will suit a particular purpose. Nothing in these terms excludes rights or liability that cannot legally be excluded. To the extent permitted by law, Finnri is not responsible for indirect or consequential loss arising from reliance on user-entered records, estimates, or third-party service outages.</p>
            </section>

            <section>
                <h2>11. Governing law and contact</h2>
                <p>These terms are governed by the laws of India. Courts with competent jurisdiction in India will handle disputes, subject to any consumer rights or mandatory dispute process that applies.</p>
                <p className="mt-3">Questions about these terms can be sent to <a href="mailto:support@finnri.app?subject=Finnri%20Terms">support@finnri.app</a>.</p>
            </section>
        </LegalPage>
    );
}
