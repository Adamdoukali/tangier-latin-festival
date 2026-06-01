import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";

const TARGET = new Date("2027-01-22T14:00:00").getTime();

function diff() {
  const ms = Math.max(0, TARGET - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms / 3600000) % 24);
  const m = Math.floor((ms / 60000) % 60);
  const s = Math.floor((ms / 1000) % 60);
  return { d, h, m, s };
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-sans text-5xl md:text-6xl lg:text-7xl text-zinc-950 dark:text-gold leading-none tabular-nums font-extrabold tracking-tight">
        {value.toString().padStart(2, "0")}
      </span>
      <span className="mt-2 text-[10px] md:text-xs tracking-[0.25em] text-zinc-950 dark:text-zinc-100 font-bold uppercase">
        {label}
      </span>
    </div>
  );
}

export function Countdown() {
  const { t } = useLanguage();
  const [timeState, setTimeState] = useState(diff());

  useEffect(() => {
    const id = setInterval(() => setTimeState(diff()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md px-6 py-8 md:px-12 md:py-10 shadow-soft">
      <div className="grid grid-cols-4 gap-4 md:gap-10">
        <Cell value={timeState.d} label={t("days")} />
        <Cell value={timeState.h} label={t("hours")} />
        <Cell value={timeState.m} label={t("minutes")} />
        <Cell value={timeState.s} label={t("seconds")} />
      </div>
    </div>
  );
}
