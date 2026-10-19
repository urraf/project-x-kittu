import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/services/settings";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Delivery policy",
  description: `How ${SITE_NAME} delivers live sessions and digital study material. Nothing is shipped physically.`,
  alternates: { canonical: "/shipping-policy" },
};

export default async function ShippingPolicyPage() {
  const email = (await getSettings()).social.email || "lifeofkittukunweb@gmail.com";
  return (
    <LegalPage jp="配送" title="Delivery policy" updated="20 October 2026" path="/shipping-policy">
      <p>Everything we sell is digital. Nothing is shipped physically, and there are no delivery charges.</p>

      <h2>Study material</h2>
      <p>
        As soon as your payment succeeds, the guide is added to <Link href="/account?tab=library">My library</Link> in your account and you get a confirmation email. You can
        download it straight away, as many times as you need.
      </p>

      <h2>Live sessions</h2>
      <p>
        Your seat is confirmed immediately after payment. The confirmation email contains the date, time (IST) and the join link, which is also shown in{" "}
        <Link href="/account">My account</Link>. We send a reminder about one hour before the session starts.
      </p>

      <h2>Didn&apos;t receive it?</h2>
      <p>
        Check your spam folder first, then sign in to your account, where every purchase and booking is listed. Still stuck? Email{" "}
        <a href={`mailto:${email}`}>{email}</a> and we&apos;ll sort it out within 2 working days.
      </p>
    </LegalPage>
  );
}
