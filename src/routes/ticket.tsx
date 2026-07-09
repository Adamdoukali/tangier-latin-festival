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
          cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
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
          cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
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
          cls: "border-amber-500/40 bg-amber-500/10 text-amber-300",
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
          cls: "border-red-500/40 bg-red-500/10 text-red-300",
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
    <div className="min-h-screen bg-zinc-950 px-4 py-10 notranslate" translate="no">
      <div className="max-w-md mx-auto">
        {/* Branding */}
        <div className="text-center mb-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[10px] tracking-[0.25em] uppercase text-amber-400">
            Tangier International Latin Festival
          </p>
          <p className="mt-3 text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-amber-500/60" />
            January 07–11, 2027
            <span className="text-zinc-700">·</span>
            <MapPin className="h-3.5 w-3.5 text-amber-500/60" />
            Kenzi Solazur, Tangier
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-zinc-600 py-16">
            {tr("Checking ticket…", "Vérification du billet…", "Verificando entrada…")}
          </p>
        ) : !booking ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <h1 className="font-display text-xl text-red-300">
              {tr("Ticket Not Found", "Billet introuvable", "Entrada no encontrada")}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
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
            <div className="mt-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-6">
              {qr && (
                <div className="flex justify-center mb-5">
                  <div className="rounded-xl border border-zinc-700/40 bg-zinc-100 p-3">
                    <img src={qr} alt="Ticket QR" className="w-52 h-52" />
                  </div>
                </div>
              )}
              <div className="text-center">
                <code className="inline-flex items-center gap-1.5 text-sm font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
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
                    <dt className="text-zinc-500 shrink-0">{k}</dt>
                    <dd className="text-zinc-200 text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition">
            ← tangierlatinfestival.com
          </Link>
        </div>
      </div>
    </div>
  );
}
