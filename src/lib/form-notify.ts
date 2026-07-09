// ─── Form notifications with free customer auto-reply ────────────────
// Primary channel: FormSubmit.co — notifies the festival inbox AND
// sends an automatic reply to the customer (their free _autoresponse
// feature). Requires a one-time activation click in the festival inbox.
//
// Fallback: Web3Forms (the original channel, no auto-reply) — used
// automatically if FormSubmit is unavailable or not activated yet, so
// submissions are never lost.

const FESTIVAL_EMAIL = "contact@tangierlatinfestival.com";
const WEB3FORMS_KEY = "132f8460-381d-4f1b-861e-acb51f25e842";

export interface FormNotification {
  /** Subject of the email the festival team receives */
  subject: string;
  /** Data fields shown in the notification email (must include `email` + `name`) */
  fields: Record<string, string>;
  /** Message automatically emailed back to the customer */
  autoresponse: string;
}

export async function sendFormNotification(n: FormNotification): Promise<boolean> {
  // 1) FormSubmit (with free auto-reply to the customer)
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${FESTIVAL_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ...n.fields,
        _subject: n.subject,
        _template: "table",
        _captcha: "false",
        _autoresponse: n.autoresponse,
      }),
    });
    const data = await res.json().catch(() => null);
    const ok =
      res.ok && data && (data.success === true || data.success === "true");
    if (ok) return true;
    throw new Error(data?.message ?? `HTTP ${res.status}`);
  } catch (e) {
    console.warn("[form-notify] FormSubmit failed, falling back to Web3Forms:", e);
  }

  // 2) Web3Forms fallback (no auto-reply, but the team is still notified)
  try {
    const fd = new FormData();
    fd.append("access_key", WEB3FORMS_KEY);
    fd.append("subject", n.subject);
    fd.append("from_name", "Tangier International Latin Festival");
    for (const [k, v] of Object.entries(n.fields)) fd.append(k, v);
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: fd,
    });
    return res.ok;
  } catch (e) {
    console.error("[form-notify] Web3Forms fallback failed too:", e);
    return false;
  }
}

/** The 24-hour pending-booking auto-reply, in the customer's language.
 *  When the reservation number is known, it's included with a link to
 *  the ticket page where the guest can track their booking. */
export function bookingAutoResponse(
  lang: string,
  reservation?: { code: string; url: string }
): string {
  if (lang === "fr") {
    const refBlock = reservation
      ? `Votre numéro de réservation : ${reservation.code}\n` +
        `Suivez votre réservation ici : ${reservation.url}\n\n`
      : "";
    return (
      "Bonjour,\n\n" +
      "Merci pour votre demande de réservation au Tangier International Latin Festival (07–11 janvier 2027 · Hôtel Kenzi Solazur, Tanger).\n\n" +
      refBlock +
      "Votre demande est maintenant EN ATTENTE. Un membre de notre équipe vous contactera sous 24 heures pour confirmer votre réservation et vous envoyer les détails de paiement.\n\n" +
      "— L'équipe du Tangier International Latin Festival\n" +
      "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
    );
  }
  if (lang === "es") {
    const refBlock = reservation
      ? `Tu número de reserva: ${reservation.code}\n` +
        `Sigue tu reserva aquí: ${reservation.url}\n\n`
      : "";
    return (
      "Hola,\n\n" +
      "Gracias por tu solicitud de reserva para el Tangier International Latin Festival (07–11 de enero de 2027 · Hotel Kenzi Solazur, Tánger).\n\n" +
      refBlock +
      "Tu solicitud está ahora PENDIENTE. Un miembro de nuestro equipo te contactará en un plazo de 24 horas para confirmar tu reserva y enviarte los detalles de pago.\n\n" +
      "— El equipo del Tangier International Latin Festival\n" +
      "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
    );
  }
  const refBlock = reservation
    ? `Your reservation number: ${reservation.code}\n` +
      `Track your booking here: ${reservation.url}\n\n`
    : "";
  return (
    "Hello,\n\n" +
    "Thank you for your booking request for the Tangier International Latin Festival (January 07–11, 2027 · Kenzi Solazur Hotel, Tangier).\n\n" +
    refBlock +
    "Your request is now PENDING. One of our team members will contact you within 24 hours to confirm your booking and send you the payment details.\n\n" +
    "— The Tangier International Latin Festival team\n" +
    "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
  );
}

/** Confirmation email with the guest's ticket link, sent automatically
 *  when the admin confirms a booking. Bilingual EN/FR (we don't know the
 *  guest's language at confirmation time). */
export function ticketConfirmationEmail(opts: {
  customerName: string;
  packName: string;
  ticketCode: string;
  numPeople: number;
  ticketUrl: string;
}): { subject: string; body: string } {
  const firstName = opts.customerName.split(/\s|&/)[0] || opts.customerName;
  return {
    subject: `Your ticket is confirmed! · Votre billet est confirmé ! (${opts.ticketCode})`,
    body:
      `Hello ${firstName},\n\n` +
      `Great news — your booking for "${opts.packName}" at the Tangier International Latin Festival (January 07–11, 2027 · Kenzi Solazur Hotel, Tangier) is CONFIRMED!\n\n` +
      `🎫 Your ticket (QR code included):\n${opts.ticketUrl}\n\n` +
      `Ticket code: ${opts.ticketCode}\n` +
      `Guests: ${opts.numPeople}\n\n` +
      `Open the link and show the QR code at check-in. Save it or take a screenshot.\n\n` +
      `───────────────\n\n` +
      `Bonjour ${firstName},\n\n` +
      `Bonne nouvelle — votre réservation « ${opts.packName} » au Tangier International Latin Festival (07–11 janvier 2027 · Hôtel Kenzi Solazur, Tanger) est CONFIRMÉE !\n\n` +
      `🎫 Votre billet (avec QR code) :\n${opts.ticketUrl}\n\n` +
      `Code billet : ${opts.ticketCode}\n` +
      `Personnes : ${opts.numPeople}\n\n` +
      `Ouvrez le lien et présentez le QR code à l'entrée. Enregistrez-le ou faites une capture d'écran.\n\n` +
      `See you on the dance floor! / À très vite sur la piste !\n` +
      `— Tangier International Latin Festival\n` +
      `contact@tangierlatinfestival.com · +212 6 64 01 02 79`,
  };
}

/** Auto-reply for the general contact form. */
export function contactAutoResponse(lang: string): string {
  if (lang === "fr") {
    return (
      "Bonjour,\n\n" +
      "Merci de nous avoir contactés — nous avons bien reçu votre message et nous vous répondrons très prochainement.\n\n" +
      "— L'équipe du Tangier International Latin Festival\n" +
      "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
    );
  }
  if (lang === "es") {
    return (
      "Hola,\n\n" +
      "Gracias por contactarnos — hemos recibido tu mensaje y te responderemos muy pronto.\n\n" +
      "— El equipo del Tangier International Latin Festival\n" +
      "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
    );
  }
  return (
    "Hello,\n\n" +
    "Thank you for reaching out — we received your message and will get back to you shortly.\n\n" +
    "— The Tangier International Latin Festival team\n" +
    "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
  );
}
