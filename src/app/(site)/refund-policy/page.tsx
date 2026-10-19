import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/services/settings";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Refunds & cancellations",
  description: `When ${SITE_NAME} refunds live sessions and study material, and how long refunds take.`,
  alternates: { canonical: "/refund-policy" },
};

export default async function RefundPolicyPage() {
  const email = (await getSettings()).social.email || "lifeofkittukunweb@gmail.com";
  return (
    <LegalPage jp="返金" title="Refunds & cancellations" updated="20 October 2026" path="/refund-policy">
      <h2>Live sessions</h2>
      <ul>
        <li><strong>If we cancel a session,</strong> everyone who paid gets a full refund automatically. You don&apos;t need to do anything.</li>
        <li><strong>If we change the date or time</strong> and the new time doesn&apos;t work for you, write to us before the session starts for a full refund.</li>
        <li><strong>If you can&apos;t attend,</strong> email us at least 24 hours before the start time and we&apos;ll refund you in full or move your seat to another session.</li>
        <li>Requests made less than 24 hours before the start, or after a session you missed, are not refundable.</li>
        <li>If a session couldn&apos;t go ahead because of a technical problem on our side, you&apos;ll get a full refund or a free seat in the next session, your choice.</li>
      </ul>

      <h2>Study material (digital downloads)</h2>
      <p>
        Guides and templates are delivered instantly, so purchases are final once payment succeeds. We will always refund you in full if you were charged twice, if the
        download doesn&apos;t work and we can&apos;t fix it, or if the file is clearly different from its description. Write to us within 7 days of buying.
      </p>

      <h2>How refunds are paid</h2>
      <p>
        Refunds go back to the original payment method (card, UPI, net banking or wallet) through Razorpay. Once we start a refund, it usually reaches you within 5–7 working
        days, depending on your bank.
      </p>

      <h2>How to ask for a refund</h2>
      <p>
        Email <a href={`mailto:${email}`}>{email}</a> or use the <Link href="/contact?topic=payment">contact form</Link> with the email you booked with and the session or guide
        name. We reply within 2 working days.
      </p>
    </LegalPage>
  );
}
