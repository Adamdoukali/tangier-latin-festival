import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ScanLine,
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  User,
  Users,
  Building2,
  Ticket,
  Mail,
  Phone,
  Globe,
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Check,
  Clock,
  ArrowRight,
  ShieldCheck,
  Tag,
  Watch,
  Flame,
  Bus,
  MapPin,
  Calendar,
  Gift,
  Mic2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getBookings,
  getPacks,
  getCollaborators,
  getInvites,
  bookingPeopleCount,
  parseGuestDetails,
  checkInBookingGuest,
  undoCheckInBookingGuest,
  checkInEntireBooking,
  resolveTicketOrInvite,
  extractScanCode,
  guestBracelets,
  guestBraceletsGiven,
  setGuestBraceletGiven,
  packLabel,
  packRoomCategory,
  addBooking,
  markInviteUsed,
  type Booking,
  type Pack,
  type Collaborator,
  type Invite,
  type GuestDetail,
  type BraceletCategory,
  type ScanValidationResult,
} from "@/lib/admin-store";
import { getCurrentAdmin } from "@/lib/auth-store";
import { translateDynamicText } from "@/lib/translations";

export const Route = createFileRoute("/admin/scanner")({
  component: AdminScannerPage,
});

// ─── Sound Feedback ──────────────────────────────────────────────────
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
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);

      if (navigator.vibrate) navigator.vibrate(100);
    } else if (type === "warning") {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(440, now + 0.12); // A4

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
  }
> = {
  artist: {
    label: "Bracelet Artiste",
    icon: Mic2,
    cardBorder: "border-fuchsia-300",
    cardBg: "bg-fuchsia-50/80",
    badgeCls: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    textColor: "text-fuchsia-700",
    desc: "Accès VIP scène, ateliers masterclass & coulisses",
  },
  hotel: {
    label: "Bracelet Hôtel",
    icon: Building2,
    cardBorder: "border-blue-300",
    cardBg: "bg-blue-50/80",
    badgeCls: "bg-blue-100 text-blue-800 border-blue-200",
    textColor: "text-blue-700",
    desc: "Hébergement Kenzi Solazur, petit-déjeuner & soirées",
  },
  fullpass: {
    label: "Bracelet Full Pass",
    icon: Ticket,
    cardBorder: "border-emerald-300",
    cardBg: "bg-emerald-50/80",
    badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-200",
    textColor: "text-emerald-700",
    desc: "Accès complet à tous les workshops et soirées",
  },
  none: {
    label: "Aucun Bracelet Requis",
    icon: ShieldCheck,
    cardBorder: "border-slate-200",
    cardBg: "bg-slate-50",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    textColor: "text-slate-600",
    desc: "Cette invitation / ce billet ne comprend pas de bracelet physique",
  },
};

function AdminScannerPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle for bracelet controls: when FALSE, it's pure normal check-in. When TRUE, shows bracelet status.
  const [showBracelets, setShowBracelets] = useState(false);

  // Search & input
  const [manualCode, setManualCode] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<"all" | "confirmed" | "checked-in" | "pending">(
    "all",
  );

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fullScreen, setFullScreen] = useState(false);

  // Active validation modal
  const [activeResult, setActiveResult] = useState<ScanValidationResult | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Missing info inline edit form for a guest
  const [editingGuestIndex, setEditingGuestIndex] = useState<number | null>(null);
  const [guestEditForm, setGuestEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "Morocco",
    origin: "morocco" as "morocco" | "international",
  });

  // Door invite redemption form
  const [inviteRedeemForm, setInviteRedeemForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "Morocco",
  });

  const scannerRef = useRef<any>(null);
  const scannerContainerId = "tlf-checkin-reader";
  const currentAdmin = getCurrentAdmin();

  const reloadData = useCallback(async () => {
    const [b, p, c, inv] = await Promise.all([
      getBookings(),
      getPacks(),
      getCollaborators(),
      getInvites(),
    ]);
    setBookings(b);
    setPacks(p);
    setCollaborators(c);
    setInvites(inv);
    setLoading(false);
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Keep modal booking synced when background bookings change
  useEffect(() => {
    if (activeResult?.type === "ticket") {
      const refreshed = bookings.find((b) => b.id === activeResult.booking.id);
      if (refreshed) {
        setActiveResult((prev) => (prev ? { ...prev, booking: refreshed } : null));
      }
    }
  }, [bookings]);

  // ─── Camera Scanner Initialization ─────────────────────────────────
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
          // frame error, ignore
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

  // ─── Code Resolution & Handling ─────────────────────────────────────
  const handleCodeScanned = async (rawCode: string) => {
    if (!rawCode || processingAction) return;
    const clean = extractScanCode(rawCode);
    if (!clean) return;

    const result = await resolveTicketOrInvite(clean);
    if (result) {
      if (soundEnabled) {
        if (result.type === "ticket" && result.booking.status === "checked-in") {
          playChime("warning");
        } else {
          playChime("success");
        }
      }
      setActiveResult(result);
      setNotFoundCode(null);
      setEditingGuestIndex(null);
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

  // ─── Check-In Actions ───────────────────────────────────────────────
  const handleCheckInGuest = async (guestIndex: number) => {
    if (!activeResult || activeResult.type !== "ticket") return;
    setProcessingAction(true);
    setStatusMessage(null);
    try {
      const updated = await checkInBookingGuest(activeResult.booking, guestIndex, undefined, packs);
      setActiveResult({ ...activeResult, booking: updated });
      if (soundEnabled) playChime("success");
      setStatusMessage({
        type: "success",
        text: `Participant ${guestIndex + 1} validé avec succès !`,
      });
      await reloadData();
    } catch (err: any) {
      if (soundEnabled) playChime("error");
      setStatusMessage({ type: "error", text: err?.message || "Erreur lors du check-in" });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUndoCheckIn = async (guestIndex: number) => {
    if (!activeResult || activeResult.type !== "ticket") return;
    setProcessingAction(true);
    setStatusMessage(null);
    try {
      const updated = await undoCheckInBookingGuest(activeResult.booking, guestIndex);
      setActiveResult({ ...activeResult, booking: updated });
      if (soundEnabled) playChime("warning");
      setStatusMessage({
        type: "success",
        text: `Check-in annulé pour le participant ${guestIndex + 1}.`,
      });
      await reloadData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Erreur lors de l'annulation" });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCheckInAll = async () => {
    if (!activeResult || activeResult.type !== "ticket") return;
    setProcessingAction(true);
    setStatusMessage(null);
    try {
      const updated = await checkInEntireBooking(activeResult.booking, packs);
      setActiveResult({ ...activeResult, booking: updated });
      if (soundEnabled) playChime("success");
      setStatusMessage({
        type: "success",
        text: "Tous les participants ont été validés avec succès !",
      });
      await reloadData();
    } catch (err: any) {
      if (soundEnabled) playChime("error");
      setStatusMessage({ type: "error", text: err?.message || "Erreur lors de la validation" });
    } finally {
      setProcessingAction(false);
    }
  };

  // Open inline form to complete missing guest info (especially Guest 2 email)
  const openEditGuestForm = (
    guestIndex: number,
    currentGuest: GuestDetail,
    fallbackName: string,
  ) => {
    const parts = fallbackName.split(/\s+/);
    setGuestEditForm({
      firstName: currentGuest.firstName || parts[0] || "",
      lastName: currentGuest.lastName || parts.slice(1).join(" ") || "",
      email: currentGuest.email || "",
      phone: currentGuest.phone || "",
      country: currentGuest.country || "Morocco",
      origin: currentGuest.origin || "morocco",
    });
    setEditingGuestIndex(guestIndex);
  };

  const handleSaveAndCheckInGuest = async (guestIndex: number) => {
    if (!activeResult || activeResult.type !== "ticket") return;
    if (!guestEditForm.email.trim()) {
      setStatusMessage({
        type: "error",
        text: "Veuillez renseigner une adresse email pour ce participant.",
      });
      return;
    }
    setProcessingAction(true);
    setStatusMessage(null);
    try {
      const updated = await checkInBookingGuest(
        activeResult.booking,
        guestIndex,
        {
          firstName: guestEditForm.firstName.trim(),
          lastName: guestEditForm.lastName.trim(),
          email: guestEditForm.email.trim(),
          phone: guestEditForm.phone.trim(),
          country: guestEditForm.country,
          origin: guestEditForm.origin,
        },
        packs,
      );
      setActiveResult({ ...activeResult, booking: updated });
      setEditingGuestIndex(null);
      if (soundEnabled) playChime("success");
      setStatusMessage({
        type: "success",
        text: `Informations enregistrées et participant ${guestIndex + 1} validé !`,
      });
      await reloadData();
    } catch (err: any) {
      if (soundEnabled) playChime("error");
      setStatusMessage({ type: "error", text: err?.message || "Erreur lors de l'enregistrement" });
    } finally {
      setProcessingAction(false);
    }
  };

  // Toggle bracelet given
  const handleToggleBracelet = async (guestIndex: number, currentGiven: boolean) => {
    if (!activeResult || activeResult.type !== "ticket") return;
    try {
      await setGuestBraceletGiven(activeResult.booking, guestIndex, !currentGiven);
      const refreshed = await getBookings();
      setBookings(refreshed);
      const updated = refreshed.find((b) => b.id === activeResult.booking.id);
      if (updated) {
        setActiveResult({ ...activeResult, booking: updated });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Erreur bracelet" });
    }
  };

  // Door redemption for unredeemed invite
  const handleRedeemInviteAtDoor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResult || activeResult.type !== "invite") return;
    if (!inviteRedeemForm.firstName.trim() || !inviteRedeemForm.email.trim()) {
      setStatusMessage({ type: "error", text: "Le prénom et l'email sont obligatoires." });
      return;
    }

    setProcessingAction(true);
    setStatusMessage(null);
    try {
      const fullName =
        `${inviteRedeemForm.firstName.trim()} ${inviteRedeemForm.lastName.trim()}`.trim();
      const inv = activeResult.invite;

      const newBooking = await addBooking({
        packId: inv.packId,
        packName: inv.packName,
        customerName: fullName,
        email: inviteRedeemForm.email.trim(),
        phone: inviteRedeemForm.phone.trim(),
        country: inviteRedeemForm.country || "Morocco",
        numPeople: 1,
        danceLevel: "All levels",
        notes: `Redeemed at door via Invite ${inv.code}`,
        status: "checked-in",
        source: "invite",
        inviteId: inv.id,
        inviteCode: inv.code,
        collaboratorId: inv.collaboratorId || null,
        guestDetails: JSON.stringify([
          {
            firstName: inviteRedeemForm.firstName.trim(),
            lastName: inviteRedeemForm.lastName.trim(),
            email: inviteRedeemForm.email.trim(),
            phone: inviteRedeemForm.phone.trim(),
            country: inviteRedeemForm.country,
            checkedIn: true,
            checkedInAt: new Date().toISOString(),
          },
        ]),
      });

      await markInviteUsed(inv.id);

      if (soundEnabled) playChime("success");
      setActiveResult({
        type: "ticket",
        booking: newBooking,
        invite: inv,
        matchedBy: "invite_redeemed",
      });
      setStatusMessage({
        type: "success",
        text: `Invitation validée et participant ${fullName} enregistré !`,
      });
      await reloadData();
    } catch (err: any) {
      if (soundEnabled) playChime("error");
      setStatusMessage({
        type: "error",
        text: err?.message || "Erreur lors de la validation de l'invitation.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // ─── Directory Statistics ───────────────────────────────────────────
  const confirmedOrCheckedIn = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "checked-in",
  );
  const totalTickets = confirmedOrCheckedIn.length;
  const totalCheckedInTickets = confirmedOrCheckedIn.filter(
    (b) => b.status === "checked-in",
  ).length;
  const totalWaitingTickets = totalTickets - totalCheckedInTickets;

  const totalGuestsCount = confirmedOrCheckedIn.reduce(
    (acc, b) => acc + Math.max(bookingPeopleCount(b, packs), b.numPeople || 1),
    0,
  );
  const totalCheckedInGuests = confirmedOrCheckedIn.reduce((acc, b) => {
    const ov = parseGuestDetails(b.guestDetails);
    const count = Math.max(bookingPeopleCount(b, packs), b.numPeople || 1);
    if (b.status === "checked-in") return acc + count;
    const checked = ov.filter((g) => g.checkedIn).length;
    return acc + checked;
  }, 0);

  // Table filtering
  const filteredBookings = bookings.filter((b) => {
    if (tableFilter === "confirmed" && b.status !== "confirmed") return false;
    if (tableFilter === "checked-in" && b.status !== "checked-in") return false;
    if (tableFilter === "pending" && b.status !== "pending") return false;
    if (!tableSearch.trim()) return true;

    const q = tableSearch.trim().toLowerCase();
    const guestMatch = parseGuestDetails(b.guestDetails).some(
      (g) =>
        (g.firstName && g.firstName.toLowerCase().includes(q)) ||
        (g.lastName && g.lastName.toLowerCase().includes(q)) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        (g.phone && g.phone.includes(q)),
    );

    return (
      b.ticketCode.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      b.packName.toLowerCase().includes(q) ||
      (b.roomNumber && b.roomNumber.toLowerCase().includes(q)) ||
      guestMatch
    );
  });

  return (
    <div
      className={`p-4 md:p-8 space-y-6 ${fullScreen ? "fixed inset-0 z-50 bg-slate-900 overflow-y-auto" : ""}`}
    >
      {/* ─── Header & Top Actions ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1a3d] via-[#13234d] to-[#1d3a7a] text-white p-6 rounded-2xl shadow-md border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-widest">
            <ScanLine className="h-4 w-4" />
            Contrôle d'accès & Check-in
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1 text-white">
            Check-in Entrées Festival
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Validation rapide des billets, gestion des passes 2 personnes, complétion des coordonnées
            et attributions de chambres.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {/* Bracelet Toggle (ON / OFF) */}
            <button
              type="button"
              onClick={() => setShowBracelets(!showBracelets)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                showBracelets
                  ? "bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-400/40"
                  : "bg-white/10 text-slate-300 border-white/15 hover:text-white"
              }`}
              title="Activer ou désactiver l'affichage des bracelets sur cet écran de check-in"
            >
              <Watch className="h-3.5 w-3.5" />
              <span>Affichage Bracelets:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                  showBracelets ? "bg-fuchsia-500 text-white" : "bg-black/30 text-slate-400"
                }`}
              >
                {showBracelets ? "Activé" : "Désactivé (Check-in pur)"}
              </span>
            </button>

            {/* Direct Link to Dedicated Bracelet Scanner Station */}
            <Link
              to="/admin/bracelet-scanner"
              className="px-3 py-1.5 rounded-lg border border-fuchsia-400/30 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-200 transition text-xs font-semibold flex items-center gap-1.5"
            >
              <Watch className="h-3.5 w-3.5 text-fuchsia-300" />
              Ouvrir le Scanner Dédié aux Bracelets →
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              soundEnabled
                ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
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

      {/* ─── Real-time Statistics Grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Billets Confirmés
            </span>
            <Ticket className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalTickets}</span>
            <span className="text-xs text-slate-500">billets</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Participants
            </span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{totalGuestsCount}</span>
            <span className="text-xs text-slate-500">personnes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Déjà Entrés
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{totalCheckedInGuests}</span>
            <span className="text-xs text-emerald-600 font-medium">
              / {totalGuestsCount} personnes
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              En Attente d'Entrée
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">
              {Math.max(0, totalGuestsCount - totalCheckedInGuests)}
            </span>
            <span className="text-xs text-amber-600 font-medium">restants</span>
          </div>
        </div>
      </div>

      {/* ─── Scanner & Manual Lookup Card ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Camera Box (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-amber-500" />
              <h2 className="font-bold text-slate-900 text-base">Caméra & Lecteur QR</h2>
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
                    : "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow hover:brightness-105"
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
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-amber-400">
                  <QrCode className="h-8 w-8" />
                </div>
                <h3 className="text-white font-medium text-sm">Caméra inactive</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Cliquez sur "Démarrer la caméra" pour scanner un QR code ou saisissez le code
                  ci-contre.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold text-xs shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer"
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

        {/* Right / Manual Search Bar (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold text-slate-900 text-base">Recherche & Douchette</h2>
          </div>

          <form onSubmit={handleManualSearch} className="space-y-3">
            <div>
              <label
                htmlFor="manual-code-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Code billet, URL de scan ou nom du client
              </label>
              <div className="relative">
                <input
                  id="manual-code-input"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: TLF-ABC12, URL ou nom..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono uppercase placeholder:normal-case placeholder:font-sans"
                  autoComplete="off"
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Compatible douchette code-barre (appuyez sur Entrée pour valider immédiatement).
              </p>
            </div>

            <button
              type="submit"
              disabled={!manualCode.trim() || processingAction}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#13234d] text-white font-semibold text-sm shadow hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="h-4 w-4 text-amber-400" />
              Vérifier le Billet
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
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <XCircle className="h-4 w-4 text-red-600" />
                Code Invalide ou Introuvable
              </div>
              <p className="text-xs text-red-700">
                Le code <strong className="font-mono">{notFoundCode}</strong> ne correspond à aucun
                billet confirmé ni invitation active dans la base de données.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── TICKET VALIDATION MODAL ─────────────────────────────────── */}
      {activeResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-6">
            {/* Modal Top Nav */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeResult.type === "ticket"
                      ? "Validation du Billet (Check-in)"
                      : "Validation de l'Invitation"}
                  </h3>
                  <p className="text-xs text-slate-500">Tangier Latin Festival 2027</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveResult(null);
                  setStatusMessage(null);
                  setEditingGuestIndex(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ─── CASE 1: TICKET FOUND ─────────────────────────────── */}
            {activeResult.type === "ticket" &&
              (() => {
                const b = activeResult.booking;
                const ov = parseGuestDetails(b.guestDetails);
                const totalGuests = Math.max(bookingPeopleCount(b, packs), b.numPeople || 1);
                const names = b.customerName
                  .split(/\s*&\s*/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const bracelets = guestBracelets(b, packs);
                const braceletsGiven = guestBraceletsGiven(b);

                const allCheckedIn = Array.from({ length: totalGuests }, (_, i) => {
                  const g = ov[i];
                  return g ? Boolean(g.checkedIn) : b.status === "checked-in";
                }).every(Boolean);

                const anyCheckedIn = Array.from({ length: totalGuests }, (_, i) => {
                  const g = ov[i];
                  return g ? Boolean(g.checkedIn) : b.status === "checked-in";
                }).some(Boolean);

                return (
                  <div className="space-y-6">
                    {/* Status Banner */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        allCheckedIn
                          ? "bg-cyan-50 border-cyan-200 text-cyan-800"
                          : b.status === "confirmed"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : b.status === "pending"
                              ? "bg-amber-50 border-amber-200 text-amber-800"
                              : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {allCheckedIn ? (
                          <UserCheck className="h-7 w-7 text-cyan-600 shrink-0" />
                        ) : b.status === "confirmed" ? (
                          <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-7 w-7 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <div className="text-sm font-bold uppercase tracking-wider">
                            {allCheckedIn
                              ? "Entrée Complète (Tous Enregistrés)"
                              : anyCheckedIn
                                ? "Entrée Partielle (1/2 Enregistré)"
                                : b.status === "confirmed"
                                  ? "Billet Valide — Prêt pour le Check-in"
                                  : b.status === "pending"
                                    ? "Billet En Attente"
                                    : "Billet Non Valide"}
                          </div>
                          <div className="text-xs opacity-90 mt-0.5">
                            {allCheckedIn
                              ? "Tous les invités de ce billet ont déjà été enregistrés."
                              : "Vérifiez l'identité et validez le ou les participants présents."}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm px-3 py-1 rounded-md bg-white/80 border border-current font-bold text-amber-700">
                          {b.ticketCode}
                        </span>
                      </div>
                    </div>

                    {/* Summary Badges: Pack, Room, Guest Count */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block mb-1">Formule / Pack</span>
                        <strong className="text-slate-900 font-semibold text-sm">
                          {translateDynamicText(b.packName, "fr")}
                        </strong>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 block mb-1">Nombre d'invités</span>
                        <strong className="text-slate-900 font-semibold text-sm flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-amber-600" />
                          {totalGuests} {totalGuests > 1 ? "Personnes (Pass Duo)" : "Personne (Pass Solo)"}
                        </strong>
                      </div>

                      {b.roomNumber ? (
                        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 col-span-2 sm:col-span-1">
                          <span className="text-blue-600 block mb-1 font-semibold">Chambre Hôtel</span>
                          <strong className="text-blue-950 font-bold text-sm flex items-center gap-1">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            Chambre {b.roomNumber} ({b.roomType || "Standard"})
                          </strong>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                          <span className="text-slate-500 block mb-1">Hébergement</span>
                          <span className="text-slate-600 font-medium">Sans chambre hôtel</span>
                        </div>
                      )}
                    </div>

                    {/* Optional Bracelet Section (Toggled ON / OFF) */}
                    {showBracelets && (
                      <div className="p-4 rounded-xl bg-fuchsia-50/50 border border-fuchsia-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-fuchsia-950 flex items-center gap-1.5 uppercase tracking-wider">
                            <Watch className="h-4 w-4 text-fuchsia-600" />
                            Attribution des Bracelets (Mode Activé)
                          </h4>
                          <Link
                            to="/admin/bracelet-scanner"
                            className="text-[11px] text-fuchsia-700 underline font-semibold"
                          >
                            Ouvrir station dédiée
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Array.from({ length: totalGuests }, (_, i) => {
                            const braceletCat = bracelets[i] || "none";
                            const style = BRACELET_STYLES[braceletCat];
                            const isGiven = braceletsGiven[i] ?? false;
                            const displayName =
                              ov[i]?.firstName || names[i] || `Participant ${i + 1}`;

                            return (
                              <div
                                key={i}
                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                  isGiven
                                    ? "bg-emerald-50 border-emerald-300"
                                    : `${style.cardBg} ${style.cardBorder}`
                                }`}
                              >
                                <div>
                                  <span className="text-[10px] text-slate-500 font-semibold block">
                                    Invité {i + 1}: {displayName}
                                  </span>
                                  <span className={`font-bold ${style.textColor}`}>
                                    {style.label}
                                  </span>
                                </div>
                                {braceletCat !== "none" && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBracelet(i, isGiven)}
                                    className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                                      isGiven
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-900 text-white"
                                    }`}
                                  >
                                    {isGiven ? "Remis ✓" : "Donner"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ─── Multi-Guest Check-In Cards ───────────────────── */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Users className="h-4 w-4 text-amber-500" />
                          Participants rattachés à ce pass ({totalGuests})
                        </h4>

                        {!allCheckedIn && totalGuests > 1 && (
                          <button
                            type="button"
                            onClick={handleCheckInAll}
                            disabled={processingAction}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Valider tous les participants
                          </button>
                        )}
                      </div>

                      {Array.from({ length: totalGuests }, (_, i) => {
                        const guestOverride = ov[i] || {};
                        const fallbackName =
                          names[i] || (i === 0 ? b.customerName : `Participant ${i + 1}`);
                        const firstName =
                          guestOverride.firstName || fallbackName.split(/\s+/)[0] || "";
                        const lastName =
                          guestOverride.lastName ||
                          fallbackName.split(/\s+/).slice(1).join(" ") ||
                          "";
                        const displayName = `${firstName} ${lastName}`.trim() || fallbackName;

                        const email = guestOverride.email || (i === 0 ? b.email : "");
                        const phone = guestOverride.phone || (i === 0 ? b.phone : "");
                        const country = guestOverride.country || b.country || "Morocco";

                        const isCheckedIn =
                          guestOverride.checkedIn !== undefined
                            ? Boolean(guestOverride.checkedIn)
                            : b.status === "checked-in";
                        const checkedInTime = guestOverride.checkedInAt;

                        const isEditing = editingGuestIndex === i;
                        const hasNoEmail = !email.trim();

                        return (
                          <div
                            key={i}
                            className={`p-4 rounded-xl border transition-all ${
                              isCheckedIn
                                ? "bg-emerald-50/40 border-emerald-200"
                                : hasNoEmail
                                  ? "bg-amber-50/30 border-amber-200"
                                  : "bg-white border-slate-200 shadow-sm"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                                    Participant {i + 1}
                                  </span>
                                  <h5 className="font-bold text-slate-900 text-sm">{displayName}</h5>

                                  {isCheckedIn ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                      <Check className="h-3 w-3" />
                                      Enregistré
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                      Non enregistré
                                    </span>
                                  )}

                                  {hasNoEmail && !isCheckedIn && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                                      <AlertTriangle className="h-3 w-3" />
                                      Email manquant
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-slate-400" />
                                    {email || (
                                      <span className="text-amber-700 italic font-medium">
                                        À renseigner
                                      </span>
                                    )}
                                  </span>
                                  {phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-slate-400" />
                                      {phone}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3 text-slate-400" />
                                    {country}
                                  </span>
                                  {checkedInTime && (
                                    <span className="text-slate-400 text-[11px]">
                                      (Enregistré à{" "}
                                      {new Date(checkedInTime).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      )
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions for this guest */}
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {isCheckedIn ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUndoCheckIn(i)}
                                    disabled={processingAction}
                                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                    title="Annuler le check-in de cet invité"
                                  >
                                    Annuler
                                  </button>
                                ) : hasNoEmail ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditGuestForm(i, guestOverride, fallbackName)
                                    }
                                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                    Renseigner email & Valider
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEditGuestForm(i, guestOverride, fallbackName)
                                      }
                                      className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                                    >
                                      Modifier
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCheckInGuest(i)}
                                      disabled={processingAction}
                                      className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Valider l'entrée
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Inline Edit Form for Guest Missing Info */}
                            {isEditing && (
                              <div className="mt-3 pt-3 border-t border-amber-200 space-y-3 bg-amber-50/70 p-3 rounded-lg animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-amber-900">
                                    Compléter les coordonnées du Participant {i + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingGuestIndex(null)}
                                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                                  >
                                    Fermer
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                                      Prénom
                                    </label>
                                    <input
                                      type="text"
                                      value={guestEditForm.firstName}
                                      onChange={(e) =>
                                        setGuestEditForm({
                                          ...guestEditForm,
                                          firstName: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                                      placeholder="Ex: Sara"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                                      Nom
                                    </label>
                                    <input
                                      type="text"
                                      value={guestEditForm.lastName}
                                      onChange={(e) =>
                                        setGuestEditForm({
                                          ...guestEditForm,
                                          lastName: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                                      placeholder="Ex: Alaoui"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-amber-900 mb-0.5">
                                      Adresse Email (Obligatoire) *
                                    </label>
                                    <input
                                      type="email"
                                      required
                                      value={guestEditForm.email}
                                      onChange={(e) =>
                                        setGuestEditForm({
                                          ...guestEditForm,
                                          email: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-400 bg-white focus:ring-1 focus:ring-amber-500"
                                      placeholder="email.participant@exemple.com"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                                      Téléphone
                                    </label>
                                    <input
                                      type="tel"
                                      value={guestEditForm.phone}
                                      onChange={(e) =>
                                        setGuestEditForm({
                                          ...guestEditForm,
                                          phone: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                                      placeholder="+212 6..."
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-700 mb-0.5">
                                      Pays
                                    </label>
                                    <input
                                      type="text"
                                      value={guestEditForm.country}
                                      onChange={(e) =>
                                        setGuestEditForm({
                                          ...guestEditForm,
                                          country: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                                      placeholder="Morocco / France..."
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingGuestIndex(null)}
                                    className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveAndCheckInGuest(i)}
                                    disabled={processingAction || !guestEditForm.email.trim()}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Enregistrer et Valider l'entrée
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <span className="text-xs text-slate-400">
                        Réf Billet: {b.id.slice(0, 8)}...
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveResult(null);
                          setStatusMessage(null);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                      >
                        Terminer & Reprendre le scan
                      </button>
                    </div>
                  </div>
                );
              })()}

            {/* ─── CASE 2: UNREDEEMED INVITE FOUND ──────────────────── */}
            {activeResult.type === "invite" &&
              (() => {
                const inv = activeResult.invite;
                return (
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Sparkles className="h-5 w-5 text-amber-600" />
                        Invitation VIP Valide — Non Encore Enregistrée
                      </div>
                      <p className="text-xs opacity-90">
                        Ce code d'invitation (<strong className="font-mono">{inv.code}</strong>) est
                        valide pour la formule{" "}
                        <strong>{translateDynamicText(inv.packName, "fr")}</strong>. Vous pouvez
                        enregistrer le bénéficiaire et valider son entrée directement ici.
                      </p>
                      {inv.assignee && (
                        <p className="text-xs font-medium text-amber-800 mt-1">
                          Destinataire prévu: {inv.assignee}
                        </p>
                      )}
                    </div>

                    <form onSubmit={handleRedeemInviteAtDoor} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Prénom *</label>
                          <input
                            type="text"
                            required
                            value={inviteRedeemForm.firstName}
                            onChange={(e) =>
                              setInviteRedeemForm({
                                ...inviteRedeemForm,
                                firstName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-1 focus:ring-amber-500"
                            placeholder="Ex: Mehdi"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Nom</label>
                          <input
                            type="text"
                            value={inviteRedeemForm.lastName}
                            onChange={(e) =>
                              setInviteRedeemForm({
                                ...inviteRedeemForm,
                                lastName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-1 focus:ring-amber-500"
                            placeholder="Ex: Benali"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-medium text-slate-700 mb-1">
                            Adresse Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={inviteRedeemForm.email}
                            onChange={(e) =>
                              setInviteRedeemForm({ ...inviteRedeemForm, email: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-1 focus:ring-amber-500"
                            placeholder="nom.prenom@exemple.com"
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Téléphone</label>
                          <input
                            type="tel"
                            value={inviteRedeemForm.phone}
                            onChange={(e) =>
                              setInviteRedeemForm({ ...inviteRedeemForm, phone: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-1 focus:ring-amber-500"
                            placeholder="+212 6..."
                          />
                        </div>

                        <div>
                          <label className="block font-medium text-slate-700 mb-1">Pays</label>
                          <input
                            type="text"
                            value={inviteRedeemForm.country}
                            onChange={(e) =>
                              setInviteRedeemForm({
                                ...inviteRedeemForm,
                                country: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-1 focus:ring-amber-500"
                            placeholder="Morocco"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setActiveResult(null)}
                          className="px-4 py-2 rounded-xl text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Annuler
                        </button>

                        <button
                          type="submit"
                          disabled={
                            processingAction ||
                            !inviteRedeemForm.firstName.trim() ||
                            !inviteRedeemForm.email.trim()
                          }
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                          Enregistrer & Valider l'entrée
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* ─── LIVE TICKETS & PASSES DIRECTORY ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Ticket className="h-5 w-5 text-amber-500" />
              Répertoire de tous les billets & passes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultez et validez les billets directement depuis la liste des réservations.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Rechercher nom, code, email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-amber-500"
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
                Tous ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter("confirmed")}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  tableFilter === "confirmed"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                À entrer ({totalWaitingTickets})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter("checked-in")}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  tableFilter === "checked-in"
                    ? "bg-cyan-600 text-white font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Entrés ({totalCheckedInTickets})
              </button>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Code Billet</th>
                <th className="px-5 py-3">Participant(s)</th>
                <th className="px-5 py-3">Formule / Pack</th>
                <th className="px-5 py-3">Invités</th>
                <th className="px-5 py-3">Statut Entrée</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Chargement des billets...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Aucun billet correspondant aux filtres.
                  </td>
                </tr>
              ) : (
                filteredBookings.slice(0, 100).map((b) => {
                  const ov = parseGuestDetails(b.guestDetails);
                  const totalGuests = Math.max(bookingPeopleCount(b, packs), b.numPeople || 1);
                  const checkedCount =
                    b.status === "checked-in"
                      ? totalGuests
                      : ov.filter((g) => g.checkedIn).length;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-amber-600">
                        {b.ticketCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{b.customerName}</div>
                        <div className="text-[11px] text-slate-500">{b.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-800">
                          {translateDynamicText(b.packName, "fr")}
                        </span>
                        {b.roomNumber && (
                          <div className="text-[11px] text-blue-600 font-medium">
                            Ch. {b.roomNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {totalGuests}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {b.status === "checked-in" ? (
                          <span className="inline-flex items-center gap-1 text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                            <UserCheck className="h-3 w-3" />
                            {totalGuests}/{totalGuests} Entrés
                          </span>
                        ) : checkedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                            <Clock className="h-3 w-3" />
                            {checkedCount}/{totalGuests} Entrés
                          </span>
                        ) : b.status === "confirmed" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-[11px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Confirmé
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-[11px]">
                            {b.status}
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
                            setNotFoundCode(null);
                            setEditingGuestIndex(null);
                            setStatusMessage(null);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          Valider
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
