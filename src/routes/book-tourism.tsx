import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Compass,
  Users,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import chefchaouenImg from "@/assets/chefchaouen.jpg";
import asilahImg from "@/assets/asilah.jpg";
import tangierImg from "@/assets/tangier-tour.jpg";
import { PhoneCountrySelect } from "@/components/PhoneCountrySelect";
import {
  addBooking,
  getCollaboratorByCode,
  getRememberedReferral,
  ticketUrl,
  findMatchingFestivalBooking,
  type Booking,
  type Collaborator,
} from "@/lib/admin-store";
import { restorePartnerSession } from "@/lib/partner-auth";
import { useLanguage } from "@/hooks/useLanguage";
import { type Language } from "@/lib/translations";
import { sendFormNotification, bookingAutoResponse } from "@/lib/form-notify";

export const Route = createFileRoute("/book-tourism")({
  head: () => ({
    meta: [
      { title: "Book Cultural Excursions & Tours — Tangier Latin Festival 2027" },
      {
        name: "description",
        content:
          "Book your official guided excursions to Tangier, Asilah, and Chefchaouen during the Tangier International Latin Festival 2027.",
      },
    ],
  }),
  component: BookTourismPage,
});

export interface TourPackage {
  id: string;
  city: string;
  subtitle: { en: string; fr: string; es: string };
  date: { en: string; fr: string; es: string };
  time: string;
  duration: { en: string; fr: string; es: string };
  price: number;
  currency: string;
  image: string;
  desc: { en: string; fr: string; es: string };
  highlights: { en: string[]; fr: string[]; es: string[] };
  included: { en: string[]; fr: string[]; es: string[] };
  badge?: { en: string; fr: string; es: string };
}

const TOURS_DATA: TourPackage[] = [
  {
    id: "tour-tangier",
    city: "Tangier Tour",
    subtitle: {
      en: "Mythical Strait, Ancient Kasbah & Hercules Caves",
      fr: "Détroit mythique, Kasbah ancestrale & Grottes d'Hercule",
      es: "Estrecho mítico, antigua Kasbah y Cuevas de Hércules",
    },
    date: {
      en: "Saturday · January 9, 2027",
      fr: "Samedi · 9 Janvier, 2027",
      es: "Sábado · 9 de Enero, 2027",
    },
    time: "15:00 – 19:00",
    duration: {
      en: "4 Hours (15:00 – 19:00)",
      fr: "4h00 (15h00 – 19h00)",
      es: "4 Horas (15:00 – 19:00)",
    },
    price: 15,
    currency: "€",
    image: tangierImg,
    badge: {
      en: "City Classic",
      fr: "Incontournable",
      es: "Clásico",
    },
    desc: {
      en: "Where the Mediterranean meets the Atlantic. Discover the historical Kasbah, the bustling Medina, panoramic views of Cap Spartel, and the legendary Caves of Hercules.",
      fr: "Où la Méditerranée rencontre l'Atlantique. Découvrez la Kasbah historique, la médina animée, la vue panoramique du Cap Spartel et les légendaires Grottes d'Hercule.",
      es: "Donde el Mediterráneo se encuentra con el Atlántico. Descubre la histórica Kasbah, la vibrante medina, las vistas de Cabo Spartel y las míticas Cuevas de Hércules.",
    },
    highlights: {
      en: [
        "Historical Kasbah & Sultan's Palace view",
        "Cap Spartel (Atlantic & Mediterranean junction)",
        "Legendary Caves of Hercules",
        "Mendoubia Botanical Gardens & Grand Socco",
        "Vibrant ancient medina & artisan alleys",
      ],
      fr: [
        "La Kasbah historique & vue sur le détroit",
        "Cap Spartel (rencontre Méditerranée & Atlantique)",
        "Les mythiques Grottes d'Hercule",
        "Jardins de la Mendoubia & Grand Socco",
        "L'ancienne médina et ruelles d'artisans",
      ],
      es: [
        "La Kasbah histórica y mirador del Estrecho",
        "Cabo Spartel (unión del Mediterráneo y Atlántico)",
        "Las legendarias Cuevas de Hércules",
        "Jardines de la Mendoubia y Grand Socco",
        "Antigua medina y callejones artesanales",
      ],
    },
    included: {
      en: [
        "AC Transport from Hotel Kenzi Solazur",
        "Professional multilingual guide",
        "All site entrance fees included",
      ],
      fr: [
        "Transport climatisé depuis l'Hôtel Kenzi Solazur",
        "Guide officiel multilingue",
        "Tous les tickets d'accès aux sites",
      ],
      es: [
        "Transporte con A/C desde Hotel Kenzi Solazur",
        "Guía oficial multilingüe",
        "Entradas a todos los monumentos",
      ],
    },
  },
  {
    id: "tour-asilah",
    city: "Asilah Tour",
    subtitle: {
      en: "Atlantic Coastal Gem & Art-Filled White Medina",
      fr: "Perle côtière atlantique & médina blanche d'artistes",
      es: "Joya costera atlántica y medina blanca de artistas",
    },
    date: {
      en: "Saturday · January 9, 2027",
      fr: "Samedi · 9 Janvier, 2027",
      es: "Sábado · 9 de Enero, 2027",
    },
    time: "12:00 – 19:00",
    duration: {
      en: "7 Hours (12:00 – 19:00)",
      fr: "7h00 (12h00 – 19h00)",
      es: "7 Horas (12:00 – 19:00)",
    },
    price: 25,
    currency: "€",
    image: asilahImg,
    badge: {
      en: "Coastal Beauty",
      fr: "Charme Côtier",
      es: "Belleza Costera",
    },
    desc: {
      en: "A tranquil coastal jewel famous for its whitewashed alleys, 15th-century Portuguese ramparts overlooking the ocean, vibrant murals by world-renowned artists, and relaxed Atlantic sea breeze.",
      fr: "Un bijou côtier renommé pour ses ruelles blanchies à la chaux, ses remparts portugais du XVe siècle face à l'océan, ses fresques murales d'artistes et sa brise marine.",
      es: "Una joya costera famosa por sus callejuelas encaladas, sus murallas portuguesas del siglo XV frente al océano, sus murales artísticos y su atmósfera relajada.",
    },
    highlights: {
      en: [
        "Bab el-Kasbah & 15th-century Portuguese ramparts",
        "Borj Al Kamra historic watchtower",
        "Palais Raissouni ocean palace architecture",
        "Vibrant street murals painted by international artists",
        "Free time by the Atlantic oceanfront & cafes",
      ],
      fr: [
        "Bab el-Kasbah & remparts portugais du XVe siècle",
        "Tour historique Borj Al Kamra",
        "Palais Raissouni au bord de l'océan",
        "Fresques murales peintes par des artistes internationaux",
        "Temps libre sur la promenade maritime & cafés",
      ],
      es: [
        "Bab el-Kasbah y murallas portuguesas del siglo XV",
        "Torre histórica Borj Al Kamra",
        "Palacio Raissouni frente al mar",
        "Murales artísticos de renombre mundial",
        "Tiempo libre en el paseo marítimo y cafés",
      ],
    },
    included: {
      en: [
        "Round-trip AC coach from festival hotel",
        "Guided historical medina walking tour",
        "Free time for shopping, photos & seaside dining",
      ],
      fr: [
        "Transport A/R climatisé depuis l'hôtel du festival",
        "Visite guidée à pied dans la médina historique",
        "Temps libre shopping, photos & bord de mer",
      ],
      es: [
        "Transporte I/V con A/C desde el hotel",
        "Visita guiada a pie por la medina histórica",
        "Tiempo libre para fotos, compras y relax",
      ],
    },
  },
  {
    id: "tour-chefchaouen",
    city: "Chefchaouen Tour",
    subtitle: {
      en: "The World-Famous Blue Pearl in the Rif Mountains",
      fr: "La Perle Bleue mondialement célèbre dans le Rif",
      es: "La famosa Perla Azul en las montañas del Rif",
    },
    date: {
      en: "Sunday · January 10, 2027",
      fr: "Dimanche · 10 Janvier, 2027",
      es: "Domingo · 10 de Enero, 2027",
    },
    time: "11:00 – 19:00",
    duration: {
      en: "8 Hours (Starts at 11:00 AM)",
      fr: "8 Heures (Départ à 11h00)",
      es: "8 Horas (Salida a las 11:00)",
    },
    price: 30,
    currency: "€",
    image: chefchaouenImg,
    badge: {
      en: "Top Pick ★",
      fr: "Coup de Cœur ★",
      es: "Más Popular ★",
    },
    desc: {
      en: "Immerse yourself in Morocco's most photogenic destination. Wander through mesmerizing blue-washed streets nestled high in the Rif Mountains, discover authentic wool & leather crafts, and enjoy scenic mountain vistas.",
      fr: "Plongez dans la destination la plus photogénique du Maroc. Flânez dans les ruelles bleues féeriques nichées dans les montagnes du Rif, découvrez l'artisanat local et des panoramas sublimes.",
      es: "Sumérgete en el destino más fotogénico de Marruecos. Recorre sus fascinantes calles azules enclavadas en las montañas del Rif, descubre artesanías locales y disfruta de vistas panorámicas.",
    },
    highlights: {
      en: [
        "Picturesque blue-tinted streets & iconic photo spots",
        "Plaza Uta el-Hammam & historic red-walled Kasbah",
        "The Grand Mosque & mountain spring Ras El Maa",
        "Panoramic viewpoints across the Rif Mountain range",
        "Handmade artisan crafts, textiles & leather souks",
      ],
      fr: [
        "Rues bleues féeriques & spots photos emblématiques",
        "Place Uta el-Hammam & Kasbah aux murs ocres",
        "La Grande Mosquée & source d'eau Ras El Maa",
        "Points de vue panoramiques sur la chaîne du Rif",
        "Souks d'artisanat : tissages, cuir et poteries",
      ],
      es: [
        "Calles azules de ensueño y rincones fotográficos",
        "Plaza Uta el-Hammam y Kasbah histórica",
        "La Gran Mezquita y manantial de Ras El Maa",
        "Vistas panorámicas de la cordillera del Rif",
        "Mercados de artesanía tradicional y tejidos",
      ],
    },
    included: {
      en: [
        "Luxury AC Coach transport from Tangier",
        "Certified local mountain & medina tour guide",
        "Scenic stops along the Rif Mountain peaks",
        "Free time for lunch & artisanal shopping",
      ],
      fr: [
        "Transport en autocar grand confort climatisé",
        "Guide officiel local certifié",
        "Arrêts photos panoramiques dans les montagnes",
        "Temps libre pour déjeuner & shopping d'artisanat",
      ],
      es: [
        "Transporte de lujo con A/C ida y vuelta",
        "Guía oficial local certificado",
        "Paradas panorámicas en la cordillera del Rif",
        "Tiempo libre para almuerzo y compras",
      ],
    },
  },
];

function BookTourismPage() {
  const { lang, setLang } = useLanguage();
  const L = (lang as Language) || "en";
  const tr = (en: string, fr: string, es: string) =>
    L === "fr" ? fr : L === "es" ? es : en;

  const [selectedTour, setSelectedTour] = useState<TourPackage | null>(null);
  const [numGuests, setNumGuests] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reservation, setReservation] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [partnerCode, setPartnerCode] = useState<string | null>(null);
  const [matchedFestivalBooking, setMatchedFestivalBooking] = useState<Booking | null>(null);

  const [form, setForm] = useState({
    guests: [{ firstName: "", lastName: "" }],
    email: "",
    phone: "",
    country: "",
    roomNumber: "",
    notes: "",
  });

  // Cross-booking auto-linking lookup: search database as user enters phone, email or name
  useEffect(() => {
    const timer = setTimeout(async () => {
      const leadName = form.guests[0]?.firstName
        ? `${form.guests[0].firstName} ${form.guests[0].lastName}`.trim()
        : undefined;

      if (!form.phone && !form.email && !leadName) {
        setMatchedFestivalBooking(null);
        return;
      }

      const match = await findMatchingFestivalBooking({
        phone: form.phone,
        email: form.email,
        name: leadName,
      });

      if (match) {
        setMatchedFestivalBooking(match);
        // Pre-fill hotel room if available and not manually entered
        if (match.roomNumber) {
          setForm((f) => ({ ...f, roomNumber: f.roomNumber || match.roomNumber! }));
        }
        if (match.country) {
          setForm((f) => ({ ...f, country: f.country || match.country }));
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [form.phone, form.email, form.guests]);

  // Check ?ref= partner code and automatically sync language if needed
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || getRememberedReferral();
    if (ref) {
      setPartnerCode(ref);
      if (!params.get("lang")) {
        getCollaboratorByCode(ref)
          .then((c) => {
            if (c?.language && (c.language === "fr" || c.language === "es" || c.language === "en")) {
              setLang(c.language);
            }
          })
          .catch(() => {});
      }
    }

    // Direct preselection via ?tour=
    const tourParam = params.get("tour");
    if (tourParam) {
      const matched = TOURS_DATA.find(
        (t) => t.id === tourParam || t.city.toLowerCase().includes(tourParam.toLowerCase())
      );
      if (matched) setSelectedTour(matched);
    }
  }, [setLang]);

  // Adjust guest fields array when number of guests changes
  const handleGuestCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setNumGuests(validCount);
    setForm((f) => {
      const current = [...f.guests];
      if (current.length < validCount) {
        const added = Array.from({ length: validCount - current.length }, () => ({
          firstName: "",
          lastName: "",
        }));
        return { ...f, guests: [...current, ...added] };
      } else {
        return { ...f, guests: current.slice(0, validCount) };
      }
    });
  };

  const setGuestField = (idx: number, field: "firstName" | "lastName", value: string) => {
    setForm((f) => ({
      ...f,
      guests: f.guests.map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));
  };

  const handleSelectTour = (tour: TourPackage) => {
    setSelectedTour(tour);
    setTimeout(() => {
      const formEl = document.getElementById("booking-form");
      if (formEl) {
        const topPos = formEl.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: Math.max(0, topPos), behavior: "smooth" });
      }
    }, 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTour) return;

    const hasEmptyGuest = form.guests.some((g) => !g.firstName.trim() || !g.lastName.trim());
    if (hasEmptyGuest || !form.email.trim() || !form.phone.trim()) {
      setError(
        tr(
          "Please fill in all required fields marked with *",
          "Veuillez remplir tous les champs obligatoires marqués d'un *",
          "Por favor completa todos los campos obligatorios marcados con *"
        )
      );
      return;
    }

    setSubmitting(true);
    setError("");

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const urlRef = params?.get("ref");
    const rememberedRef = getRememberedReferral();
    const refCode = urlRef || partnerCode || rememberedRef;

    let explicitCollaborator: Collaborator | undefined = undefined;
    if (refCode) {
      explicitCollaborator = await getCollaboratorByCode(refCode).catch(() => undefined);
    }

    // Check if partner is logged in on this browser (e.g. testing their own link)
    let partnerSessionCollab: Collaborator | null = null;
    try {
      partnerSessionCollab = await restorePartnerSession();
    } catch {}

    // Match with existing festival booking by phone, email, or lead guest name
    let matchedCollabId = matchedFestivalBooking?.collaboratorId;
    if (!matchedCollabId && (form.phone || form.email || form.guests[0]?.firstName)) {
      const match = await findMatchingFestivalBooking({
        phone: form.phone,
        email: form.email,
        name: `${form.guests[0]?.firstName || ""} ${form.guests[0]?.lastName || ""}`.trim(),
      });
      if (match?.collaboratorId) {
        matchedCollabId = match.collaboratorId;
      }
    }

    const finalCollaboratorId =
      explicitCollaborator?.id ??
      matchedCollabId ??
      (partnerSessionCollab?.id ?? null);

    const customerName = form.guests
      .map((g) => `${g.firstName.trim()} ${g.lastName.trim()}`)
      .join(" & ");

    const totalCost = selectedTour.price * numGuests;

    const linkedNote = matchedFestivalBooking
      ? `[Linked Festival Ticket #${matchedFestivalBooking.ticketCode}]`
      : "";
    const fullNotes = [
      form.roomNumber ? `Hotel Room: ${form.roomNumber}` : "",
      form.notes ? `Notes: ${form.notes}` : "",
      linkedNote,
    ]
      .filter(Boolean)
      .join(" | ");

    let created: Booking | null = null;
    try {
      created = await addBooking({
        ticketCode: matchedFestivalBooking?.ticketCode,
        packId: selectedTour.id,
        packName: `Tourism: ${selectedTour.city} (${selectedTour.date[L] || selectedTour.date.en})`,
        customerName,
        email: form.email,
        phone: form.phone,
        country: form.country || "Morocco",
        numPeople: numGuests,
        danceLevel: "",
        notes: fullNotes,
        arrivalDate: "2027-01-09",
        departureDate: "2027-01-11",
        roomNumber: form.roomNumber || matchedFestivalBooking?.roomNumber || null,
        guestDetails: JSON.stringify(form.guests),
        lang: L,
        status: "pending",
        source: finalCollaboratorId ? "referral" : "website",
        collaboratorId: finalCollaboratorId,
      });
    } catch (dbErr) {
      console.warn("Could not record tourism booking:", dbErr);
    }

    try {
      const tourDateStr = selectedTour.date[L] || selectedTour.date.en;
      await sendFormNotification({
        subject: `New Tourism Booking: ${selectedTour.city} (${numGuests} ${numGuests > 1 ? "guests" : "guest"})`,
        lang: L,
        fields: {
          name: customerName,
          email: form.email,
          Tour: `${selectedTour.city} — ${selectedTour.subtitle[L] || selectedTour.subtitle.en}`,
          Date: `${tourDateStr} (${selectedTour.time})`,
          Guests: String(numGuests),
          "Total Price": `${totalCost} ${selectedTour.currency}`,
          Phone: form.phone,
          Country: form.country || "N/A",
          ...(form.roomNumber ? { "Hotel Room": form.roomNumber } : {}),
          ...(form.notes ? { Notes: form.notes } : {}),
          ...(created ? { Reservation: created.ticketCode } : {}),
          ...(explicitCollaborator ? { "Partner Referral": `${explicitCollaborator.name} (${explicitCollaborator.code})` } : {}),
        },
        autoresponse: "",
      });

      setReservation(created);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      if (created) {
        setReservation(created);
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(
          tr(
            "An error occurred. Please try again or email us at contact@tangierlatinfestival.com",
            "Une erreur est survenue. Veuillez réessayer ou nous écrire à contact@tangierlatinfestival.com",
            "Ocurrió un error. Inténtalo de nuevo o contáctanos en contact@tangierlatinfestival.com"
          )
        );
      }
    }
    setSubmitting(false);
  };

  // ── Success Screen ──
  if (done && selectedTour) {
    const totalCost = selectedTour.price * numGuests;
    return (
      <TourismShell lang={L} setLang={setLang}>
        <div className="max-w-xl mx-auto py-12 px-4 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 border-2 border-blue-300 grid place-items-center mb-6 shadow-md">
            <CheckCircle2 className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="font-display text-3xl font-extrabold text-slate-900 tracking-wide">
            {tr("Excursion Request Received!", "Demande d'excursion reçue !", "¡Solicitud de excursión recibida!")}
          </h1>

          {/* Ticket / Reservation Card */}
          <div className="mt-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-lg text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-[11px] font-bold tracking-widest uppercase text-blue-600">
                  {tr("Destination", "Destination", "Destino")}
                </p>
                <h3 className="font-display text-xl font-bold text-gray-900 mt-0.5">
                  {selectedTour.city}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-blue-700">
                  {totalCost} {selectedTour.currency}
                </span>
                <span className="block text-[10px] text-gray-500 font-medium">
                  ({numGuests} {numGuests > 1 ? tr("guests", "personnes", "personas") : tr("guest", "personne", "persona")})
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-xs text-gray-700 font-medium">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{selectedTour.date[L] || selectedTour.date.en}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{selectedTour.time} ({selectedTour.duration[L] || selectedTour.duration.en})</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{tr("Pickup: Kenzi Solazur Hotel Lobby", "Départ : Hall Hôtel Kenzi Solazur", "Salida: Hall Hotel Kenzi Solazur")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="truncate">{form.guests.map((g) => `${g.firstName} ${g.lastName}`).join(" · ")}</span>
              </div>
            </div>

            {reservation && (
              <div className="pt-4 border-t border-gray-100 text-center bg-blue-50/70 -mx-6 -mb-6 p-5 rounded-b-2xl">
                <p className="text-[10px] tracking-widest uppercase text-gray-500 font-semibold">
                  {tr("Your Booking Code", "Votre code de réservation", "Tu código de reserva")}
                </p>
                <code className="mt-1 inline-block font-mono text-2xl font-black text-blue-700">
                  {reservation.ticketCode}
                </code>
                <p className="mt-2 text-xs text-gray-500">
                  {tr(
                    "You can track your reservation at any time with this code:",
                    "Vous pouvez suivre votre réservation à tout moment avec ce code :",
                    "Puedes seguir tu reserva en cualquier momento con este código:"
                  )}
                </p>
                <a
                  href={ticketUrl(reservation.ticketCode)}
                  className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-800 underline font-semibold break-all"
                >
                  {ticketUrl(reservation.ticketCode)}
                </a>
              </div>
            )}
          </div>

          <p className="mt-6 text-sm text-gray-600 leading-relaxed font-medium">
            {tr(
              "An automated confirmation has been sent to your email. Our team will contact you within 24-48 hours with departure details and payment confirmation.",
              "Un e-mail récapitulatif a été envoyé à votre adresse. Notre équipe vous contactera sous 24 à 48 heures pour les détails de départ et le règlement.",
              "Se ha enviado un correo electrónico de confirmación. Nuestro equipo se comunicará contigo en 24-48 horas con los detalles de salida y pago."
            )}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setDone(false);
                setSelectedTour(null);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
            >
              {tr("Book Another Tour", "Réserver une autre excursion", "Reservar otra excursión")}
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto px-8 py-3 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200 cursor-pointer"
            >
              {tr("Back to Festival Website", "Retour au site du festival", "Volver al sitio del festival")}
            </Link>
          </div>
        </div>
      </TourismShell>
    );
  }

  // ── Main Booking View ──
  return (
    <TourismShell lang={L} setLang={setLang}>
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/90 text-blue-900 border border-blue-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
          <Compass className="h-3.5 w-3.5 text-blue-600" />
          {tr("Official Festival Excursions", "Excursions Officielles du Festival", "Excursiones Oficiales del Festival")}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {tr(
            "Discover Morocco with Our Guided Tours",
            "Découvrez le Maroc avec nos excursions guidées",
            "Descubre Marruecos con nuestras excursiones guiadas"
          )}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {tr(
            "Explore Tangier, Asilah, and Chefchaouen with official multilingual guides, air-conditioned transport from Hotel Kenzi Solazur, and an unforgettable cultural experience.",
            "Explorez Tanger, Asilah et Chefchaouen avec guides officiels multilingues et transport grand confort depuis l'Hôtel Kenzi Solazur pour un séjour inoubliable.",
            "Explora Tánger, Asilah y Chefchaouen con guías oficiales multilingües y transporte con A/C desde el Hotel Kenzi Solazur para una experiencia inolvidable."
          )}
        </p>

        {partnerCode && (
          <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold px-4 py-1.5 rounded-full">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span>
              {tr("Booking via Partner Referral", "Réservation via partenaire affilié", "Reserva vía colaborador afiliado")}:{" "}
              <strong className="font-mono text-blue-900">{partnerCode}</strong>
            </span>
          </div>
        )}
      </div>

      {/* 3 Tour Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-14">
        {TOURS_DATA.map((tItem) => {
          const isSelected = selectedTour?.id === tItem.id;
          return (
            <div
              key={tItem.id}
              onClick={() => handleSelectTour(tItem)}
              className={`group relative rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between cursor-pointer bg-white ${
                isSelected
                  ? "border-blue-600 ring-4 ring-blue-500/20 shadow-xl scale-[1.02]"
                  : "border-gray-200/90 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              {/* Card Image Thumbnail */}
              <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                <img
                  src={tItem.image}
                  alt={tItem.city}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                {/* Badge */}
                {tItem.badge && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-blue-600/90 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                    <Sparkles className="h-2.5 w-2.5" />
                    {tItem.badge[L] || tItem.badge.en}
                  </span>
                )}

                {/* Price Tag in Image */}
                <div className="absolute bottom-3 right-3 rounded-xl bg-white/95 backdrop-blur-md px-3 py-1 text-right shadow-lg border border-white/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                    {tr("Price / pers.", "Prix / pers.", "Precio / pers.")}
                  </span>
                  <span className="font-display text-xl font-black text-blue-700 leading-none">
                    {tItem.price} {tItem.currency}
                  </span>
                </div>

                {/* Title on Image */}
                <div className="absolute bottom-3 left-3 pr-24">
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">
                    {tItem.city}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <p className="text-xs font-semibold text-blue-700 leading-tight">
                    {tItem.subtitle[L] || tItem.subtitle.en}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-600 font-medium">
                    <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg text-blue-900 font-bold">
                      <Calendar className="h-3 w-3 text-blue-600" />
                      <span>{tItem.date[L] || tItem.date.en}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-gray-700 font-semibold">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span>{tItem.time}</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-gray-600 line-clamp-3 leading-relaxed">
                    {tItem.desc[L] || tItem.desc.en}
                  </p>

                  {/* Highlights List */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      {tr("Places Visited", "Lieux visités", "Lugares visitados")}
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-700">
                      {(tItem.highlights[L] || tItem.highlights.en).slice(0, 3).map((hl, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Choose button */}
                <button
                  type="button"
                  onClick={() => handleSelectTour(tItem)}
                  className={`w-full mt-4 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-gray-800"
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {tr("Selected Tour", "Excursion sélectionnée", "Excursión seleccionada")}
                    </>
                  ) : (
                    <>
                      <span>{tr("Select This Tour", "Choisir cette excursion", "Seleccionar esta excursión")}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Form Section */}
      <div id="booking-form" className="max-w-2xl mx-auto">
        <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-gray-100 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white grid place-items-center shadow-sm">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">
                {tr("Complete Your Excursion Booking", "Complétez votre réservation", "Completa tu reserva")}
              </h2>
              <p className="text-xs text-gray-500">
                {tr(
                  "Choose your destination above and enter the participants' details.",
                  "Sélectionnez votre excursion ci-dessus et saisissez vos coordonnées.",
                  "Selecciona tu excursión arriba e ingresa los datos de los participantes."
                )}
              </p>
            </div>
          </div>

          {/* If no tour is selected yet */}
          {!selectedTour ? (
            <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 text-center space-y-2">
              <Compass className="h-8 w-8 text-blue-500 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-blue-900">
                {tr("Please select a tour above to proceed", "Veuillez sélectionner une excursion ci-dessus", "Selecciona una excursión arriba para continuar")}
              </p>
              <p className="text-xs text-blue-700">
                {tr(
                  "Click on Tangier, Asilah, or Chefchaouen to configure your reservation.",
                  "Cliquez sur Tanger, Asilah ou Chefchaouen pour configurer votre réservation.",
                  "Haz clic en Tánger, Asilah o Chefchaouen para configurar tu reserva."
                )}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selected Tour Summary Banner */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      {tr("Selected Excursion", "Excursion Choisie", "Excursión Elegida")}
                    </span>
                    <h3 className="font-display text-lg font-extrabold text-slate-900">
                      {selectedTour.city}
                    </h3>
                    <p className="text-xs text-blue-700 font-medium">
                      {selectedTour.date[L] || selectedTour.date.en} · {selectedTour.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-500 block">
                      {selectedTour.price} {selectedTour.currency} / {tr("person", "pers.", "pers.")}
                    </span>
                    <span className="font-display text-2xl font-black text-blue-700">
                      {selectedTour.price * numGuests} {selectedTour.currency}
                    </span>
                  </div>
                </div>

                {/* Number of Guests Selector */}
                <div className="pt-3 border-t border-blue-200/80 flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-600" />
                    {tr("Number of Participants:", "Nombre de participants :", "Número de participantes:")}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGuestCountChange(numGuests - 1)}
                      disabled={numGuests <= 1}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer grid place-items-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-display text-base font-bold text-slate-900">
                      {numGuests}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGuestCountChange(numGuests + 1)}
                      disabled={numGuests >= 20}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer grid place-items-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Guest Name Inputs */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  {tr("Participant Names", "Noms des participants", "Nombres de los participantes")}
                </p>

                {form.guests.map((g, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                    {numGuests > 1 && (
                      <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                        {tr("Participant", "Participant", "Participante")} {idx + 1}
                      </p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          {tr("First Name", "Prénom", "Nombre")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={g.firstName}
                          onChange={(e) => setGuestField(idx, "firstName", e.target.value)}
                          placeholder={idx === 0 ? "Jean" : "Marie"}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 transition placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          {tr("Last Name", "Nom", "Apellido")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={g.lastName}
                          onChange={(e) => setGuestField(idx, "lastName", e.target.value)}
                          placeholder="Dupont"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500 transition placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                {matchedFestivalBooking && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-3.5 flex items-start gap-3 shadow-xs">
                    <div className="h-7 w-7 rounded-xl bg-emerald-600 text-white grid place-items-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 flex-wrap">
                        <span>{tr("Festival Pass Linked!", "Réservation Festival Associée !", "¡Pase de Festival Vinculado!")}</span>
                        <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                          #{matchedFestivalBooking.ticketCode}
                        </span>
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                        {matchedFestivalBooking.customerName} · {matchedFestivalBooking.packName}
                        {matchedFestivalBooking.roomNumber ? ` · ${tr("Room", "Chambre", "Habitación")} ${matchedFestivalBooking.roomNumber}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  {tr("Contact & Pickup Details", "Contact & Prise en charge", "Contacto y recogida")}
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="your.email@domain.com"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 transition placeholder:text-gray-400"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {tr("WhatsApp / Phone", "WhatsApp / Téléphone", "WhatsApp / Teléfono")} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <PhoneCountrySelect className="rounded-l-xl border border-gray-300 border-r-0 bg-white px-2 max-w-[105px] text-gray-900 focus:outline-none focus:border-blue-500 text-xs" />
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="612345678"
                        className="w-full rounded-r-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 transition placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {tr("Country of Residence", "Pays de résidence", "País de residencia")}
                    </label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      placeholder="France / Spain / Morocco"
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 transition placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Total Calculation & Terms */}
              <div className="rounded-2xl bg-slate-900 text-white p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{selectedTour.city} ({numGuests} × {selectedTour.price} {selectedTour.currency})</span>
                  <span>{selectedTour.price * numGuests} {selectedTour.currency}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-display font-bold text-sm text-slate-200">
                    {tr("Total Amount to Pay:", "Montant Total :", "Monto Total:")}
                  </span>
                  <span className="font-display text-2xl font-black text-amber-400">
                    {selectedTour.price * numGuests} {selectedTour.currency}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-display font-extrabold text-sm uppercase tracking-wider transition-all duration-300 shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{tr("Processing Booking…", "Envoi en cours…", "Procesando reserva…")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      {tr(
                        `Confirm Booking (${selectedTour.price * numGuests} ${selectedTour.currency})`,
                        `Confirmer la réservation (${selectedTour.price * numGuests} ${selectedTour.currency})`,
                        `Confirmar reserva (${selectedTour.price * numGuests} ${selectedTour.currency})`
                      )}
                    </span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-gray-500 font-medium">
                {tr(
                  "You will receive an automatic confirmation receipt with your reservation code.",
                  "Vous recevrez automatiquement un reçu de confirmation avec votre numéro de réservation.",
                  "Recibirás un recibo de confirmación automático con tu número de reserva."
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </TourismShell>
  );
}

function TourismShell({
  children,
  lang,
  setLang,
}: {
  children: React.ReactNode;
  lang: Language;
  setLang: (l: Language) => void;
}) {
  const flags = [
    { code: "en" as const, label: "EN", flag: "https://flagcdn.com/us.svg" },
    { code: "fr" as const, label: "FR", flag: "https://flagcdn.com/fr.svg" },
    { code: "es" as const, label: "ES", flag: "https://flagcdn.com/es.svg" },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Top Banner with Moroccan Royal Blue Aesthetic */}
      <header className="w-full bg-[#0d1a3d] bg-gradient-to-r from-[#09132e] via-[#10204d] to-[#1a3275] text-white py-7 px-4 sm:px-6 shadow-md border-b border-blue-900/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-amber-400 text-[11px] font-extrabold tracking-[0.35em] uppercase">
              Tangier International
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white mt-0.5">
              LATIN FESTIVAL 2027
            </h2>
            <p className="text-blue-200 text-xs mt-1 flex items-center justify-center sm:justify-start gap-2">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              January 07–11, 2027 · Kenzi Solazur Hotel, Tangier
            </p>
          </div>

          {/* Lang switcher & Nav links */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-full border border-white/20">
              {flags.map((f) => (
                <button
                  key={f.code}
                  type="button"
                  onClick={() => setLang(f.code)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    lang === f.code
                      ? "bg-amber-400 text-slate-950 shadow-xs"
                      : "text-blue-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <img src={f.flag} alt={f.label} className="w-3.5 h-3.5 rounded-full object-cover" />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>

            <Link
              to="/tourism"
              className="hidden md:inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white transition px-3 py-1.5 rounded-full border border-blue-400/30 hover:border-blue-400/70"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Full Tourism Guide</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">{children}</main>

      {/* Footer */}
      <footer className="w-full bg-[#0d1a3d] text-slate-400 py-8 px-4 border-t border-blue-950 text-center text-xs space-y-2">
        <p className="text-slate-300 font-semibold">
          Tangier International Latin Festival — Cultural Excursions & Guided Tours
        </p>
        <p className="text-slate-500">
          Kenzi Solazur Hotel, Tangier, Morocco · January 07–11, 2027
        </p>
      </footer>
    </div>
  );
}
