import { useState } from "react";
import { X, Sparkles, User, Mail, Phone, Globe, Users, CheckCircle2, ChevronDown } from "lucide-react";
import { countries, getFlagEmoji } from "@/lib/countries";
import { useLanguage } from "@/hooks/useLanguage";

export function PackBookingModal({
  pack,
  onClose,
}: {
  pack: { name: string; sub: string; price: string; currency?: string };
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div
      id="pack-booking-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background/95 backdrop-blur-2xl shadow-gold animate-in fade-in zoom-in-95 duration-300"
        style={{ animationFillMode: "both" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-card/80 border border-border/40 hover:bg-card hover:border-primary/40 transition cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with golden accent */}
        <div className="relative overflow-hidden px-8 pt-8 pb-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gold" />
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs tracking-[0.3em] uppercase text-primary font-semibold">
                {t("packFormTitle")}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{t("packFormDesc")}</p>
          </div>

          {/* Selected pack badge */}
          <div className="mt-5 flex items-center gap-4 p-4 rounded-2xl border border-primary/20 bg-primary/5">
            <div className="h-12 w-12 rounded-xl bg-gold grid place-items-center shrink-0">
              <span className="text-primary-foreground font-display text-lg font-bold">
                {pack.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                {t("packFormSelectedPack")}
              </p>
              <p className="font-display text-xl truncate">{pack.name}</p>
              <p className="text-xs text-muted-foreground">{pack.sub}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-display text-2xl text-gold">{pack.price}</span>
              <span className="text-xs text-muted-foreground block">{pack.currency || "€"}</span>
            </div>
          </div>
        </div>

        {/* Form or Success */}
        {submitted ? (
          <div className="px-8 pb-10 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/30 grid place-items-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-display text-2xl mb-3">{t("packFormTitle")}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              {t("packFormSuccess")}
            </p>
            <button
              onClick={onClose}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition cursor-pointer shadow-gold"
            >
              {t("packFormClose")}
            </button>
          </div>
        ) : (
          <form
            className="px-8 pb-8 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              formData.append("access_key", "132f8460-381d-4f1b-861e-acb51f25e842");
              formData.append("subject", `New Pack Booking: ${pack.name}`);
              
              try {
                await fetch("https://api.web3forms.com/submit", {
                  method: "POST",
                  body: formData,
                });
              } catch (err) {
                console.error(err);
              } finally {
                setIsSubmitting(false);
                setSubmitted(true);
              }
            }}
          >
            <input type="hidden" name="Pack" value={`${pack.name} - ${pack.sub} (${pack.price})`} />
            {/* Name & Email row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <User className="h-3 w-3" />
                  {t("packFormFullName")}
                </label>
                <input
                  type="text"
                  name="Full Name"
                  required
                  className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Mail className="h-3 w-3" />
                  {t("packFormEmail")}
                </label>
                <input
                  type="email"
                  name="Email"
                  required
                  className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Phone & Country */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Phone className="h-3 w-3" />
                  {t("packFormPhone")}
                </label>
                <div className="flex">
                  <select
                    name="Phone Country Code"
                    defaultValue={`${getFlagEmoji("MA")} +212`}
                    className="rounded-l-xl border border-border border-r-0 bg-card/40 px-3 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition max-w-[120px]"
                  >
                    {countries.map(c => {
                      const flag = getFlagEmoji(c.code);
                      return (
                        <option key={c.code} value={`${flag} ${c.dial_code}`}>
                          {flag} {c.dial_code.replace('+', '')} ({c.code})
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="tel"
                    name="Phone"
                    required
                    className="w-full rounded-r-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition placeholder:text-muted-foreground/50"
                    placeholder="6 XX XX XX XX"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Globe className="h-3 w-3" />
                  {t("packFormCountry")}
                </label>
                <select
                  name="Country"
                  required
                  defaultValue="MA"
                  className="w-full appearance-none rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition text-foreground cursor-pointer"
                >
                  <option value="" disabled>{t("packFormCountry")}</option>
                  {countries.map(c => (
                    <option key={c.code} value={c.name}>{getFlagEmoji(c.code)} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* People & Level */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <Users className="h-3 w-3" />
                  {t("packFormNumPeople")}
                </label>
                <input
                  type="number"
                  name="Number of People"
                  min="1"
                  max="20"
                  defaultValue="1"
                  required
                  className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                  <ChevronDown className="h-3 w-3" />
                  {t("packFormDanceLevel")}
                </label>
                <select
                  name="Dance Level"
                  required
                  className="w-full appearance-none rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition text-foreground cursor-pointer"
                >
                  <option value="beginner">{t("packFormDanceLevelBeginner")}</option>
                  <option value="intermediate">{t("packFormDanceLevelIntermediate")}</option>
                  <option value="advanced">{t("packFormDanceLevelAdvanced")}</option>
                  <option value="pro">{t("packFormDanceLevelPro")}</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 font-medium">
                {t("packFormNotes")}
              </label>
              <textarea
                name="Notes"
                rows={3}
                className="w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition resize-none placeholder:text-muted-foreground/50"
                placeholder="..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gold px-4 py-4 text-sm font-bold tracking-widest text-primary-foreground uppercase hover:opacity-90 transition shadow-gold cursor-pointer disabled:opacity-70 flex items-center justify-center"
            >
              {isSubmitting ? "Sending..." : t("packFormSubmitBtn")}
            </button>

            <p className="text-center text-[10px] text-muted-foreground/60 tracking-wide">
              contact@tangierlatinfestival.com · +212 6 64 01 02 79
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
