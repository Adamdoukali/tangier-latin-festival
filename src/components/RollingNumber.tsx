import { useEffect, useRef, useState } from "react";

/**
 * Parses a stat value string like "+1500" or "4" into
 * { prefix: "+"|"", numericValue: 1500 }
 */
function parseStatValue(raw: string) {
  const match = raw.match(/^([+]?)(\d+)$/);
  if (!match) return { prefix: "", numericValue: 0 };
  return { prefix: match[1], numericValue: parseInt(match[2], 10) };
}

/**
 * Easing: ease-out cubic for a snappy acceleration then smooth deceleration
 */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * A single rolling number that animates from 0 → target
 * when the element scrolls into view.
 */
export function RollingNumber({
  value,
  duration = 2000,
}: {
  value: string;
  duration?: number;
}) {
  const { prefix, numericValue } = parseStatValue(value);
  const [display, setDisplay] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  /* Intersection Observer – trigger once when visible */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasStarted]);

  /* Animate once started */
  useEffect(() => {
    if (!hasStarted) return;

    let start: number | null = null;

    function tick(timestamp: number) {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      setDisplay(Math.round(easedProgress * numericValue));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasStarted, numericValue, duration]);

  return (
    <span ref={ref} className="rolling-number">
      {prefix}
      {display.toLocaleString()}
    </span>
  );
}
