// Sends the guest their confirmed ticket by e-mail (QR link + attachment).
// Used when an admin confirms a booking by hand and when a Moroccan
// guest's payment is completed in the "Paiements Maroc" section.

import { ticketUrl, type Booking, type Collaborator } from "./admin-store";
import { sendFormNotification, ticketConfirmationEmail } from "./form-notify";
import { translateDynamicText, type Language } from "./translations";

/** Resolves true when the e-mail was handed to a delivery service,
 *  false when the booking has no e-mail or every channel failed. */
export async function sendTicketConfirmationEmail(
  booking: Booking,
  collaborators: Collaborator[] = [],
): Promise<boolean> {
  if (!booking.email) return false;
  // Guest's own language: what they booked in, else their partner's
  const partner = booking.collaboratorId
    ? collaborators.find((c) => c.id === booking.collaboratorId)
    : undefined;
  const bLang = ((booking.lang || partner?.language || "en") as Language) ?? "en";
  const tUrl = ticketUrl(booking.ticketCode) + (bLang !== "en" ? `&lang=${bLang}` : "");
  const mail = ticketConfirmationEmail({
    customerName: booking.customerName,
    packName: translateDynamicText(booking.packName, bLang),
    ticketCode: booking.ticketCode,
    numPeople: booking.numPeople || 1,
    ticketUrl: tUrl,
    lang: bLang,
    guests: booking.customerName.split(/\s*&\s*/),
    arrivalDate: booking.arrivalDate,
    departureDate: booking.departureDate,
  });
  return sendFormNotification({
    subject: `Ticket confirmed: ${booking.customerName} (${booking.ticketCode})`,
    guestSubject: mail.subject,
    lang: bLang,
    ticket: { code: booking.ticketCode, url: tUrl },
    fields: {
      name: booking.customerName,
      email: booking.email,
      Ticket: tUrl,
      Code: booking.ticketCode,
      Pack: booking.packName,
    },
    autoresponse: mail.body,
  });
}
