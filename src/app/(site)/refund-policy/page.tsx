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
      <p>
        All payments are final. We give a full refund only when you don&apos;t receive what you paid for: the session doesn&apos;t take place, or the study material doesn&apos;t
        reach you. The cases are listed below.
      </p>

      <h2>Live sessions</h2>
      <p>You get a full refund if:</p>
      <ul>
        <li><strong>We cancel the session.</strong> Everyone who paid is refunded automatically; you don&apos;t need to do anything.</li>
        <li><strong>We move the session to a new date or time</strong> and you can&apos;t make it. Write to us before the new start time.</li>
        <li><strong>You couldn&apos;t join because of a problem on our side,</strong> for example the meeting link didn&apos;t work or the host didn&apos;t start the session.</li>
      </ul>
      <p>
        There is no refund if you change your mind, can&apos;t attend, join late or miss a session that went ahead as scheduled. If you know you can&apos;t make it, write to us
        before the start time and we&apos;ll try to move your seat to a later session where one is available.
      </p>

      <h2>Study material (digital downloads)</h2>
      <p>You get a full refund if:</p>
      <ul>
        <li><strong>You paid but the guide never reached you</strong>: it doesn&apos;t appear in My library and we can&apos;t deliver it.</li>
        <li><strong>The download doesn&apos;t work</strong> (a broken or missing file) and we can&apos;t fix it.</li>
        <li><strong>You were charged twice</strong> for the same purchase.</li>
      </ul>
      <p>
        Because guides are delivered instantly, there is no refund once you have received or downloaded the material, including if you change your mind. Please report a
        problem within 7 days of buying.
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
