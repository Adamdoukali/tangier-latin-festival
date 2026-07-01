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

  const goldGradientStyle = {
    color: "transparent",
    backgroundImage: "var(--gradient-gold)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text"
  };

  return (
    <div className="w-full flex justify-center mt-6 md:mt-16 px-4" role="timer" aria-label="Event countdown">
      <span className="sr-only">
        {timeState.d} {t("days")}, {timeState.h} {t("hours")}, {timeState.m} {t("minutes")}, {timeState.s} {t("seconds")}
      </span>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-6 lg:gap-8 w-full max-w-[340px] sm:max-w-[400px] md:max-w-none md:w-auto">
        {[
          { value: dStr, label: "days" },
          { value: hStr, label: "hours" },
          { value: mStr, label: "minutes" },
          { value: sStr, label: "seconds" }
        ].map((item, idx) => (
          <div 
            key={idx} 
            className="flex flex-col items-center justify-center bg-white rounded-lg sm:rounded-xl md:rounded-3xl p-2 sm:p-3 md:p-8 min-w-0 md:min-w-[140px] lg:min-w-[180px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-black/5 relative overflow-hidden"
          >
            {/* Top golden gradient edge */}
            <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 md:h-1.5" style={{ backgroundImage: "var(--gradient-gold)" }} />
            
            <span className="font-display text-2xl sm:text-3xl md:text-8xl lg:text-[110px] font-bold tracking-tighter leading-none" style={goldGradientStyle}>
              {item.value}
            </span>
            <span className="text-[6px] sm:text-[8px] md:text-xs lg:text-sm tracking-[0.1em] md:tracking-[0.25em] uppercase text-zinc-500 mt-0.5 sm:mt-1 md:mt-4 font-bold">
              {t(item.label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
