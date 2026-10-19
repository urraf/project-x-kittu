import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/services/settings";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The terms for using ${SITE_NAME}: accounts, live sessions, study material and payments.`,
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const email = (await getSettings()).social.email || "lifeofkittukunweb@gmail.com";
  return (
    <LegalPage jp="規約" title="Terms of use" updated="20 October 2026" path="/terms">
      <p>
        These terms apply to everyone who uses {SITE_NAME} (this website), run by Chitranshu Rajput. By using the website, creating an account, booking a session or buying
        study material, you agree to them.
      </p>

      <h2>What we offer</h2>
      <ul>
        <li><strong>Live sessions:</strong> online group sessions on studying, interning and working in Japan, held over video call.</li>
        <li><strong>Study material:</strong> digital guides and templates (PDF downloads).</li>
        <li><strong>Free resources:</strong> articles, videos, the opportunity finder, the university directory and the Kittu chat assistant.</li>
      </ul>

      <h2>Guidance, not guarantees</h2>
      <p>
        Everything here is shared from personal experience and research to help you prepare. We don&apos;t guarantee admission, scholarships, internships, visas or jobs.
        University programs, deadlines and requirements change every year, so always confirm details on the official website before applying. Answers from the chat
        assistant are generated automatically and may contain mistakes.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate details and keep your password private. You&apos;re responsible for activity on your account.</li>
        <li>One account per person. We may suspend accounts that are misused.</li>
      </ul>

      <h2>Sessions</h2>
      <ul>
        <li>The join link is personal to the booking. Please don&apos;t share it or record the session without permission.</li>
        <li>Be respectful to the host and other participants. We may remove anyone who disrupts a session, without a refund.</li>
        <li>If we have to cancel or move a session, you&apos;ll be told by email. See the <Link href="/refund-policy">refund policy</Link> for what happens next.</li>
      </ul>

      <h2>Study material</h2>
      <p>
        When you buy a guide, you get a personal licence to download and use it for your own preparation. You may not resell, share, upload or republish it. All content on
        this website (articles, videos, guides, the Kittu mascot and branding) belongs to {SITE_NAME} unless stated otherwise.
      </p>

      <h2>Prices and payments</h2>
      <p>
        Prices are shown in Indian rupees (₹) and include any applicable taxes. Payments are processed securely by Razorpay. A booking or purchase is confirmed only once the
        payment succeeds. Refunds follow our <Link href="/refund-policy">refunds &amp; cancellations policy</Link>.
      </p>

      <h2>Comments and messages</h2>
      <p>Don&apos;t post anything unlawful, abusive or spam. We may remove comments or reviews that break these rules.</p>

      <h2>Liability</h2>
      <p>
        We work hard to keep the website accurate and available, but it is provided &quot;as is&quot;. To the extent the law allows, our total liability for any claim is limited
        to the amount you paid us for the session or material concerned.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of India. Questions? Email{" "}
        <a href={`mailto:${email}`}>{email}</a> or use the <Link href="/contact">contact form</Link>.
      </p>
    </LegalPage>
  );
}
