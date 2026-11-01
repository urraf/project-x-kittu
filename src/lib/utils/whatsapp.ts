/** wa.me link that opens a WhatsApp chat with a pre-filled message. Works on phones (app) and computers (WhatsApp Web). */
export function whatsappLink(number: string, message?: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
