import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
    title: "Digital Delivery Policy | Finnri",
    description: "How paid Finnri digital access is delivered after payment.",
};

export default function ShippingPolicyPage() {
    return (
        <LegalPage title="Digital Delivery Policy" effectiveDate="5 September 2026" intro={<p>Finnri sells digital access only. No physical goods are packed or shipped, so shipping charges and physical delivery timelines do not apply.</p>}>
            <section><h2>How access is delivered</h2><p>After Razorpay confirms a captured payment to Finnri, the selected pass and its credits are attached electronically to the Finnri account used to start checkout. Access normally appears within a few minutes.</p></section>
            <section><h2>If delivery is delayed</h2><p>Payment confirmation can occasionally remain pending while the bank and payment provider finish processing. Reopen Plans &amp; Credits in Finnri to refresh the status. If access has not appeared within 30 minutes, email <a href="mailto:support@finnri.app?subject=Paid%20access%20not%20delivered">support@finnri.app</a> with the payment ID and account email.</p></section>
            <section><h2>Supported territory</h2><p>Self-serve prices are published in Indian rupees for customers who can use the payment methods offered at checkout. Finnri does not promise physical delivery or courier service in any territory.</p></section>
        </LegalPage>
    );
}
