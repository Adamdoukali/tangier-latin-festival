import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";

const TARGET = new Date("2027-01-07T14:00:00").getTime();

interface TimeState {
  d: number;
  h: number;
  m: number;
  s: number;
}

function diff(): TimeState {
  const ms = Math.max(0, TARGET - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms / 3600000) % 24);
  const m = Math.floor((ms / 60000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return { d, h, m, s };
}

/* ── Main Countdown ──────────────────────────────────────── */
export function Countdown() {
  const { t } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [timeState, setTimeState] = useState<TimeState>({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    setIsMounted(true);
    setTimeState(diff());
    const id = setInterval(() => setTimeState(diff()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isMounted) return <div className="w-full min-h-[120px]" aria-hidden="true" />;

  const dStr = timeState.d.toString().padStart(timeState.d >= 100 ? 3 : 2, "0");
  const hStr = timeState.h.toString().padStart(2, "0");
  const mStr = timeState.m.toString().padStart(2, "0");
  const sStr = timeState.s.toString().padStart(2, "0");

  return (
    <div className="w-full flex justify-center mt-12 md:mt-16" role="timer" aria-label="Event countdown">
      {/* Screenreader-only text */}
      <span className="sr-only">
        {timeState.d} {t("days")}, {timeState.h} {t("hours")}, {timeState.m} {t("minutes")}, {timeState.s} {t("seconds")}
      </span>

      <div className="flex items-center gap-4 md:gap-8 lg:gap-12">
        <div className="flex flex-col items-center">
          <span className="font-display text-5xl md:text-7xl lg:text-8xl text-foreground font-bold tracking-tighter">
            {dStr}
          </span>
          <span className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-muted-foreground mt-2 font-semibold">
            {t("days")}
          </span>
        </div>
        <span className="text-3xl md:text-5xl text-border/50 mb-6 font-display">:</span>
        <div className="flex flex-col items-center">
          <span className="font-display text-5xl md:text-7xl lg:text-8xl text-foreground font-bold tracking-tighter">
            {hStr}
          </span>
          <span className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-muted-foreground mt-2 font-semibold">
            {t("hours")}
          </span>
        </div>
        <span className="text-3xl md:text-5xl text-border/50 mb-6 font-display">:</span>
        <div className="flex flex-col items-center">
          <span className="font-display text-5xl md:text-7xl lg:text-8xl text-gold font-bold tracking-tighter">
            {mStr}
          </span>
          <span className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-muted-foreground mt-2 font-semibold">
            {t("minutes")}
          </span>
        </div>
        <span className="text-3xl md:text-5xl text-border/50 mb-6 font-display">:</span>
        <div className="flex flex-col items-center">
          <span className="font-display text-5xl md:text-7xl lg:text-8xl text-gold font-bold tracking-tighter">
            {sStr}
          </span>
          <span className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-muted-foreground mt-2 font-semibold">
            {t("seconds")}
          </span>
        </div>
      </div>
    </div>
  );
}
