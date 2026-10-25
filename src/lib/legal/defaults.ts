/**
 * Starting text for the policy pages. The admin edits these in Studio →
 * Settings → Policies (Markdown); what's saved there replaces these defaults.
 * {email} is replaced with the public contact email when the page is shown.
 */

export const LEGAL_DOCS = {
  terms: { path: "/terms", title: "Terms of use", jp: "規約", description: "The terms for using Life of KittuKun: accounts, live sessions, study material and payments." },
  sessionTerms: { path: "/session-terms", title: "Session terms", jp: "講座", description: "Terms that apply when you book a live session on Life of KittuKun." },
  productTerms: { path: "/product-terms", title: "Study material terms", jp: "教材", description: "Terms that apply when you buy guides, templates and other digital study material." },
  privacy: { path: "/privacy", title: "Privacy policy", jp: "個人情報", description: "How Life of KittuKun collects, uses and protects your personal information." },
  refund: { path: "/refund-policy", title: "Refunds & cancellations", jp: "返金", description: "When Life of KittuKun refunds live sessions and study material, and how long refunds take." },
  shipping: { path: "/shipping-policy", title: "Delivery policy", jp: "配送", description: "How Life of KittuKun delivers live sessions and digital study material. Nothing is shipped physically." },
} as const;

export type LegalDoc = keyof typeof LEGAL_DOCS;

export const DEFAULT_LEGAL: Record<LegalDoc, string> = {
  terms: `These terms apply to everyone who uses Life of KittuKun (this website), run by Chitranshu Rajput. By using the website, creating an account, booking a session or buying study material, you agree to them.

## What we offer

- **Live sessions:** online group sessions on studying, interning and working in Japan, held over video call. See the [session terms](/session-terms).
- **Study material:** digital guides and templates (PDF downloads). See the [study material terms](/product-terms).
- **Free resources:** articles, videos, the opportunity finder, the university directory and the Kittu chat assistant.

## Guidance, not guarantees

Everything here is shared from personal experience and research to help you prepare. We don't guarantee admission, scholarships, internships, visas or jobs. University programs, deadlines and requirements change every year, so always confirm details on the official website before applying. Answers from the chat assistant are generated automatically and may contain mistakes.

## Your account

- You need an account to book a session or buy study material. Give accurate details and keep your password private. You're responsible for activity on your account.
- One account per person. We may suspend accounts that are misused.

## Prices and payments

Prices are shown in Indian rupees (₹) and include any applicable taxes. Payments are processed securely by Razorpay. A booking or purchase is confirmed only once the payment succeeds. Refunds follow our [refunds & cancellations policy](/refund-policy).

## Content

All content on this website (articles, videos, guides, the Kittu mascot and branding) belongs to Life of KittuKun unless stated otherwise. Don't post anything unlawful, abusive or spam in comments or reviews; we may remove it.

## Liability

We work hard to keep the website accurate and available, but it is provided "as is". To the extent the law allows, our total liability for any claim is limited to the amount you paid us for the session or material concerned.

## Changes and governing law

We may update these terms; the date at the top shows the latest version. These terms are governed by the laws of India. Questions? Email {email} or use the [contact form](/contact).`,

  sessionTerms: `These terms apply when you book a live session. By ticking "I agree" at checkout, you accept them together with our [terms of use](/terms) and [refund policy](/refund-policy).

## Booking

- You need to be logged in to book. The seat is booked for the person on the account.
- Your seat is confirmed only after payment succeeds (or straight away for free sessions). You'll get a confirmation email with the date, time (IST) and join link.
- Sessions are small groups with limited seats, held online over video call.

## Joining the session

- The join link is personal to your booking. Please don't share it with others.
- Join a few minutes early. Sessions start on time; joining late doesn't extend the session.
- Please be respectful to the host and other participants. We may remove anyone who disrupts a session, without a refund.
- Don't record or share the session without permission.

## Changes and cancellations

- If we need to cancel a session, everyone who paid gets a full refund automatically.
- If we move a session to a new date or time and you can't make it, write to us before the new start time for a full refund.
- If you can't attend, let us know before the start time and we'll try to move your seat to a later session where one is available. Missed sessions are not refunded.

## What sessions are

Sessions share guidance from personal experience. They don't guarantee admission, scholarships, internships or visas.

Questions? Email {email}.`,

  productTerms: `These terms apply when you buy guides, templates or other digital study material. By ticking "I agree" at checkout, you accept them together with our [terms of use](/terms) and [refund policy](/refund-policy).

## What you get

- You need to be logged in to buy. The material is added to My library in your account straight after payment, and you can download it as many times as you need.
- A receipt is emailed to you.

## Licence

When you buy a guide, you get a personal licence to download and use it for your own preparation. You may not resell, share, upload or republish it, in full or in part.

## Refunds

Because study material is delivered instantly, purchases are final once you have received or downloaded it. We refund in full only if the material never reached you, the download doesn't work and we can't fix it, or you were charged twice. See the [refund policy](/refund-policy).

## Accuracy

Guides are prepared carefully from experience and research, but programs, deadlines and requirements change. Always confirm details on the official website before applying.

Questions? Email {email}.`,

  privacy: `Life of KittuKun ("we", "us") is run by Chitranshu Rajput to help students learn about studying, interning and working in Japan. This policy explains what personal information we collect when you use this website, why we collect it, and the choices you have.

## What we collect

- **Account details:** your name, email address, phone number and a securely hashed password. If you choose "Continue with Google", we receive only your name and email address from Google.
- **Bookings and purchases:** the sessions you book, the study material you buy, the amount paid, the payment reference and when you accepted the terms. Payments are processed by Razorpay; we never see or store your card, UPI or bank details.
- **Messages and feedback:** what you send through the contact form, session reviews, blog comments and notes you add when booking.
- **Basic usage data:** an anonymous visitor cookie used to count article views and likes, and technical logs (such as IP address) kept briefly to prevent spam and abuse.

## How we use it

- To create and secure your account, and to sign you in.
- To confirm bookings and purchases, send join links, reminders, receipts and download access.
- To reply to your messages and ask for feedback.
- To issue refunds.
- To keep the website safe and to improve our content.

We do not sell your personal information, and we do not use it for third-party advertising.

## Services we rely on

We share only the information each service needs to do its job:

- **Razorpay** for payments and refunds.
- **Brevo** to send emails (codes, confirmations, reminders).
- **Google** for "Continue with Google" sign-in and, where used, Google Meet session links.
- **MongoDB Atlas** and **Render** to store data and host the website.
- **Groq** to power "Ask Kittu", the chat assistant. Chat messages are sent to it to generate an answer and are not saved by us, so please don't share sensitive personal details in the chat.

## Cookies

We use a small number of cookies that are needed for the site to work: one to keep you signed in, one to protect the Google sign-in step, and an anonymous visitor cookie for view and like counts. We don't use advertising or cross-site tracking cookies.

## How long we keep it

We keep your account and booking history for as long as your account exists, so you can see past sessions, receipts and downloads. Sign-in codes expire within 10 minutes, and email delivery logs are deleted after 90 days. Payment records may be kept longer where the law requires it.

## Your choices and rights

- You can view and update your details at any time in [My account](/account).
- You can ask us for a copy of your data, or ask us to correct or delete it, by writing to {email}. We'll respond within 30 days.

## Security

Passwords are stored only as secure hashes, all traffic uses HTTPS, and admin access is protected. No system is perfectly secure, but we take reasonable care to protect your information.

## Children

This website is meant for students aged 16 and above. If you are under 18, please use it with a parent or guardian's permission.

## Changes and contact

If we change this policy, we'll update the date at the top of this page. Questions? Email {email} or use the [contact form](/contact).`,

  refund: `All payments are final. We give a full refund only when you don't receive what you paid for: the session doesn't take place, or the study material doesn't reach you. The cases are listed below.

## Live sessions

You get a full refund if:

- **We cancel the session.** Everyone who paid is refunded automatically; you don't need to do anything.
- **We move the session to a new date or time** and you can't make it. Write to us before the new start time.
- **You couldn't join because of a problem on our side**, for example the meeting link didn't work or the host didn't start the session.

There is no refund if you change your mind, can't attend, join late or miss a session that went ahead as scheduled. If you know you can't make it, write to us before the start time and we'll try to move your seat to a later session where one is available.

## Study material (digital downloads)

You get a full refund if:

- **You paid but the guide never reached you**: it doesn't appear in My library and we can't deliver it.
- **The download doesn't work** (a broken or missing file) and we can't fix it.
- **You were charged twice** for the same purchase.

Because guides are delivered instantly, there is no refund once you have received or downloaded the material, including if you change your mind. Please report a problem within 7 days of buying.

## How refunds are paid

Refunds go back to the original payment method (card, UPI, net banking or wallet) through Razorpay. Once we start a refund, it usually reaches you within 5–7 working days, depending on your bank.

## How to ask for a refund

Email {email} or use the [contact form](/contact?topic=payment) with the email you booked with and the session or guide name. We reply within 2 working days.`,

  shipping: `Everything we sell is digital. Nothing is shipped physically, and there are no delivery charges.

## Study material

As soon as your payment succeeds, the guide is added to [My library](/account?tab=library) in your account and you get a confirmation email. You can download it straight away, as many times as you need.

## Live sessions

Your seat is confirmed immediately after payment. The confirmation email contains the date, time (IST) and the join link, which is also shown in [My account](/account). We send a reminder about one hour before the session starts.

## Didn't receive it?

Check your spam folder first, then sign in to your account, where every purchase and booking is listed. Still stuck? Email {email} and we'll sort it out within 2 working days.`,
};
