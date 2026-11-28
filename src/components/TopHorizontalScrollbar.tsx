import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";

export function TopHorizontalScrollbar({
  targetRef,
  label = "Défilement tableau",
  stickyTop = "top-14",
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  label?: string;
  stickyTop?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncWidth = useCallback(() => {
    if (targetRef.current) {
      const sw = targetRef.current.scrollWidth;
      const cw = targetRef.current.clientWidth;
      setScrollWidth(sw);
      setClientWidth(cw);
      const sl = targetRef.current.scrollLeft;
      setCanScrollLeft(sl > 2);
      setCanScrollRight(sl < sw - cw - 2);
    }
  }, [targetRef]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    syncWidth();

    const ro = new ResizeObserver(() => {
      syncWidth();
    });
    ro.observe(target);
    if (target.firstElementChild) {
      ro.observe(target.firstElementChild);
    }

    const onTargetScroll = () => {
      if (scrollRef.current && target) {
        scrollRef.current.scrollLeft = target.scrollLeft;
        const sw = target.scrollWidth;
        const cw = target.clientWidth;
        const sl = target.scrollLeft;
        setCanScrollLeft(sl > 2);
        setCanScrollRight(sl < sw - cw - 2);
      }
    };

    const onTopScroll = () => {
      if (target && scrollRef.current) {
        target.scrollLeft = scrollRef.current.scrollLeft;
      }
    };

    target.addEventListener("scroll", onTargetScroll, { passive: true });
    const topEl = scrollRef.current;
    topEl?.addEventListener("scroll", onTopScroll, { passive: true });

    return () => {
      ro.disconnect();
      target.removeEventListener("scroll", onTargetScroll);
      topEl?.removeEventListener("scroll", onTopScroll);
    };
  }, [targetRef, syncWidth]);

  // If table does not overflow, hide the scrollbar
  if (scrollWidth <= clientWidth) return null;

  const scrollByDelta = (delta: number) => {
    if (targetRef.current) {
      targetRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  return (
    <div
      className={`sticky ${stickyTop} z-20 flex items-center gap-2.5 bg-blue-50/95 backdrop-blur-md border border-blue-200/90 rounded-lg px-3 py-1.5 mb-2 shadow-xs transition-all`}
    >
      <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-blue-900">
        <MoveHorizontal className="h-4 w-4 text-blue-600" />
        <span className="hidden sm:inline">{label} :</span>
        <button
          type="button"
          onClick={() => scrollByDelta(-350)}
          disabled={!canScrollLeft}
          className="p-1 rounded bg-white border border-blue-200 text-blue-900 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs transition cursor-pointer"
          title="Défiler vers la gauche"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => scrollByDelta(350)}
          disabled={!canScrollRight}
          className="p-1 rounded bg-white border border-blue-200 text-blue-900 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs transition cursor-pointer"
          title="Défiler vers la droite"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden h-4 rounded cursor-ew-resize"
        style={{ scrollbarWidth: "thin" }}
      >
        <div style={{ width: `${scrollWidth}px`, height: "2px" }} />
      </div>
    </div>
  );
}
