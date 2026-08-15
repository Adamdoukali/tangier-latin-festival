import jsPDF from "jspdf";
import { type Booking } from "./admin-store";
import { translateDynamicText, type Language } from "./translations";

export async function generateTicketPdf(
  booking: Booking,
  qrDataUrl: string,
  lang: string = "en"
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 1. Header Banner (Dark Navy)
  doc.setFillColor(13, 26, 61); // #0d1a3d
  doc.rect(0, 0, 210, 45, "F");

  // Gold accent bar
  doc.setFillColor(212, 175, 55); // #d4af37
  doc.rect(0, 45, 210, 2, "F");

  // Header Titles
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TANGIER INTERNATIONAL", 105, 14, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("LATIN FESTIVAL", 105, 24, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("January 07–11, 2027  ·  Kenzi Solazur Hotel, Tangier, Morocco", 105, 33, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(212, 175, 55);
  const badgeTitle =
    lang === "fr"
      ? "BILLET OFFICIEL DE CONFIRMATION"
      : lang === "es"
      ? "ENTRADA OFICIAL DE CONFIRMACIÓN"
      : "OFFICIAL TICKET & RESERVATION CONFIRMATION";
  doc.text(badgeTitle, 105, 40, { align: "center" });

  // 2. Ticket Code Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 54, 180, 24, 3, 3, "FD");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const codeLabel =
    lang === "fr"
      ? "CODE DE RÉSERVATION"
      : lang === "es"
      ? "CÓDIGO DE RESERVA"
      : "RESERVATION TICKET CODE";
  doc.text(codeLabel, 25, 62);

  doc.setTextColor(180, 83, 9); // Gold-amber
  doc.setFontSize(16);
  doc.setFont("courier", "bold");
  doc.text(booking.ticketCode, 25, 71);

  // Status Badge
  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(135, 60, 52, 12, 2, 2, "FD");
  doc.setTextColor(21, 128, 61);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  const statusTxt =
    booking.status === "checked-in"
      ? lang === "fr"
        ? "ENREGISTRÉ"
        : lang === "es"
        ? "REGISTRADO"
        : "CHECKED IN"
      : lang === "fr"
      ? "CONFIRMÉ & VALIDE"
      : lang === "es"
      ? "CONFIRMADO Y VÁLIDO"
      : "CONFIRMED & VALID";
  doc.text(statusTxt, 161, 67.5, { align: "center" });

  // 3. Main Ticket Content & QR Code
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  const detailsHeading =
    lang === "fr"
      ? "Détails de la Réservation"
      : lang === "es"
      ? "Detalles de la Reserva"
      : "Reservation Details";
  doc.text(detailsHeading, 15, 90);

  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 93, 115, 93);

  const fmtDate = (d?: string | null) =>
    d
      ? new Date(d).toLocaleDateString(
          lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        )
      : "—";

  const rows: Array<[string, string]> = [
    [
      lang === "fr" ? "Titulaire" : lang === "es" ? "Titular" : "Guest Name",
      booking.customerName,
    ],
    [
      lang === "fr" ? "Pack réservé" : lang === "es" ? "Pack reservado" : "Booked Pack",
      translateDynamicText(booking.packName, lang as Language),
    ],
    (() => {
      const effPeople =
        booking.numPeople && booking.numPeople > 1
          ? booking.numPeople
          : booking.customerName.includes(" & ")
          ? booking.customerName.split(" & ").filter(Boolean).length
          : /double|doble|couple|pareja/i.test(booking.packName)
          ? 2
          : booking.numPeople || 1;
      return [
        lang === "fr"
          ? "Nombre de personnes"
          : lang === "es"
          ? "Número de personas"
          : "Number of Guests",
        `${effPeople} ${
          effPeople > 1
            ? lang === "fr"
              ? "personnes"
              : lang === "es"
              ? "personas"
              : "guests"
            : lang === "fr"
            ? "personne"
            : lang === "es"
            ? "persona"
            : "guest"
        }`,
      ];
    })(),
    [
      lang === "fr" ? "Date d'arrivée" : lang === "es" ? "Fecha de llegada" : "Arrival Date",
      fmtDate(booking.arrivalDate),
    ],
    [
      lang === "fr" ? "Date de départ" : lang === "es" ? "Fecha de salida" : "Departure Date",
      fmtDate(booking.departureDate),
    ],
    [
      lang === "fr" ? "Hôtel / Lieu" : lang === "es" ? "Hotel / Lugar" : "Hotel Venue",
      "Kenzi Solazur Hotel, Tangier",
    ],
    [
      lang === "fr" ? "Contact client" : lang === "es" ? "Contacto cliente" : "Contact Email",
      booking.email || "—",
    ],
    [
      lang === "fr" ? "Téléphone" : lang === "es" ? "Teléfono" : "Phone",
      booking.phone || "—",
    ],
  ];

  let y = 101;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 15, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(value, 55, y);
    y += 8.5;
  });

  // Right Side: QR Code Box
  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.roundedRect(128, 86, 67, 67, 4, 4, "FD");

    doc.addImage(qrDataUrl, "PNG", 132, 90, 59, 59);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    const scanNotice =
      lang === "fr"
        ? "Scanner à l'enregistrement"
        : lang === "es"
        ? "Escanear en la entrada"
        : "Scan at Check-in Desk";
    doc.text(scanNotice, 161.5, 158, { align: "center" });
  }

  // 4. Instructions / Notice Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, 175, 180, 32, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const instTitle =
    lang === "fr"
      ? "Instructions d'accueil & Enregistrement"
      : lang === "es"
      ? "Instrucciones de llegada y Registro"
      : "Check-in & Event Entry Instructions";
  doc.text(instTitle, 22, 183);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const instLines =
    lang === "fr"
      ? [
          "- Présentez ce document PDF ou le QR code sur votre téléphone à l'accueil de l'Hôtel Kenzi Solazur.",
          "- Un bracelet personnel vous sera remis lors de l'enregistrement pour accéder aux workshops, soirées et spectacles.",
        ]
      : lang === "es"
      ? [
          "- Presenta este documento PDF o el código QR en tu teléfono en la recepción del Hotel Kenzi Solazur.",
          "- Se te entregará una pulsera personal en el registro para acceder a los talleres, fiestas y espectáculos.",
        ]
      : [
          "- Present this PDF ticket or show the QR code on your phone at the Kenzi Solazur Hotel welcome desk.",
          "- A personal event bracelet will be issued at check-in for full access to workshops, shows, and parties.",
        ];

  let iy = 191;
  instLines.forEach((line) => {
    doc.text(line, 22, iy);
    iy += 6;
  });

  // 5. Programme Banner Link
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(15, 214, 180, 20, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9);
  const progTitle =
    lang === "fr"
      ? "Programme Officiel du Festival"
      : lang === "es"
      ? "Programa Oficial del Festival"
      : "Official Festival Schedule & Programme";
  doc.text(progTitle, 22, 222);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  const progSub =
    lang === "fr"
      ? "Téléchargez le programme complet sur : tangierlatinfestival.com/program"
      : lang === "es"
      ? "Descarga el programa completo en: tangierlatinfestival.com/program"
      : "Download the complete schedule at: tangierlatinfestival.com/program";
  doc.text(progSub, 22, 229);


  // 6. Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Tangier International Latin Festival  ·  contact@tangierlatinfestival.com  ·  +212 6 64 01 02 79",
    105,
    275,
    { align: "center" }
  );

  doc.save(`Ticket-${booking.ticketCode}.pdf`);
}
