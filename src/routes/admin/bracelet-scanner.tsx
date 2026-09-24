import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Watch,
  ScanLine,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  User,
  Users,
  Building2,
  Ticket,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Check,
  Clock,
  ArrowRight,
  ShieldCheck,
  Gift,
  Mic2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  bookingPeopleCount,
  parseGuestDetails,
  resolveTicketOrInvite,
  extractScanCode,
  guestBracelets,
  guestBraceletsGiven,
  setGuestBraceletGiven,
  packRoomCategory,
  isArtistInviteOrBooking,
  addBooking,
  markInviteUsed,
  type Booking,
  type Pack,
  type BraceletCategory,
  type ScanValidationResult,
} from "@/lib/admin-store";
import { getCurrentAdmin } from "@/lib/auth-store";
import { translateDynamicText } from "@/lib/translations";

export const Route = createFileRoute("/admin/bracelet-scanner")({
  component: AdminBraceletScannerPage,
});

// Sound feedback for bracelet hand-out
function playChime(type: "success" | "warning" | "error") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "success") {
      const now = ctx.currentTime;
      const notes = [880, 1108.73, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    } else if (type === "warning") {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.3);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // ignore
  }
}

const BRACELET_STYLES: Record<
  BraceletCategory,
  {
    label: string;
    icon: typeof Mic2;
    cardBorder: string;
    cardBg: string;
    badgeCls: string;
    textColor: string;
    desc: string;
    hasPhysicalBracelet: boolean;
  }
> = {
  artist: {
    label: "Bracelet Artiste",
    icon: Mic2,
    cardBorder: "border-fuchsia-300",
    cardBg: "bg-fuchsia-50",
    badgeCls: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
    textColor: "text-fuchsia-700",
    desc: "Accès VIP scène, ateliers masterclass & coulisses",
    hasPhysicalBracelet: true,
  },
  hotel: {
    label: "Bracelet Hôtel",
    icon: Building2,
    cardBorder: "border-blue-300",
    cardBg: "bg-blue-50",
    badgeCls: "bg-blue-100 text-blue-800 border-blue-300",
    textColor: "text-blue-700",
    desc: "Hébergement Kenzi Solazur, petit-déjeuner & soirées",
    hasPhysicalBracelet: true,
  },
  fullpass: {
    label: "Bracelet Full Pass",
    icon: Ticket,
    cardBorder: "border-emerald-300",
    cardBg: "bg-emerald-50",
    badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-300",
    textColor: "text-emerald-700",
    desc: "Accès complet à tous les workshops et soirées",
    hasPhysicalBracelet: true,
  },
  none: {
    label: "Aucun Bracelet Requis",
    icon: ShieldCheck,
    cardBorder: "border-slate-200",
    cardBg: "bg-slate-50",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    textColor: "text-slate-600",
    desc: "Cette invitation / ce billet ne comprend pas de bracelet physique",
    hasPhysicalBracelet: false,
  },
};

function AdminBraceletScannerPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & input
  const [manualCode, setManualCode] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<"all" | "pending" | "given">("all");

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);

  // Active validation modal
  const [activeResult, setActiveResult] = useState<ScanValidationResult | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const scannerRef = useRef<any>(null);
  const scannerContainerId = "tlf-bracelet-reader";
  const currentAdmin = getCurrentAdmin();

  const reloadData = useCallback(async () => {
    const [b, p] = await Promise.all([getBookings(), getPacks()]);
    setBookings(b);
    setPacks(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Keep modal synced
  useEffect(() => {
    if (activeResult?.type === "ticket") {
      const refreshed = bookings.find((b) => b.id === activeResult.booking.id);
      if (refreshed) {
        setActiveResult((prev) => (prev ? { ...prev, booking: refreshed } : null));
      }
    }
  }, [bookings]);

  // ─── Camera Scanner ────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleCodeScanned(decodedText);
        },
        () => {
          // frame error
        },
      );

      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera start error:", err);
      setCameraError(
        err?.message?.includes("Permission")
          ? "Accès caméra refusé. Veuillez autoriser la caméra dans votre navigateur."
          : "Impossible de démarrer la caméra. Vérifiez les permissions de votre appareil.",
      );
      setCameraActive(false);
    }
  }, [facingMode]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const flipCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (cameraActive) {
      await stopCamera();
      setTimeout(() => {
        startCamera();
      }, 200);
    }
  };

  // ─── Code Resolution ───────────────────────────────────────────────
  const handleCodeScanned = async (rawCode: string) => {
    if (!rawCode || processing) return;
    const clean = extractScanCode(rawCode);
    if (!clean) return;

    const result = await resolveTicketOrInvite(clean);
    if (result) {
      if (soundEnabled) playChime("success");
      setActiveResult(result);
      setNotFoundCode(null);
      setStatusMessage(null);
    } else {
      if (soundEnabled) playChime("error");
      setNotFoundCode(clean);
      setActiveResult(null);
      setStatusMessage({
        type: "error",
        text: `Aucun billet ou invitation trouvé pour le code "${clean}".`,
      });
    }
  };

  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    await handleCodeScanned(manualCode.trim());
  };

  // ─── Hand-out Bracelet Actions ─────────────────────────────────────
  const handleToggleBracelet = async (guestIndex: number, currentGiven: boolean) => {
    if (!activeResult || activeResult.type !== "ticket") return;
    try {
      await setGuestBraceletGiven(activeResult.booking, guestIndex, !currentGiven);
      if (soundEnabled && !currentGiven) playChime("success");
      const refreshed = await getBookings();
      setBookings(refreshed);
      const updated = refreshed.find((b) => b.id === activeResult.booking.id);
      if (updated) {
        setActiveResult({ ...activeResult, booking: updated });
      }
      setStatusMessage({
        type: "success",
        text: !currentGiven
          ? `Bracelet remis pour le participant ${guestIndex + 1} !`
          : `Remise du bracelet annulée.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Erreur bracelet" });
    }
  };

  const handleGiveAllBracelets = async () => {
    if (!activeResult || activeResult.type !== "ticket") return;
    const b = activeResult.booking;
    const totalGuests = Math.max(bookingPeopleCount(b, packs), b.numPeople || 1);
    setProcessing(true);
    try {
      for (let i = 0; i < totalGuests; i++) {
        await setGuestBraceletGiven(b, i, true);
      }
      if (soundEnabled) playChime("success");
      const refreshed = await getBookings();
      setBookings(refreshed);
      const updated = refreshed.find((item) => item.id === b.id);
      if (updated) {
        setActiveResult({ ...activeResult, booking: updated });
      }
      setStatusMessage({
        type: "success",
        text: "Tous les bracelets de ce pass ont été marqués comme remis !",
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Erreur remise bracelets" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRedeemArtistInvite = async () => {
    if (!activeResult || activeResult.type !== "invite") return;
    setProcessing(true);
    try {
      const inv = activeResult.invite;
      const artistName = inv.assignee || "Artiste Invité";
      const newBooking = await addBooking({
        packId: inv.packId,
        packName: inv.packName,
        customerName: artistName,
        email: `${inv.code.toLowerCase()}@tangierlatinfestival.com`,
        phone: "",
        country: "Morocco",
        numPeople: 1,
        danceLevel: "All levels",
        notes: `Artist Invite ${inv.code} redeemed at Bracelet Station`,
        status: "checked-in",
        source: "invite",
        inviteId: inv.id,
        inviteCode: inv.code,
        bracelet: JSON.stringify(["artist"]),
        braceletGiven: JSON.stringify([true]),
        guestDetails: JSON.stringify([
          {
            firstName: artistName,
            lastName: "",
            email: "",
            phone: "",
            checkedIn: true,
            checkedInAt: new Date().toISOString(),
          },
        ]),
      });
      await markInviteUsed(inv.id);
      if (soundEnabled) playChime("success");
      await reloadData();
      setActiveResult({
        type: "ticket",
        booking: newBooking,
        invite: inv,
        matchedBy: "invite_redeemed",
      });
      setStatusMessage({
        type: "success",
        text: `Bracelet Artiste remis avec succès pour ${artistName} !`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Erreur enregistrement artiste" });
    } finally {
      setProcessing(false);
    }
  };

  // ─── Statistics ────────────────────────────────────────────────────
  const confirmedBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "checked-in",
  );

  let totalPhysicalBraceletsNeeded = 0;
  let totalPhysicalBraceletsGiven = 0;
  let artistBraceletsCount = 0;
  let hotelBraceletsCount = 0;
  let fullpassBraceletsCount = 0;

  for (const b of confirmedBookings) {
    const brs = guestBracelets(b, packs);
    const given = guestBraceletsGiven(b);
    brs.forEach((br, i) => {
      if (br !== "none") {
        totalPhysicalBraceletsNeeded++;
        if (given[i]) totalPhysicalBraceletsGiven++;
        if (br === "artist") artistBraceletsCount++;
        if (br === "hotel") hotelBraceletsCount++;
        if (br === "fullpass") fullpassBraceletsCount++;
      }
    });
  }

  // Filter directory
  const filteredBookings = confirmedBookings.filter((b) => {
    const brs = guestBracelets(b, packs);
    const given = guestBraceletsGiven(b);
    const hasAnyPhysical = brs.some((br) => br !== "none");
    if (!hasAnyPhysical) return false;

    const allGiven = brs.every((br, i) => br === "none" || Boolean(given[i]));
    if (tableFilter === "pending" && allGiven) return false;
    if (tableFilter === "given" && !allGiven) return false;

    if (!tableSearch.trim()) return true;
    const q = tableSearch.trim().toLowerCase();
    return (
      b.ticketCode.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      (b.roomNumber && b.roomNumber.toLowerCase().includes(q)) ||
      b.packName.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className={`p-4 md:p-8 space-y-6 ${fullScreen ? "fixed inset-0 z-50 bg-slate-900 overflow-y-auto" : ""}`}
    >
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-fuchsia-950 via-[#1a134d] to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-fuchsia-500/20">
        <div>
          <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-semibold uppercase tracking-widest">
            <Watch className="h-4 w-4" />
            Station Dédiée · Distribution des Bracelets
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 text-white">
            Scanner des Bracelets Festival
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Scannez les billets pour délivrer immédiatement les bracelets physiques (Artistes, Hôtel
            Kenzi, Full Pass).
          </p>

          <div className="flex items-center gap-3 mt-3">
            <Link
              to="/admin/scanner"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition"
            >
              <ScanLine className="h-3.5 w-3.5 text-amber-400" />
              Basculer vers Check-in Entrées
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              soundEnabled
                ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
            title={soundEnabled ? "Sons activés" : "Sons coupés"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "Audio ON" : "Muet"}</span>
          </button>

          <button
            type="button"
            onClick={() => setFullScreen(!fullScreen)}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title={fullScreen ? "Quitter plein écran" : "Mode plein écran"}
          >
            {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{fullScreen ? "Réduire" : "Plein écran"}</span>
          </button>
        </div>
      </div>

      {/* ─── Statistics Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Bracelets Donnés
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {totalPhysicalBraceletsGiven}
            </span>
            <span className="text-xs text-slate-500">/ {totalPhysicalBraceletsNeeded} remis</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fuchsia-700 uppercase tracking-wide">
              Bracelets Artistes
            </span>
            <Mic2 className="h-4 w-4 text-fuchsia-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-fuchsia-700">{artistBraceletsCount}</span>
            <span className="text-xs text-fuchsia-600 font-medium">artistes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
              Bracelets Hôtel
            </span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{hotelBraceletsCount}</span>
            <span className="text-xs text-blue-600 font-medium">chambres</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Bracelets Full Pass
            </span>
            <Ticket className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{fullpassBraceletsCount}</span>
            <span className="text-xs text-emerald-600 font-medium">participants</span>
          </div>
        </div>
      </div>

      {/* ─── Scanner View & Manual Lookup ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Camera (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-fuchsia-600" />
              <h2 className="font-bold text-slate-900 text-base">Caméra Scanner de Bracelets</h2>
            </div>
            <div className="flex items-center gap-2">
              {cameraActive && (
                <button
                  type="button"
                  onClick={flipCamera}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Changer caméra
                </button>
              )}
              <button
                type="button"
                onClick={toggleCamera}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  cameraActive
                    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    : "bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow hover:brightness-105"
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="h-3.5 w-3.5" /> Arrêter la caméra
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" /> Démarrer la caméra
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center min-h-[300px] border border-slate-800">
            <div id={scannerContainerId} className="w-full max-w-md" />

            {!cameraActive && (
              <div className="p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-fuchsia-400">
                  <Watch className="h-8 w-8" />
                </div>
                <h3 className="text-white font-medium text-sm">Scanner Bracelets Inactif</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Présentez le QR code devant la caméra pour afficher immédiatement le bracelet à
                  donner.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-semibold text-xs shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  Activer la caméra
                </button>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-x-4 bottom-4 p-3 rounded-lg bg-red-500/90 text-white text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Lookup (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-fuchsia-600" />
            <h2 className="font-bold text-slate-900 text-base">Recherche Manuelle</h2>
          </div>

          <form onSubmit={handleManualSearch} className="space-y-3">
            <div>
              <label
                htmlFor="manual-bracelet-code"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Code billet ou nom du participant
              </label>
              <div className="relative">
                <input
                  id="manual-bracelet-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: TLF-ABC12 ou nom..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 font-mono uppercase placeholder:normal-case placeholder:font-sans"
                  autoComplete="off"
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={!manualCode.trim() || processing}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-700 to-indigo-700 text-white font-semibold text-sm shadow hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Watch className="h-4 w-4 text-fuchsia-200" />
              Afficher les Bracelets du Billet
            </button>
          </form>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          )}

          {notFoundCode && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <XCircle className="h-4 w-4 text-red-600" />
                Code Invalide ou Introuvable
              </div>
              <p className="text-xs text-red-700">
                Le code <strong className="font-mono">{notFoundCode}</strong> ne correspond à aucun
                billet actif.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── DEDICATED BRACELET MODAL ─────────────────────────────────── */}
      {activeResult && activeResult.type === "ticket" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-600">
                  <Watch className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Remise des Bracelets · Billet {activeResult.booking.ticketCode}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeResult.booking.customerName} ·{" "}
                    {translateDynamicText(activeResult.booking.packName, "fr")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveResult(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            {(() => {
              const b = activeResult.booking;
              const ov = parseGuestDetails(b.guestDetails);
              const totalGuests = Math.max(bookingPeopleCount(b, packs), b.numPeople || 1);
              const names = b.customerName
                .split(/\s*&\s*/)
                .map((s) => s.trim())
                .filter(Boolean);
              const bracelets = guestBracelets(b, packs);
              const braceletsGiven = guestBraceletsGiven(b);
              const allGiven = bracelets.every((br, i) => br === "none" || braceletsGiven[i]);
              const hasPhysical = bracelets.some((br) => br !== "none");

              return (
                <div className="space-y-5">
                  {/* Room alert if any */}
                  {b.roomNumber && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        Chambre attribuée: Chambre {b.roomNumber} ({b.roomType || "Standard"})
                      </span>
                      <span className="text-blue-700 font-medium">Hôtel Kenzi Solazur</span>
                    </div>
                  )}

                  {!hasPhysical ? (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-base">
                        Aucun Bracelet Requis pour ce Billet / Invitation
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Cette personne dispose d'un accès sans bracelet physique (invitation simple,
                        accès sur liste ou formule sans bracelet). Seuls les artistes et packs hôtel
                        / full pass disposent d'un bracelet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Watch className="h-4 w-4 text-fuchsia-600" />
                          Bracelets à délivrer ({totalGuests})
                        </h4>

                        {!allGiven && (
                          <button
                            type="button"
                            onClick={handleGiveAllBracelets}
                            disabled={processing}
                            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 shadow transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Gift className="h-3.5 w-3.5" />
                            Remettre tous les bracelets
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {Array.from({ length: totalGuests }, (_, i) => {
                          const guestOverride = ov[i] || {};
                          const fallbackName =
                            names[i] || (i === 0 ? b.customerName : `Participant ${i + 1}`);
                          const displayName =
                            `${guestOverride.firstName || ""} ${guestOverride.lastName || ""}`.trim() ||
                            fallbackName;
                          const braceletCat = bracelets[i] || "none";
                          const style = BRACELET_STYLES[braceletCat];
                          const isGiven = braceletsGiven[i] ?? false;

                          if (braceletCat === "none") {
                            return (
                              <div
                                key={i}
                                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <strong className="text-slate-800">
                                    Invité {i + 1}: {displayName}
                                  </strong>
                                  <div className="text-[11px] text-slate-500">
                                    Pas de bracelet requis
                                  </div>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                                  Sans bracelet
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={i}
                              className={`p-4 rounded-xl border transition-all ${
                                isGiven
                                  ? "bg-emerald-50/70 border-emerald-300"
                                  : `${style.cardBg} ${style.cardBorder}`
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current text-slate-700">
                                      Participant {i + 1}
                                    </span>
                                    <h5 className="font-bold text-slate-900 text-sm">
                                      {displayName}
                                    </h5>
                                  </div>

                                  <div className="flex items-center gap-2 mt-1">
                                    <style.icon className={`h-4 w-4 ${style.textColor}`} />
                                    <strong className={`text-base font-bold ${style.textColor}`}>
                                      {style.label}
                                    </strong>
                                    <span className="text-xs text-slate-500">({style.desc})</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleToggleBracelet(i, isGiven)}
                                  disabled={processing}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 self-end sm:self-center shrink-0 ${
                                    isGiven
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                                  }`}
                                >
                                  {isGiven ? (
                                    <>
                                      <Check className="h-4 w-4" />
                                      Bracelet Remis ✓
                                    </>
                                  ) : (
                                    <>
                                      <Gift className="h-4 w-4 text-amber-300" />
                                      Remettre ce bracelet
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      Réf Billet: {b.id.slice(0, 8)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveResult(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                    >
                      Terminer & Reprendre le scan
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── INVITE MODAL (Differentiates Artist vs Non-artist Invites) ─ */}
      {activeResult && activeResult.type === "invite" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isArtistInviteOrBooking(activeResult.invite, packs)
                      ? "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  {isArtistInviteOrBooking(activeResult.invite, packs) ? (
                    <Mic2 className="h-6 w-6" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Invitation {activeResult.invite.code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeResult.invite.assignee || "Invitation festival"} ·{" "}
                    {translateDynamicText(activeResult.invite.packName, "fr")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveResult(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* CASE A: ARTIST INVITE -> entitled to an Artist Bracelet! */}
            {isArtistInviteOrBooking(activeResult.invite, packs) ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Mic2 className="h-5 w-5 text-fuchsia-600" />
                    Invitation Artiste Confirmée — Bracelet Artiste
                  </div>
                  <p className="text-xs text-fuchsia-800 leading-relaxed">
                    Cet invité est un artiste officiel du festival. Il a droit à un{" "}
                    <strong>Bracelet Artiste (Fuchsia)</strong> pour l'accès VIP scène et coulisses.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-fuchsia-300 bg-fuchsia-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700 block">
                      Bracelet à remettre :
                    </span>
                    <strong className="text-base text-fuchsia-950 font-bold">
                      Bracelet Artiste VIP
                    </strong>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Artiste : {activeResult.invite.assignee || "Artiste invité"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRedeemArtistInvite}
                    disabled={processing}
                    className="px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Gift className="h-4 w-4 text-amber-300" />
                    Remettre Bracelet Artiste
                  </button>
                </div>
              </div>
            ) : (
              /* CASE B: STANDARD INVITE -> NO BRACELET! */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    Aucun Bracelet Requis pour cette Invitation
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Rappel :</strong> Toutes les invitations n'ont pas de bracelet. Seuls certains
                    artistes reçoivent un bracelet physique.
                  </p>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed bg-amber-100/60 p-2.5 rounded-lg border border-amber-200">
                    Cette invitation est une <strong>invitation standard sans bracelet</strong>. Ne lui
                    remettez aucun bracelet physique.
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Veuillez inviter la personne à se présenter au guichet <strong>Check-in Entrées</strong>{" "}
                    pour scanner son pass et valider son accès direct au festival.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Type d'accès :</span>
                    <strong className="text-sm text-slate-800 font-semibold">
                      Accès Direct Check-in (Sans Bracelet)
                    </strong>
                  </div>
                  <Link
                    to="/admin/scanner"
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    Aller au Check-in Entrées →
                  </Link>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Fermer & Reprendre le scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Directory Table (Bracelets only) ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Watch className="h-5 w-5 text-fuchsia-600" />
              Répertoire des bracelets à distribuer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Liste filtrée des participants éligibles à un bracelet physique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Rechercher nom, code, chambre..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-fuchsia-500"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setTableFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  tableFilter === "all"
                    ? "bg-white text-slate-900 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tous ({filteredBookings.length})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter("pending")}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  tableFilter === "pending"
                    ? "bg-fuchsia-600 text-white font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                À donner
              </button>
              <button
                type="button"
                onClick={() => setTableFilter("given")}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  tableFilter === "given"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Remis
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Code Billet</th>
                <th className="px-5 py-3">Participant</th>
                <th className="px-5 py-3">Chambre</th>
                <th className="px-5 py-3">Bracelets Requis</th>
                <th className="px-5 py-3">Statut Remise</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Chargement...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Aucun billet correspondant.
                  </td>
                </tr>
              ) : (
                filteredBookings.slice(0, 100).map((b) => {
                  const brs = guestBracelets(b, packs);
                  const given = guestBraceletsGiven(b);
                  const totalGuests = Math.max(bookingPeopleCount(b, packs), b.numPeople || 1);
                  const givenCount = given.filter(Boolean).length;
                  const firstBracelet = brs.find((br) => br !== "none") || brs[0];

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-fuchsia-700">
                        {b.ticketCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{b.customerName}</div>
                        <div className="text-[11px] text-slate-500">
                          {translateDynamicText(b.packName, "fr")}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {b.roomNumber ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            <Building2 className="h-3 w-3" />
                            Ch. {b.roomNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sans chambre</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded border border-fuchsia-200">
                          <Watch className="h-3 w-3" />
                          {BRACELET_STYLES[firstBracelet]?.label || firstBracelet}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {givenCount === totalGuests ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                            <Check className="h-3 w-3" />
                            {givenCount}/{totalGuests} Remis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                            <Clock className="h-3 w-3" />
                            {givenCount}/{totalGuests} Remis
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveResult({
                              type: "ticket",
                              booking: b,
                              matchedBy: "booking_id",
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-fuchsia-700 text-white hover:bg-fuchsia-800 transition cursor-pointer"
                        >
                          Délivrer
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
