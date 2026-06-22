import { useEffect, useState, useRef } from "react";
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

/* ── Single flip digit ───────────────────────────────────── */
function FlipDigit({ value }: { value: string }) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value !== current) {
      setPrevious(current);
      setFlipping(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        setCurrent(value);
        setFlipping(false);
      }, 500);
    }
  }, [value, current]);

  return (
    <div className="flip-digit" aria-hidden="true">
      {/* Top half – shows current value */}
      <div className="flip-digit-top">
        <span>{current}</span>
      </div>

      {/* Bottom half – shows current value */}
      <div className="flip-digit-bottom">
        <span>{current}</span>
      </div>

      {/* Animated top-flap: starts showing previous, flips down to reveal current */}
      {flipping && (
        <div className="flip-digit-flap flip-digit-flap-top" key={`top-${value}`}>
          <span>{previous}</span>
        </div>
      )}

      {/* Animated bottom-flap: starts hidden, flips to show current */}
      {flipping && (
        <div className="flip-digit-flap flip-digit-flap-bottom" key={`bot-${value}`}>
          <span>{value}</span>
        </div>
      )}
    </div>
  );
}

/* ── A countdown cell: digits + label ────────────────────── */
function Cell({
  value,
  label,
  minDigits = 2,
}: {
  value: number;
  label: string;
  minDigits?: number;
}) {
  const str = value.toString().padStart(minDigits, "0");
  return (
    <div className="countdown-cell">
      <div className="countdown-digits">
        {str.split("").map((ch, i) => (
          <FlipDigit key={i} value={ch} />
        ))}
      </div>
      <span className="countdown-label">{label}</span>
    </div>
  );
}

/* ── Colon separator ─────────────────────────────────────── */
function Separator() {
  return (
    <div className="countdown-separator" aria-hidden="true">
      <span className="countdown-dot" />
      <span className="countdown-dot" />
    </div>
  );
}

/* ── Main Countdown ──────────────────────────────────────── */
export function Countdown() {
  const { t } = useLanguage();
  const [timeState, setTimeState] = useState<TimeState>(diff());

  useEffect(() => {
    const id = setInterval(() => setTimeState(diff()), 1000);
    return () => clearInterval(id);
  }, []);

  // Determine how many digits for days (at least 2, up to 3)
  const dayDigits = timeState.d >= 100 ? 3 : 2;

  return (
    <div className="countdown-wrapper" role="timer" aria-label="Event countdown">
      {/* Screenreader-only text */}
      <span className="sr-only">
        {timeState.d} {t("days")}, {timeState.h} {t("hours")}, {timeState.m}{" "}
        {t("minutes")}, {timeState.s} {t("seconds")}
      </span>

      <div className="countdown-grid">
        <Cell value={timeState.d} label={t("days")} minDigits={dayDigits} />
        <Separator />
        <Cell value={timeState.h} label={t("hours")} />
        <Separator />
        <Cell value={timeState.m} label={t("minutes")} />
        <Separator />
        <Cell value={timeState.s} label={t("seconds")} />
      </div>
    </div>
  );
}
