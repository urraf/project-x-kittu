import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/services/settings";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${SITE_NAME} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const email = (await getSettings()).social.email || "lifeofkittukunweb@gmail.com";
  return (
    <LegalPage jp="個人情報" title="Privacy policy" updated="20 October 2026" path="/privacy">
      <p>
        {SITE_NAME} (&quot;we&quot;, &quot;us&quot;) is run by Chitranshu Rajput to help students learn about studying, interning and working in Japan. This policy explains what
        personal information we collect when you use this website, why we collect it, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address, phone number (optional) and a securely hashed password. If you choose &quot;Continue with Google&quot;, we receive only your name and email address from Google.</li>
        <li><strong>Bookings and purchases:</strong> the sessions you book, the study material you buy, the amount paid and the payment reference. Payments are processed by Razorpay; we never see or store your card, UPI or bank details.</li>
        <li><strong>Messages and feedback:</strong> what you send through the contact form, session reviews, blog comments and notes you add when booking.</li>
        <li><strong>Basic usage data:</strong> an anonymous visitor cookie used to count article views and likes, and technical logs (such as IP address) kept briefly to prevent spam and abuse.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create and secure your account, and to sign you in.</li>
        <li>To confirm bookings and purchases, send join links, reminders, receipts and download access.</li>
        <li>To reply to your messages and ask for feedback about sessions.</li>
        <li>To issue refunds when a session is cancelled.</li>
        <li>To keep the website safe (rate limits, spam protection) and to improve our content.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>

      <h2>Services we rely on</h2>
      <p>We share only the information each service needs to do its job:</p>
      <ul>
        <li><strong>Razorpay</strong> for payments and refunds.</li>
        <li><strong>Brevo</strong> to send emails (codes, confirmations, reminders).</li>
        <li><strong>Google</strong> for &quot;Continue with Google&quot; sign-in and, where used, Google Meet session links.</li>
        <li><strong>MongoDB Atlas</strong> and <strong>Render</strong> to store data and host the website.</li>
        <li><strong>Groq</strong> to power &quot;Ask Kittu&quot;, the chat assistant. Chat messages are sent to it to generate an answer and are not saved by us, so please don&apos;t share sensitive personal details in the chat.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use a small number of cookies that are needed for the site to work: one to keep you signed in, one to protect the Google sign-in step, and an anonymous visitor
        cookie for view and like counts. We don&apos;t use advertising or cross-site tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and booking history for as long as your account exists, so you can see past sessions, receipts and downloads. Sign-in codes expire within
        10 minutes, and email delivery logs are deleted after 90 days. Payment records may be kept longer where the law requires it.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>You can view and update your details at any time in <Link href="/account">My account</Link>.</li>
        <li>You can ask us for a copy of your data, or ask us to correct or delete it, by writing to <a href={`mailto:${email}`}>{email}</a>. We&apos;ll respond within 30 days.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Passwords are stored only as secure hashes, all traffic uses HTTPS, and admin access is protected. No system is perfectly secure, but we take reasonable care to protect
        your information.
      </p>

      <h2>Children</h2>
      <p>This website is meant for students aged 16 and above. If you are under 18, please use it with a parent or guardian&apos;s permission.</p>

      <h2>Changes and contact</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top of this page. Questions? Email <a href={`mailto:${email}`}>{email}</a> or use the{" "}
        <Link href="/contact">contact form</Link>.
      </p>
    </LegalPage>
  );
}
