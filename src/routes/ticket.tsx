import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  Calendar,
  MapPin,
  Ticket as TicketIcon,
} from "lucide-react";
import { getBookingByTicketCode, ticketUrl, type Booking } from "@/lib/admin-store";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/ticket")({
  head: () => ({
    meta: [
      { title: "Your Ticket — Tangier International Latin Festival 2027" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketPage,
});

function TicketPage() {
  const { lang } = useLanguage();
  const tr = (en: string, fr: string, es: string) =>
    lang === "fr" ? fr : lang === "es" ? es : en;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code") ?? "";
    if (!code) {
      setLoading(false);
      return;
    }
    getBookingByTicketCode(code).then((b) => {
      setBooking(b ?? null);
      setLoading(false);
      if (b && (b.status === "confirmed" || b.status === "checked-in")) {
        QRCode.toDataURL(ticketUrl(b.ticketCode), {
          width: 280,
          margin: 2,
          color: { dark: "#18181b", light: "#fafafa" },
        })
          .then(setQr)
          .catch(() => setQr(""));
      }
    });
  }, []);

  const banner = (() => {
    if (loading || !booking) return null;
    switch (booking.status) {
      case "confirmed":
        return {
          icon: CheckCircle2,
          cls: "border-emerald-300 bg-emerald-50 text-emerald-700",
          title: tr("Valid Ticket", "Billet valide", "Entrada válida"),
          text: tr(
            "This booking is confirmed. Show this page (or the QR below) at check-in.",
            "Cette réservation est confirmée. Présentez cette page (ou le QR ci-dessous) à l'entrée.",
            "Esta reserva está confirmada. Muestra esta página (o el QR de abajo) en la entrada."
          ),
        };
      case "checked-in":
        return {
          icon: UserCheck,
          cls: "border-cyan-300 bg-cyan-50 text-cyan-700",
          title: tr("Already Checked In", "Déjà enregistré", "Ya registrado"),
          text: tr(
            "This ticket has already been used to enter the festival.",
            "Ce billet a déjà été utilisé pour entrer au festival.",
            "Esta entrada ya se utilizó para entrar al festival."
          ),
        };
      case "pending":
        return {
          icon: Clock,
          cls: "border-amber-300 bg-amber-50 text-amber-700",
          title: tr("Not Confirmed Yet", "Pas encore confirmé", "Aún no confirmada"),
          text: tr(
            "This booking is still pending — our team confirms within 24 hours. This page will become your ticket once confirmed.",
            "Cette réservation est encore en attente — notre équipe confirme sous 24 heures. Cette page deviendra votre billet une fois confirmée.",
            "Esta reserva sigue pendiente — nuestro equipo confirma en 24 horas. Esta página será tu entrada cuando esté confirmada."
          ),
        };
      default: // declined
        return {
          icon: XCircle,
          cls: "border-red-300 bg-red-50 text-red-700",
          title: tr("Ticket Not Valid", "Billet non valide", "Entrada no válida"),
          text: tr(
            "This booking was not confirmed. Contact us if you think this is a mistake.",
            "Cette réservation n'a pas été confirmée. Contactez-nous si vous pensez qu'il s'agit d'une erreur.",
            "Esta reserva no fue confirmada. Contáctanos si crees que es un error."
          ),
        };
    }
  })();

  return (
    <div
      className="min-h-screen bg-slate-100 notranslate"
      translate="no"
      style={{ fontFamily: "'Poppins','Segoe UI',system-ui,sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');`}</style>
      {/* Banner */}
      <div className="w-full bg-[#13234d] bg-gradient-to-r from-[#0d1a3d] via-[#13234d] to-[#1d3a7a] py-8 px-6 text-center shadow-md mb-8">
        <p className="text-amber-400 text-xs tracking-[0.4em] uppercase">
          Tangier International
        </p>
        <h1 className="mt-1 text-white text-3xl font-bold tracking-wide">LATIN FESTIVAL</h1>
        <p className="mt-2 text-slate-300 text-sm flex items-center justify-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-amber-400/80" />
          January 07–11, 2027
          <span className="text-slate-500">·</span>
          <MapPin className="h-3.5 w-3.5 text-amber-400/80" />
          Kenzi Solazur, Tangier
        </p>
      </div>
      <div className="max-w-md mx-auto px-4 pb-10">
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-16">
            {tr("Checking ticket…", "Vérification du billet…", "Verificando entrada…")}
          </p>
        ) : !booking ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center">
            <XCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
            <h1 className="font-display text-xl text-red-700">
              {tr("Ticket Not Found", "Billet introuvable", "Entrada no encontrada")}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {tr(
                "This code doesn't match any booking in our system.",
                "Ce code ne correspond à aucune réservation dans notre système.",
                "Este código no corresponde a ninguna reserva en nuestro sistema."
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Status banner */}
            {banner && (
              <div className={`rounded-2xl border p-5 text-center ${banner.cls}`}>
                <banner.icon className="h-10 w-10 mx-auto mb-2" />
                <h1 className="font-display text-xl">{banner.title}</h1>
                <p className="mt-1.5 text-sm opacity-90">{banner.text}</p>
              </div>
            )}

            {/* Ticket card */}
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
              {qr && (
                <div className="flex justify-center mb-5">
                  <div className="rounded-xl border border-gray-200 bg-zinc-100 p-3">
                    <img src={qr} alt="Ticket QR" className="w-52 h-52" />
                  </div>
                </div>
              )}
              <div className="text-center">
                <code className="inline-flex items-center gap-1.5 text-sm font-mono text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                  <TicketIcon className="h-3.5 w-3.5" />
                  {booking.ticketCode}
                </code>
              </div>
              <dl className="mt-5 space-y-2.5 text-sm">
                {[
                  [tr("Name", "Nom", "Nombre"), booking.customerName],
                  [tr("Pack", "Pack", "Pack"), booking.packName],
                  [
                    tr("Guests", "Personnes", "Personas"),
                    String(booking.numPeople || 1),
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-gray-500 shrink-0">{k}</dt>
                    <dd className="text-gray-800 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
            ← tangierlatinfestival.com
          </Link>
        </div>
      </div>
    </div>
  );
}
