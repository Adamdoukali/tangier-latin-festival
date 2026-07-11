// ─── Form notifications with free customer auto-reply ────────────────
// Preferred channel: Resend via our own server function (branded HTML
// from @tangierlatinfestival.com, QR code attached on ticket emails).
// Free tier, activates automatically once RESEND_API_KEY is configured.
//
// Fallback 1: FormSubmit.co — notifies the festival inbox AND sends an
// automatic reply to the customer (their free _autoresponse feature).
// Fallback 2: Web3Forms (no auto-reply) — so submissions are never lost.

import { sendEmailViaResend } from "./email-server";

const FESTIVAL_EMAIL = "contact@tangierlatinfestival.com";
const WEB3FORMS_KEY = "132f8460-381d-4f1b-861e-acb51f25e842";

export interface FormNotification {
  /** Subject of the email the festival team receives */
  subject: string;
  /** Data fields shown in the notification email (must include `email` + `name`) */
  fields: Record<string, string>;
  /** Message automatically emailed back to the customer */
  autoresponse: string;
  /** Subject of the customer's email (Resend); defaults to `subject` */
  guestSubject?: string;
  /** Guest's language ('en' | 'fr' | 'es') for the HTML email chrome */
  lang?: string;
  /** When set, the ticket QR is attached + a ticket button shown (Resend) */
  ticket?: { code: string; url: string } | null;
}

export async function sendFormNotification(n: FormNotification): Promise<boolean> {
  // Test hook: E2E tests set this flag to force the interceptable
  // FormSubmit path instead of the server-side Resend send.
  const testMode =
    typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem("tlf_email_test") === "formsubmit-only";

  // 0) Resend through our server — branded email + QR attachment.
  //    Skipped silently when RESEND_API_KEY isn't configured yet.
  if (n.fields.email && !testMode) {
    try {
      const res = await sendEmailViaResend({
        data: {
          guestEmail: n.fields.email,
          guestName: n.fields.name ?? "",
          subject: n.subject,
          fields: n.fields,
          message: n.autoresponse,
          guestSubject: n.guestSubject ?? n.subject,
          lang: n.lang ?? "en",
          ticket: n.ticket ?? null,
        },
      });
      if (res.sent) return true;
      if (res.reason !== "not-configured") {
        console.warn("[form-notify] Resend send failed, falling back:", res.reason);
      }
    } catch (e) {
      console.warn("[form-notify] Resend unavailable, falling back:", e);
    }
  }

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
      "Merci pour votre inscription !\n\n" +
      "Votre demande de réservation a bien été enregistrée.\n\n" +
      refBlock +
      "Dès réception de votre paiement, notre partenaire vous adressera la confirmation officielle de votre réservation, accompagnée de votre code QR personnel. Ce code devra être présenté à nos équipes d'accueil lors de votre arrivée au festival afin de faciliter votre enregistrement.\n\n" +
      "Nous sommes impatients de vous accueillir à Tanger et de vous faire vivre une expérience unique, placée sous le signe de la danse, du partage et de la convivialité.\n\n" +
      "Toute l'équipe du Tangier International Latin Festival vous remercie pour votre confiance et vous souhaite un séjour exceptionnel ainsi que des souvenirs inoubliables.\n\n" +
      "À très bientôt au Tangier International Latin Festival !\n\n" +
      "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
    );
  }
  if (lang === "es") {
    const refBlock = reservation
      ? `Tu número de reserva: ${reservation.code}\n` +
        `Sigue tu reserva aquí: ${reservation.url}\n\n`
      : "";
    return (
      "¡Gracias por tu inscripción!\n\n" +
      "Tu solicitud de reserva ha quedado registrada.\n\n" +
      refBlock +
      "En cuanto recibamos tu pago, nuestro socio te enviará la confirmación oficial de tu reserva, junto con tu código QR personal. Deberás presentar este código a nuestro equipo de recepción a tu llegada al festival para facilitar tu registro.\n\n" +
      "Estamos deseando recibirte en Tánger y hacerte vivir una experiencia única, bajo el signo del baile, el intercambio y la convivencia.\n\n" +
      "Todo el equipo del Tangier International Latin Festival te agradece tu confianza y te desea una estancia excepcional y recuerdos inolvidables.\n\n" +
      "¡Hasta muy pronto en el Tangier International Latin Festival!\n\n" +
      "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
    );
  }
  const refBlock = reservation
    ? `Your reservation number: ${reservation.code}\n` +
      `Track your booking here: ${reservation.url}\n\n`
    : "";
  return (
    "Thank you for your registration!\n\n" +
    "Your booking request has been recorded.\n\n" +
    refBlock +
    "As soon as your payment is received, our partner will send you the official confirmation of your booking, together with your personal QR code. This code must be presented to our welcome team when you arrive at the festival to make your check-in easier.\n\n" +
    "We look forward to welcoming you to Tangier for a unique experience of dance, sharing and conviviality.\n\n" +
    "The whole Tangier International Latin Festival team thanks you for your trust and wishes you an exceptional stay and unforgettable memories.\n\n" +
    "See you very soon at the Tangier International Latin Festival!\n\n" +
    "contact@tangierlatinfestival.com · +212 6 64 01 02 79"
  );
}

/** Confirmation email with the guest's ticket link and every detail of
 *  their reservation, written entirely in the guest's own language. */
export function ticketConfirmationEmail(opts: {
  customerName: string;
  packName: string;
  ticketCode: string;
  numPeople: number;
  ticketUrl: string;
  lang?: string | null;
  guests?: string[];
  arrivalDate?: string | null;
  departureDate?: string | null;
}): { subject: string; body: string } {
  const lang = opts.lang === "fr" || opts.lang === "es" ? opts.lang : "en";
  const firstName = opts.customerName.split(/\s|&/)[0] || opts.customerName;
  const guests =
    opts.guests && opts.guests.length > 0 ? opts.guests : [opts.customerName];
  const fmtDate = (d?: string | null) =>
    d
      ? new Date(d).toLocaleDateString(
          lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        )
      : null;
  const arrival = fmtDate(opts.arrivalDate);
  const departure = fmtDate(opts.departureDate);

  const L = {
    en: {
      subject: `Your ticket is confirmed! (${opts.ticketCode})`,
      hello: `Hello ${firstName},`,
      confirmed: `Great news — your booking at the Tangier International Latin Festival (January 07–11, 2027 · Kenzi Solazur Hotel, Tangier) is CONFIRMED!`,
      details: "Your reservation details:",
      pack: "Pack",
      guests: "Guests",
      people: (n: number) => `${n} ${n > 1 ? "people" : "person"}`,
      arrival: "Arrival",
      departure: "Departure",
      code: "Reservation number",
      ticket: "🎫 Your ticket (QR code attached):",
      show: "Open the link and show the QR code at check-in. Save this email or take a screenshot.",
      bye: "See you on the dance floor!",
    },
    fr: {
      subject: `Votre billet est confirmé ! (${opts.ticketCode})`,
      hello: `Bonjour ${firstName},`,
      confirmed: `Bonne nouvelle — votre réservation au Tangier International Latin Festival (07–11 janvier 2027 · Hôtel Kenzi Solazur, Tanger) est CONFIRMÉE !`,
      details: "Les détails de votre réservation :",
      pack: "Pack",
      guests: "Personnes",
      people: (n: number) => `${n} personne${n > 1 ? "s" : ""}`,
      arrival: "Arrivée",
      departure: "Départ",
      code: "Numéro de réservation",
      ticket: "🎫 Votre billet (QR code en pièce jointe) :",
      show: "Ouvrez le lien et présentez le QR code à l'entrée. Gardez cet email ou faites une capture d'écran.",
      bye: "À très vite sur la piste !",
    },
    es: {
      subject: `¡Tu entrada está confirmada! (${opts.ticketCode})`,
      hello: `Hola ${firstName},`,
      confirmed: `¡Buenas noticias — tu reserva para el Tangier International Latin Festival (07–11 de enero de 2027 · Hotel Kenzi Solazur, Tánger) está CONFIRMADA!`,
      details: "Los detalles de tu reserva:",
      pack: "Pack",
      guests: "Personas",
      people: (n: number) => `${n} persona${n > 1 ? "s" : ""}`,
      arrival: "Llegada",
      departure: "Salida",
      code: "Número de reserva",
      ticket: "🎫 Tu entrada (código QR adjunto):",
      show: "Abre el enlace y muestra el código QR en la entrada. Guarda este correo o haz una captura de pantalla.",
      bye: "¡Nos vemos en la pista!",
    },
  }[lang];

  const detailLines = [
    `• ${L.pack}: ${opts.packName}`,
    `• ${L.guests}: ${guests.join(" & ")} (${L.people(opts.numPeople)})`,
    ...(arrival ? [`• ${L.arrival}: ${arrival}`] : []),
    ...(departure ? [`• ${L.departure}: ${departure}`] : []),
    `• ${L.code}: ${opts.ticketCode}`,
  ].join("\n");

  return {
    subject: L.subject,
    body:
      `${L.hello}\n\n` +
      `${L.confirmed}\n\n` +
      `${L.details}\n${detailLines}\n\n` +
      `${L.ticket}\n${opts.ticketUrl}\n\n` +
      `${L.show}\n\n` +
      `${L.bye}\n` +
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
